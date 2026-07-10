import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentRole } from "@/lib/auth-helpers"
import { getCurrentStudioUserId } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"
type Ctx = { params: Promise<{ id: string }> }

// POST /api/kanban/columns/[id]/cards
// Create a new card in the given column.
export async function POST(req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  if (!["admin", "manager", "sales"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  
  const userId = await getCurrentStudioUserId() ?? "demo:admin"

  const { id: columnId } = await params
  const body = await req.json().catch(() => ({}))
  const title = String(body.title || "").trim()
  if (!title) return NextResponse.json({ error: "عنوان الزامی است" }, { status: 400 })

  // Make sure the column belongs to the user
  const col = await db.kanbanColumn.findUnique({ where: { id: columnId } })
  if (!col || col.userId !== userId) {
    return NextResponse.json({ error: "ستون یافت نشد" }, { status: 404 })
  }

  const description = typeof body.description === "string" ? body.description.trim() || null : null
  const priority = typeof body.priority === "string" && body.priority ? body.priority : "none"
  let dueDate: Date | null = null
  if (typeof body.dueDate === "string" && body.dueDate) {
    const d = new Date(body.dueDate)
    if (!Number.isNaN(d.getTime())) dueDate = d
  }
  let labels: string[] = []
  if (Array.isArray(body.labels)) {
    labels = body.labels.map((l: unknown) => String(l).trim()).filter(Boolean)
  }
  const linkType = typeof body.linkType === "string" && body.linkType ? body.linkType : null
  const linkId = typeof body.linkId === "string" && body.linkId ? body.linkId : null
  const sourceProjectId = typeof body.sourceProjectId === "string" && body.sourceProjectId ? body.sourceProjectId : null
  const sourceCustomerId = typeof body.sourceCustomerId === "string" && body.sourceCustomerId ? body.sourceCustomerId : null
  const assignedToName = typeof body.assignedToName === "string" && body.assignedToName ? body.assignedToName : null

  const count = await db.kanbanCard.count({ where: { columnId } })
  const card = await db.kanbanCard.create({
    data: {
      columnId,
      userId,
      title,
      description,
      priority,
      dueDate,
      labels: JSON.stringify(labels),
      linkType,
      linkId,
      sourceProjectId,
      sourceCustomerId,
      assignedToName,
      order: count,
    },
  })

  return NextResponse.json(
    {
      id: card.id,
      columnId: card.columnId,
      title: card.title,
      description: card.description,
      order: card.order,
      priority: card.priority,
      dueDate: card.dueDate ? card.dueDate.toISOString() : null,
      labels,
      linkType: card.linkType,
      linkId: card.linkId,
      completed: card.completed,
      assignedToName: card.assignedToName,
      notifyUserId: card.notifyUserId,
      notifyUserName: card.notifyUserName,
      notifiedAt: card.notifiedAt ? card.notifiedAt.toISOString() : null,
      sourceProjectId: card.sourceProjectId,
      sourceCustomerId: card.sourceCustomerId,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
    },
    { status: 201 }
  )
}
