import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentUser } from "@/lib/auth-helpers"
import { getAttachmentForDownload } from "@/lib/attachment-service"

export const dynamic = "force-dynamic"

function contentTypeFor(filename: string, fallback: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg"
  if (lower.endsWith(".gif")) return "image/gif"
  if (lower.endsWith(".webp")) return "image/webp"
  if (lower.endsWith(".mp3")) return "audio/mpeg"
  if (lower.endsWith(".mp4")) return "video/mp4"
  if (lower.endsWith(".webm")) return "video/webm"
  if (lower.endsWith(".pdf")) return "application/pdf"
  return fallback
}

// GET /api/attachments/[id]/content — serve the file (authorized).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
    const db = await getCurrentStudioDb()
    if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

    const { id } = await params
    const result = await getAttachmentForDownload(db, id)
    if (!result) return NextResponse.json({ error: "فایل یافت نشد" }, { status: 404 })

    const ct = contentTypeFor(result.fileName, result.mimeType)
    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        "Content-Type": ct,
        "Content-Length": String(result.buffer.length),
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `inline; filename="${encodeURIComponent(result.fileName)}"`,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

