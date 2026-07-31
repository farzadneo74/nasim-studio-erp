import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentRole, getCurrentUser, getCurrentStudioUserId } from "@/lib/auth-helpers"

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
// ⚠️ SECURITY FIX: همه‌ی نوشته‌ها (Notification, ProjectNote) حالا در دیتابیس استودیوی
// فعلی نوشته می‌شوند، نه دیتابیس پیش‌فرض. این از نشت داده بین استودیوها جلوگیری می‌کند.
export async function POST(req: NextRequest, { params }: Ctx) {
  // بررسی احراز هویت
  const role = await getCurrentRole()
  if (!role) {
    return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
  }
  if (!["admin", "manager", "sales"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const studioDb = await getCurrentStudioDb()
  if (!studioDb) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const user = await getCurrentUser()
  // شناسه کاربر فعلی در دیتابیس استودیو (با phone matching)
  const currentStudioUserId = await getCurrentStudioUserId()
  if (!currentStudioUserId) {
    return NextResponse.json({ error: "کاربر در استودیو یافت نشد" }, { status: 403 })
  }

  const { id } = await params
  const card = await studioDb.kanbanCard.findUnique({ where: { id } })
  if (!card || card.userId !== currentStudioUserId) {
    return NextResponse.json({ error: "کارت یافت نشد" }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const notifyUserId = typeof body.notifyUserId === "string" ? body.notifyUserId.trim() : ""
  if (!notifyUserId) {
    return NextResponse.json({ error: "گیرنده اعلان الزامی است" }, { status: 400 })
  }

  // Resolve the target user's name from the studio DB.
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

  // 1) Create a Notification for the target user — در دیتابیس استودیوی فعلی
  try {
    // نام نمایشی کاربر فعلی (تکمیل‌کننده) از دیتابیس استودیو
    let completerName = user?.name || "کاربر"
    const me = await studioDb.user.findUnique({
      where: { id: currentStudioUserId },
      select: { firstName: true, lastName: true },
    })
    if (me) completerName = `${me.firstName} ${me.lastName}`.trim() || completerName

    await studioDb.notification.create({
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

  // 2) If the card is linked to a project, also create a ProjectNote — در دیتابیس استودیو
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
      // Make sure the project exists in the studio db.
      const project = await studioDb.project.findUnique({ where: { id: linkedProjectId }, select: { id: true } })
      if (project) {
        await studioDb.projectNote.create({
          data: {
            projectId: linkedProjectId,
            authorId: currentStudioUserId,
            noteType: "text",
            content: noteContent,
          },
        })
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
