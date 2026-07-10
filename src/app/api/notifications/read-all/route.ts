import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import type { Role } from "@/lib/constants"
import { PrismaClient } from "@prisma/client"

export const dynamic = "force-dynamic"

async function getCurrentUserId(db: PrismaClient, role: Role): Promise<string | null> {
  const u = await db.user.findFirst({ where: { role }, select: { id: true } })
  return u?.id ?? null
}

// POST: mark all of the current user's notifications as read.
// - Targeted: where userId = current user.
// - Broadcasts (userId null): mark as read for this user too. Since broadcasts
//   are shared across users, we instead mark them read by setting read=true on
//   the row itself. This is acceptable for the demo (single shared broadcast).
export async function POST() {
  const role = await getCurrentRole()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const userId = await getCurrentUserId(db, role)
  if (!userId) {
    return NextResponse.json({ updated: 0 })
  }

  // Mark targeted notifications for this user as read, EXCEPT those that still
  // require an action (their read state is gated behind completing the action).
  const targeted = await db.notification.updateMany({
    where: { userId, read: false, requiresAction: false },
    data: { read: true },
  })

  // Mark broadcast (userId null) notifications as read, again skipping those
  // that still require action.
  const broadcast = await db.notification.updateMany({
    where: { userId: null, read: false, requiresAction: false },
    data: { read: true },
  })

  return NextResponse.json({ updated: targeted.count + broadcast.count })
}
