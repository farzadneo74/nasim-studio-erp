import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { COMMISSION_TYPES, APPLY_ON } from "@/lib/constants"

export const dynamic = "force-dynamic"

const SALARY_ROLES = ["photographer", "editor", "logistics"]

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole()
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const existing = await db.salaryRule.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Salary rule not found" }, { status: 404 })
  }

  const data: Record<string, unknown> = {}

  if (typeof body.role === "string") {
    if (!SALARY_ROLES.includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }
    data.role = body.role
  }

  if (typeof body.commissionType === "string") {
    if (!COMMISSION_TYPES.includes(body.commissionType as never)) {
      return NextResponse.json({ error: "Invalid commission type" }, { status: 400 })
    }
    data.commissionType = body.commissionType
  }

  if (typeof body.applyOn === "string") {
    if (!APPLY_ON.includes(body.applyOn as never)) {
      return NextResponse.json({ error: "Invalid applyOn" }, { status: 400 })
    }
    data.applyOn = body.applyOn
  }

  if (body.commissionValue !== undefined) {
    const v = Number(body.commissionValue)
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: "Invalid commission value" }, { status: 400 })
    }
    const type = (data.commissionType as string) || existing.commissionType
    if (type === "percent" && v > 100) {
      return NextResponse.json({ error: "Percent cannot exceed 100" }, { status: 400 })
    }
    data.commissionValue = v
  }

  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive
  }

  const updated = await db.salaryRule.update({ where: { id }, data })

  return NextResponse.json({
    id: updated.id,
    role: updated.role,
    commissionType: updated.commissionType,
    commissionValue: Number(updated.commissionValue),
    applyOn: updated.applyOn,
    isActive: updated.isActive,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole()
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params

  const existing = await db.salaryRule.findUnique({
    where: { id },
    select: { id: true, salaryRecords: { select: { id: true }, take: 1 } },
  })
  if (!existing) {
    return NextResponse.json({ error: "Salary rule not found" }, { status: 404 })
  }

  if (existing.salaryRecords.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete a salary rule that has already generated salary records" },
      { status: 409 }
    )
  }

  await db.salaryRule.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
