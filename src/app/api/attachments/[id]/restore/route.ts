import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentUser } from "@/lib/auth-helpers"
import { restore } from "@/lib/attachment-service"

export const dynamic = "force-dynamic"

// POST /api/attachments/[id]/restore — restore from trash.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
    const db = await getCurrentStudioDb()
    if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

    const { id } = await params
    const ok = await restore(db, id, user.userId, user.name)
    if (!ok) return NextResponse.json({ error: "فایل یافت نشد" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
