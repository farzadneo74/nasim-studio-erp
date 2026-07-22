import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { TECHNICAL_ROLES } from "@/lib/constants"

/**
 * GET /api/calendar/events
 * Query params:
 *   start, end        — ISO date strings bounding the visible range (required)
 *   teamMemberId      — filter to projects where this user is in any team
 *   status            — comma-separated ProjectStatus list
 *   category          — comma-separated PackageCategory list (photo|video|mix)
 *   includeLeaves     — "true" to also return approved LeaveRequest rows as grey events
 *
 * RBAC: all roles can view. Technical roles (photographer/editor/qc/logistics) see
 * only projects where someone of their role is on the team (demo stand-in for
 * "their own projects" since the demo role switcher has no user identity).
 */
export async function GET(req: NextRequest) {
  const role = await getCurrentRole()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { searchParams } = new URL(req.url)
  const start = searchParams.get("start")
  const end = searchParams.get("end")
  const teamMemberId = searchParams.get("teamMemberId") || undefined
  const statusParam = searchParams.get("status") || undefined
  const categoryParam = searchParams.get("category") || undefined
  const includeLeaves = searchParams.get("includeLeaves") === "true"

  if (!start || !end) {
    return NextResponse.json(
      { error: "start and end query params are required" },
      { status: 400 }
    )
  }

  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 })
  }

  // Build project filter
  const where: Record<string, unknown> = {
    startDatetime: { not: null },
    AND: [
      { startDatetime: { gte: startDate } },
      { startDatetime: { lte: endDate } },
    ],
  }

  if (statusParam) {
    const statuses = statusParam.split(",").map((s) => s.trim()).filter(Boolean)
    if (statuses.length) where.status = { in: statuses }
  }
  if (categoryParam) {
    const cats = categoryParam.split(",").map((s) => s.trim()).filter(Boolean)
    if (cats.length) where.servicePackage = { category: { in: cats } }
  }

  // Team-member filter (OR across the three team relations)
  if (teamMemberId) {
    where.OR = [
      { fieldTeam: { some: { id: teamMemberId } } },
      { studioTeam: { some: { id: teamMemberId } } },
    ]
  }

  // For technical roles, narrow to projects where someone of their role is on a team
  if ((TECHNICAL_ROLES as readonly string[]).includes(role)) {
    where.OR = [
      { fieldTeam: { some: { role } } },
      { studioTeam: { some: { role } } },
    ]
  }

  const projects = await db.project.findMany({
    where,
    include: {
      servicePackage: { select: { id: true, title: true, category: true } },
      contract: { include: { customer: { select: { id: true, name: true } } } },
      fieldTeam: { select: { id: true, firstName: true, lastName: true, role: true } },
      studioTeam: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { startDatetime: "asc" },
  })

  const events = projects.map((p) => {
    const team = [
      ...p.fieldTeam.map((u) => ({ ...u, team: "field" as const })),
      ...p.studioTeam.map((u) => ({ ...u, team: "studio" as const })),
    ]
    return {
      id: p.id,
      projectId: p.id,
      title: `${p.contract.customer.name} · ${p.servicePackage.title}`,
      customer: p.contract.customer.name,
      packageTitle: p.servicePackage.title,
      start: p.startDatetime,
      end: p.endDatetime,
      category: p.servicePackage.category,
      status: p.status,
      team: team.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        team: u.team,
      })),
      isLeave: false,
    }
  })

  let leaves: Array<Record<string, unknown>> = []
  if (includeLeaves) {
    const leaveRecords = await db.leaveRequest.findMany({
      where: {
        status: "approved",
        AND: [
          { startDate: { lte: endDate } },
          { endDate: { gte: startDate } },
        ],
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    })
    leaves = leaveRecords.map((l) => ({
      id: l.id,
      projectId: null,
      title: `${l.user.firstName} ${l.user.lastName} (leave)`,
      customer: `${l.user.firstName} ${l.user.lastName}`,
      packageTitle: "Leave",
      start: l.startDate,
      end: l.endDate,
      category: null,
      status: null,
      team: [],
      isLeave: true,
    }))
  }

  return NextResponse.json([...events, ...leaves])
}

