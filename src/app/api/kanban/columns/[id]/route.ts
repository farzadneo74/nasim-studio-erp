import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentRole } from "@/lib/auth-helpers"
import { getCurrentStudioUserId } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"
type Ctx = { params: Promise<{ id: string }> }

// ✅ Fixed (system) kanban columns — cannot be deleted or renamed.
// "در صف" is the entry column (workflow assignments create cards here).
// "انجام شده" is the done column (moving a card here marks it complete + notifies).
const FIXED_COLUMN_TITLES = new Set(["در صف", "انجام شده"])
function isFixedTitle(title: string): boolean {
  return FIXED_COLUMN_TITLES.has(title.trim())
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  if (!["admin", "manager", "sales"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}

  // ✅ Prevent renaming of fixed columns ("در صف" / "انجام شده").
  if (typeof body.title === "string") {
    const newTitle = body.title.trim()
    if (!newTitle) {
      return NextResponse.json({ error: "عنوان ستون نمی‌تواند خالی باشد" }, { status: 400 })
    }
    // Check the CURRENT title of this column. If it's a fixed one, the title
    // cannot be changed (regardless of what the new title is).
    const existing = await db.kanbanColumn.findUnique({ where: { id }, select: { title: true } })
    if (existing && isFixedTitle(existing.title)) {
      return NextResponse.json(
        { error: `ستون «${existing.title}» قابل تغییر نام نیست (ستون ثابت سیستم)` },
        { status: 400 }
      )
    }
    data.title = newTitle
  }
  if (typeof body.color === "string") data.color = body.color
  if (typeof body.order === "number") data.order = body.order
  await db.kanbanColumn.update({ where: { id }, data })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  if (!["admin", "manager", "sales"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id } = await params

  // ✅ Prevent deletion of fixed columns ("در صف" / "انجام شده").
  const existing = await db.kanbanColumn.findUnique({ where: { id }, select: { title: true } })
  if (!existing) return NextResponse.json({ error: "ستون یافت نشد" }, { status: 404 })
  if (isFixedTitle(existing.title)) {
    return NextResponse.json(
      { error: "این ستون قابل حذف نیست" },
      { status: 403 }
    )
  }

  await db.kanbanColumn.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

