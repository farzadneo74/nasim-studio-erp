import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import type { Role } from "@/lib/constants"
import { PrismaClient } from "@prisma/client"

export const dynamic = "force-dynamic"

async function getCurrentUserId(db: PrismaClient, role: Role): Promise<string | null> {
  const u = await db.user.findFirst({ where: { role }, select: { id: true } })
  return u?.id ?? null
}

type Ctx = { params: Promise<{ id: string }> }

// PATCH: mark a single notification as read/unread.
// - For targeted notifications: only the owner can mutate.
// - For broadcast (userId null): any logged-in demo user can mark read.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const userId = await getCurrentUserId(db, role)

  const { id } = await params
  const existing = await db.notification.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "اعلان یافت نشد" }, { status: 404 })
  }

  if (existing.userId && existing.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const data: { read?: boolean; requiresAction?: boolean; actionLabel?: string | null } = {}
  if (typeof body.read === "boolean") data.read = body.read
  if (typeof body.requiresAction === "boolean") data.requiresAction = body.requiresAction
  if (body.actionLabel !== undefined) {
    data.actionLabel =
      typeof body.actionLabel === "string" && body.actionLabel.trim()
        ? body.actionLabel.trim()
        : null
  }

  // Action-required gate: cannot mark read while requiresAction is true
  // (unless the caller is simultaneously clearing requiresAction).
  if (
    data.read === true &&
    existing.requiresAction &&
    data.requiresAction !== false
  ) {
    return NextResponse.json(
      { error: "این اعلان نیازمند اقدام است؛ ابتدا اقدام مورد نیاز را انجام دهید." },
      { status: 409 }
    )
  }

  const updated = await db.notification.update({ where: { id }, data })

  return NextResponse.json({
    id: updated.id,
    read: updated.read,
    requiresAction: updated.requiresAction,
    actionLabel: updated.actionLabel,
  })
}

// DELETE: remove a notification.
// - Owner can delete their own targeted notifications.
// - Broadcasts: only admin/manager can delete.
// - Action-required notifications cannot be deleted until their action is
//   resolved (requiresAction cleared).
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const userId = await getCurrentUserId(db, role)

  const { id } = await params
  const existing = await db.notification.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "اعلان یافت نشد" }, { status: 404 })
  }

  if (existing.userId) {
    // Targeted: only owner can delete.
    if (existing.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  } else {
    // Broadcast: admin/manager only.
    if (role !== "admin" && role !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  if (existing.requiresAction) {
    return NextResponse.json(
      { error: "این اعلان نیازمند اقدام است و تا انجام اقدام قابل حذف نیست." },
      { status: 409 }
    )
  }

  await db.notification.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

