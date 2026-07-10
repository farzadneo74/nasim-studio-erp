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
  if (cols.length === 0) {
    const defaults = [
      { title: "در صف", color: "#64748b" },
      { title: "در حال انجام", color: "#f59e0b" },
      { title: "انجام شده", color: "#22c55e" },
    ]
    for (let i = 0; i < defaults.length; i++) {
      await db.kanbanColumn.create({ data: { userId, title: defaults[i].title, color: defaults[i].color, order: i } })
    }
    cols = await db.kanbanColumn.findMany({ where: { userId }, orderBy: { order: "asc" }, include: { cards: { orderBy: { order: "asc" } } } })
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
