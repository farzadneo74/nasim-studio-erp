import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentStudioDbName } from "@/lib/auth-helpers"
import { getCurrentUser } from "@/lib/auth"
import { broadcastToChatWs, conversationRoom, studioRoom } from "@/lib/chat-ws"

export const dynamic = "force-dynamic"

// POST /api/messages/conversations/[id]/forward
// Body: { messageIds: string[] }
// Forwards the given messages (from any conversation in the same studio)
// into this conversation as new messages with forwardedFromId/forwardedFromName.
export async function POST(
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

    // Verify participant of the target conversation.
    const participant = await db.conversationParticipant.findFirst({
      where: { conversationId: id, userId: user.userId, leftAt: null },
      select: { id: true },
    })
    if (!participant) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const messageIds: string[] = Array.isArray(body.messageIds)
      ? body.messageIds.filter((x: unknown) => typeof x === "string")
      : []
    if (messageIds.length === 0) {
      return NextResponse.json({ error: "پیامی برای فوروارد انتخاب نشده" }, { status: 400 })
    }

    // Fetch the source messages.
    const sources = await db.message.findMany({
      where: { id: { in: messageIds }, deletedAt: null },
      select: {
        id: true,
        body: true,
        attachments: true,
        mentions: true,
        senderId: true,
        senderName: true,
        conversationId: true,
      },
    })

    if (sources.length === 0) {
      return NextResponse.json({ error: "پیام مرجع یافت نشد" }, { status: 404 })
    }

    // Verify the user is a participant of all source conversations.
    const sourceConvIds = Array.from(new Set(sources.map((s) => s.conversationId)))
    for (const cid of sourceConvIds) {
      const p = await db.conversationParticipant.findFirst({
        where: { conversationId: cid, userId: user.userId, leftAt: null },
        select: { id: true },
      })
      if (!p) {
        return NextResponse.json(
          { error: "دسترسی غیرمجاز به یکی از پیام‌های مرجع" },
          { status: 403 }
        )
      }
    }

    // Create forwarded copies in the target conversation.
    const createdIds: string[] = []
    const shapedMessages: unknown[] = []
    let lastCreatedAt: Date | null = null
    let lastPreview = ""
    for (const src of sources) {
      const created = await db.message.create({
        data: {
          conversationId: id,
          senderId: user.userId,
          senderName: user.name || "شما",
          body: src.body,
          mentions: src.mentions, // copy as-is
          attachments: src.attachments, // copy as-is
          forwardedFromId: src.id,
          forwardedFromName: src.senderName,
        },
        include: { reactions: true },
      })
      createdIds.push(created.id)
      lastCreatedAt = created.createdAt
      lastPreview = created.body.trim().slice(0, 80) || "📎 پیوست"

      shapedMessages.push({
        id: created.id,
        conversationId: created.conversationId,
        senderId: created.senderId,
        senderName: created.senderName,
        body: created.body,
        mentions: JSON.parse(created.mentions || "[]"),
        attachments: JSON.parse(created.attachments || "[]"),
        replyToId: created.replyToId,
        replyTo: null,
        forwardedFromId: created.forwardedFromId,
        forwardedFromName: created.forwardedFromName,
        editedAt: created.editedAt ? created.editedAt.toISOString() : null,
        deletedAt: created.deletedAt ? created.deletedAt.toISOString() : null,
        deletedFor: JSON.parse(created.deletedFor || "[]"),
        pinnedAt: created.pinnedAt ? created.pinnedAt.toISOString() : null,
        readBy: JSON.parse(created.readBy || "[]"),
        createdAt: created.createdAt.toISOString(),
        reactions: created.reactions.map((r) => ({
          id: r.id,
          userId: r.userId,
          userName: r.userName,
          emoji: r.emoji,
          createdAt: r.createdAt.toISOString(),
        })),
      })
    }

    // Update conversation denormalized fields.
    if (lastCreatedAt) {
      await db.conversation.update({
        where: { id },
        data: {
          updatedAt: new Date(),
          lastMessageAt: lastCreatedAt,
          lastMessagePreview: lastPreview,
          lastMessageSenderName: user.name || "شما",
        },
      })
    }

    // Broadcast each forwarded message to the conversation room.
    for (const m of shapedMessages) {
      await broadcastToChatWs({
        room: conversationRoom(studioDbName, id),
        event: "message:new",
        data: m,
      })
    }
    // Notify studio room for list refresh.
    await broadcastToChatWs({
      room: studioRoom(studioDbName),
      event: "conversation:updated",
      data: {
        id,
        lastMessageAt: lastCreatedAt ? lastCreatedAt.toISOString() : null,
        lastMessagePreview: lastPreview,
        lastMessageSenderName: user.name || "شما",
      },
    })

    return NextResponse.json({ ok: true, createdIds }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

