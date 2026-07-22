import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentStudioDbName } from "@/lib/auth-helpers"
import { getCurrentUser } from "@/lib/auth"
import { broadcastToChatWs, conversationRoom } from "@/lib/chat-ws"

export const dynamic = "force-dynamic"

// POST /api/messages/[id]/reactions — toggle a reaction { emoji }.
// If the user already has that emoji on this message, remove it; otherwise add it.
// Returns the message's reactions array AND broadcasts to the conversation room.
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

    const msg = await db.message.findUnique({
      where: { id },
      select: { id: true, conversationId: true },
    })
    if (!msg) return NextResponse.json({ error: "پیام یافت نشد" }, { status: 404 })

    // Ensure the user is a participant of the conversation.
    const participant = await db.conversationParticipant.findFirst({
      where: { conversationId: msg.conversationId, userId: user.userId, leftAt: null },
      select: { id: true },
    })
    if (!participant) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const emoji = typeof body.emoji === "string" ? body.emoji.trim() : ""
    if (!emoji) return NextResponse.json({ error: "ایموجی الزامی است" }, { status: 400 })

    // Try to find existing reaction (messageId, userId, emoji).
    const existing = await db.messageReaction.findFirst({
      where: { messageId: id, userId: user.userId, emoji },
    })
    if (existing) {
      await db.messageReaction.delete({ where: { id: existing.id } })
    } else {
      try {
        await db.messageReaction.create({
          data: {
            messageId: id,
            userId: user.userId,
            userName: user.name || "شما",
            emoji,
          },
        })
      } catch {
        // Race condition: someone else inserted concurrently. Ignore.
      }
    }

    const reactions = await db.messageReaction.findMany({ where: { messageId: id } })
    const shaped = reactions.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.userName,
      emoji: r.emoji,
      createdAt: r.createdAt.toISOString(),
    }))

    // Broadcast
    await broadcastToChatWs({
      room: conversationRoom(studioDbName, msg.conversationId),
      event: "message:reaction",
      data: {
        messageId: id,
        conversationId: msg.conversationId,
        reactions: shaped,
      },
    })

    return NextResponse.json({ items: shaped })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

