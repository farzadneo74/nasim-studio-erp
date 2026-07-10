import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

function overlapsToday(start: Date, end: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const s = new Date(start)
  s.setHours(0, 0, 0, 0)
  const e = new Date(end)
  e.setHours(23, 59, 59, 999)
  return today >= s && today <= e
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const status = String(body.status || "")
  if (status !== "approved" && status !== "rejected") {
    return NextResponse.json(
      { error: "status must be 'approved' or 'rejected'" },
      { status: 400 }
    )
  }

  const existing = await db.leaveRequest.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
  }

  // Resolve a real approver user record by the current role.
  const approver = await db.user.findFirst({
    where: { role },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  })

  const updated = await db.leaveRequest.update({
    where: { id },
    data: {
      status,
      approverId: approver?.id ?? null,
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isAvailable: true,
        },
      },
      approver: { select: { id: true, firstName: true, lastName: true } },
    },
  })

  // On approve, mark the user unavailable if the leave overlaps today.
  if (status === "approved" && overlapsToday(existing.startDate, existing.endDate)) {
    await db.user.update({
      where: { id: existing.userId },
      data: { isAvailable: false },
    })
  }

  return NextResponse.json({
    id: updated.id,
    userId: updated.userId,
    user: updated.user,
    approverId: updated.approverId,
    approver: updated.approver,
    startDate: updated.startDate,
    endDate: updated.endDate,
    reason: updated.reason,
    status: updated.status,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    userMarkedUnavailable: status === "approved" && overlapsToday(existing.startDate, existing.endDate),
  })
}
