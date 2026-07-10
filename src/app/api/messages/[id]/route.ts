import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb } from "@/lib/auth-helpers"
import { getCurrentUser } from "@/lib/auth"

export const dynamic = "force-dynamic"

// PATCH /api/messages/[id] — edit message body (sender only). Sets editedAt.
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
    const { id } = await params

    const existing = await db.message.findUnique({
      where: { id },
      select: { senderId: true, conversationId: true },
    })
    if (!existing) return NextResponse.json({ error: "پیام یافت نشد" }, { status: 404 })
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

    // Resolve replyTo manually (no Prisma relation in schema)
    let replyTo: {
      id: string
      senderId: string
      senderName: string
      body: string
    } | null = null
    if (updated.replyToId) {
      const r = await db.message.findUnique({
        where: { id: updated.replyToId },
        select: { id: true, senderId: true, senderName: true, body: true },
      })
      replyTo = r
    }

    let mentions: unknown[] = []
    try { mentions = JSON.parse(updated.mentions || "[]") } catch { mentions = [] }
    let attachments: unknown[] = []
    try { attachments = JSON.parse(updated.attachments || "[]") } catch { attachments = [] }
    return NextResponse.json({
      id: updated.id,
      conversationId: updated.conversationId,
      senderId: updated.senderId,
      senderName: updated.senderName,
      body: updated.body,
      mentions,
      attachments,
      replyToId: updated.replyToId,
      replyTo: replyTo
        ? {
            id: replyTo.id,
            senderId: replyTo.senderId,
            senderName: replyTo.senderName,
            body: replyTo.body,
          }
        : null,
      editedAt: updated.editedAt ? updated.editedAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      reactions: updated.reactions.map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: r.userName,
        emoji: r.emoji,
        createdAt: r.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/messages/[id] — hard delete (sender only).
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
    const { id } = await params

    const existing = await db.message.findUnique({
      where: { id },
      select: { senderId: true },
    })
    if (!existing) return NextResponse.json({ error: "پیام یافت نشد" }, { status: 404 })
    if (existing.senderId !== user.userId) {
      return NextResponse.json({ error: "فقط فرستنده می‌تواند حذف کند" }, { status: 403 })
    }

    await db.message.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
