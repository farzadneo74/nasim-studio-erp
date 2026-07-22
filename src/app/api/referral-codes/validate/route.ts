import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { hasPermission } from "@/lib/constants"

export const dynamic = "force-dynamic"

function iso(d: Date | null): string | null {
  return d ? d.toISOString() : null
}

// GET /api/referral-codes/validate?code=XXX
// Returns {valid:true, code, owner, relatedProject?} or {valid:false, reason:"not_found"|"expired"|"used_up"}
export async function GET(req: NextRequest) {
  const role = await getCurrentRole()
  if (!hasPermission(role, "scanner")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const code = (new URL(req.url).searchParams.get("code") || "").trim().toUpperCase()
  if (!code) {
    return NextResponse.json(
      { valid: false, reason: "not_found" },
      { status: 200 }
    )
  }

  const rec = await db.referralCode.findUnique({
    where: { code },
    include: {
      owner: { select: { id: true, name: true, phone: true, customerType: true } },
      relatedProject: {
        select: {
          id: true,
          status: true,
          contract: { select: { contractNumber: true, customer: { select: { name: true } } } },
          servicePackage: { select: { title: true, category: true } },
        },
      },
    },
  })

  if (!rec) {
    return NextResponse.json({ valid: false, reason: "not_found" })
  }

  const isUsedUp = rec.usedCount >= rec.maxUses
  const isExpiredFlag = rec.isExpired || (rec.validUntil ? new Date(rec.validUntil) < new Date() : false)

  if (isExpiredFlag) {
    return NextResponse.json({
      valid: false,
      reason: "expired",
      code: {
        id: rec.id,
        code: rec.code,
        discountPercent: rec.discountPercent,
        isExpired: true,
        usedCount: rec.usedCount,
        maxUses: rec.maxUses,
      },
      owner: rec.owner,
    })
  }
  if (isUsedUp) {
    return NextResponse.json({
      valid: false,
      reason: "used_up",
      code: {
        id: rec.id,
        code: rec.code,
        discountPercent: rec.discountPercent,
        isExpired: false,
        usedCount: rec.usedCount,
        maxUses: rec.maxUses,
      },
      owner: rec.owner,
    })
  }

  return NextResponse.json({
    valid: true,
    reason: "ok",
    code: {
      id: rec.id,
      code: rec.code,
      discountPercent: rec.discountPercent,
      isExpired: false,
      usedCount: rec.usedCount,
      maxUses: rec.maxUses,
      validFrom: iso(rec.validFrom),
      validUntil: iso(rec.validUntil),
      relatedProjectId: rec.relatedProjectId,
    },
    owner: rec.owner,
    relatedProject: rec.relatedProject
      ? {
          id: rec.relatedProject.id,
          status: rec.relatedProject.status,
          contractNumber: rec.relatedProject.contract.contractNumber,
          customerName: rec.relatedProject.contract.customer.name,
          packageTitle: rec.relatedProject.servicePackage.title,
          category: rec.relatedProject.servicePackage.category,
        }
      : null,
  })
}

