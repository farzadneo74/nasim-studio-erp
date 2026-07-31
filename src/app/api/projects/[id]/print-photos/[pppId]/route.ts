import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentUser, getCurrentRole, currentUserHasPermission } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string; pppId: string }> }

// DELETE /api/projects/[id]/print-photos/[pppId] — remove a print photo selection
// نیاز به دسترسی: projects_edit
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
    const role = await getCurrentRole()
    if (!role) return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })

    // ⚠️ SECURITY: فقط کاربرانی که projects_edit دارن می‌تونن حذف کنن
    const canEdit = await currentUserHasPermission("projects_edit")
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden — نیاز به دسترسی ویرایش پروژه" }, { status: 403 })
    }

    const db = await getCurrentStudioDb()
    if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
    const { pppId } = await params

    await db.projectPrintPhoto.delete({ where: { id: pppId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
