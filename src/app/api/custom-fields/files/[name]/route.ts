import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole } from "@/lib/auth-helpers"
import { readFile, stat } from "fs/promises"
import path from "path"

export const dynamic = "force-dynamic"

const UPLOAD_ROOT = path.resolve(process.cwd(), "upload", "custom-fields")

function contentTypeFor(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg"
  if (lower.endsWith(".gif")) return "image/gif"
  if (lower.endsWith(".webp")) return "image/webp"
  if (lower.endsWith(".svg")) return "image/svg+xml"
  if (lower.endsWith(".mp3")) return "audio/mpeg"
  if (lower.endsWith(".wav")) return "audio/wav"
  if (lower.endsWith(".ogg")) return "audio/ogg"
  if (lower.endsWith(".m4a")) return "audio/mp4"
  if (lower.endsWith(".mp4")) return "video/mp4"
  if (lower.endsWith(".webm")) return "video/webm"
  if (lower.endsWith(".mov")) return "video/quicktime"
  if (lower.endsWith(".pdf")) return "application/pdf"
  if (lower.endsWith(".zip")) return "application/zip"
  if (lower.endsWith(".doc")) return "application/msword"
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  if (lower.endsWith(".txt")) return "text/plain"
  return "application/octet-stream"
}

// GET /api/custom-fields/files/[name] — serves an uploaded file from disk.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  await getCurrentRole()

  const { name } = await params
  // Reject any path traversal attempts.
  if (!name || /[\\/]/.test(name) || name.includes("..")) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 })
  }

  const fullPath = path.join(UPLOAD_ROOT, name)
  try {
    const s = await stat(fullPath)
    if (!s.isFile()) {
      return NextResponse.json({ error: "Not a file" }, { status: 404 })
    }
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }

  const buf = await readFile(fullPath)
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": contentTypeFor(name),
      "Content-Length": String(buf.length),
      "Cache-Control": "private, max-age=3600",
    },
  })
}
