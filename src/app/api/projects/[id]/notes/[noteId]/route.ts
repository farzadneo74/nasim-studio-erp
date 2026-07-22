import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"

type Ctx = { params: Promise<{ id: string; noteId: string }> }

// PATCH /api/projects/[id]/notes/[noteId]
// Admin/manager only. Edits the note content.
export async function PATCH(req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id, noteId } = await params
  const body = (await req.json().catch(() => ({}))) as { content?: string }
  const content = typeof body.content === "string" ? body.content.trim() : ""

  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 })
  }

  const existing = await db.projectNote.findUnique({ where: { id: noteId } })
  if (!existing || existing.projectId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const updated = await db.projectNote.update({
    where: { id: noteId },
    data: { content },
    include: {
      author: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
  })

  return NextResponse.json({
    id: updated.id,
    noteType: updated.noteType,
    content: updated.content,
    attachmentUrl: updated.attachmentUrl,
    previewUrl: updated.previewUrl,
    createdAt: updated.createdAt,
    author: updated.author
      ? {
          id: updated.author.id,
          firstName: updated.author.firstName,
          lastName: updated.author.lastName,
          fullName: updated.author.firstName + " " + updated.author.lastName,
          role: updated.author.role,
        }
      : null,
  })
}

// DELETE /api/projects/[id]/notes/[noteId]
// Admin/manager only.
export async function DELETE(_req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id, noteId } = await params
  const existing = await db.projectNote.findUnique({ where: { id: noteId } })
  if (!existing || existing.projectId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await db.projectNote.delete({ where: { id: noteId } })
  return NextResponse.json({ ok: true })
}

