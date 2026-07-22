import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentStudioDbName } from "@/lib/auth-helpers"
import { getCurrentUser } from "@/lib/auth"
import { broadcastToChatWs, conversationRoom } from "@/lib/chat-ws"

export const dynamic = "force-dynamic"

// PATCH /api/messages/[id]/pin
// Body: { pinned: boolean, conversationId: string }
// Pin/unpin a message. In groups, requires admin/owner role.
// In direct conversations, sender or recipient can pin.
// Updates Conversation.pinnedMessageId and Message.pinnedAt.
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

    const body = await req.json().catch(() => ({}))
    const pinned = !!body.pinned
    const conversationId = String(body.conversationId || "")

    if (!conversationId) {
      return NextResponse.json({ error: "شناسه گفتگو الزامی است" }, { status: 400 })
    }

    // Verify the message belongs to this conversation.
    const msg = await db.message.findUnique({
      where: { id },
      select: { id: true, conversationId: true, deletedAt: true },
    })
    if (!msg) return NextResponse.json({ error: "پیام یافت نشد" }, { status: 404 })
    if (msg.conversationId !== conversationId) {
      return NextResponse.json({ error: "پیام متعلق به این گفتگو نیست" }, { status: 400 })
    }
    if (msg.deletedAt) {
      return NextResponse.json({ error: "پیام حذف شده است" }, { status: 400 })
    }

    // Verify participant.
    const me = await db.conversationParticipant.findFirst({
      where: { conversationId, userId: user.userId, leftAt: null },
      select: { id: true, role: true },
    })
    if (!me) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 })
    }

    const conv = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { type: true },
    })
    if (!conv) return NextResponse.json({ error: "گفتگو یافت نشد" }, { status: 404 })

    if (conv.type === "group" && me.role !== "owner" && me.role !== "admin") {
      return NextResponse.json(
        { error: "فقط مدیر گروه می‌تواند پیام را سنجاق کند" },
        { status: 403 }
      )
    }

    if (pinned) {
      // Unpin any previously pinned message in this conversation.
      await db.message.updateMany({
        where: { conversationId, pinnedAt: { not: null } },
        data: { pinnedAt: null },
      })
      await db.message.update({ where: { id }, data: { pinnedAt: new Date() } })
      await db.conversation.update({
        where: { id: conversationId },
        data: { pinnedMessageId: id },
      })
    } else {
      await db.message.update({ where: { id }, data: { pinnedAt: null } })
      // Clear pinnedMessageId if it matches.
      const c = await db.conversation.findUnique({
        where: { id: conversationId },
        select: { pinnedMessageId: true },
      })
      if (c?.pinnedMessageId === id) {
        await db.conversation.update({
          where: { id: conversationId },
          data: { pinnedMessageId: null },
        })
      }
    }

    // Broadcast
    await broadcastToChatWs({
      room: conversationRoom(studioDbName, conversationId),
      event: "message:pinned",
      data: { messageId: id, conversationId, pinned },
    })

    return NextResponse.json({ ok: true, pinned })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

