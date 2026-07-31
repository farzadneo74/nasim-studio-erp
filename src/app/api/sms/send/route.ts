import { NextResponse } from "next/server"
import { getCurrentStudioDbName } from "@/lib/auth-helpers"
import { requirePermission, currentUserHasPermission } from "@/lib/auth-helpers"
import { sendSms, isSmsAvailable } from "@/lib/kavenegar"
import { masterDb } from "@/lib/master-db"

export const dynamic = "force-dynamic"

/**
 * POST /api/sms/send
 * ارسال پیامک از داخل استودیو
 *
 * body: {
 *   receptor: string,  // شماره گیرنده (یا لیست با کاما)
 *   message: string,   // متن پیام
 *   sender?: string,   // شماره فرستنده اختیاری
 *   customerId?: string, // اگر پیامک به مشتری است (برای log)
 * }
 *
 * نیاز به دسترسی: messages یا customers (برای ارسال به مشتری)
 */
export async function POST(req: Request) {
  try {
    // بررسی دسترسی — هر کاربری که به messages یا customers دسترسی داشته باشد می‌تواند پیامک بفرستد
    const canSend =
      (await currentUserHasPermission("messages")) ||
      (await currentUserHasPermission("customers"))
    if (!canSend) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { receptor, message, sender, customerId } = body

  // اعتبارسنجی
  if (!receptor || !message) {
    return NextResponse.json({ error: "شماره گیرنده و متن پیام الزامی است" }, { status: 400 })
  }

  // اعتبارسنجی شماره موبایل (۱۱ رقمی، شروع با 09)
  const phones = receptor.split(",").map((s: string) => s.trim()).filter(Boolean)
  for (const p of phones) {
    if (!/^09\d{9}$/.test(p)) {
      return NextResponse.json({ error: `شماره موبایل نامعتبر: ${p}` }, { status: 400 })
    }
  }

  // استودیو فعلی رو پیدا کن
  const studioDbName = await getCurrentStudioDbName()
  if (!studioDbName) {
    return NextResponse.json({ error: "استودیو فعال یافت نشد" }, { status: 400 })
  }

  const studio = await masterDb.studio.findUnique({
    where: { dbName: studioDbName },
    select: { id: true, name: true, smsCreditRial: true },
  })
  if (!studio) {
    return NextResponse.json({ error: "استودیو یافت نشد" }, { status: 404 })
  }

  // بررسی دسترسی به SMS
  const smsStatus = await isSmsAvailable(studio.id)
  if (!smsStatus.available) {
    return NextResponse.json({
      error: smsStatus.reason || "ارسال پیامک ممکن نیست",
      mode: smsStatus.mode,
    }, { status: 400 })
  }

  // ارسال پیامک
  const result = await sendSms(studio.id, receptor, message, sender)

  if (result.status === "failed") {
    return NextResponse.json({
      error: result.error || "ارسال پیامک ناموفق بود",
      mode: smsStatus.mode,
    }, { status: 500 })
  }

  // لاگ در دیتابیس استودیو (برای history)
  try {
    const db = await import("@/lib/auth-helpers").then(m => m.getCurrentStudioDb())
    if (db && customerId) {
      // اگه مشتری مشخص شده، یک یادداشت در پروفایل مشتری ثبت کن
      const { toPersianDigits } = await import("@/lib/format")
      console.log(`[sms] sent to customer ${customerId} from studio ${studio.name}: ${toPersianDigits(phones.length)} recipient(s)`)
    }
  } catch (e) {
    // خطای log غیرحیاتی
    console.error("[sms] failed to log to studio DB:", e)
  }

  return NextResponse.json({
    ok: true,
    messageId: result.messageId,
    cost: result.cost,
    mode: smsStatus.mode,
    chargedFromStudio: result.chargedFromStudio,
    remainingCredit: result.studioRemainingCredit,
  })
}
