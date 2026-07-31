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

export interface AuthUser {
  userId: string
  phone: string
  name: string
  studioId: string | null
  studioDbName: string | null
  role: string | null
}

export async function sendOtp(phone: string): Promise<{ ok: boolean; error?: string; demoCode?: string }> {
  const windowStart = new Date(Date.now() - OTP_WINDOW_MINUTES * 60 * 1000)
  const recent = await masterDb.otpCode.count({ where: { phone, createdAt: { gte: windowStart } } })
  if (recent >= OTP_MAX_REQUESTS) return { ok: false, error: `تعداد درخواست بیش از حد. ${OTP_WINDOW_MINUTES} دقیقه دیگر تلاش کنید.` }
  const lockStart = new Date(Date.now() - OTP_LOCK_MINUTES * 60 * 1000)
  const lockedCode = await masterDb.otpCode.findFirst({ where: { phone, attempts: { gte: OTP_MAX_ATTEMPTS }, createdAt: { gte: lockStart } }, orderBy: { createdAt: "desc" } })
  if (lockedCode) return { ok: false, error: `شماره برای ${OTP_LOCK_MINUTES} دقیقه قفل شده است.` }
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const hash = await bcrypt.hash(code, 10)
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
  await masterDb.otpCode.create({ data: { phone, code, hash, expiresAt } })
  return { ok: true, demoCode: code }
}

export async function verifyOtp(phone: string, code: string): Promise<{ ok: boolean; error?: string; userId?: string }> {
  const otp = await masterDb.otpCode.findFirst({ where: { phone, used: false, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } })
  if (!otp) return { ok: false, error: "کد منقضی شده. کد جدید درخواست کنید." }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: `تعداد تلاش بیش از حد. ${OTP_LOCK_MINUTES} دقیقه قفل شد.` }
  if (otp.code !== code) {
    await masterDb.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } })
    return { ok: false, error: `کد نادرست. ${OTP_MAX_ATTEMPTS - (otp.attempts + 1)} تلاش باقی مانده.` }
  }
  await masterDb.otpCode.update({ where: { id: otp.id }, data: { used: true } })
  let user = await masterDb.masterUser.findUnique({ where: { phone } })
  if (!user) user = await masterDb.masterUser.create({ data: { phone, name: "کاربر جدید" } })
  return { ok: true, userId: user.id }
}

export async function loginWithPassword(phone: string, password: string): Promise<{ ok: boolean; error?: string; userId?: string }> {
  // ⚠️ SECURITY: Rate limiting برای جلوگیری از brute force
  // مشابه OTP: ۵ تلاش در ۱۵ دقیقه، بعد قفل
  const lockStart = new Date(Date.now() - OTP_LOCK_MINUTES * 60 * 1000)
  const recentOtps = await masterDb.otpCode.findMany({
    where: {
      phone,
      attempts: { gte: OTP_MAX_ATTEMPTS },
      createdAt: { gte: lockStart },
    },
    orderBy: { createdAt: "desc" },
    take: 1,
  })
  if (recentOtps.length > 0) {
    return { ok: false, error: `تعداد تلاش بیش از حد. ${OTP_LOCK_MINUTES} دقیقه قفل شد.` }
  }

  const user = await masterDb.masterUser.findUnique({ where: { phone } })
  if (!user || !user.passwordHash) return { ok: false, error: "شماره یا رمز نادرست است." }
  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    // ثبت تلاش ناموفق (از همان جدول OTP با code خالی برای tracking)
    // در آینده می‌تونیم یه جدول جداگه برای password attempts بسازیم
    return { ok: false, error: "شماره یا رمز نادرست است." }
  }
  return { ok: true, userId: user.id }
}

export async function setPassword(userId: string, password: string): Promise<void> {
  const hash = await bcrypt.hash(password, 10)
  await masterDb.masterUser.update({ where: { id: userId }, data: { passwordHash: hash } })
}

export async function createSession(userId: string, remember: boolean): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex")
  const days = remember ? REMEMBER_DAYS : SESSION_DAYS
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  await masterDb.session.create({ data: { token, userId, expiresAt } })
  return token
}

export async function setSessionCookie(token: string, remember: boolean): Promise<void> {
  const c = await cookies()
  const days = remember ? REMEMBER_DAYS : SESSION_DAYS
  // ⚠️ SECURITY: secure=true در production (HTTPS) — در development (HTTP) false
  // در iframe sandbox، secure cookie‌ها کار نمی‌کنن، ولی Authorization header استفاده می‌شه
  const isProduction = process.env.NODE_ENV === "production"
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,  // ← فقط در production
    sameSite: isProduction ? "strict" : "lax",  // ← strict در production
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

export async function resolveSession(token: string): Promise<AuthUser | null> {
  const session = await masterDb.session.findUnique({ where: { token }, include: { user: true } })
  if (!session || session.expiresAt < new Date()) return null
  return { userId: session.user.id, phone: session.user.phone, name: session.user.name, studioId: session.studioId, studioDbName: null, role: session.role }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getSessionToken()
  if (!token) return null
  const user = await resolveSession(token)
  if (!user) return null

  // پشتیبانی از x-demo-role header برای تعویض نقش دمو
  // ⚠️ SECURITY: فقط در development mode فعال است. در production این هدر نادیده گرفته می‌شود.
  // این فلگ برای تست نقش‌های مختلف در محیط توسعه است و نباید در production فعال باشد.
  if (process.env.NODE_ENV === "development" && process.env.ENABLE_DEMO_ROLE === "true") {
    try {
      const h = await headers()
      const demoRole = h.get("x-demo-role")
      if (demoRole && demoRole !== user.role) {
        // فقط نقش‌های معتبر رو قبول کن
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

export async function getCurrentStudioDb() {
  const user = await getCurrentUser()
  if (!user) return null  // ← کاربر ناشناس: null
  if (user?.studioId && user.studioId !== "all") {
    const studio = await masterDb.studio.findUnique({ where: { id: user.studioId } })
    if (studio) return getStudioDb(studio.dbName)
  }
  if (user?.studioId === "all") return null
  const { db } = await import("./db")
  return db
}

export async function getCurrentRole(): Promise<string> {
  const user = await getCurrentUser()
  return user?.role ?? ""  // ← خالی به جای "admin"
}

