import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentRole, getCurrentUser, getCurrentStudioUserId } from "@/lib/auth-helpers"
import { db as defaultDb } from "@/lib/db"

export const dynamic = "force-dynamic"
type Ctx = { params: Promise<{ id: string }> }

// ✅ "انجام شده" is the system "done" column. Moving a card into it auto-marks
// the card as completed and notifies the configured recipient.
const DONE_COLUMN_TITLE = "انجام شده"

// PATCH /api/kanban/cards/[id]
// Update a card: title/description/priority/dueDate/labels/link/order/columnId/completed.
// When `completed: true` is passed, `completedAt` (notifiedAt) is NOT set here — that
// happens via the dedicated `/notify` endpoint so we always pair completion with a
// notification. If you want to silently mark complete without notifying, send
// `completed: true` here (e.g. uncheck + recheck) — the field just flips.
//
// ✅ NEW: When a card is moved to the "انجام شده" column, the card is automatically
// marked complete and a notification is sent to the card's `notifyUserId` (if set)
// or — when the card has a `sourceProjectId` — to the user who assigned the
// workflow stage (resolved from ProjectWorkflow rows for that project).
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

  // ✅ Detect move into "انجام شده" column. If so, mark complete + notify.
  let movedToDone = false
  let targetColumnTitle: string | null = null
  if (typeof body.columnId === "string" && body.columnId && body.columnId !== card.columnId) {
    data.columnId = body.columnId
    // Look up the target column's title to see if it's the "done" column.
    try {
      const targetCol = await db.kanbanColumn.findUnique({
        where: { id: body.columnId },
        select: { title: true, userId: true },
      })
      if (targetCol) {
        targetColumnTitle = targetCol.title
        if (targetCol.title.trim() === DONE_COLUMN_TITLE) {
          movedToDone = true
          data.completed = true
          data.notifiedAt = new Date()
        }
      }
    } catch { /* ignore */ }
  }

  if (typeof body.completed === "boolean") data.completed = body.completed
  // Allow clearing notify fields when uncompleting (null = clear).
  if (body.notifyUserId === null || typeof body.notifyUserId === "string") {
    data.notifyUserId = body.notifyUserId || null
  }
  if (body.notifyUserName === null || typeof body.notifyUserName === "string") {
    data.notifyUserName = body.notifyUserName || null
  }

  const updated = await db.kanbanCard.update({ where: { id }, data })

  // ✅ Auto-notify when moved to the "done" column.
  if (movedToDone) {
    try {
      // Resolve the notification recipient:
      // 1) card.notifyUserId (the workflow assigner — pre-set when the card was
      //    created by PUT /api/projects/[id]/workflow; this is "who assigned the
      //    workflow task").
      // 2) the workflow assigner for the card's source project (if linked) — we
      //    approximate this by looking up the first admin/manager when no
      //    notifyUserId is set.
      let recipientId: string | null = card.notifyUserId ?? null
      let recipientName: string | null = card.notifyUserName ?? null
      if (!recipientId && (card.sourceProjectId || (card.linkType === "project" && card.linkId))) {
        try {
          const admin = await db.user.findFirst({
            where: { OR: [{ role: "admin" }, { role: "manager" }] },
            select: { id: true, firstName: true, lastName: true },
          })
          if (admin) {
            recipientId = admin.id
            recipientName = `${admin.firstName} ${admin.lastName}`.trim()
          }
        } catch { /* ignore */ }
      }

      // Persist the resolved recipient on the card.
      if (recipientId) {
        try {
          await db.kanbanCard.update({
            where: { id },
            data: { notifyUserId: recipientId, notifyUserName: recipientName },
          })
        } catch { /* ignore */ }
      }

      // ✅ Resolve the linked project (if any) so we can include the project name
      // in the notification message. Supports both legacy `sourceProjectId` and
      // the newer `linkType: "project"` + `linkId` shape.
      let linkedProjectId: string | null = null
      if (card.linkType === "project" && card.linkId) {
        linkedProjectId = card.linkId
      } else if (card.linkType === "multi" && card.linkId) {
        try {
          const parsed = JSON.parse(card.linkId) as { projectId?: unknown }
          if (typeof parsed.projectId === "string" && parsed.projectId) {
            linkedProjectId = parsed.projectId
          }
        } catch { /* ignore malformed JSON */ }
      } else if (card.sourceProjectId) {
        linkedProjectId = card.sourceProjectId
      }

      let projectName: string | null = null
      if (linkedProjectId) {
        try {
          const project = await defaultDb.project.findUnique({
            where: { id: linkedProjectId },
            include: {
              servicePackage: { select: { title: true } },
              contract: { select: { contractNumber: true } },
            },
          })
          if (project) {
            projectName = project.servicePackage?.title || project.contract?.contractNumber || null
          }
        } catch { /* best-effort */ }
      }

      // ✅ Compose + send the notification (to the DEFAULT db so the bell dropdown sees it).
      // Message format per FIXES-7B spec:
      //   کار "{cardTitle}" انجام شد
      // and when the card links to a project, include the project name:
      //   کار "{cardTitle}" (پروژه: {projectName}) انجام شد
      try {
        const authUser = await getCurrentUser()
        let completerName = authUser?.name || "کاربر"
        if (role) {
          const me = await db.user.findFirst({ where: { role }, select: { firstName: true, lastName: true } })
          if (me) completerName = `${me.firstName} ${me.lastName}`.trim() || completerName
        }
        const baseMsg = `کار «${card.title}» انجام شد`
        const msg = projectName
          ? `${baseMsg} (پروژه: ${projectName}) — ${completerName}`
          : `${baseMsg} — ${completerName}`
        await defaultDb.notification.create({
          data: {
            type: "info",
            title: "کار انجام شد",
            message: msg,
            userId: recipientId ?? undefined,
            link: "my-tasks",
            refId: card.id,
          },
        })
      } catch { /* best-effort */ }

      // If the card is linked to a project, also drop a ProjectNote.
      if (linkedProjectId) {
        try {
          const me = await defaultDb.user.findFirst({ where: { role }, select: { id: true } })
          if (me) {
            const project = await defaultDb.project.findUnique({
              where: { id: linkedProjectId },
              select: { id: true },
            })
            if (project) {
              await defaultDb.projectNote.create({
                data: {
                  projectId: linkedProjectId,
                  authorId: me.id,
                  noteType: "text",
                  content: `✅ کارت «${card.title}» تکمیل شد.`,
                },
              })
            }
          }
        } catch { /* best-effort */ }
      }
    } catch { /* best-effort — never block the card update */ }
  }

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

