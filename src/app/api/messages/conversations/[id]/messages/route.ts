import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb } from "@/lib/auth-helpers"
import { getCurrentUser } from "@/lib/auth"

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
  editedAt: Date | null
  createdAt: Date
  reactions: { id: string; userId: string; userName: string; emoji: string; createdAt: Date }[]
}

function shapeMessage(m: MessageWithExtras, replyToById: Map<string, ReplyToLite>): {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  body: string
  mentions: unknown[]
  attachments: unknown[]
  replyToId: string | null
  replyTo: ReplyToLite | null
  editedAt: string | null
  createdAt: string
  reactions: {
    id: string
    userId: string
    userName: string
    emoji: string
    createdAt: string
  }[]
} {
  let mentions: unknown[] = []
  try { mentions = JSON.parse(m.mentions || "[]") } catch { mentions = [] }
  let attachments: unknown[] = []
  try { attachments = JSON.parse(m.attachments || "[]") } catch { attachments = [] }
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
    editedAt: m.editedAt ? m.editedAt.toISOString() : null,
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
    where: { conversationId, userId },
    select: { id: true },
  })
  if (!p) return { ok: false as const, error: "دسترسی غیرمجاز" }
  return { ok: true as const }
}

// Bulk-fetch replyTo messages for a list of messages that have replyToId set.
// (The Message model has replyToId but no Prisma relation, so we resolve manually.)
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

    return NextResponse.json({
      items: messages.map((m) => shapeMessage(m, replyToMap)),
      hasMore: messages.length === LIMIT,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST: send a message. Body: { body, replyToId?, mentions?, attachments? }.
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
    const { id } = await params
    const access = await ensureParticipant(db, id, user.userId)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const text = typeof body.body === "string" ? body.body : ""
    const replyToId = typeof body.replyToId === "string" && body.replyToId ? body.replyToId : null

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

    // Atomic create + bump conversation.updatedAt
    const [created] = await db.$transaction([
      db.message.create({
        data: {
          conversationId: id,
          senderId: user.userId,
          senderName: user.name || "شما",
          body: text,
          mentions: JSON.stringify(mentions),
          attachments: JSON.stringify(attachments),
          replyToId,
        },
        include: { reactions: true },
      }),
      db.conversation.update({
        where: { id },
        data: { updatedAt: new Date() },
      }),
    ])

    // Resolve replyTo manually if present
    const replyToMap = await fetchReplyTos(db, [created])
    return NextResponse.json(shapeMessage(created, replyToMap), { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
