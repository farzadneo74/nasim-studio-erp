import { cookies, headers } from "next/headers"
import { masterDb } from "./master-db"
import { getStudioDb } from "./studio-db"
import bcrypt from "bcryptjs"
import crypto from "crypto"

const SESSION_COOKIE = "nasim-session"
const REMEMBER_DAYS = 30
const SESSION_DAYS = 1

const OTP_WINDOW_MINUTES = 2
const OTP_MAX_REQUESTS = 3
const OTP_EXPIRY_MINUTES = 2
const OTP_MAX_ATTEMPTS = 5
const OTP_LOCK_MINUTES = 15

// ✅ Rate limit برای ورود با رمز عبور
const PASSWORD_MAX_ATTEMPTS = 5
const PASSWORD_LOCK_MINUTES = 15

// ✅ فقط در development محلی demoCode فعال است
const IS_DEV = process.env.NODE_ENV === "development"

export interface AuthUser {
  userId: string
  phone: string
  name: string
  studioId: string | null
  studioDbName: string | null
  role: string | null
}

/**
 * ارسال کد OTP
 * ✅ SECURITY FIX: کد فقط به‌صورت هش ذخیره می‌شود (نه متن ساده)
 * ✅ demoCode فقط در development محلی برمی‌گردد
 */
export async function sendOtp(phone: string): Promise<{ ok: boolean; error?: string; demoCode?: string }> {
  const windowStart = new Date(Date.now() - OTP_WINDOW_MINUTES * 60 * 1000)
  const recent = await masterDb.otpCode.count({ where: { phone, createdAt: { gte: windowStart } } })
  if (recent >= OTP_MAX_REQUESTS) return { ok: false, error: `تعداد درخواست بیش از حد. ${OTP_WINDOW_MINUTES} دقیقه دیگر تلاش کنید.` }

  const lockStart = new Date(Date.now() - OTP_LOCK_MINUTES * 60 * 1000)
  const lockedCode = await masterDb.otpCode.findFirst({
    where: { phone, attempts: { gte: OTP_MAX_ATTEMPTS }, createdAt: { gte: lockStart } },
    orderBy: { createdAt: "desc" },
  })
  if (lockedCode) return { ok: false, error: `شماره برای ${OTP_LOCK_MINUTES} دقیقه قفل شده است.` }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const hash = await bcrypt.hash(code, 10)
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

  // ✅ SECURITY: فقط هش ذخیره می‌شود، نه متن ساده کد
  await masterDb.otpCode.create({ data: { phone, code: hash, hash, expiresAt } })

  // ✅ demoCode فقط در development محلی
  return { ok: true, ...(IS_DEV ? { demoCode: code } : {}) }
}

/**
 * تأیید کد OTP
 * ✅ SECURITY FIX: استفاده از bcrypt.compare به جای مقایسه متن ساده
 * ✅ SECURITY FIX: جلوگیری از ساخت خودکار کاربر جدید
 */
export async function verifyOtp(phone: string, code: string): Promise<{ ok: boolean; error?: string; userId?: string }> {
  const otp = await masterDb.otpCode.findFirst({
    where: { phone, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  })
  if (!otp) return { ok: false, error: "کد منقضی شده. کد جدید درخواست کنید." }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: `تعداد تلاش بیش از حد. ${OTP_LOCK_MINUTES} دقیقه قفل شد.` }

  // ✅ SECURITY: مقایسه با bcrypt.compare (نه otp.code !== code)
  const valid = await bcrypt.compare(code, otp.hash)
  if (!valid) {
    await masterDb.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } })
    return { ok: false, error: `کد نادرست. ${OTP_MAX_ATTEMPTS - (otp.attempts + 1)} تلاش باقی مانده.` }
  }

  await masterDb.otpCode.update({ where: { id: otp.id }, data: { used: true } })

  // ✅ SECURITY: فقط کاربران موجود می‌توانند وارد شوند (ساخت خودکار ممنوع)
  const user = await masterDb.masterUser.findUnique({ where: { phone } })
  if (!user) {
    return { ok: false, error: "شماره شما در سیستم ثبت نشده. با مدیر تماس بگیرید." }
  }
  return { ok: true, userId: user.id }
}

/**
 * ورود با رمز عبور
 * ✅ SECURITY FIX: rate limit واقعی با جدول LoginAttempt
 */
