import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"

type Ctx = { params: Promise<{ id: string }> }

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export async function PATCH(req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return forbidden()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { isPaid, note, paidAt } = body as {
    isPaid?: boolean
    note?: string | null
    paidAt?: string | null
  }

  if (isPaid === undefined && note === undefined && paidAt === undefined) {
    return NextResponse.json(
      { error: "isPaid, note or paidAt is required" },
      { status: 400 }
    )
  }

  const existing = await db.salaryRecord.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Salary record not found" }, { status: 404 })
  }

  const data: Record<string, unknown> = {}

  if (isPaid !== undefined) {
    data.isPaid = Boolean(isPaid)
    // Auto-stamp paidAt when transitioning to paid. If toggled back to unpaid,
    // clear the paidAt timestamp.
    if (Boolean(isPaid) && !existing.isPaid) {
      data.paidAt = new Date()
    } else if (!isPaid) {
      data.paidAt = null
    }
  }

  // Allow explicit paidAt override (rarely used — keeps API flexible).
  if (paidAt !== undefined) {
    data.paidAt = paidAt ? new Date(paidAt) : null
  }

  if (note !== undefined) {
    data.note =
      typeof note === "string" && note.trim() ? note.trim() : null
  }

  const updated = await db.salaryRecord.update({ where: { id }, data })

  return NextResponse.json({
    id: updated.id,
    isPaid: updated.isPaid,
    note: updated.note,
    period: updated.period,
    paidAt: updated.paidAt,
  })
}

