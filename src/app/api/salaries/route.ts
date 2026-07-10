import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export async function GET(req: Request) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return forbidden()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const url = new URL(req.url)
  const userId = url.searchParams.get("userId")
  const isPaid = url.searchParams.get("isPaid")
  const period = url.searchParams.get("period")
  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")

  const where: Record<string, unknown> = {}
  if (userId) where.userId = userId
  if (isPaid === "true") where.isPaid = true
  if (isPaid === "false") where.isPaid = false
  if (period) where.period = period
  // Date range applies to createdAt (the period the record represents is
  // captured by the `period` field; the from/to here filter by creation date).
  if (from || to) {
    where.createdAt = {}
    if (from) (where.createdAt as { gte?: Date }).gte = new Date(from)
    if (to) (where.createdAt as { lte?: Date }).lte = new Date(to)
  }

  const records = await db.salaryRecord.findMany({
    where,
    include: {
      user: true,
      project: {
        include: {
          contract: { include: { customer: true } },
          servicePackage: true,
        },
      },
      ruleUsed: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(
    records.map((r) => ({
      id: r.id,
      userId: r.userId,
      amount: Number(r.amount),
      isPaid: r.isPaid,
      period: r.period,
      note: r.note,
      paidAt: r.paidAt,
      createdAt: r.createdAt,
      user: {
        id: r.user.id,
        firstName: r.user.firstName,
        lastName: r.user.lastName,
        role: r.user.role,
        name: `${r.user.firstName} ${r.user.lastName}`,
      },
      project: {
        id: r.project.id,
        customer: r.project.contract.customer.name,
        servicePackage: r.project.servicePackage.title,
      },
      ruleUsed: {
        id: r.ruleUsed.id,
        role: r.ruleUsed.role,
        commissionType: r.ruleUsed.commissionType,
        commissionValue: Number(r.ruleUsed.commissionValue),
        applyOn: r.ruleUsed.applyOn,
      },
    }))
  )
}
