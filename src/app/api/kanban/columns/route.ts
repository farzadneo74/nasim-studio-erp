import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentRole } from "@/lib/auth-helpers"
import { getCurrentStudioUserId } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

export async function GET() {
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ columns: [] })
  // دریافت شناسه کاربر استودیو (نه master DB)
  const userId = await getCurrentStudioUserId() ?? "demo:admin"
  let cols = await db.kanbanColumn.findMany({ where: { userId }, orderBy: { order: "asc" }, include: { cards: { orderBy: { order: "asc" } } } })

  // ✅ Auto-create the two fixed/system columns if missing:
  //   - "در صف" must always exist (it's the entry column for workflow cards).
  //   - "انجام شده" must always exist (it's the done column for completion notifications).
  const QUEUE_TITLE = "در صف"
  const DONE_TITLE = "انجام شده"
  const hasQueue = cols.some((c) => c.title.trim() === QUEUE_TITLE)
  const hasDone = cols.some((c) => c.title.trim() === DONE_TITLE)
  if (cols.length === 0) {
    // First-time setup: create the standard 3-column board.
    const defaults = [
      { title: QUEUE_TITLE, color: "#64748b" },
      { title: "در حال انجام", color: "#f59e0b" },
      { title: DONE_TITLE, color: "#22c55e" },
    ]
    for (let i = 0; i < defaults.length; i++) {
      await db.kanbanColumn.create({ data: { userId, title: defaults[i].title, color: defaults[i].color, order: i } })
    }
    cols = await db.kanbanColumn.findMany({ where: { userId }, orderBy: { order: "asc" }, include: { cards: { orderBy: { order: "asc" } } } })
  } else if (!hasQueue || !hasDone) {
    // Some columns exist but the fixed ones are missing — recreate them.
    if (!hasQueue) {
      // Place at the smallest order so it sorts first; we'll normalize orders below.
      await db.kanbanColumn.create({ data: { userId, title: QUEUE_TITLE, color: "#64748b", order: -1 } })
    }
    if (!hasDone) {
      const maxOrder = cols.reduce((m, c) => Math.max(m, c.order), 0)
      await db.kanbanColumn.create({ data: { userId, title: DONE_TITLE, color: "#22c55e", order: maxOrder + 1 } })
    }
    cols = await db.kanbanColumn.findMany({ where: { userId }, orderBy: { order: "asc" }, include: { cards: { orderBy: { order: "asc" } } } })
  }

  // ✅ Normalize ordering: "در صف" → order 0, "انجام شده" → order (last).
  // Middle columns keep their relative order between 1 and (n-2).
  // We do this on every GET so the contract ("first" / "last") is always honored
  // even if an older client PATCHed the order field directly.
  {
    const queueCol = cols.find((c) => c.title.trim() === QUEUE_TITLE)
    const doneCol = cols.find((c) => c.title.trim() === DONE_TITLE)
    const middleCols = cols.filter((c) => c !== queueCol && c !== doneCol)
    const expectedOrder: { id: string; order: number }[] = []
    if (queueCol) expectedOrder.push({ id: queueCol.id, order: 0 })
    middleCols.forEach((c, i) => expectedOrder.push({ id: c.id, order: i + 1 }))
    if (doneCol) expectedOrder.push({ id: doneCol.id, order: middleCols.length + 1 })

    // Persist any mismatched orders (cheap: usually 0–3 small updates).
    for (const e of expectedOrder) {
      const c = cols.find((x) => x.id === e.id)
      if (c && c.order !== e.order) {
        await db.kanbanColumn.update({ where: { id: e.id }, data: { order: e.order } })
        c.order = e.order
      }
    }
    // Re-sort by the (possibly updated) order so the response is correct.
    cols = [...cols].sort((a, b) => a.order - b.order)
  }

  return NextResponse.json({ columns: cols.map((c) => ({
    id: c.id, title: c.title, color: c.color, order: c.order,
    cards: c.cards.map((card) => ({
      id: card.id, columnId: card.columnId, title: card.title, description: card.description,
      order: card.order, priority: card.priority,
      dueDate: card.dueDate ? card.dueDate.toISOString() : null,
      labels: (() => { try { return JSON.parse(card.labels) } catch { return [] } })(),
      linkType: card.linkType, linkId: card.linkId, completed: card.completed,
      assignedToName: card.assignedToName, notifyUserId: card.notifyUserId, notifyUserName: card.notifyUserName,
      notifiedAt: card.notifiedAt ? card.notifiedAt.toISOString() : null,
      sourceProjectId: card.sourceProjectId, sourceCustomerId: card.sourceCustomerId,
      createdAt: card.createdAt.toISOString(), updatedAt: card.updatedAt.toISOString(),
    })),
  })) })
}

export async function POST(req: NextRequest) {
  const role = await getCurrentRole()
  if (!["admin", "manager", "sales"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  // دریافت شناسه کاربر استودیو (نه master DB)
  const userId = await getCurrentStudioUserId() ?? "demo:admin"
  const body = await req.json().catch(() => ({}))
  const title = String(body.title || "").trim()
  if (!title) return NextResponse.json({ error: "عنوان الزامی" }, { status: 400 })
  const count = await db.kanbanColumn.count({ where: { userId } })
  const col = await db.kanbanColumn.create({ data: { userId, title, color: body.color || "#64748b", order: count } })
  return NextResponse.json({ id: col.id, title: col.title, color: col.color, order: col.order, cards: [] }, { status: 201 })
}

