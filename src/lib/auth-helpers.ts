import { masterDb } from "./master-db"
import { getStudioDb } from "./studio-db"
import { getCurrentUser as getAuthUser } from "./auth"
import { PrismaClient } from "@prisma/client"

export { getAuthUser as getCurrentUser }
export type { AuthUser } from "./auth"

export async function getCurrentRole(): Promise<string> {
  const user = await getAuthUser()
  return user?.role ?? "admin"
}

export async function getCurrentStudioDb(): Promise<PrismaClient | null> {
  const user = await getAuthUser()
  if (user?.studioId && user.studioId !== "all") {
    const studio = await masterDb.studio.findUnique({ where: { id: user.studioId } })
    if (studio) return getStudioDb(studio.dbName)
  }
  if (user?.studioId === "all") return null
  const { db } = await import("./db")
  return db
}

export async function getAllStudioDbs() {
  const user = await getAuthUser()
  if (!user) return []
  const memberships = await masterDb.studioMembership.findMany({ where: { userId: user.userId, isActive: true }, include: { studio: true } })
  return memberships.map((m) => ({ db: getStudioDb(m.studio.dbName), studioName: m.studio.name, studioId: m.studio.id }))
}

export async function isAllStudiosMode(): Promise<boolean> {
  const user = await getAuthUser()
  return user?.studioId === "all"
}

export function assertRole(actual: string, allowed: string[]) {
  if (!allowed.includes(actual)) throw new Error("Forbidden: insufficient role")
}

/**
 * Returns the current studio's dbName (used as studioId in Attachment table +
 * the storage directory name). Returns null if not in a single-studio context.
 */
export async function getCurrentStudioDbName(): Promise<string | null> {
  const user = await getAuthUser()
  if (!user?.studioId || user.studioId === "all") return null
  const studio = await masterDb.studio.findUnique({ where: { id: user.studioId }, select: { dbName: true } })
  return studio?.dbName ?? null
}

/**
 * Returns the current studio's SQLite file path (for backup). Resolves the
 * DATABASE_URL pattern "file:../db/<dbName>" relative to the prisma dir.
 */
export async function getCurrentStudioDbPath(): Promise<string | null> {
  const dbName = await getCurrentStudioDbName()
  if (!dbName) return null
  return `${process.cwd()}/db/${dbName}`
}

/**
 * دریافت شناسه کاربر فعلی در دیتابیس استودیو
 * 
 * این تابع نقش کاربر فعلی را از نشست master DB می‌گیرد،
 * سپس در دیتابیس استودیو کاربری با همان نقش را پیدا می‌کند.
 * این برای سیستم کانبان و اعلان‌ها ضروری است چون شناسه کاربر در
 * master DB (مثلاً "user-admin") با شناسه در studio DB (مثلاً "u-admin") متفاوت است.
 */
export async function getCurrentStudioUserId(): Promise<string | null> {
  const role = await getCurrentRole()
  const db = await getCurrentStudioDb()
  if (!db) return null
  const user = await db.user.findFirst({
    where: { role },
    select: { id: true },
  })
  return user?.id ?? null
}
