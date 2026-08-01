import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { ROLES, type Role } from "@/lib/constants"
import { PrismaClient } from "@prisma/client"

// Demo: in the absence of real auth, we resolve the current user as the first
// user matching the demo role. admin/manager/sales share a "system inbox" of
// notes scoped to the admin user; technical roles get their own user's notes.
async function resolveUserId(db: PrismaClient, role: Role): Promise<string | null> {
  const exact = await db.user.findFirst({ where: { role }, select: { id: true } })
  if (exact) return exact.id
  // Fallback: first admin user.
  const admin = await db.user.findFirst({ where: { role: "admin" }, select: { id: true } })
  return admin?.id ?? null
}

interface NoteItem {
  text: string
  done: boolean
}

interface Attachment {
  type: "image" | "audio" | "video" | "file"
  url: string
  name: string
  size: number
  mime: string
  thumbUrl?: string
}

function parseItems(raw: string | null | undefined): NoteItem[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    if (!Array.isArray(v)) return []
    return v
      .filter((x) => x && typeof x === "object")
      .map((x) => ({
        text: String((x as any).text ?? ""),
        done: Boolean((x as any).done),
      }))
  } catch {
    return []
  }
}

function serialize(items: NoteItem[]): string {
  return JSON.stringify(items)
}

function parseAttachments(raw: string | null | undefined): Attachment[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    if (!Array.isArray(v)) return []
    return v.filter(
      (x): x is Attachment =>
        !!x && typeof x === "object" && typeof (x as Attachment).url === "string"
    )
  } catch {
    return []
  }
}

function normalizeAttachments(input: unknown): Attachment[] {
  if (!Array.isArray(input)) return []
  return input
    .filter((x): x is Attachment =>
      !!x &&
      typeof x === "object" &&
      typeof (x as Attachment).url === "string" &&
      ["image", "audio", "video", "file"].includes((x as Attachment).type)
    )
    .map((x) => ({
      type: x.type,
      url: String(x.url),
      name: String(x.name ?? ""),
      size: Number(x.size ?? 0) || 0,
      mime: String(x.mime ?? "application/octet-stream"),
      ...(x.thumbUrl ? { thumbUrl: String(x.thumbUrl) } : {}),
    }))
}

export async function GET() {
  const role = await getCurrentRole()
  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const userId = await resolveUserId(db, role)
  if (!userId) return NextResponse.json({ items: [] })

  const rows = await db.userNote.findMany({
    where: { userId },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  })

  return NextResponse.json({
    items: rows.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      kind: n.kind,
      items: parseItems(n.items),
      attachments: parseAttachments(n.attachments),
      color: n.color,
      pinned: n.pinned,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    })),
  })
}

interface CreateBody {
  title?: string
  body?: string
  kind?: string
  items?: NoteItem[]
  attachments?: Attachment[] | string
  color?: string
  pinned?: boolean
}

export async function POST(req: Request) {
  const role = await getCurrentRole()
  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const userId = await resolveUserId(db, role)
  if (!userId) {
    return NextResponse.json({ error: "No user available" }, { status: 400 })
  }

  const body = (await req.json().catch(() => ({}))) as CreateBody
  const kind = body.kind === "todo" ? "todo" : "note"
  const title = String(body.title ?? "").trim()
  const text = String(body.body ?? "").trim()
  const items =
    kind === "todo" && Array.isArray(body.items)
      ? body.items
          .filter((x) => x && typeof x === "object")
          .map((x) => ({ text: String((x as NoteItem).text ?? ""), done: Boolean((x as NoteItem).done) }))
      : []
  const color = typeof body.color === "string" ? body.color : ""
  const pinned = Boolean(body.pinned)
  // attachments may come in as an array or as a JSON string
  let attachments: Attachment[] = []
  if (Array.isArray(body.attachments)) {
    attachments = normalizeAttachments(body.attachments)
  } else if (typeof body.attachments === "string" && body.attachments.trim()) {
    attachments = normalizeAttachments(JSON.parse(body.attachments))
  }

  if (!title && !text && items.length === 0 && attachments.length === 0) {
    return NextResponse.json({ error: "Note is empty" }, { status: 400 })
  }

  const created = await db.userNote.create({
    data: {
      userId,
      title,
      body: text,
      kind,
      items: serialize(items),
      attachments: JSON.stringify(attachments),
      color,
      pinned,
    },
  })

  return NextResponse.json(
    {
      id: created.id,
      title: created.title,
      body: created.body,
      kind: created.kind,
      items: parseItems(created.items),
      attachments: parseAttachments(created.attachments),
      color: created.color,
      pinned: created.pinned,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    },
    { status: 201 }
  )
}

