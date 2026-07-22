import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentStudioDbName } from "@/lib/auth-helpers"
import { getCurrentUser } from "@/lib/auth"
import { masterDb } from "@/lib/master-db"
import { broadcastToChatWs, conversationRoom, studioRoom } from "@/lib/chat-ws"

export const dynamic = "force-dynamic"

// PATCH /api/messages/conversations/[id]
// Body (one or more of):
//   { action: "rename", title: string }
//   { action: "set-avatar", avatarUrl: string | null }
//   { action: "add-participants", participantIds: string[] }
//   { action: "remove-participant", userId: string }
//   { action: "leave" }
//   { action: "promote", userId: string, role: "admin" | "member" }
//   { action: "mute", muted: boolean }
//   { action: "pin", pinned: boolean }
//
// Authorization:
//   - rename / set-avatar / add-participants / remove-participant / promote: owner or admin only
//   - leave / mute / pin: self only
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.userId || !user.studioId || user.studioId === "all") {
      return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
    }
    const db = await getCurrentStudioDb()
    if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
    const studioDbName = await getCurrentStudioDbName()
    if (!studioDbName)
      return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
    const { id } = await params

    // Verify the conversation exists and the user is a participant.
    const me = await db.conversationParticipant.findFirst({
      where: { conversationId: id, userId: user.userId, leftAt: null },
      select: { id: true, role: true },
    })
    if (!me) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 })
    }
    const conv = await db.conversation.findUnique({
      where: { id },
      select: { id: true, type: true, title: true, avatarUrl: true },
    })
    if (!conv) return NextResponse.json({ error: "گفتگو یافت نشد" }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const action = String(body.action || "")

    function assertAdmin() {
      if (me.role !== "owner" && me.role !== "admin") {
        return NextResponse.json(
          { error: "فقط مدیر گروه می‌تواند این کار را انجام دهد" },
          { status: 403 }
        )
      }
      return null
    }

    if (action === "rename") {
      const err = assertAdmin()
      if (err) return err
      const title = typeof body.title === "string" ? body.title.trim() : ""
      if (!title) return NextResponse.json({ error: "نام گروه الزامی است" }, { status: 400 })
      await db.conversation.update({ where: { id }, data: { title } })
    } else if (action === "set-avatar") {
      const err = assertAdmin()
      if (err) return err
      const avatarUrl =
        typeof body.avatarUrl === "string" ? body.avatarUrl : null
      await db.conversation.update({ where: { id }, data: { avatarUrl } })
    } else if (action === "add-participants") {
      const err = assertAdmin()
      if (err) return err
      const ids = Array.isArray(body.participantIds)
        ? Array.from(
            new Set(
              body.participantIds
                .map((x: unknown) => (typeof x === "string" ? x : String(x ?? "")))
                .filter((s: string) => s && s !== user.userId)
            )
          )
        : []
      if (ids.length === 0) {
        return NextResponse.json({ error: "کاربری انتخاب نشده" }, { status: 400 })
      }
      // Resolve names
      const memberships = await masterDb.studioMembership.findMany({
        where: { studioId: user.studioId, userId: { in: ids }, isActive: true },
        include: { user: true },
      })
      const idToName = new Map<string, string>()
      for (const m of memberships) idToName.set(m.userId, m.user.name)

      // Filter out participants that are already in the conversation.
      const existing = await db.conversationParticipant.findMany({
        where: { conversationId: id, userId: { in: ids } },
        select: { userId: true, leftAt: true, id: true },
      })
      const existingMap = new Map(existing.map((e) => [e.userId, e]))

      for (const userId of ids) {
        const ex = existingMap.get(userId)
        if (ex) {
          if (ex.leftAt) {
            // re-join
            await db.conversationParticipant.update({
              where: { id: ex.id },
              data: { leftAt: null, role: "member" },
            })
          }
          // else: already a member, skip
        } else {
          await db.conversationParticipant.create({
            data: {
              conversationId: id,
              userId,
              userName: idToName.get(userId) || "کاربر",
              role: "member",
            },
          })
        }
      }
    } else if (action === "remove-participant") {
      const err = assertAdmin()
      if (err) return err
      const targetUserId = String(body.userId || "")
      if (!targetUserId) {
        return NextResponse.json({ error: "کاربر مشخص نشده" }, { status: 400 })
      }
      // Soft-remove (set leftAt) so message history is preserved.
      await db.conversationParticipant.updateMany({
        where: { conversationId: id, userId: targetUserId, leftAt: null },
        data: { leftAt: new Date() },
      })
    } else if (action === "leave") {
      await db.conversationParticipant.updateMany({
        where: { conversationId: id, userId: user.userId, leftAt: null },
        data: { leftAt: new Date() },
      })
      // If group has no remaining participants, mark conversation as ... well,
      // we leave it for now (history kept). The list endpoint filters out
      // conversations where the user has left.
    } else if (action === "promote") {
      const err = assertAdmin()
      if (err) return err
      const targetUserId = String(body.userId || "")
      const role = body.role === "admin" ? "admin" : "member"
      if (!targetUserId) {
        return NextResponse.json({ error: "کاربر مشخص نشده" }, { status: 400 })
      }
      await db.conversationParticipant.updateMany({
        where: { conversationId: id, userId: targetUserId, leftAt: null },
        data: { role },
      })
    } else if (action === "mute") {
      const muted = !!body.muted
      await db.conversationParticipant.updateMany({
        where: { conversationId: id, userId: user.userId, leftAt: null },
        data: { muted },
      })
    } else if (action === "pin") {
      const pinned = !!body.pinned
      await db.conversationParticipant.updateMany({
        where: { conversationId: id, userId: user.userId, leftAt: null },
        data: { pinned },
      })
    } else {
      return NextResponse.json({ error: "action نامعتبر است" }, { status: 400 })
    }

    // Broadcast conversation:updated to the studio room (for list refresh).
    const updated = await db.conversation.findUnique({
      where: { id },
      include: { participants: true },
    })
    await broadcastToChatWs({
      room: studioRoom(studioDbName),
      event: "conversation:updated",
      data: {
        id,
        type: updated?.type,
        title: updated?.title,
        avatarUrl: updated?.avatarUrl,
        participants: updated?.participants.map((p) => ({
          id: p.id,
          userId: p.userId,
          userName: p.userName,
          role: p.role,
          leftAt: p.leftAt ? p.leftAt.toISOString() : null,
        })),
      },
    })
    // Also broadcast to the conversation room (for header refresh).
    await broadcastToChatWs({
      room: conversationRoom(studioDbName, id),
      event: "conversation:updated",
      data: {
        id,
        type: updated?.type,
        title: updated?.title,
        avatarUrl: updated?.avatarUrl,
        participants: updated?.participants.map((p) => ({
          id: p.id,
          userId: p.userId,
          userName: p.userName,
          role: p.role,
          leftAt: p.leftAt ? p.leftAt.toISOString() : null,
        })),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/messages/conversations/[id]
// Permanently delete a conversation and ALL its messages, reactions, and
// attachment records. The physical attachment files are removed from disk too.
//
// Authorization: any participant can delete a direct conversation. For groups,
// only an owner/admin can delete. Once deleted, the conversation is gone for
// everyone — this is NOT a "leave" or "delete for me".
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.userId || !user.studioId || user.studioId === "all") {
      return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
    }
    const db = await getCurrentStudioDb()
    if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
    const studioDbName = await getCurrentStudioDbName()
    if (!studioDbName)
      return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
    const { id } = await params

    // Verify the conversation exists and the user is a participant.
    const me = await db.conversationParticipant.findFirst({
      where: { conversationId: id, userId: user.userId, leftAt: null },
      select: { id: true, role: true },
    })
    if (!me) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 })
    }
    const conv = await db.conversation.findUnique({
      where: { id },
      select: { id: true, type: true },
    })
    if (!conv) return NextResponse.json({ error: "گفتگو یافت نشد" }, { status: 404 })

    // For group conversations, require owner/admin.
    if (conv.type === "group" && me.role !== "owner" && me.role !== "admin") {
      return NextResponse.json(
        { error: "فقط مدیر گروه می‌تواند گفتگو را کاملاً حذف کند" },
        { status: 403 }
      )
    }

    // Collect attachment IDs for physical file cleanup.
    // Attachments are stored in the Attachment table with ownerType="message"
    // and ownerId=<conversationId>.
    type AttachmentRow = { id: string }
    const attachmentRows = (await db.attachment.findMany({
      where: { ownerType: "message", ownerId: id },
      select: { id: true },
    })) as AttachmentRow[]

    // Delete the conversation (cascades to participants, messages, reactions).
    await db.conversation.delete({ where: { id } })

    // Delete attachment records + physical files (best-effort).
    if (attachmentRows.length > 0) {
      try {
        const { hardDelete } = await import("@/lib/attachment-service")
        for (const a of attachmentRows) {
          try {
            await hardDelete(db, a.id, user.userId, user.name)
          } catch {
            /* ignore individual file errors */
          }
        }
      } catch {
        // The import might fail in some environments; the DB records are
        // already gone via cascade, so this is best-effort cleanup.
      }
    }

    // Broadcast to the studio room so all clients refresh their conversation lists.
    await broadcastToChatWs({
      room: studioRoom(studioDbName),
      event: "conversation:deleted",
      data: { id },
    })

    return NextResponse.json({ ok: true, id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

