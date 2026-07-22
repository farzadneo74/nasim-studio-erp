import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

function iso(d: Date | null): string | null {
  return d ? d.toISOString() : null
}

interface PatchBody {
  isExpired?: boolean
  validUntil?: string | null
  maxUses?: number
  discountPercent?: number
}

// PATCH /api/referral-codes/[id] {isExpired?, validUntil?, maxUses?, discountPercent?}
// RBAC: admin/manager only.
export async function PATCH(req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params
  const existing = await db.referralCode.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = (await req.json().catch(() => ({}))) as PatchBody
  const data: Record<string, unknown> = {}
  if (typeof body.isExpired === "boolean") data.isExpired = body.isExpired
  if (body.validUntil !== undefined) {
    data.validUntil = body.validUntil ? new Date(body.validUntil) : null
  }
  if (body.maxUses !== undefined) {
    const n = Number(body.maxUses)
    if (!Number.isNaN(n) && n >= 1) data.maxUses = n
  }
  if (body.discountPercent !== undefined) {
    const n = Number(body.discountPercent)
    if (!Number.isNaN(n) && n >= 0 && n <= 100) data.discountPercent = n
  }

  const updated = await db.referralCode.update({
    where: { id },
    data,
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
  })

  const isUsedUp = updated.usedCount >= updated.maxUses
  return NextResponse.json({
    id: updated.id,
    code: updated.code,
    ownerId: updated.ownerId,
    owner: updated.owner,
    discountPercent: updated.discountPercent,
    maxUses: updated.maxUses,
    usedCount: updated.usedCount,
    isExpired: updated.isExpired,
    validFrom: iso(updated.validFrom),
    validUntil: iso(updated.validUntil),
    relatedProjectId: updated.relatedProjectId,
    relatedProject: updated.relatedProject
      ? {
          id: updated.relatedProject.id,
          contractNumber: updated.relatedProject.contract.contractNumber,
          customerName: updated.relatedProject.contract.customer.name,
          packageTitle: updated.relatedProject.servicePackage.title,
        }
      : null,
    statusLabel: updated.isExpired ? "expired" : isUsedUp ? "used" : "available",
  })
}

