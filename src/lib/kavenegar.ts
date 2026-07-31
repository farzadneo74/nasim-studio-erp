/**
 * Kavenegar SMS Client — کلاینت کاوه‌نگار برای ارسال پیامک و OTP
 *
 * این ماژول فقط در server-side قابل استفاده است.
 *
 * معماری:
 *  - حساب اصلی (master) متعلق به فرزاد (super-admin) است
 *  - هر استودیو می‌تواند حساب فرزند (child) مستقل داشته باشد
 *  - اگه استودیو child apikey داشته باشد، از آن استفاده می‌شود
 *  - در غیر این صورت، از master apikey استفاده می‌شود و هزینه از شارژ master کم می‌شود
 *
 * مستندات: https://kavenegar.com/rest.html
 *           https://kavenegar.com/customers.html
 */

import { masterDb } from "./master-db"
import { getPlatformSetting } from "./super-admin"

const KAVENEGAR_BASE_URL = "https://api.kavenegar.com/v1"

// ============== Types ==============
export interface KavenegarResponse<T = unknown> {
  return: { status: number; message: string }
  entries?: T
  metadata?: {
    totalcount: string
    currentpage: string
    totalpages: string
    pagesize: string
  }
}

export interface SendSmsResult {
  messageId?: string
  status: "sent" | "failed"
  cost?: number
  error?: string
  /** اگر از شارژ استودیو استفاده شده باشد */
  chargedFromStudio: boolean
  /** موجودی باقی‌مانده استودیو پس از ارسال (به ریال) */
  studioRemainingCredit?: number
}

// ============== Helper: Get Effective API Key ==============
/**
 * تعیین کلید API موثر برای استودیو.
 *  - اگر استودیو child apikey داشته باشد → از آن استفاده می‌شود
 *  - در غیر این صورت → از master apikey استفاده می‌شود
 *
 * همچنین شماره فرستنده (sender) را هم برمی‌گرداند.
 */
async function getEffectiveApiKey(studioId: string): Promise<{
  apiKey: string
  sender?: string
  isChild: boolean
  studio?: {
    id: string
    name: string
    smsCreditRial: number
    kavenegarStatus: string
  }
}> {
  // استودیو رو پیدا کن
  const studio = await masterDb.studio.findUnique({
    where: { id: studioId },
    select: {
      id: true, name: true, smsCreditRial: true,
      kavenegarApikey: true, kavenegarSender: true, kavenegarStatus: true,
    },
  })

  // اگر استودیو child apikey فعال داشت، از آن استفاده کن
  if (studio?.kavenegarApikey && studio.kavenegarStatus === "active") {
    return {
      apiKey: studio.kavenegarApikey,
      sender: studio.kavenegarSender ?? undefined,
      isChild: true,
      studio: {
        id: studio.id, name: studio.name,
        smsCreditRial: studio.smsCreditRial,
        kavenegarStatus: studio.kavenegarStatus,
      },
    }
  }

  // در غیر این صورت از master apikey استفاده کن
  const masterApikey = await getPlatformSetting("kavenegar.master_apikey")
  const defaultSender = await getPlatformSetting("kavenegar.default_sender")

  if (!masterApikey) {
    throw new Error("Kavenegar master apikey is not configured")
  }

  return {
    apiKey: masterApikey,
    sender: defaultSender ?? undefined,
    isChild: false,
    studio: studio ? {
      id: studio.id, name: studio.name,
      smsCreditRial: studio.smsCreditRial,
      kavenegarStatus: studio.kavenegarStatus,
    } : undefined,
  }
}

// ============== Send SMS (Regular) ==============
/**
 * ارسال پیامک به یک یا چند گیرنده
 *
 * نکته: اگر از master apikey استفاده شود، هزینه از شارژ داخلی استودیو کم می‌شود
 *
 * @param studioId شناسه استودیو (برای انتخاب apikey و کسر هزینه)
 * @param receptor شماره گیرنده (یا لیست شماره‌ها با کاما)
 * @param message متن پیام
 * @param sender شماره فرستنده (اختیاری — در غیر این صورت از پیش‌فرض استفاده می‌شود)
 */
