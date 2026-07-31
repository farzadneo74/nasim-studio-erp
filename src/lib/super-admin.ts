import { masterDb } from "./master-db"
import { getCurrentUser } from "./auth"

/**
 * بررسی می‌کند که آیا کاربر فعلی super-admin است یا خیر
 * super-admin = فرزاد (صاحب پلتفرم) و هر کس دیگری که isSuperAdmin=true باشد
 */
export async function isSuperAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  const masterUser = await masterDb.masterUser.findUnique({
    where: { id: user.userId },
    select: { isSuperAdmin: true },
  })
  return masterUser?.isSuperAdmin === true
}

/**
 * اگر کاربر فعلی super-admin نباشد، خطا می‌اندازد
 * استفاده در API routes برای حفاظت
 */
export async function requireSuperAdmin(): Promise<void> {
  if (!(await isSuperAdmin())) {
    throw new Error("Forbidden: super-admin access required")
  }
}

/**
 * دریافت تنظیمات پلتفرم به صورت یک object
 */
export async function getPlatformSettings(): Promise<Record<string, string>> {
  const rows = await masterDb.platformSetting.findMany()
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

/**
 * دریافت یک تنظیم خاص
 */
export async function getPlatformSetting(key: string): Promise<string | null> {
  const row = await masterDb.platformSetting.findUnique({ where: { key } })
  return row?.value ?? null
}

/**
 * ذخیره یک تنظیم
 */
export async function setPlatformSetting(key: string, value: string): Promise<void> {
  await masterDb.platformSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
}

/**
 * آپدیت چندین تنظیم همزمان
 */
export async function setPlatformSettings(settings: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(settings)) {
    await masterDb.platformSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
  }
}

/**
 * تعریف پلن‌های اشتراک (به صورت constants — نه در DB)
 * این‌ها پلن‌های پیش‌فرض پلتفرم هستند
 */
export const SUBSCRIPTION_PLANS = [
  {
    id: "trial",
    name: "تستی",
    nameEn: "Trial",
    maxEmployees: 5,
    maxProjects: 0, // unlimited
    maxCustomers: 0, // unlimited
    maxStorageBytes: BigInt(1073741824), // 1GB
    monthlyPriceToman: 0,
    durationDays: 14,
    color: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
  },
  {
    id: "basic",
    name: "پایه",
    nameEn: "Basic",
    maxEmployees: 5,
    maxProjects: 0,
    maxCustomers: 0,
    maxStorageBytes: BigInt(5 * 1073741824), // 5GB
    monthlyPriceToman: 500000,
    durationDays: 30,
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  },
  {
    id: "pro",
    name: "حرفه‌ای",
    nameEn: "Pro",
    maxEmployees: 15,
    maxProjects: 0,
    maxCustomers: 0,
    maxStorageBytes: BigInt(20 * 1073741824), // 20GB
    monthlyPriceToman: 1200000,
    durationDays: 30,
    color: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  },
  {
    id: "enterprise",
    name: "سازمانی",
    nameEn: "Enterprise",
    maxEmployees: 50,
    maxProjects: 0,
    maxCustomers: 0,
    maxStorageBytes: BigInt(100 * 1073741824), // 100GB
    monthlyPriceToman: 3000000,
    durationDays: 30,
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
  {
    id: "suspended",
    name: "معلق",
    nameEn: "Suspended",
    maxEmployees: 0,
    maxProjects: 0,
    maxCustomers: 0,
    maxStorageBytes: BigInt(0),
    monthlyPriceToman: 0,
    durationDays: 0,
    color: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
  },
] as const

export type PlanId = (typeof SUBSCRIPTION_PLANS)[number]["id"]

export function getPlan(id: string) {
  return SUBSCRIPTION_PLANS.find((p) => p.id === id) ?? SUBSCRIPTION_PLANS[0]
}

/**
 * تعداد کارمندان یک استودیو (از دیتابیس استودیو)
 */
export async function countStudioEmployees(studioDbName: string): Promise<number> {
  try {
    const { getStudioDb } = await import("./studio-db")
    const db = getStudioDb(studioDbName)
    return await db.user.count()
  } catch {
    return 0
  }
}

/**
 * تعداد پروژه‌های یک استودیو
 */
export async function countStudioProjects(studioDbName: string): Promise<number> {
  try {
    const { getStudioDb } = await import("./studio-db")
    const db = getStudioDb(studioDbName)
    return await db.project.count()
  } catch {
    return 0
  }
}

/**
 * تعداد مشتریان یک استودیو
 */
export async function countStudioCustomers(studioDbName: string): Promise<number> {
  try {
    const { getStudioDb } = await import("./studio-db")
    const db = getStudioDb(studioDbName)
    return await db.customer.count()
  } catch {
    return 0
  }
}

/**
 * آمار کامل یک استودیو (کارمندان، پروژه‌ها، مشتریان، فضای ذخیره‌سازی)
 */
export async function getStudioStats(studioDbName: string): Promise<{
  employees: number
  projects: number
  customers: number
}> {
  const [employees, projects, customers] = await Promise.all([
    countStudioEmployees(studioDbName),
    countStudioProjects(studioDbName),
    countStudioCustomers(studioDbName),
  ])
  return { employees, projects, customers }
}
