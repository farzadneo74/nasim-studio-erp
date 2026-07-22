import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { COMMISSION_TYPES, APPLY_ON, TECHNICAL_ROLES } from "@/lib/constants"

export const dynamic = "force-dynamic"

// Roles that can have salary rules: technical roles + sales (commissions).
const SALARY_ROLES = [...TECHNICAL_ROLES, "sales"]

export async function GET() {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const rules = await db.salaryRule.findMany({
    orderBy: [{ role: "asc" }, { applyOn: "asc" }],
  })

  return NextResponse.json(
    rules.map((r) => ({
      id: r.id,
      role: r.role,
      commissionType: r.commissionType,
      commissionValue: Number(r.commissionValue),
      applyOn: r.applyOn,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))
  )
}

export async function POST(req: NextRequest) {
  const role = await getCurrentRole()
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const ruleRole = String(body.role || "")
  if (!SALARY_ROLES.includes(ruleRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  }

  const commissionType = String(body.commissionType || "")
  if (!COMMISSION_TYPES.includes(commissionType as never)) {
    return NextResponse.json({ error: "Invalid commission type" }, { status: 400 })
  }

  const applyOn = String(body.applyOn || "")
  if (!APPLY_ON.includes(applyOn as never)) {
    return NextResponse.json({ error: "Invalid applyOn" }, { status: 400 })
  }

  const commissionValue = Number(body.commissionValue)
  if (!Number.isFinite(commissionValue) || commissionValue < 0) {
    return NextResponse.json({ error: "Invalid commission value" }, { status: 400 })
  }

  if (commissionType === "percent" && commissionValue > 100) {
    return NextResponse.json({ error: "Percent cannot exceed 100" }, { status: 400 })
  }

  const isActive = body.isActive === undefined ? true : Boolean(body.isActive)

  const created = await db.salaryRule.create({
    data: {
      role: ruleRole,
      commissionType,
      commissionValue,
      applyOn,
      isActive,
    },
  })

  return NextResponse.json(
    {
      id: created.id,
      role: created.role,
      commissionType: created.commissionType,
      commissionValue: Number(created.commissionValue),
      applyOn: created.applyOn,
      isActive: created.isActive,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    },
    { status: 201 }
  )
}

