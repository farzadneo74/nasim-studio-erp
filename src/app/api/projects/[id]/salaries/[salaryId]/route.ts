import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb, getCurrentStudioUserId } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string; salaryId: string }> }

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

/**
 * PATCH /api/projects/[id]/salaries/[salaryId]
 * Body: { amount?, description?, tags?, isSettled? }
 * - When isSettled transitions false -> true, stamp settledAt + settledById.
 * - When isSettled transitions true -> false, clear settledAt + settledById.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return forbidden()
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id, salaryId } = await params
  const body = await req.json().catch(() => ({}))
  const { amount, description, tags, isSettled } = body as {
    amount?: number
    description?: string | null
    tags?: string[]
    isSettled?: boolean
  }

  if (amount === undefined && description === undefined && tags === undefined && isSettled === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  const existing = await db.projectSalary.findUnique({ where: { id: salaryId } })
  if (!existing) return NextResponse.json({ error: "Salary not found" }, { status: 404 })
  // Allow `id === "any"` as a sentinel for cross-project settlement views
  // (e.g. the Employees > تاریخچه حقوق tab marks items settled without
  // knowing the projectId). Otherwise the URL projectId must match the row's
  // projectId.
  if (id !== "any" && existing.projectId !== id) {
    return NextResponse.json({ error: "Salary does not belong to this project" }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (amount !== undefined) {
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json({ error: "amount must be a positive number (Rials)" }, { status: 400 })
    }
    data.amount = amt
  }
  if (description !== undefined) {
    data.description = (typeof description === "string" && description.trim()) ? description.trim() : null
  }
  if (tags !== undefined) {
    const tagArr = Array.isArray(tags)
      ? tags.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim())
      : []
    data.tags = JSON.stringify(tagArr)
  }
  if (isSettled !== undefined) {
    const willSettle = Boolean(isSettled)
    data.isSettled = willSettle
    if (willSettle && !existing.isSettled) {
      const settledById = await getCurrentStudioUserId()
      data.settledAt = new Date()
      if (settledById) data.settledById = settledById
    } else if (!willSettle && existing.isSettled) {
      data.settledAt = null
      data.settledById = null
    }
  }

  const updated = await db.projectSalary.update({ where: { id: salaryId }, data })

  let updatedTags: string[] = []
  try { updatedTags = JSON.parse(updated.tags) } catch { updatedTags = [] }

  return NextResponse.json({
    id: updated.id,
    projectId: updated.projectId,
    userId: updated.userId,
    amount: Number(updated.amount),
    description: updated.description,
    tags: updatedTags,
    isSettled: updated.isSettled,
    settledAt: updated.settledAt,
    settledById: updated.settledById,
    updatedAt: updated.updatedAt,
  })
}

/**
 * DELETE /api/projects/[id]/salaries/[salaryId]
 */
export async function DELETE(_req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return forbidden()
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id, salaryId } = await params

  const existing = await db.projectSalary.findUnique({ where: { id: salaryId } })
  if (!existing) return NextResponse.json({ error: "Salary not found" }, { status: 404 })
  if (id !== "any" && existing.projectId !== id) {
    return NextResponse.json({ error: "Salary does not belong to this project" }, { status: 400 })
  }

  await db.projectSalary.delete({ where: { id: salaryId } })
  return NextResponse.json({ ok: true })
}
