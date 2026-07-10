import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { ROLES } from "@/lib/constants"
import { PrismaClient } from "@prisma/client"

type Ctx = { params: Promise<{ id: string }> }

async function resolveUserId(db: PrismaClient, role: string): Promise<string | null> {
  const exact = await db.user.findFirst({ where: { role }, select: { id: true } })
  if (exact) return exact.id
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
      .map((x) => ({ text: String((x as any).text ?? ""), done: Boolean((x as any).done) }))
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

interface PatchBody {
  title?: string
  body?: string
  kind?: string
  items?: NoteItem[]
  attachments?: Attachment[] | string
  color?: string
  pinned?: boolean
}

export async function PATCH(req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  if (!ROLES.includes(role as never)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const userId = await resolveUserId(db, role)
  if (!userId) {
    return NextResponse.json({ error: "No user available" }, { status: 400 })
  }

  const { id } = await params
  const existing = await db.userNote.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = (await req.json().catch(() => ({}))) as PatchBody
  const data: Record<string, unknown> = {}

  if (typeof body.title === "string") data.title = body.title.trim()
  if (typeof body.body === "string") data.body = body.body
  if (body.kind === "note" || body.kind === "todo") data.kind = body.kind
  if (typeof body.color === "string") data.color = body.color
  if (typeof body.pinned === "boolean") data.pinned = body.pinned
  if (Array.isArray(body.items)) {
    const items = body.items
      .filter((x) => x && typeof x === "object")
      .map((x) => ({ text: String((x as NoteItem).text ?? ""), done: Boolean((x as NoteItem).done) }))
    data.items = serialize(items)
  }
  if (Array.isArray(body.attachments)) {
    data.attachments = JSON.stringify(normalizeAttachments(body.attachments))
  } else if (typeof body.attachments === "string") {
    if (body.attachments.trim() === "") {
      data.attachments = "[]"
    } else {
      try {
        data.attachments = JSON.stringify(normalizeAttachments(JSON.parse(body.attachments)))
      } catch {
        /* ignore invalid JSON */
      }
    }
  }

  const updated = await db.userNote.update({ where: { id }, data })

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    body: updated.body,
    kind: updated.kind,
    items: parseItems(updated.items),
    attachments: parseAttachments(updated.attachments),
    color: updated.color,
    pinned: updated.pinned,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  if (!ROLES.includes(role as never)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const userId = await resolveUserId(db, role)
  if (!userId) {
    return NextResponse.json({ error: "No user available" }, { status: 400 })
  }

  const { id } = await params
  const existing = await db.userNote.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await db.userNote.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
