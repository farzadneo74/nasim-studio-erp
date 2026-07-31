import { NextResponse } from "next/server"
import { masterDb } from "@/lib/master-db"
import { requireSuperAdmin, getStudioStats, getPlan } from "@/lib/super-admin"

export const dynamic = "force-dynamic"

/**
 * GET /api/super-admin/studios/[id]
 * دریافت اطلاعات کامل یک استودیو
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin()
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const studio = await masterDb.studio.findUnique({
    where: { id },
    include: {
      memberships: {
        include: { user: { select: { phone: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      smsTransactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  })

  if (!studio) {
    return NextResponse.json({ error: "Studio not found" }, { status: 404 })
  }

  const stats = await getStudioStats(studio.dbName)
  const plan = getPlan(studio.plan)

  return NextResponse.json({
    studio: {
      id: studio.id,
      name: studio.name,
      nameEn: studio.nameEn,
      dbName: studio.dbName,
      isActive: studio.isActive,
      plan: studio.plan,
      planName: plan.name,
      subscriptionStart: studio.subscriptionStart,
      subscriptionEnd: studio.subscriptionEnd,
      maxEmployees: studio.maxEmployees,
      maxProjects: studio.maxProjects,
      maxCustomers: studio.maxCustomers,
      maxStorageBytes: Number(studio.maxStorageBytes),
      storageQuotaBytes: Number(studio.storageQuotaBytes),
      storageUsedBytes: Number(studio.storageUsedBytes),
      studioPhone: studio.studioPhone,
      ownerName: studio.ownerName,
      ownerPhone: studio.ownerPhone,
      city: studio.city,
      address: studio.address,
      notes: studio.notes,
      kavenegarApikey: studio.kavenegarApikey,
      kavenegarSender: studio.kavenegarSender,
      kavenegarLocalId: studio.kavenegarLocalId,
      kavenegarStatus: studio.kavenegarStatus,
      smsCreditRial: studio.smsCreditRial,
      createdAt: studio.createdAt,
      updatedAt: studio.updatedAt,
    },
    stats,
    memberships: studio.memberships.map((m) => ({
      id: m.id,
      userId: m.userId,
      userName: m.user.name,
      userPhone: m.user.phone,
      role: m.role,
      isActive: m.isActive,
      createdAt: m.createdAt,
    })),
    recentSmsTransactions: studio.smsTransactions,
    subscriptionHistory: studio.subscriptions,
  })
}

/**
 * PATCH /api/super-admin/studios/[id]
 * آپدیت اطلاعات استودیو (plan, limits, owner info, kavenegar, isActive)
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin()
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  const studio = await masterDb.studio.findUnique({ where: { id } })
  if (!studio) {
    return NextResponse.json({ error: "Studio not found" }, { status: 404 })
  }

  // فیلدهای قابل آپدیت
  const allowedFields = [
    "name", "nameEn", "isActive", "studioPhone",
    "ownerName", "ownerPhone", "city", "address", "notes",
    "kavenegarApikey", "kavenegarSender", "kavenegarLocalId", "kavenegarStatus",
    "maxEmployees", "maxProjects", "maxCustomers",
  ]
  const data: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) {
      data[field] = body[field]
    }
  }
  // BigInt برای storage
  if (typeof body.maxStorageBytes === "number") {
    data.maxStorageBytes = BigInt(body.maxStorageBytes)
  }
  if (typeof body.storageQuotaBytes === "number") {
    data.storageQuotaBytes = BigInt(body.storageQuotaBytes)
  }

  const updated = await masterDb.studio.update({
    where: { id },
    data,
  })

  return NextResponse.json({
    ok: true,
    studio: {
      id: updated.id,
      name: updated.name,
      plan: updated.plan,
      isActive: updated.isActive,
    },
  })
}