export async function sendSms(
  studioId: string,
  receptor: string,
  message: string,
  sender?: string
): Promise<SendSmsResult> {
  try {
    const { apiKey, sender: defaultSender, isChild, studio } = await getEffectiveApiKey(studioId)

    if (!apiKey) {
      return {
        status: "failed",
        error: "Kavenegar API key is not configured",
        chargedFromStudio: false,
      }
    }

    // هزینه تقریبی پیامک (از تنظیمات پلتفرم)
    const costPerMessageRial = Number(await getPlatformSetting("sms.cost_per_message_rial") || "1500")

    // اگر از master apikey استفاده می‌شود و استودیو شارژ کافی ندارد، خطا بده
    if (!isChild && studio && studio.smsCreditRial < costPerMessageRial) {
      return {
        status: "failed",
        error: `موجودی SMS استودیو کافی نیست (موجودی: ${studio.smsCreditRial} ریال، نیاز: ${costPerMessageRial} ریال)`,
        chargedFromStudio: false,
      }
    }

    // ارسال درخواست به Kavenegar
    const url = `${KAVENEGAR_BASE_URL}/${apiKey}/sms/send.json`
    const params = new URLSearchParams({
      receptor,
      message,
      ...(sender || defaultSender ? { sender: sender || defaultSender! } : {}),
    })

    console.log(`[kavenegar] sending SMS to ${receptor} (studio: ${studio?.name}, mode: ${isChild ? "child" : "master"})`)

    const response = await fetch(`${url}?${params.toString()}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })

    const data: KavenegarResponse<{
      messageid: string
      message: string
      status: number
      statustext: string
      sender: string
      receptor: string
      date: number
      cost: number
    }[]> = await response.json()

    if (data.return.status !== 200) {
      console.error("[kavenegar] API error:", data.return)
      return {
        status: "failed",
        error: data.return.message || `Kavenegar error ${data.return.status}`,
        chargedFromStudio: false,
      }
    }

    const entry = data.entries?.[0]
    const messageId = entry?.messageid
    const cost = entry?.cost ?? costPerMessageRial

    // ثبت تراکنش در master DB
    if (studio) {
      await masterDb.smsTransaction.create({
        data: {
          studioId: studio.id,
          type: "send",
          amountRial: -cost, // مصرف
          receptor,
          messageSnippet: message.slice(0, 100),
          kavenegarMessageId: messageId,
          status: "sent",
        },
      })

      // اگر از master apikey استفاده شد، شارژ داخلی استودیو رو کم کن
      if (!isChild) {
        const updated = await masterDb.studio.update({
          where: { id: studio.id },
          data: { smsCreditRial: { decrement: cost } },
          select: { smsCreditRial: true },
        })
        return {
          messageId,
          status: "sent",
          cost,
          chargedFromStudio: true,
          studioRemainingCredit: updated.smsCreditRial,
        }
      }
    }

    return {
      messageId,
      status: "sent",
      cost,
      chargedFromStudio: isChild, // اگه child بود، هزینه مستقیم از حساب child کسر شده
    }
  } catch (e: any) {
    console.error("[kavenegar] sendSms error:", e)
    return {
      status: "failed",
      error: e?.message || "Unknown error",
      chargedFromStudio: false,
    }
  }
}

// ============== Send OTP via verify/lookup ==============
/**
 * ارسال کد OTP با استفاده از verify/lookup (مخصوص OTP)
 *
 * این روش اولویت بالاتری دارد و از فیلتر تبلیغات عبور می‌کند.
 * نیازمند قالب (template) تایید شده در پنل کاوه‌نگار است.
 *
 * @param studioId شناسه استودیو
 * @param receptor شماره گیرنده
 * @param token کد OTP (or مقدار token)
 * @param template نام قالب (اختیاری — در غیر این صورت از تنظیمات پلتفرم استفاده می‌شود)
 * @param token2 پارامتر اختیاری دوم
 * @param token3 پارامتر اختیاری سوم
 */
export async function sendOtp(
  studioId: string,
  receptor: string,
  token: string,
  template?: string,
  token2?: string,
  token3?: string
): Promise<SendSmsResult> {
  try {
    const { apiKey, isChild, studio } = await getEffectiveApiKey(studioId)
    const templateName = template || (await getPlatformSetting("kavenegar.otp_template")) || "nasim-otp"

    if (!apiKey) {
      return {
        status: "failed",
        error: "Kavenegar API key is not configured",
        chargedFromStudio: false,
      }
    }

    const costPerMessageRial = Number(await getPlatformSetting("sms.cost_per_message_rial") || "1500")

    // بررسی موجودی
    if (!isChild && studio && studio.smsCreditRial < costPerMessageRial) {
      return {
        status: "failed",
        error: `موجودی SMS استودیو کافی نیست`,
        chargedFromStudio: false,
      }
    }

    const url = `${KAVENEGAR_BASE_URL}/${apiKey}/verify/lookup.json`
    const params = new URLSearchParams({
      receptor,
      token,
      template: templateName,
      ...(token2 ? { token2 } : {}),
      ...(token3 ? { token3 } : {}),
    })

    console.log(`[kavenegar] sending OTP to ${receptor} (template: ${templateName})`)

    const response = await fetch(`${url}?${params.toString()}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })

    const data: KavenegarResponse<{
      messageid: string
      cost: number
      status: number
    }> = await response.json()

    if (data.return.status !== 200) {
      console.error("[kavenegar] OTP API error:", data.return)
      return {
        status: "failed",
        error: data.return.message || `Kavenegar error ${data.return.status}`,
        chargedFromStudio: false,
      }
    }

    const messageId = data.entries?.messageid
    const cost = data.entries?.cost ?? costPerMessageRial

    // ثبت تراکنش
    if (studio) {
      await masterDb.smsTransaction.create({
        data: {
          studioId: studio.id,
          type: "send",
          amountRial: -cost,
          receptor,
          messageSnippet: `[OTP ${templateName}] token=${token.slice(0, 4)}...`,
          kavenegarMessageId: messageId,
          status: "sent",
        },
      })

      if (!isChild) {
        const updated = await masterDb.studio.update({
          where: { id: studio.id },
          data: { smsCreditRial: { decrement: cost } },
          select: { smsCreditRial: true },
        })
        return {
          messageId,
          status: "sent",
          cost,
          chargedFromStudio: true,
          studioRemainingCredit: updated.smsCreditRial,
        }
      }
    }

    return {
      messageId,
      status: "sent",
      cost,
      chargedFromStudio: isChild,
    }
  } catch (e: any) {
    console.error("[kavenegar] sendOtp error:", e)
    return {
      status: "failed",
      error: e?.message || "Unknown error",
      chargedFromStudio: false,
    }
  }
}

