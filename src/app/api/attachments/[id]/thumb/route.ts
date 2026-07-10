import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentUser } from "@/lib/auth-helpers"
import { getAttachmentForDownload } from "@/lib/attachment-service"

export const dynamic = "force-dynamic"

// GET /api/attachments/[id]/thumb — serve the thumbnail (images only).
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
    const result = await getAttachmentForDownload(db, id, { thumb: true })
    if (!result) return NextResponse.json({ error: "فایل یافت نشد" }, { status: 404 })

    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(result.buffer.length),
        "Cache-Control": "public, max-age=86400",
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
