import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import type { Role } from "@/lib/constants"
import { PrismaClient } from "@prisma/client"

export const dynamic = "force-dynamic"

const VALID_TYPES = ["info", "payment_approval", "reminder", "sms"]

async function getCurrentUserId(db: PrismaClient, role: Role): Promise<string | null> {
  const u = await db.user.findFirst({ where: { role }, select: { id: true } })
  return u?.id ?? null
}

// GET: list notifications for the current user + broadcast (userId IS NULL).
// Newest first.
export async function GET() {
  const role = await getCurrentRole()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const userId = await getCurrentUserId(db, role)

  // If no user resolved (no seeded user for this role), still return broadcasts.
  const where = userId
    ? { OR: [{ userId }, { userId: null }] }
    : { userId: null }

  const notifications = await db.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 80,
  })

  const items = notifications.map((n) => ({
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    message: n.message,
    read: n.read,
    link: n.link,
    refId: n.refId,
    requiresAction: n.requiresAction,
    actionLabel: n.actionLabel,
    createdAt: n.createdAt.toISOString(),
  }))

  return NextResponse.json({ items })
}

// POST: create a notification (inter-member message).
// Any role can send to any user. The current user is resolved by role → first
// matching User; we store their id in the message metadata via title prefix
// is not desired, so just create the notification for the recipient.
export async function POST(req: NextRequest) {
  const role = await getCurrentRole()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const senderId = await getCurrentUserId(db, role)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const userId = String(body.userId || "").trim()
  const title = String(body.title || "").trim()
  const message = String(body.message || "").trim()

  if (!userId) {
    return NextResponse.json({ error: "گیرنده پیام الزامی است" }, { status: 400 })
  }
  if (!title) {
    return NextResponse.json({ error: "عنوان پیام الزامی است" }, { status: 400 })
  }
  if (!message) {
    return NextResponse.json({ error: "متن پیام الزامی است" }, { status: 400 })
  }

  // Verify recipient exists
  const recipient = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true },
  })
  if (!recipient) {
    return NextResponse.json({ error: "گیرنده یافت نشد" }, { status: 404 })
  }

  const type =
    typeof body.type === "string" && VALID_TYPES.includes(body.type)
      ? body.type
      : "info"
  const link = typeof body.link === "string" && body.link ? body.link : null
  const refId = typeof body.refId === "string" && body.refId ? body.refId : null
  const requiresAction = typeof body.requiresAction === "boolean" ? body.requiresAction : false
  const actionLabel =
    typeof body.actionLabel === "string" && body.actionLabel.trim()
      ? body.actionLabel.trim()
      : null

  // Prefix message with sender info if we can resolve the sender.
  let finalMessage = message
  if (senderId) {
    const sender = await db.user.findUnique({
      where: { id: senderId },
      select: { firstName: true, lastName: true },
    })
    if (sender) {
      finalMessage = `${message}\n— از ${sender.firstName} ${sender.lastName}`
    }
  }

  const created = await db.notification.create({
    data: {
      userId,
      type,
      title,
      message: finalMessage,
      link,
      refId,
      requiresAction,
      actionLabel,
    },
  })

  return NextResponse.json(
    {
      id: created.id,
      userId: created.userId,
      type: created.type,
      title: created.title,
      message: created.message,
      read: created.read,
      link: created.link,
      refId: created.refId,
      requiresAction: created.requiresAction,
      actionLabel: created.actionLabel,
      createdAt: created.createdAt.toISOString(),
    },
    { status: 201 }
  )
}