// ============== Get Account Info (balance) ==============
/**
 * دریافت اطلاعات حساب و موجودی
 * اگر studioId داده شود، موجودی child apikey رو برمی‌گرداند
 * در غیر این صورت، master apikey رو بررسی می‌کند
 */
export async function getAccountInfo(studioId?: string): Promise<{
  remaincredit: number
  expiredate: number
  type: "master" | "child"
}> {
  const { apiKey } = studioId
    ? await getEffectiveApiKey(studioId)
    : { apiKey: await getPlatformSetting("kavenegar.master_apikey") || "" }

  if (!apiKey) {
    throw new Error("Kavenegar API key is not configured")
  }

  const url = `${KAVENEGAR_BASE_URL}/${apiKey}/account/info.json`
  const response = await fetch(url)
  const data: KavenegarResponse<{
    remaincredit: number
    expiredate: number
    type: "master" | "child"
  }> = await response.json()

  if (data.return.status !== 200) {
    throw new Error(data.return.message || `Kavenegar error ${data.return.status}`)
  }

  return data.entries!
}

// ============== Customer Management (Reseller) ==============
/**
 * ساخت حساب فرزند (child) جدید در کاوه‌نگار
 * نیازمند فعال‌بودن reseller روی master account است
 *
 * مستندات: https://kavenegar.com/customers.html
 */
export async function createChildAccount(params: {
  username: string
  password: string
  fullname: string
  mobile?: string
  localId?: string // معمولا = studio.id
  credit?: number // شارژ اولیه به ریال
  planId?: string
}): Promise<{
  apikey: string
  remaincredit: number
  status: number
}> {
  const masterApikey = await getPlatformSetting("kavenegar.master_apikey")
  if (!masterApikey) {
    throw new Error("Kavenegar master apikey is not configured")
  }

  const resellerEnabled = await getPlatformSetting("kavenegar.reseller_enabled")
  if (resellerEnabled !== "true") {
    throw new Error("Reseller mode is not enabled. Contact Kavenegar support to activate Customer Management feature.")
  }

  const url = `${KAVENEGAR_BASE_URL}/${masterApikey}/client/add.json`
  const body = new URLSearchParams({
    Username: params.username,
    password: params.password,
    Fullname: params.fullname,
    Status: "1", // 1 = active+login
    Mininumallowedcredit: "1000",
    ...(params.mobile ? { Mobile: params.mobile } : {}),
    ...(params.localId ? { localid: params.localId } : {}),
    ...(params.credit ? { Credit: String(params.credit) } : {}),
    ...(params.planId ? { Planid: params.planId } : {}),
  })

  const response = await fetch(`${url}?${body.toString()}`, { method: "POST" })
  const data: KavenegarResponse<{
    apikey: string
    remaincredit: number
    status: number
  }> = await response.json()

  if (data.return.status !== 200) {
    throw new Error(data.return.message || `Kavenegar error ${data.return.status}`)
  }

  return data.entries!
}

