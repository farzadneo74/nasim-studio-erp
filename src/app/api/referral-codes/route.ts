import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { ROLE_PERMISSIONS, type Role } from "@/lib/constants"
import { PrismaClient } from "@prisma/client"

export const dynamic = "force-dynamic"

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0/O/1/I
  let s = "STD-"
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

async function genUniqueCode(db: PrismaClient): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = genCode()
    const exists = await db.referralCode.findUnique({ where: { code }, select: { id: true } })
    if (!exists) return code
  }
  return genCode() + "-" + Date.now().toString(36).toUpperCase().slice(-4)
}

function iso(d: Date | null): string | null {
  return d ? d.toISOString() : null
}

// GET /api/referral-codes?ownerId=&status=&page=&limit=
export async function GET(req: NextRequest) {
  const role = await getCurrentRole()
  if (!ROLE_PERMISSIONS[role].qr) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const ownerId = searchParams.get("ownerId")?.trim() || ""
  const status = searchParams.get("status")?.trim() || ""
  const page = Math.max(1, Number(searchParams.get("page") || 1))
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || 50)))

  const where: Record<string, unknown> = {}
  if (ownerId) where.ownerId = ownerId
  if (status === "available") {
    where.isExpired = false
  } else if (status === "used") {
    where.isExpired = false
  } else if (status === "expired") {
    where.isExpired = true
  }

  const fetchLimit = status === "available" || status === "used" ? 200 : limit
  const [totalAll, rows] = await Promise.all([
    db.referralCode.count({ where }),
    db.referralCode.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, phone: true, customerType: true } },
        relatedProject: {
          select: {
            id: true,
            contract: { select: { contractNumber: true, customer: { select: { name: true } } } },
            servicePackage: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: fetchLimit,
    }),
  ])

  const filtered = rows.filter((r) => {
    if (status === "available") return !r.isExpired && r.usedCount < r.maxUses
    if (status === "used") return !r.isExpired && r.usedCount >= r.maxUses
    if (status === "expired") return r.isExpired
    return true
  })

  const total = status ? filtered.length : totalAll
  const paged = status ? filtered.slice((page - 1) * limit, page * limit) : filtered

  const items = paged.map((r) => {
    const isUsedUp = r.usedCount >= r.maxUses
    const isAvailable = !r.isExpired && !isUsedUp
    return {
      id: r.id,
      code: r.code,
      ownerId: r.ownerId,
      owner: r.owner,
      discountPercent: r.discountPercent,
      maxUses: r.maxUses,
      usedCount: r.usedCount,
      isExpired: r.isExpired,
      validFrom: iso(r.validFrom),
      validUntil: iso(r.validUntil),
      relatedProjectId: r.relatedProjectId,
      relatedProject: r.relatedProject
        ? {
            id: r.relatedProject.id,
            contractNumber: r.relatedProject.contract.contractNumber,
            customerName: r.relatedProject.contract.customer.name,
            packageTitle: r.relatedProject.servicePackage.title,
          }
        : null,
      statusLabel: r.isExpired ? "expired" : isUsedUp ? "used" : "available",
      isAvailable,
      isUsedUp,
      description: r.description ?? null,
      createdAt: iso(r.createdAt),
    }
  })

  return NextResponse.json({ items, total, page, limit })
}

interface CreateBody {
  ownerId?: string
  quantity?: number
  discountPercent?: number
  maxUses?: number
  relatedProjectId?: string | null
  validUntil?: string | null
  description?: string | null
}

// POST /api/referral-codes {ownerId, quantity, discountPercent, maxUses, relatedProjectId?, validUntil?}
export async function POST(req: NextRequest) {
  const role = await getCurrentRole()
  if (!ROLE_PERMISSIONS[role].qr) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const body = (await req.json().catch(() => ({}))) as CreateBody

  const ownerId = String(body.ownerId || "").trim()
  if (!ownerId) {
    return NextResponse.json({ error: "Owner customer is required" }, { status: 400 })
  }
  const owner = await db.customer.findUnique({ where: { id: ownerId }, select: { id: true } })
  if (!owner) {
    return NextResponse.json({ error: "Owner customer not found" }, { status: 400 })
  }

  const quantity = Math.max(1, Math.min(20, Number(body.quantity || 5)))
  const discountPercent = Math.max(0, Math.min(100, Number(body.discountPercent ?? 10)))
  const maxUses = Math.max(1, Math.min(1000, Number(body.maxUses ?? 1)))

  let relatedProjectId: string | null = null
  if (body.relatedProjectId) {
    const p = await db.project.findUnique({ where: { id: body.relatedProjectId }, select: { id: true } })
    if (!p) return NextResponse.json({ error: "Related project not found" }, { status: 400 })
    relatedProjectId = p.id
  }

  let validUntil: Date | null = null
  if (body.validUntil) {
    const d = new Date(body.validUntil)
    if (!isNaN(d.getTime())) validUntil = d
  }

  // Optional description (free-form note)
  const description =
    typeof body.description === "string" && body.description.trim().length > 0
      ? body.description.trim().slice(0, 500)
      : null

  const created: Array<{
    id: string
    code: string
    ownerId: string
    discountPercent: number
    maxUses: number
    usedCount: number
    isExpired: boolean
    validFrom: string
    validUntil: string | null
    relatedProjectId: string | null
    description: string | null
  }> = []

  for (let i = 0; i < quantity; i++) {
    const code = await genUniqueCode(db)
    const rec = await db.referralCode.create({
      data: {
        ownerId,
        code,
        discountPercent,
        maxUses,
        usedCount: 0,
        validFrom: new Date(),
        validUntil,
        isExpired: false,
        relatedProjectId,
        description,
      },
    })
    created.push({
      id: rec.id,
      code: rec.code,
      ownerId: rec.ownerId,
      discountPercent: rec.discountPercent,
      maxUses: rec.maxUses,
      usedCount: rec.usedCount,
      isExpired: rec.isExpired,
      validFrom: iso(rec.validFrom)!,
      validUntil: iso(rec.validUntil),
      relatedProjectId: rec.relatedProjectId,
      description: rec.description,
    })
  }

  return NextResponse.json({ items: created }, { status: 201 })
}
