import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { CAN_MANAGE_CUSTOMERS, type Role } from "@/lib/constants"
import { PrismaClient } from "@prisma/client"

// ---- Attachment helpers ----
type AttachmentType = "image" | "audio" | "video" | "file"
interface Attachment {
  type: AttachmentType
  url: string
  name: string
  size: number
  mime: string
  thumbUrl?: string
}

function parseAttachments(raw: unknown): Attachment[] {
  if (!raw) return []
  if (typeof raw !== "string") return []
  try {
    const v = JSON.parse(raw)
    if (!Array.isArray(v)) return []
    return v.filter(
      (x): x is Attachment =>
        !!x &&
        typeof x === "object" &&
        typeof (x as Attachment).url === "string" &&
        ["image", "audio", "video", "file"].includes((x as Attachment).type)
    )
  } catch {
    return []
  }
}

function normalizeAttachments(input: unknown): Attachment[] {
  if (!Array.isArray(input)) return []
  return input
    .filter(
      (x): x is Attachment =>
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

// Demo: resolve first user with the given role.
async function resolveAuthor(db: PrismaClient, role: Role) {
  const exact = await db.user.findFirst({ where: { role }, select: { id: true, firstName: true, lastName: true } })
  if (exact) return exact
  const admin = await db.user.findFirst({ where: { role: "admin" }, select: { id: true, firstName: true, lastName: true } })
  return admin ?? null
}

interface NoteRow {
  id: string
  customerId: string
  authorId: string | null
  authorName: string | null
  content: string
  attachments: string | null
  createdAt: Date
}

// GET /api/customers/[id]/notes  — list customer notes (with attachments)
// Uses raw SQL because the runtime Prisma client may not yet know about the
// `attachments` column (added later; takes effect after a dev-server restart).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole()
  if (!CAN_MANAGE_CUSTOMERS.includes(role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id } = await params

  const rows = (await db.$queryRawUnsafe(
    `SELECT id, customerId, authorId, authorName, content, attachments, createdAt FROM CustomerNote WHERE customerId = ? ORDER BY createdAt DESC`,
    id
  )) as NoteRow[]

  return NextResponse.json({
    items: rows.map((n) => ({
      id: n.id,
      authorName: n.authorName,
      content: n.content,
      attachments: parseAttachments(n.attachments),
      createdAt: new Date(n.createdAt).toISOString(),
    })),
  })
}

interface CreateBody {
  content?: string
  attachments?: Attachment[] | string
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole()
  if (!CAN_MANAGE_CUSTOMERS.includes(role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id } = await params
  const body = (await req.json().catch(() => ({}))) as CreateBody
  const content = String(body.content ?? "").trim()
  if (!content) return NextResponse.json({ error: "محتوای یادداشت الزامی است" }, { status: 400 })

  // attachments may come in as an array or as a JSON string
  let attachments: Attachment[] = []
  if (Array.isArray(body.attachments)) {
    attachments = normalizeAttachments(body.attachments)
  } else if (typeof body.attachments === "string" && body.attachments.trim()) {
    try {
      attachments = normalizeAttachments(JSON.parse(body.attachments))
    } catch {
      attachments = []
    }
  }

  const author = await resolveAuthor(db, role as Role)
  const authorId = author?.id ?? null
  const authorName = author ? `${author.firstName} ${author.lastName}` : "ناشناس"
  const attJson = JSON.stringify(attachments)

  // Use raw SQL so the `attachments` column is written even when the runtime
  // Prisma client hasn't been refreshed (dev-server holds the old client).
  // We generate a cuid-like id ourselves to avoid depending on Prisma's @default(cuid()).
  const noteId = generateCuid()
  await db.$executeRawUnsafe(
    `INSERT INTO CustomerNote (id, customerId, authorId, authorName, content, attachments, createdAt) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    noteId,
    id,
    authorId,
    authorName,
    content,
    attJson
  )

  // Read back the created row to get the canonical createdAt.
  const created = (await db.$queryRawUnsafe(
    `SELECT id, authorName, content, attachments, createdAt FROM CustomerNote WHERE id = ?`,
    noteId
  )) as NoteRow[]

  const note = created[0]
  return NextResponse.json({
    id: note.id,
    authorName: note.authorName,
    content: note.content,
    attachments: parseAttachments(note.attachments),
    createdAt: new Date(note.createdAt).toISOString(),
  })
}

// Minimal cuid generator (matches Prisma's @default(cuid()) format roughly).
function generateCuid(): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 10)
  const rand2 = Math.random().toString(36).slice(2, 6)
  return `c${ts}${rand}${rand2}`.slice(0, 24)
}

