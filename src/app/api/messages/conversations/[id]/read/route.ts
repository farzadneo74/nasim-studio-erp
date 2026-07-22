import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentStudioDbName } from "@/lib/auth-helpers"
import { getCurrentUser } from "@/lib/auth"
import { broadcastToChatWs, conversationRoom } from "@/lib/chat-ws"

export const dynamic = "force-dynamic"

// POST /api/messages/conversations/[id]/read
// Marks all messages in this conversation as read by the current user.
// Body: { messageId?: string } (optional — if provided, only marks up to that
// message; otherwise marks all un-read messages).
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

    // Verify participant
    const participant = await db.conversationParticipant.findFirst({
      where: { conversationId: id, userId: user.userId, leftAt: null },
      select: { id: true },
    })
    if (!participant) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const now = new Date()

    // Update participant.lastReadAt
    await db.conversationParticipant.updateMany({
      where: { conversationId: id, userId: user.userId, leftAt: null },
      data: { lastReadAt: now },
    })

    // Add this user to readBy for all messages in the conversation that
    // don't already have them and aren't sent by them (and aren't deleted).
    const msgs = await db.message.findMany({
      where: {
        conversationId: id,
        senderId: { not: user.userId },
        deletedAt: null,
      },
      select: { id: true, readBy: true },
    })
    const updatedIds: string[] = []
    for (const m of msgs) {
      let readBy: { userId: string; readAt: string }[] = []
      try {
        readBy = JSON.parse(m.readBy || "[]")
      } catch {
        readBy = []
      }
      if (!readBy.some((r) => r.userId === user.userId)) {
        readBy.push({ userId: user.userId, readAt: now.toISOString() })
        await db.message.update({
          where: { id: m.id },
          data: { readBy: JSON.stringify(readBy) },
        })
        updatedIds.push(m.id)
      }
    }

    // Broadcast read receipt to the room (so other participants see ✓✓ turn blue).
    await broadcastToChatWs({
      room: conversationRoom(studioDbName, id),
      event: "message:read",
      data: {
        conversationId: id,
        userId: user.userId,
        lastReadAt: now.toISOString(),
        messageIds: updatedIds,
      },
    })

    return NextResponse.json({
      ok: true,
      lastReadAt: now.toISOString(),
      messageIds: updatedIds,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

