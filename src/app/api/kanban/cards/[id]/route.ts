import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentRole } from "@/lib/auth-helpers"
import { getCurrentStudioUserId } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"
type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/kanban/cards/[id]
// Update a card: title/description/priority/dueDate/labels/link/order/columnId/completed.
// When `completed: true` is passed, `completedAt` (notifiedAt) is NOT set here — that
// happens via the dedicated `/notify` endpoint so we always pair completion with a
// notification. If you want to silently mark complete without notifying, send
// `completed: true` here (e.g. uncheck + recheck) — the field just flips.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  if (!["admin", "manager", "sales"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  
  const userId = await getCurrentStudioUserId() ?? "demo:admin"

  const { id } = await params
  const card = await db.kanbanCard.findUnique({ where: { id } })
  if (!card || card.userId !== userId) {
    return NextResponse.json({ error: "کارت یافت نشد" }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}

  if (typeof body.title === "string") {
    const t = body.title.trim()
    if (!t) return NextResponse.json({ error: "عنوان نمی‌تواند خالی باشد" }, { status: 400 })
    data.title = t
  }
  if (typeof body.description === "string") data.description = body.description.trim() || null
  if (typeof body.priority === "string") data.priority = body.priority || "none"
  if (body.dueDate === null) {
    data.dueDate = null
  } else if (typeof body.dueDate === "string" && body.dueDate) {
    const d = new Date(body.dueDate)
    if (!Number.isNaN(d.getTime())) data.dueDate = d
  }
  if (Array.isArray(body.labels)) {
    const labels = body.labels.map((l: unknown) => String(l).trim()).filter(Boolean)
    data.labels = JSON.stringify(labels)
  }
  if (typeof body.linkType === "string") data.linkType = body.linkType || null
  if (typeof body.linkId === "string") data.linkId = body.linkId || null
  if (typeof body.assignedToName === "string") data.assignedToName = body.assignedToName || null
  if (typeof body.order === "number") data.order = body.order
  if (typeof body.columnId === "string" && body.columnId) data.columnId = body.columnId
  if (typeof body.completed === "boolean") data.completed = body.completed
  // Allow clearing notify fields when uncompleting (null = clear).
  if (body.notifyUserId === null || typeof body.notifyUserId === "string") {
    data.notifyUserId = body.notifyUserId || null
  }
  if (body.notifyUserName === null || typeof body.notifyUserName === "string") {
    data.notifyUserName = body.notifyUserName || null
  }

  const updated = await db.kanbanCard.update({ where: { id }, data })
  return NextResponse.json({
    id: updated.id,
    columnId: updated.columnId,
    title: updated.title,
    description: updated.description,
    order: updated.order,
    priority: updated.priority,
    dueDate: updated.dueDate ? updated.dueDate.toISOString() : null,
    labels: (() => {
      try {
        return JSON.parse(updated.labels)
      } catch {
        return []
      }
    })(),
    linkType: updated.linkType,
    linkId: updated.linkId,
    completed: updated.completed,
    assignedToName: updated.assignedToName,
    notifyUserId: updated.notifyUserId,
    notifyUserName: updated.notifyUserName,
    notifiedAt: updated.notifiedAt ? updated.notifiedAt.toISOString() : null,
    sourceProjectId: updated.sourceProjectId,
    sourceCustomerId: updated.sourceCustomerId,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  })
}

// DELETE /api/kanban/cards/[id]
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  if (!["admin", "manager", "sales"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  
  const userId = await getCurrentStudioUserId() ?? "demo:admin"

  const { id } = await params
  const card = await db.kanbanCard.findUnique({ where: { id } })
  if (!card || card.userId !== userId) {
    return NextResponse.json({ error: "کارت یافت نشد" }, { status: 404 })
  }
  await db.kanbanCard.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

