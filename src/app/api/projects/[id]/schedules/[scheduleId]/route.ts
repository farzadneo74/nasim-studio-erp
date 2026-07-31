import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb, assertRole } from "@/lib/auth-helpers"

type Ctx = { params: Promise<{ id: string; scheduleId: string }> }

/**
 * PATCH /api/projects/[id]/schedules/[scheduleId]
 *
 * Update an existing ProjectSchedule entry. Admin/manager only.
 * Body: { locationId?, address?, startDatetime?, endDatetime?, note?, order? }
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  try {
    assertRole(role, ["admin", "manager"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id, scheduleId } = await params

  let body: {
    locationId?: string | null
    address?: string | null
    startDatetime?: string | null
    endDatetime?: string | null
    note?: string | null
    order?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "بدنه درخواست نامعتبر است" }, { status: 400 })
  }

  const existing = await db.projectSchedule.findUnique({
    where: { id: scheduleId },
    select: { id: true, projectId: true },
  })
  if (!existing || existing.projectId !== id) {
    return NextResponse.json({ error: "زمان‌بندی یافت نشد" }, { status: 404 })
  }

  const data: Record<string, unknown> = {}

  if (body.locationId !== undefined) {
    const lid = typeof body.locationId === "string" ? body.locationId.trim() : ""
    if (lid) {
      const loc = await db.projectLocation.findUnique({
        where: { id: lid },
        select: { id: true },
      })
      if (!loc) return NextResponse.json({ error: "مکان یافت نشد" }, { status: 404 })
      data.locationId = lid
    } else {
      data.locationId = null
    }
  }

  if (body.address !== undefined) {
    data.address =
      typeof body.address === "string" && body.address.trim() ? body.address.trim() : null
  }

  if (body.startDatetime !== undefined) {
    if (body.startDatetime) {
      const d = new Date(body.startDatetime)
      data.startDatetime = Number.isNaN(d.getTime()) ? null : d
    } else {
      data.startDatetime = null
    }
  }

  if (body.endDatetime !== undefined) {
    if (body.endDatetime) {
      const d = new Date(body.endDatetime)
      data.endDatetime = Number.isNaN(d.getTime()) ? null : d
    } else {
      data.endDatetime = null
    }
  }

  if (body.note !== undefined) {
    data.note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null
  }

  if (typeof body.order === "number" && Number.isFinite(body.order)) {
    data.order = body.order
  }

  const updated = await db.projectSchedule.update({
    where: { id: scheduleId },
    data,
    include: {
      location: { select: { id: true, name: true, address: true, city: true, phone: true } },
    },
  })

  return NextResponse.json({
    id: updated.id,
    projectId: updated.projectId,
    locationId: updated.locationId,
    location: updated.location
      ? {
          id: updated.location.id,
          name: updated.location.name,
          address: updated.location.address,
          city: updated.location.city,
          phone: updated.location.phone,
        }
      : null,
    address: updated.address,
    startDatetime: updated.startDatetime,
    endDatetime: updated.endDatetime,
    note: updated.note,
    order: updated.order,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  })
}

/**
 * DELETE /api/projects/[id]/schedules/[scheduleId]
 *
 * Delete an existing ProjectSchedule entry. Admin/manager only.
 */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  try {
    assertRole(role, ["admin", "manager"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id, scheduleId } = await params

  const existing = await db.projectSchedule.findUnique({
    where: { id: scheduleId },
    select: { id: true, projectId: true },
  })
  if (!existing || existing.projectId !== id) {
    return NextResponse.json({ error: "زمان‌بندی یافت نشد" }, { status: 404 })
  }

  await db.projectSchedule.delete({ where: { id: scheduleId } })

  return NextResponse.json({ ok: true, id: scheduleId })
}
