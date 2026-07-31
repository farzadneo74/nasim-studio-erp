import { NextResponse } from "next/server"
import { masterDb } from "@/lib/master-db"
import { requireSuperAdmin, getPlan } from "@/lib/super-admin"
import { ensureStudioDb } from "@/lib/studio-db"
import fs from "fs/promises"
import path from "path"

export const dynamic = "force-dynamic"

/**
 * GET /api/super-admin/studios
 * لیست همه استودیوها (خلاصه)
 */
export async function GET() {
  try {
    await requireSuperAdmin()
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const studios = await masterDb.studio.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, nameEn: true, dbName: true,
      plan: true, isActive: true,
      subscriptionEnd: true, ownerName: true, ownerPhone: true,
      city: true, smsCreditRial: true, kavenegarStatus: true,
      maxEmployees: true, storageUsedBytes: true, storageQuotaBytes: true,
      createdAt: true,
      _count: { select: { memberships: true } },
    },
  })

  return NextResponse.json({
    studios: studios.map((s) => ({
      ...s,
      storageUsedBytes: Number(s.storageUsedBytes),
      storageQuotaBytes: Number(s.storageQuotaBytes),
      planName: getPlan(s.plan).name,
    })),
  })
}

/**
 * POST /api/super-admin/studios
 * ساخت استودیوی جدید
 * body: { name, nameEn?, ownerName?, ownerPhone?, city?, plan?, studioPhone? }
 */
export async function POST(req: Request) {
  try {
    await requireSuperAdmin()
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { name, nameEn, ownerName, ownerPhone, city, plan, studioPhone, address, notes } = body

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  // ساخت dbName از نام (slug)
  const slugBase = (nameEn || name)
    .toString()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30) || `studio-${Date.now()}`
  // اطمینان از یکتا بودن dbName
  let dbName = `studio-${slugBase}.db`
  let suffix = 1
  while (true) {
    try {
      await fs.access(path.join(process.cwd(), "db", dbName))
      dbName = `studio-${slugBase}-${suffix}.db`
      suffix++
    } catch {
      break // فایل وجود نداره — می‌تونیم بسازیم
    }
  }

  // اطمینان از اینکه فایل DB خالی ساخته می‌شه
  await ensureStudioDb(dbName)

  // push studio schema به فایل DB جدید
  // استفاده از prisma db push با DATABASE_URL override
  const { execSync } = await import("child_process")
  try {
    execSync(
      `DATABASE_URL="file:../db/${dbName}" bunx prisma db push --schema=prisma/schema.prisma --accept-data-loss --skip-generate`,
      { cwd: process.cwd(), stdio: "pipe", timeout: 30000 }
    )
  } catch (e) {
    console.error("Failed to push studio schema:", e)
    return NextResponse.json({ error: "Failed to initialize studio database" }, { status: 500 })
  }

  // تنظیمات پلن
  const planId = plan || "trial"
  const planDef = getPlan(planId)
  const startAt = new Date()
  const endAt = new Date(Date.now() + (planDef.durationDays || 14) * 24 * 60 * 60 * 1000)

  // ساخت استودیو در master DB
  const studio = await masterDb.studio.create({
    data: {
      name,
      nameEn,
      dbName,
      plan: planId,
      subscriptionStart: startAt,
      subscriptionEnd: endAt,
      maxEmployees: planDef.maxEmployees,
      maxProjects: planDef.maxProjects,
      maxCustomers: planDef.maxCustomers,
      maxStorageBytes: planDef.maxStorageBytes,
      storageQuotaBytes: planDef.maxStorageBytes,
      studioPhone,
      ownerName,
      ownerPhone,
      city,
      address,
      notes,
      kavenegarStatus: "none",
    },
  })

  // ثبت رویداد اشتراک
  await masterDb.subscriptionEvent.create({
    data: {
      studioId: studio.id,
      eventType: "create",
      toPlan: planId,
      durationDays: planDef.durationDays || 14,
      startAt,
      endAt,
      note: `ایجاد استودیوی جدید با پلن ${planDef.name}`,
    },
  })

  // اگه ownerPhone داده شده، membership بساز
  if (ownerPhone) {
    const owner = await masterDb.masterUser.findUnique({ where: { phone: ownerPhone } })
    if (owner) {
      await masterDb.studioMembership.create({
        data: {
          userId: owner.id,
          studioId: studio.id,
          role: "admin", // owner استودیو = admin
          isActive: true,
        },
      })
    }
  }

  return NextResponse.json({
    ok: true,
    studio: {
      id: studio.id,
      name: studio.name,
      dbName: studio.dbName,
      plan: studio.plan,
    },
  })
}
