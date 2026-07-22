import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { ROLES, type Role } from "@/lib/constants"
import { PrismaClient } from "@prisma/client"

export const dynamic = "force-dynamic"

async function resolveUserId(db: PrismaClient, role: Role): Promise<string | null> {
  const exact = await db.user.findFirst({ where: { role }, select: { id: true } })
  if (exact) return exact.id
  const admin = await db.user.findFirst({ where: { role: "admin" }, select: { id: true } })
  return admin?.id ?? null
}

interface Attachment {
  type: "image" | "audio" | "video" | "file"
  url: string
  name: string
  size: number
  mime: string
  thumbUrl?: string
}

function parseAttachments(raw: string | null | undefined): Attachment[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    if (!Array.isArray(v)) return []
    return v.filter((x) => x && typeof x === "object" && typeof (x as Attachment).url === "string") as Attachment[]
  } catch {
    return []
  }
}

// POST /api/user-notes/cleanup — body: { keepNewerThan: "1week"|"1month"|"3month"|"none" }
// Deletes attachment files older than the threshold from disk AND clears them
// from the attachments JSON of affected notes (the notes themselves are kept).
// "none" = delete ALL attachments regardless of age.
export async function POST(req: NextRequest) {
  try {
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

    const body = await req.json().catch(() => ({}))
    const keep = String(body.keepNewerThan || "1month")
    let cutoffMs = 0
    const now = Date.now()
    if (keep === "1week") cutoffMs = now - 7 * 24 * 60 * 60 * 1000
    else if (keep === "1month") cutoffMs = now - 30 * 24 * 60 * 60 * 1000
    else if (keep === "3month") cutoffMs = now - 90 * 24 * 60 * 60 * 1000
    else if (keep === "none") cutoffMs = now // delete everything
    else return NextResponse.json({ error: "مقدار keepNewerThan نامعتبر است" }, { status: 400 })

    const notes = await db.userNote.findMany({
      where: { userId, attachments: { not: "[]" } },
      select: { id: true, attachments: true },
    })

    const fs = await import("fs/promises")
    const path = await import("path")
    const uploadDir = path.join(process.cwd(), "public", "upload", "notes")

    let deletedCount = 0
    for (const n of notes) {
      const atts = parseAttachments(n.attachments)
      if (atts.length === 0) continue
      const keepers: Attachment[] = []
      for (const a of atts) {
        let shouldDelete = false
        if (keep === "none") {
          shouldDelete = true
        } else {
          // Use file mtime as the upload timestamp
          try {
            const fileName = a.url.replace(/^\/upload\/notes\//, "")
            const fp = path.join(uploadDir, fileName)
            const stat = await fs.stat(fp)
            if (stat.mtimeMs < cutoffMs) shouldDelete = true
          } catch {
            // File is already gone — treat as deletable from the JSON too.
            shouldDelete = true
          }
        }
        if (shouldDelete) {
          // Delete the file (+ thumbnail if present)
          try {
            const fileName = a.url.replace(/^\/upload\/notes\//, "")
            await fs.unlink(path.join(uploadDir, fileName))
          } catch { /* ignore */ }
          if (a.thumbUrl && a.thumbUrl !== a.url) {
            try {
              const thumbName = a.thumbUrl.replace(/^\/upload\/notes\//, "")
              await fs.unlink(path.join(uploadDir, thumbName))
            } catch { /* ignore */ }
          }
          deletedCount++
        } else {
          keepers.push(a)
        }
      }
      if (keepers.length !== atts.length) {
        await db.userNote.update({
          where: { id: n.id },
          data: { attachments: JSON.stringify(keepers) },
        })
      }
    }

    return NextResponse.json({ deletedCount })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

