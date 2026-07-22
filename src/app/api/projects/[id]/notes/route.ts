import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { NOTE_TYPES, type NoteType, type Role } from "@/lib/constants"
import { PrismaClient } from "@prisma/client"

type Ctx = { params: Promise<{ id: string }> }

async function assertOnTeam(db: PrismaClient, role: Role, projectId: string) {
  if (["admin", "manager", "sales"].includes(role)) return true
  const userId = (await db.user.findFirst({ where: { role }, select: { id: true } }))?.id
  if (!userId) return false
  const p = await db.project.findUnique({
    where: { id: projectId },
    include: { fieldTeam: { select: { id: true } }, studioTeam: { select: { id: true } } },
  })
  if (!p) return false
  return (
    p.fieldTeam.some((u) => u.id === userId) ||
    p.studioTeam.some((u) => u.id === userId)
  )
}

export async function GET(_req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id } = await params
  const ok = await assertOnTeam(db, role, id)
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const notes = await db.projectNote.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
  })

  return NextResponse.json(
    notes.map((n) => ({
      id: n.id,
      noteType: n.noteType,
      content: n.content,
      attachmentUrl: n.attachmentUrl,
      previewUrl: n.previewUrl,
      createdAt: n.createdAt,
      author: n.author
        ? {
            id: n.author.id,
            firstName: n.author.firstName,
            lastName: n.author.lastName,
            fullName: n.author.firstName + " " + n.author.lastName,
            role: n.author.role,
          }
        : null,
    }))
  )
}

interface CreateBody {
  noteType?: string
  content?: string
  attachmentUrl?: string
  previewUrl?: string
  authorId?: string
}

// Acceptable attachment size (base64 payload, ~2MB → ~2.7M chars).
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024 // 2 MB raw
const MAX_BASE64_LEN = Math.ceil(MAX_ATTACHMENT_BYTES * 1.37) + 1024 // base64 inflation ~37%

function isImageDataUrl(url: string): boolean {
  return /^data:image\//i.test(url)
}

function fileNameFromDataUrl(dataUrl: string): string | null {
  // Some browsers include ;name=filename in the data URL.
  const m = dataUrl.match(/;name=([^;]+)/i)
  if (m) return decodeURIComponent(m[1])
  return null
}

export async function POST(req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id } = await params
  const ok = await assertOnTeam(db, role, id)
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = (await req.json().catch(() => ({}))) as CreateBody
  const noteType = (NOTE_TYPES.includes(body.noteType as NoteType) ? body.noteType : "text") as NoteType

  // Author resolution: prefer provided authorId; else find first user matching current role
  let authorId = body.authorId
  if (!authorId) {
    const user = await db.user.findFirst({ where: { role }, select: { id: true } })
    authorId = user?.id
  }
  if (!authorId) {
    // fall back to admin
    const admin = await db.user.findFirst({ where: { role: "admin" }, select: { id: true } })
    authorId = admin?.id
  }
  if (!authorId) return NextResponse.json({ error: "No author available" }, { status: 400 })

  if (noteType === "text" && !body.content?.trim()) {
    return NextResponse.json({ error: "Content is required for text notes" }, { status: 400 })
  }

  // Attachment handling — accept base64 data URLs (from real file input) or remote URLs.
  let attachmentUrl = body.attachmentUrl?.trim() || null
  let previewUrl = body.previewUrl?.trim() || null

  if (noteType !== "text") {
    if (!attachmentUrl && !body.content) {
      return NextResponse.json({ error: "Attachment URL or content required" }, { status: 400 })
    }
    // Enforce size limit on data URLs (large files would blow up SQLite JSON columns).
    if (attachmentUrl && attachmentUrl.startsWith("data:") && attachmentUrl.length > MAX_BASE64_LEN) {
      return NextResponse.json(
        { error: "Attachment too large (max ~2MB)" },
        { status: 413 }
      )
    }
    // For image notes, auto-derive a previewUrl if not provided (use same URL for simplicity).
    if (noteType === "image" && attachmentUrl && !previewUrl) {
      previewUrl = attachmentUrl
    }
  }

  // Build a friendly filename for file/image notes so the UI can render a download link.
  let content = body.content || null
  if (noteType !== "text" && attachmentUrl) {
    const fname = fileNameFromDataUrl(attachmentUrl)
    if (fname && !content) {
      // No caption provided — use the filename as the content text so the UI has something to show.
      content = fname
    }
  }

  const note = await db.projectNote.create({
    data: {
      projectId: id,
      authorId,
      noteType,
      content,
      attachmentUrl,
      previewUrl,
    },
    include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
  })

  return NextResponse.json(
    {
      id: note.id,
      noteType: note.noteType,
      content: note.content,
      attachmentUrl: note.attachmentUrl,
      previewUrl: note.previewUrl,
      createdAt: note.createdAt,
      isImage: note.attachmentUrl ? isImageDataUrl(note.attachmentUrl) || /^https?:\/\/.+\.(png|jpe?g|gif|webp|heic)/i.test(note.attachmentUrl) : false,
      author: note.author
        ? {
            id: note.author.id,
            firstName: note.author.firstName,
            lastName: note.author.lastName,
            fullName: note.author.firstName + " " + note.author.lastName,
            role: note.author.role,
          }
        : null,
    },
    { status: 201 }
  )
}

