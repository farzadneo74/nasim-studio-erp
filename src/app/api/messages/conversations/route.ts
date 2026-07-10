import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb } from "@/lib/auth-helpers"
import { getCurrentUser } from "@/lib/auth"
import { masterDb } from "@/lib/master-db"

export const dynamic = "force-dynamic"

// Helper: build a "public" conversation shape suitable for the client.
function shapeConversation(c: {
  id: string
  type: string
  title: string | null
  createdAt: Date
  updatedAt: Date
  participants: { id: string; userId: string; userName: string; joinedAt: Date }[]
  messages: {
    id: string
    body: string
    senderId: string
    senderName: string
    createdAt: Date
  }[]
}) {
  const last = c.messages[0]
  return {
    id: c.id,
    type: c.type,
    title: c.title,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    participants: c.participants.map((p) => ({
      id: p.id,
      userId: p.userId,
      userName: p.userName,
      joinedAt: p.joinedAt.toISOString(),
    })),
    lastMessage: last
      ? {
          id: last.id,
          body: last.body,
          senderId: last.senderId,
          senderName: last.senderName,
          createdAt: last.createdAt.toISOString(),
        }
      : null,
  }
}

// GET: list conversations the current user participates in, ordered by updatedAt desc.
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !user.userId || !user.studioId || user.studioId === "all") {
      return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
    }
    const db = await getCurrentStudioDb()
    if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

    const conversations = await db.conversation.findMany({
      where: { participants: { some: { userId: user.userId } } },
      orderBy: { updatedAt: "desc" },
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, body: true, senderId: true, senderName: true, createdAt: true },
        },
      },
    })

    return NextResponse.json({ items: conversations.map(shapeConversation) })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST: create a conversation. Body: { type: "direct"|"group", title?, participantIds: string[] }.
// The creator is auto-added. For direct with exactly 1 other participant, reuse existing.
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || !user.userId || !user.studioId || user.studioId === "all") {
      return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
    }
    const db = await getCurrentStudioDb()
    if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const type = String(body.type || "direct") === "group" ? "group" : "direct"
    const title = typeof body.title === "string" ? body.title.trim() : null
    const participantIdsRaw = Array.isArray(body.participantIds) ? body.participantIds : []
    // Sanitize participant ids (strings only), dedupe, exclude current user
    const otherIds = Array.from(
      new Set(
        participantIdsRaw
          .map((x: unknown) => (typeof x === "string" ? x : String(x ?? "")))
          .filter((id: string) => id && id !== user.userId)
      )
    ) as string[]
    if (otherIds.length === 0) {
      return NextResponse.json({ error: "حداقل یک عضو دیگر انتخاب کنید" }, { status: 400 })
    }
    if (type === "direct" && otherIds.length > 1) {
      return NextResponse.json(
        { error: "گفتگوی شخصی فقط بین دو نفر قابل ایجاد است" },
        { status: 400 }
      )
    }
    if (type === "group" && !title) {
      return NextResponse.json({ error: "نام گروه الزامی است" }, { status: 400 })
    }

    // Resolve participant names from the master DB (memberships for this studio).
    const allIds = [user.userId, ...otherIds]
    const memberships = await masterDb.studioMembership.findMany({
      where: { studioId: user.studioId, userId: { in: allIds }, isActive: true },
      include: { user: true },
    })
    const idToName = new Map<string, string>()
    for (const m of memberships) idToName.set(m.userId, m.user.name)
    // Ensure current user always has a name fallback
    if (!idToName.has(user.userId)) idToName.set(user.userId, user.name || "شما")

    // For direct: check if a direct conversation already exists between these two users.
    if (type === "direct") {
      const otherId = otherIds[0]
      // Find direct conversations where current user is a participant
      const directs = await db.conversation.findMany({
        where: {
          type: "direct",
          participants: { some: { userId: user.userId } },
        },
        include: { participants: true },
      })
      const existing = directs.find((d) =>
        d.participants.some((p) => p.userId === otherId)
      )
      if (existing) {
        const full = await db.conversation.findUnique({
          where: { id: existing.id },
          include: {
            participants: true,
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { id: true, body: true, senderId: true, senderName: true, createdAt: true },
            },
          },
        })
        if (full) return NextResponse.json(shapeConversation(full))
      }
    }

    // Create new conversation
    const created = await db.conversation.create({
      data: {
        type,
        title: type === "group" ? title : null,
        participants: {
          create: allIds.map((id) => ({
            userId: id,
            userName: idToName.get(id) || "کاربر",
          })),
        },
      },
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, body: true, senderId: true, senderName: true, createdAt: true },
        },
      },
    })

    return NextResponse.json(shapeConversation(created), { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