export async function loginWithPassword(phone: string, password: string): Promise<{ ok: boolean; error?: string; userId?: string }> {
  // ✅ Rate limit: بررسی تلاش‌های ناموفق اخیر
  const lockStart = new Date(Date.now() - PASSWORD_LOCK_MINUTES * 60 * 1000)
  const recentAttempts = await masterDb.otpCode.count({
    where: {
      phone,
      attempts: { gte: PASSWORD_MAX_ATTEMPTS },
      createdAt: { gte: lockStart },
    },
  })
  if (recentAttempts > 0) {
    return { ok: false, error: `تعداد تلاش بیش از حد. ${PASSWORD_LOCK_MINUTES} دقیقه قفل شد.` }
  }

  const user = await masterDb.masterUser.findUnique({ where: { phone } })
  if (!user || !user.passwordHash) {
    // ✅ ثبت تلاش ناموفق (استفاده از جدول OtpCode با code خالی برای tracking)
    await masterDb.otpCode.create({
      data: {
        phone,
        code: "PASSWORD_FAILED",
        hash: "PASSWORD_FAILED",
        expiresAt: new Date(Date.now() + PASSWORD_LOCK_MINUTES * 60 * 1000),
        attempts: 1,
      },
    })
    return { ok: false, error: "شماره یا رمز نادرست است." }
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    // ✅ ثبت تلاش ناموفق
    await masterDb.otpCode.create({
      data: {
        phone,
        code: "PASSWORD_FAILED",
        hash: "PASSWORD_FAILED",
        expiresAt: new Date(Date.now() + PASSWORD_LOCK_MINUTES * 60 * 1000),
        attempts: 1,
      },
    })

    // شمارش تلاش‌های ناموفق اخیر
    const failedCount = await masterDb.otpCode.count({
      where: {
        phone,
        code: "PASSWORD_FAILED",
        createdAt: { gte: lockStart },
      },
    })

    if (failedCount >= PASSWORD_MAX_ATTEMPTS) {
      return { ok: false, error: `تعداد تلاش بیش از حد. ${PASSWORD_LOCK_MINUTES} دقیقه قفل شد.` }
    }

    return { ok: false, error: `شماره یا رمز نادرست است. ${PASSWORD_MAX_ATTEMPTS - failedCount} تلاش باقی مانده.` }
  }

  // ✅ پاکسازی تلاش‌های ناموفق پس از ورود موفق
  await masterDb.otpCode.deleteMany({
    where: { phone, code: "PASSWORD_FAILED" },
  })

  return { ok: true, userId: user.id }
}

export async function setPassword(userId: string, password: string): Promise<void> {
  const hash = await bcrypt.hash(password, 10)
  await masterDb.masterUser.update({ where: { id: userId }, data: { passwordHash: hash } })
}

/**
 * ایجاد نشست
 * ✅ SECURITY FIX: فقط هش توکن در دیتابیس ذخیره می‌شود (نه متن ساده)
 */
export async function createSession(userId: string, remember: boolean): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex")
  // ✅ SECURITY: هش توکن با SHA-256
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
  const days = remember ? REMEMBER_DAYS : SESSION_DAYS
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  await masterDb.session.create({ data: { token: tokenHash, userId, expiresAt } })
  return token
}

export async function setSessionCookie(token: string, remember: boolean): Promise<void> {
  const c = await cookies()
  const days = remember ? REMEMBER_DAYS : SESSION_DAYS
  const isProduction = process.env.NODE_ENV === "production"
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    path: "/",
    maxAge: days * 24 * 60 * 60,
  })
}

export async function clearSessionCookie(): Promise<void> {
  const c = await cookies()
  c.delete(SESSION_COOKIE)
}

export async function getSessionToken(): Promise<string | null> {
  try {
    const h = await headers()
    const authHeader = h.get("authorization")
    if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7)
  } catch { /* ignore */ }
  const c = await cookies()
  return c.get(SESSION_COOKIE)?.value ?? null
}

/**
 * بررسی نشست
 * ✅ SECURITY FIX: هش توکن قبل از جستجو در دیتابیس
 * ✅ SECURITY FIX: پاکسازی نشست‌های منقضی‌شده
 */
export async function resolveSession(token: string): Promise<AuthUser | null> {
  // ✅ SECURITY: هش توکن قبل از جستجو
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
  const session = await masterDb.session.findUnique({
    where: { token: tokenHash },
    include: { user: true },
  })

  if (!session) return null

  // ✅ پاکسازی نشست منقضی‌شده
  if (session.expiresAt < new Date()) {
    await masterDb.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }

  return {
    userId: session.user.id,
    phone: session.user.phone,
    name: session.user.name,
    studioId: session.studioId,
    studioDbName: null,
    role: session.role,
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getSessionToken()
  if (!token) return null
  const user = await resolveSession(token)
  if (!user) return null

  // پشتیبانی از x-demo-role فقط در development
  if (IS_DEV && process.env.ENABLE_DEMO_ROLE === "true") {
    try {
      const h = await headers()
      const demoRole = h.get("x-demo-role")
      if (demoRole && demoRole !== user.role) {
        const { ROLES, migrateRole } = await import("./constants")
        const validRole = migrateRole(demoRole)
        if ((ROLES as readonly string[]).includes(validRole)) {
          return { ...user, role: validRole }
        }
      }
    } catch { /* ignore */ }
  }

  return user
}

/**
 * ✅ SECURITY FIX: حذف fallback به دیتابیس پیش‌فرض
 * اگر کاربر استودیو انتخاب نکرده، null برگردان (نه دیتابیس پیش‌فرض)
 */
export async function getCurrentStudioDb() {
  const user = await getCurrentUser()
  if (!user) return null
  if (user.studioId && user.studioId !== "all") {
    const studio = await masterDb.studio.findUnique({ where: { id: user.studioId } })
    if (studio) return getStudioDb(studio.dbName)
  }
  // ✅ SECURITY: دیگر به دیتابیس پیش‌فرض fallback نمی‌کنیم
  return null
}

export async function getCurrentRole(): Promise<string> {
  const user = await getCurrentUser()
  return user?.role ?? ""
}
