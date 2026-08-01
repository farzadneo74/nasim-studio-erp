import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb, getCurrentStudioUserId } from "@/lib/auth-helpers"

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
  const { isPaid, note, paidAt, isSettled, tags } = body as {
    isPaid?: boolean
    note?: string | null
    paidAt?: string | null
    isSettled?: boolean
    tags?: string[]
  }

  if (isPaid === undefined && note === undefined && paidAt === undefined && isSettled === undefined && tags === undefined) {
    return NextResponse.json(
      { error: "isPaid, note, paidAt, isSettled or tags is required" },
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

  // ✅ isSettled support — when transitioning to settled, stamp settledAt.
  if (isSettled !== undefined) {
    data.isSettled = Boolean(isSettled)
    if (Boolean(isSettled) && !(existing as any).isSettled) {
      data.settledAt = new Date()
    } else if (!isSettled) {
      data.settledAt = null
    }
  }

  // ✅ tags support (JSON array of strings).
  if (tags !== undefined) {
    const tagArr = Array.isArray(tags)
      ? tags.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim())
      : []
    try { data.tags = JSON.stringify(tagArr) } catch { /* ignore */ }
  }

  let updated: any
  try {
    updated = await db.salaryRecord.update({ where: { id }, data })
  } catch {
    // Fallback: drop the new fields if the runtime client doesn't have them yet.
    const { tags: _t, isSettled: _s, settledAt: _sa, ...rest } = data
    updated = await db.salaryRecord.update({ where: { id }, data: rest })
  }

  return NextResponse.json({
    id: updated.id,
    isPaid: updated.isPaid,
    note: updated.note,
    period: updated.period,
    paidAt: updated.paidAt,
    isSettled: (updated as any).isSettled ?? false,
    settledAt: (updated as any).settledAt ?? null,
  })
}

