import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb, assertRole } from "@/lib/auth-helpers"

type Ctx = { params: Promise<{ id: string }> }

/**
 * GET /api/projects/[id]/schedules
 *
 * Returns all additional ProjectSchedule entries for a project (with location
 * info). Any authenticated user with access to the project can read.
 */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id } = await params

  // Verify project exists
  const project = await db.project.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!project) return NextResponse.json({ error: "پروژه یافت نشد" }, { status: 404 })

  const schedules = await db.projectSchedule.findMany({
    where: { projectId: id },
    include: {
      location: { select: { id: true, name: true, address: true, city: true, phone: true } },
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  })

  return NextResponse.json({
    items: schedules.map((s) => ({
      id: s.id,
      projectId: s.projectId,
      locationId: s.locationId,
      location: s.location
        ? {
            id: s.location.id,
            name: s.location.name,
            address: s.location.address,
            city: s.location.city,
            phone: s.location.phone,
          }
        : null,
      address: s.address,
      startDatetime: s.startDatetime,
      endDatetime: s.endDatetime,
      note: s.note,
      order: s.order,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
    role,
  })
}

/**
 * POST /api/projects/[id]/schedules
 *
 * Create a new additional ProjectSchedule entry for the project.
 * Body: { locationId?, address?, startDatetime?, endDatetime?, note? }
 * Only admin/manager can POST.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  try {
    assertRole(role, ["admin", "manager"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id } = await params

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

  const project = await db.project.findUnique({ where: { id }, select: { id: true } })
  if (!project) return NextResponse.json({ error: "پروژه یافت نشد" }, { status: 404 })

  // Validate locationId (if provided)
  if (body.locationId && typeof body.locationId === "string" && body.locationId.trim()) {
    const loc = await db.projectLocation.findUnique({
      where: { id: body.locationId },
      select: { id: true },
    })
    if (!loc) return NextResponse.json({ error: "مکان یافت نشد" }, { status: 404 })
  }

  // Parse datetimes
  let startDatetime: Date | null = null
  let endDatetime: Date | null = null
  if (body.startDatetime) {
    const d = new Date(body.startDatetime)
    if (!Number.isNaN(d.getTime())) startDatetime = d
  }
  if (body.endDatetime) {
    const d = new Date(body.endDatetime)
    if (!Number.isNaN(d.getTime())) endDatetime = d
  }

  // Determine next order value
  const existing = await db.projectSchedule.count({ where: { projectId: id } })
  const order = typeof body.order === "number" ? body.order : existing

  const created = await db.projectSchedule.create({
    data: {
      projectId: id,
      locationId: body.locationId?.trim() || null,
      address: typeof body.address === "string" && body.address.trim() ? body.address.trim() : null,
      startDatetime,
      endDatetime,
      note: typeof body.note === "string" && body.note.trim() ? body.note.trim() : null,
      order,
    },
    include: {
      location: { select: { id: true, name: true, address: true, city: true, phone: true } },
    },
  })

  return NextResponse.json({
    id: created.id,
    projectId: created.projectId,
    locationId: created.locationId,
    location: created.location
      ? {
          id: created.location.id,
          name: created.location.name,
          address: created.location.address,
          city: created.location.city,
          phone: created.location.phone,
        }
      : null,
    address: created.address,
    startDatetime: created.startDatetime,
    endDatetime: created.endDatetime,
    note: created.note,
    order: created.order,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  }, { status: 201 })
}
