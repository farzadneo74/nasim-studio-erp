import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb, assertRole } from "@/lib/auth-helpers"

/**
 * PATCH /api/projects/[id]/schedule
 * Body: { startDatetime: string, endDatetime?: string }
 *
 * Reschedules a project's shoot window. Admin/manager only.
 * If endDatetime is omitted, the existing duration is preserved
 * (or falls back to startDatetime when no prior end existed).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole()
  try {
    assertRole(role, ["admin", "manager"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params

  let body: { startDatetime?: string; endDatetime?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }

  const { startDatetime, endDatetime } = body
  if (!startDatetime) {
    return NextResponse.json(
      { error: "startDatetime is required" },
      { status: 400 }
    )
  }

  const newStart = new Date(startDatetime)
  if (Number.isNaN(newStart.getTime())) {
    return NextResponse.json(
      { error: "invalid startDatetime" },
      { status: 400 }
    )
  }

  const existing = await db.project.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  let newEnd: Date
  if (endDatetime) {
    const parsed = new Date(endDatetime)
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: "invalid endDatetime" },
        { status: 400 }
      )
    }
    newEnd = parsed
  } else if (existing.startDatetime && existing.endDatetime) {
    // Preserve prior duration
    const duration =
      existing.endDatetime.getTime() - existing.startDatetime.getTime()
    newEnd = new Date(newStart.getTime() + duration)
  } else {
    newEnd = newStart
  }

  if (newEnd.getTime() < newStart.getTime()) {
    return NextResponse.json(
      { error: "endDatetime cannot be before startDatetime" },
      { status: 400 }
    )
  }

  const updated = await db.project.update({
    where: { id },
    data: { startDatetime: newStart, endDatetime: newEnd },
  })

  return NextResponse.json({
    id: updated.id,
    startDatetime: updated.startDatetime,
    endDatetime: updated.endDatetime,
  })
}

