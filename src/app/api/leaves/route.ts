import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { LEAVE_STATUSES } from "@/lib/constants"

export const dynamic = "force-dynamic"

function isLeaveStatus(v: string): boolean {
  return (LEAVE_STATUSES as readonly string[]).includes(v)
}

export async function GET(req: NextRequest) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")?.trim() || ""

  const where: Record<string, unknown> = {}
  if (status && isLeaveStatus(status)) {
    where.status = status
  }

  const rows = await db.leaveRequest.findMany({
    where,
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
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
      approver: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  })

  return NextResponse.json(
    rows.map((l) => ({
      id: l.id,
      userId: l.userId,
      user: l.user,
      approverId: l.approverId,
      approver: l.approver,
      startDate: l.startDate,
      endDate: l.endDate,
      reason: l.reason,
      status: l.status,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    }))
  )
}

// POST: any authenticated role (a user creating a leave request for themselves).
export async function POST(req: NextRequest) {
  await getCurrentRole()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const userId = String(body.userId || "").trim()
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 })

  const startDateStr = body.startDate ? String(body.startDate) : ""
  const endDateStr = body.endDate ? String(body.endDate) : ""
  if (!startDateStr || !endDateStr) {
    return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 })
  }

  const startDate = new Date(startDateStr)
  const endDate = new Date(endDateStr)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "Invalid dates" }, { status: 400 })
  }
  if (endDate < startDate) {
    return NextResponse.json({ error: "End date cannot be before start date" }, { status: 400 })
  }

  const reason =
    typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim()
      : null

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const created = await db.leaveRequest.create({
    data: {
      userId,
      startDate,
      endDate,
      reason,
      status: "pending",
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

  return NextResponse.json(
    {
      id: created.id,
      userId: created.userId,
      user: created.user,
      approverId: created.approverId,
      approver: created.approver,
      startDate: created.startDate,
      endDate: created.endDate,
      reason: created.reason,
      status: created.status,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    },
    { status: 201 }
  )
}
