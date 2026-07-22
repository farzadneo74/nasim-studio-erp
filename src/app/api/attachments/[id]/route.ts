import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentUser } from "@/lib/auth-helpers"
import { softDelete, hardDelete } from "@/lib/attachment-service"

export const dynamic = "force-dynamic"

// DELETE /api/attachments/[id] — soft-delete (move to trash).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
    const db = await getCurrentStudioDb()
    if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

    const { id } = await params
    const ok = await softDelete(db, id, user.userId, user.name)
    if (!ok) return NextResponse.json({ error: "فایل یافت نشد" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

