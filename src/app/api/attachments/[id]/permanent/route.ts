import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentUser, getCurrentRole } from "@/lib/auth-helpers"
import { hardDelete } from "@/lib/attachment-service"

export const dynamic = "force-dynamic"

// DELETE /api/attachments/[id]/permanent — permanently delete (admin/manager only).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const role = await getCurrentRole()
    if (!["admin", "manager"].includes(role)) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 })
    }
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
    const db = await getCurrentStudioDb()
    if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

    const { id } = await params
    const ok = await hardDelete(db, id, user.userId, user.name)
    if (!ok) return NextResponse.json({ error: "فایل یافت نشد" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
