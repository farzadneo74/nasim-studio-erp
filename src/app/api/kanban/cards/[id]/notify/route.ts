import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentRole, getCurrentUser } from "@/lib/auth-helpers"
import { db as defaultDb } from "@/lib/db"

export const dynamic = "force-dynamic"
type Ctx = { params: Promise<{ id: string }> }

// POST /api/kanban/cards/[id]/notify
// Mark a card as completed and send a notification to the chosen user.
// If the card is linked to a project, also creates a ProjectNote.
//
// Body: { notifyUserId: string, notifyUserName?: string, projectNoteContent?: string }
//   - notifyUserId: target studio user id (required)
//   - notifyUserName: target user's full name (optional, denormalized for display)
//   - projectNoteContent: optional override for the note content; default uses card title.
//
// DB strategy:
//   - The KanbanCard + ProjectNote live in the studio DB (getCurrentStudioDb()).
//   - The Notification is written to the DEFAULT db (lib/db.ts → custom.db), matching
//     the existing /api/notifications route and lib/notify.ts helpers so the bell
//     dropdown (which reads from custom.db) sees the notification.
export async function POST(req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  if (!["admin", "manager", "sales"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const studioDb = await getCurrentStudioDb()
  if (!studioDb) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const user = await getCurrentUser()
  const userId = user?.userId ?? "demo:admin"

  const { id } = await params
  const card = await studioDb.kanbanCard.findUnique({ where: { id } })
  if (!card || card.userId !== userId) {
    return NextResponse.json({ error: "کارت یافت نشد" }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const notifyUserId = typeof body.notifyUserId === "string" ? body.notifyUserId.trim() : ""
  if (!notifyUserId) {
    return NextResponse.json({ error: "گیرنده اعلان الزامی است" }, { status: 400 })
  }

  // Resolve the target user's name from the studio DB if we don't have it.
  let notifyUserName = typeof body.notifyUserName === "string" ? body.notifyUserName.trim() : ""
  if (!notifyUserName) {
    const u = await studioDb.user.findUnique({
      where: { id: notifyUserId },
      select: { firstName: true, lastName: true },
    })
    if (u) notifyUserName = `${u.firstName} ${u.lastName}`.trim()
  }

  // Update the card: mark complete, record notifiedAt + target user.
  const updated = await studioDb.kanbanCard.update({
    where: { id },
    data: {
      completed: true,
      notifiedAt: new Date(),
      notifyUserId,
      notifyUserName: notifyUserName || null,
    },
  })

  // Compose a friendly message.
  const cardTitle = card.title
  const noteContent =
    typeof body.projectNoteContent === "string" && body.projectNoteContent.trim()
      ? body.projectNoteContent.trim()
      : `✅ کارت «${cardTitle}» تکمیل شد.`

  // 1) Create a Notification for the target user (targeted).
  //    Written to the DEFAULT db so the bell dropdown (which reads from default db)
  //    sees it — matches notify.ts convention.
  try {
    // Resolve the current user's display name (the completer) from the studio DB.
    let completerName = user?.name || "کاربر"
    if (role) {
      const me = await studioDb.user.findFirst({ where: { role }, select: { firstName: true, lastName: true } })
      if (me) completerName = `${me.firstName} ${me.lastName}`.trim() || completerName
    }
    await defaultDb.notification.create({
      data: {
        type: "info",
        title: "کارت کانبان تکمیل شد",
        message: `${completerName}: «${cardTitle}»${card.description ? " — " + card.description : ""}`,
        userId: notifyUserId,
        link: "my-tasks",
        refId: card.id,
      },
    })
  } catch {
    /* best-effort */
  }

  // 2) If the card is linked to a project, also create a ProjectNote.
  //    ProjectNotes live in the DEFAULT db (custom.db) — same as the projects +
  //    projects/[id]/notes APIs — so the note shows up in the project's notes tab.
  //    Supports both legacy single-link (`linkType:"project"`) and the multi-link
  //    JSON shape (`linkType:"multi"`, `linkId` = JSON.stringify({customerId, projectId})).
  let linkedProjectId: string | null = null
  if (card.linkType === "project" && card.linkId) {
    linkedProjectId = card.linkId
  } else if (card.linkType === "multi" && card.linkId) {
    try {
      const parsed = JSON.parse(card.linkId) as { projectId?: unknown }
      if (typeof parsed.projectId === "string" && parsed.projectId) {
        linkedProjectId = parsed.projectId
      }
    } catch {
      /* ignore malformed JSON */
    }
  }
  if (linkedProjectId) {
    try {
      const me = await defaultDb.user.findFirst({ where: { role }, select: { id: true } })
      if (me) {
        // Make sure the project exists in the default db (avoid FK error if stale link).
        const project = await defaultDb.project.findUnique({ where: { id: linkedProjectId }, select: { id: true } })
        if (project) {
          await defaultDb.projectNote.create({
            data: {
              projectId: linkedProjectId,
              authorId: me.id,
              noteType: "text",
              content: noteContent,
            },
          })
        }
      }
    } catch {
      /* best-effort */
    }
  }

  return NextResponse.json({
    ok: true,
    id: updated.id,
    completed: updated.completed,
    notifyUserId: updated.notifyUserId,
    notifyUserName: updated.notifyUserName,
    notifiedAt: updated.notifiedAt ? updated.notifiedAt.toISOString() : null,
  })
}