/**
 * شارژ حساب فرزند (انتقال اعتبار از master به child)
 * amount مثبت = master به child / منفی = child به master
 */
export async function chargeChildAccount(params: {
  childApikey: string
  amountRial: number // مثبت یا منفی
  description?: string
}): Promise<{ remaincredit: number }> {
  const masterApikey = await getPlatformSetting("kavenegar.master_apikey")
  if (!masterApikey) {
    throw new Error("Kavenegar master apikey is not configured")
  }

  const url = `${KAVENEGAR_BASE_URL}/${masterApikey}/client/chargecredit.json`
  const body = new URLSearchParams({
    apikey: params.childApikey,
    Credit: String(params.amountRial),
    Desc: params.description || "Charge by NASIM ERP",
  })

  const response = await fetch(`${url}?${body.toString()}`, { method: "POST" })
  const data: KavenegarResponse<{ remaincredit: number }> = await response.json()

  if (data.return.status !== 200) {
    throw new Error(data.return.message || `Kavenegar error ${data.return.status}`)
  }

  return data.entries!
}

/**
 * دریافت لیست همه حساب‌های فرزند
 */
export async function listChildAccounts(): Promise<Array<{
  apikey: string
  fullname: string
  username: string
  remaincredit: number
  status: number
  mobile?: string
  localid?: string
}>> {
  const masterApikey = await getPlatformSetting("kavenegar.master_apikey")
  if (!masterApikey) {
    throw new Error("Kavenegar master apikey is not configured")
  }

  const url = `${KAVENEGAR_BASE_URL}/${masterApikey}/client/list.json`
  const response = await fetch(url)
  const data: KavenegarResponse<Array<{
    apikey: string
    fullname: string
    username: string
    remaincredit: number
    status: number
    mobile?: string
    localid?: string
  }>> = await response.json()

  if (data.return.status !== 200) {
    throw new Error(data.return.message || `Kavenegar error ${data.return.status}`)
  }

  return data.entries || []
}

/**
 * تغییر وضعیت حساب فرزند (فعال/غیرفعال)
 * status: 0 = disabled, 1 = active+login, 2 = active-no-login
 */
export async function setChildAccountStatus(childApikey: string, status: 0 | 1 | 2): Promise<void> {
  const masterApikey = await getPlatformSetting("kavenegar.master_apikey")
  if (!masterApikey) {
    throw new Error("Kavenegar master apikey is not configured")
  }

  const url = `${KAVENEGAR_BASE_URL}/${masterApikey}/client/setstatus.json`
  const body = new URLSearchParams({
    apikey: childApikey,
    Status: String(status),
  })

  const response = await fetch(`${url}?${body.toString()}`, { method: "POST" })
  const data = await response.json()

  if (data.return.status !== 200) {
    throw new Error(data.return.message || `Kavenegar error ${data.return.status}`)
  }
}

// ============== Helper: Check if SMS is available ==============
/**
 * بررسی اینکه آیا ارسال پیامک برای استودیو ممکن است
 */
export async function isSmsAvailable(studioId: string): Promise<{
  available: boolean
  reason?: string
  mode: "child" | "master" | "none"
}> {
  const studio = await masterDb.studio.findUnique({
    where: { id: studioId },
    select: { kavenegarApikey: true, kavenegarStatus: true, smsCreditRial: true },
  })

  if (!studio) {
    return { available: false, reason: "استودیو یافت نشد", mode: "none" }
  }

  // اگر child apikey فعال داشت
  if (studio.kavenegarApikey && studio.kavenegarStatus === "active") {
    return { available: true, mode: "child" }
  }

  // در غیر این صورت master apikey رو چک کن
  const masterApikey = await getPlatformSetting("kavenegar.master_apikey")
  if (!masterApikey) {
    return {
      available: false,
      reason: "تنظیمات Kavenegar کامل نشده — لطفاً با مدیر پلتفرم تماس بگیرید",
      mode: "none",
    }
  }

  // اگه master apikey هست ولی شارژ استودیو صفره
  if (studio.smsCreditRial <= 0) {
    return {
      available: false,
      reason: `موجودی SMS استودیو صفر است (${studio.smsCreditRial} ریال)`,
      mode: "master",
    }
  }

  return { available: true, mode: "master" }
}
