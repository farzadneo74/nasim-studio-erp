import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentStudioDbName } from "@/lib/auth-helpers"
import { getCurrentUser } from "@/lib/auth"
import { broadcastToChatWs, conversationRoom, studioRoom } from "@/lib/chat-ws"

export const dynamic = "force-dynamic"

const LIMIT = 50

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

interface ShapedMessage {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  body: string
  mentions: unknown[]
  attachments: unknown[]
  replyToId: string | null
  replyTo: ReplyToLite | null
  forwardedFromId: string | null
  forwardedFromName: string | null
  editedAt: string | null
  deletedAt: string | null
  deletedFor: string[]
  pinnedAt: string | null
  readBy: { userId: string; readAt: string }[]
  createdAt: string
  reactions: {
    id: string
    userId: string
    userName: string
    emoji: string
    createdAt: string
  }[]
}

function shapeMessage(
  m: MessageWithExtras,
  replyToById: Map<string, ReplyToLite>
): ShapedMessage {
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
  const replyTo = m.replyToId ? replyToById.get(m.replyToId) ?? null : null
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

// Verify the current user is a participant in this conversation.
async function ensureParticipant(
  db: Awaited<ReturnType<typeof getCurrentStudioDb>>,
  conversationId: string,
  userId: string
) {
  if (!db) return { ok: false as const, error: "استودیو انتخاب نشده" }
  const p = await db.conversationParticipant.findFirst({
    where: { conversationId, userId, leftAt: null },
    select: { id: true, role: true },
  })
  if (!p) return { ok: false as const, error: "دسترسی غیرمجاز" }
  return { ok: true as const, role: p.role }
}

// Bulk-fetch replyTo messages for a list of messages that have replyToId set.
async function fetchReplyTos(
  db: NonNullable<Awaited<ReturnType<typeof getCurrentStudioDb>>>,
  messages: MessageWithExtras[]
): Promise<Map<string, ReplyToLite>> {
  const ids = Array.from(
    new Set(
      messages
        .map((m) => m.replyToId)
        .filter((x): x is string => !!x)
    )
  )
  if (ids.length === 0) return new Map()
  const found = await db.message.findMany({
    where: { id: { in: ids } },
    select: { id: true, senderId: true, senderName: true, body: true },
  })
  const map = new Map<string, ReplyToLite>()
  for (const f of found) map.set(f.id, f)
  return map
}

// GET: list messages in a conversation (paginated via ?before=<iso>).
// Returns newest first; client reverses to oldest-first for display.
export async function GET(
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
    const access = await ensureParticipant(db, id, user.userId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: 403 })

    const url = new URL(req.url)
    const beforeParam = url.searchParams.get("before")
    const before = beforeParam ? new Date(beforeParam) : null
    if (beforeParam && (!before || Number.isNaN(before.getTime()))) {
      return NextResponse.json({ error: "پارامتر before نامعتبر است" }, { status: 400 })
    }

    // Filter out messages the user has "deleted for me" (their userId is in deletedFor JSON).
    // SQLite has no JSON operators exposed via Prisma; we filter in code.
    const messages = await db.message.findMany({
      where: {
        conversationId: id,
        ...(before ? { createdAt: { lt: before } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: LIMIT,
      include: { reactions: true },
    })

    const replyToMap = await fetchReplyTos(db, messages)

    // Filter out soft-deleted-for-me messages
    const visible = messages.filter((m) => {
      let df: string[] = []
      try {
        df = JSON.parse(m.deletedFor || "[]")
      } catch {
        df = []
      }
      return !df.includes(user.userId)
    })

    return NextResponse.json({
      items: visible.map((m) => shapeMessage(m, replyToMap)),
      hasMore: messages.length === LIMIT,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST: send a message. Body: { body, replyToId?, mentions?, attachments?, forwardedFromId?, forwardedFromName? }.
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
    const access = await ensureParticipant(db, id, user.userId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const text = typeof body.body === "string" ? body.body : ""
    const replyToId =
      typeof body.replyToId === "string" && body.replyToId ? body.replyToId : null
    const forwardedFromId =
      typeof body.forwardedFromId === "string" && body.forwardedFromId
        ? body.forwardedFromId
        : null
    const forwardedFromName =
      typeof body.forwardedFromName === "string" && body.forwardedFromName
        ? body.forwardedFromName
        : null

    const mentions = Array.isArray(body.mentions) ? body.mentions : []
    const attachments = Array.isArray(body.attachments) ? body.attachments : []

    if (!text.trim() && attachments.length === 0) {
      return NextResponse.json({ error: "پیام خالی است" }, { status: 400 })
    }

    // Validate reply target belongs to same conversation
    if (replyToId) {
      const reply = await db.message.findUnique({
        where: { id: replyToId },
        select: { conversationId: true },
      })
      if (!reply || reply.conversationId !== id) {
        return NextResponse.json({ error: "پیام مرجع نامعتبر است" }, { status: 400 })
      }
    }

    // Atomic create + bump conversation's denormalized fields
    const preview = text.trim().slice(0, 80) || "📎 پیوست"
    const created = await db.message.create({
      data: {
        conversationId: id,
        senderId: user.userId,
        senderName: user.name || "شما",
        body: text,
        mentions: JSON.stringify(mentions),
        attachments: JSON.stringify(attachments),
        replyToId,
        forwardedFromId,
        forwardedFromName,
      },
      include: { reactions: true },
    })
    await db.conversation.update({
      where: { id },
      data: {
        updatedAt: new Date(),
        lastMessageAt: created.createdAt,
        lastMessagePreview: preview,
        lastMessageSenderName: user.name || "شما",
      },
    })

    // Resolve replyTo manually if present
    const replyToMap = await fetchReplyTos(db, [created])
    const shaped = shapeMessage(created, replyToMap)

    // Broadcast to the conversation room (real-time). The socket.io service
    // will fan this out to all connected clients (including the sender's
    // other sockets; the sender's current socket already has it via REST).
    await broadcastToChatWs({
      room: conversationRoom(studioDbName, id),
      event: "message:new",
      data: shaped,
    })
    // Also notify the studio room so conversation list previews refresh.
    await broadcastToChatWs({
      room: studioRoom(studioDbName),
      event: "conversation:updated",
      data: {
        id,
        lastMessageAt: shaped.createdAt,
        lastMessagePreview: preview,
        lastMessageSenderName: user.name || "شما",
      },
    })

    return NextResponse.json(shaped, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

