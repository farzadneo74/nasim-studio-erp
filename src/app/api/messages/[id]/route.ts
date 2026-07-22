import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentStudioDbName } from "@/lib/auth-helpers"
import { getCurrentUser } from "@/lib/auth"
import { broadcastToChatWs, conversationRoom } from "@/lib/chat-ws"

export const dynamic = "force-dynamic"

interface ReplyToLite {
  id: string
  senderId: string
  senderName: string
  body: string
}

interface MessageWithExtras {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  body: string
  mentions: string
  attachments: string
  replyToId: string | null
  forwardedFromId: string | null
  forwardedFromName: string | null
  editedAt: Date | null
  deletedAt: Date | null
  deletedFor: string
  pinnedAt: Date | null
  readBy: string
  createdAt: Date
  reactions: { id: string; userId: string; userName: string; emoji: string; createdAt: Date }[]
}

function shapeMessage(m: MessageWithExtras, replyTo: ReplyToLite | null) {
  let mentions: unknown[] = []
  try {
    mentions = JSON.parse(m.mentions || "[]")
  } catch {
    mentions = []
  }
  let attachments: unknown[] = []
  try {
    attachments = JSON.parse(m.attachments || "[]")
  } catch {
    attachments = []
  }
  let deletedFor: string[] = []
  try {
    deletedFor = JSON.parse(m.deletedFor || "[]")
  } catch {
    deletedFor = []
  }
  let readBy: { userId: string; readAt: string }[] = []
  try {
    readBy = JSON.parse(m.readBy || "[]")
  } catch {
    readBy = []
  }
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    senderName: m.senderName,
    body: m.body,
    mentions,
    attachments,
    replyToId: m.replyToId,
    replyTo: replyTo
      ? {
          id: replyTo.id,
          senderId: replyTo.senderId,
          senderName: replyTo.senderName,
          body: replyTo.body,
        }
      : null,
    forwardedFromId: m.forwardedFromId,
    forwardedFromName: m.forwardedFromName,
    editedAt: m.editedAt ? m.editedAt.toISOString() : null,
    deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
    deletedFor,
    pinnedAt: m.pinnedAt ? m.pinnedAt.toISOString() : null,
    readBy,
    createdAt: m.createdAt.toISOString(),
    reactions: m.reactions.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.userName,
      emoji: r.emoji,
      createdAt: r.createdAt.toISOString(),
    })),
  }
}

// PATCH /api/messages/[id] — edit message body (sender only). Sets editedAt. Broadcasts.
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

    const existing = await db.message.findUnique({
      where: { id },
      select: { senderId: true, conversationId: true, deletedAt: true },
    })
    if (!existing) return NextResponse.json({ error: "پیام یافت نشد" }, { status: 404 })
    if (existing.deletedAt) {
      return NextResponse.json({ error: "پیام حذف شده است" }, { status: 400 })
    }
    if (existing.senderId !== user.userId) {
      return NextResponse.json({ error: "فقط فرستنده می‌تواند ویرایش کند" }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const text = typeof body.body === "string" ? body.body : ""
    if (!text.trim()) {
      return NextResponse.json({ error: "متن پیام خالی است" }, { status: 400 })
    }

    const updated = await db.message.update({
      where: { id },
      data: { body: text, editedAt: new Date() },
      include: { reactions: true },
    })

    let replyTo: ReplyToLite | null = null
    if (updated.replyToId) {
      const r = await db.message.findUnique({
        where: { id: updated.replyToId },
        select: { id: true, senderId: true, senderName: true, body: true },
      })
      replyTo = r
    }
    const shaped = shapeMessage(updated, replyTo)

    // Broadcast
    await broadcastToChatWs({
      room: conversationRoom(studioDbName, updated.conversationId),
      event: "message:edited",
      data: shaped,
    })

    return NextResponse.json(shaped)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/messages/[id]?forEveryone=true|false
//   forEveryone=true  → soft delete (set deletedAt, clear body) — sender only.
//   forEveryone=false → "delete for me" only (append userId to deletedFor JSON).
//                      Works for any participant of the conversation.
export async function DELETE(
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

    const url = new URL(req.url)
    const forEveryone = url.searchParams.get("forEveryone") === "true"

    const existing = await db.message.findUnique({
      where: { id },
      select: { senderId: true, conversationId: true, deletedAt: true, deletedFor: true },
    })
    if (!existing) return NextResponse.json({ error: "پیام یافت نشد" }, { status: 404 })

    // Verify the user is a participant of the conversation (for "delete for me").
    const participant = await db.conversationParticipant.findFirst({
      where: { conversationId: existing.conversationId, userId: user.userId, leftAt: null },
      select: { id: true },
    })
    if (!participant) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 })
    }

    if (forEveryone) {
      if (existing.senderId !== user.userId) {
        return NextResponse.json(
          { error: "فقط فرستنده می‌تواند برای همه حذف کند" },
          { status: 403 }
        )
      }
      if (existing.deletedAt) {
        return NextResponse.json({ ok: true, already: true })
      }
      await db.message.update({
        where: { id },
        data: { deletedAt: new Date(), body: "" },
      })
      // Broadcast "for everyone" deletion
      await broadcastToChatWs({
        room: conversationRoom(studioDbName, existing.conversationId),
        event: "message:deleted",
        data: {
          id,
          conversationId: existing.conversationId,
          deletedAt: new Date().toISOString(),
          forEveryone: true,
        },
      })
    } else {
      // delete for me only
      let deletedFor: string[] = []
      try {
        deletedFor = JSON.parse(existing.deletedFor || "[]")
      } catch {
        deletedFor = []
      }
      if (!deletedFor.includes(user.userId)) {
        deletedFor.push(user.userId)
        await db.message.update({
          where: { id },
          data: { deletedFor: JSON.stringify(deletedFor) },
        })
      }
      // No real-time broadcast needed: only this user sees the message disappear.
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

