import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { type Role } from "@/lib/constants"

export const dynamic = "force-dynamic"

function iso(d: Date | null): string | null {
  return d ? d.toISOString() : null
}

// GET /api/my-tasks
// Demo: resolve current user = first user with current role.
// Returns {user, tasks, projects}
export async function GET() {
  const role = (await getCurrentRole()) as Role
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  // Resolve the "current user" — first user of this role.
  let user = await db.user.findFirst({
    where: { role },
    select: { id: true, firstName: true, lastName: true, role: true, isAvailable: true },
  })

  // If role is admin/manager/sales and there are no users of that role (shouldn't happen with seed),
  // fall back to first admin user.
  if (!user) {
    user = await db.user.findFirst({
      where: { role: "admin" },
      select: { id: true, firstName: true, lastName: true, role: true, isAvailable: true },
    })
  }
  if (!user) {
    return NextResponse.json({ user: null, tasks: [], projects: [] })
  }

  // Tasks assigned to me, with project + customer + package context
  const tasks = await db.task.findMany({
    where: { assignedToId: user.id },
    orderBy: [{ deadline: "asc" }, { order: "asc" }, { createdAt: "desc" }],
    include: {
      project: {
        select: {
          id: true,
          status: true,
          startDatetime: true,
          deliveryDeadline: true,
          contract: {
            select: {
              contractNumber: true,
              customer: { select: { id: true, name: true } },
            },
          },
          servicePackage: { select: { id: true, title: true, category: true } },
        },
      },
    },
  })

  // Projects I'm on a team for
  const projectsRaw = await db.project.findMany({
    where: {
      OR: [
        { fieldTeam: { some: { id: user.id } } },
        { studioTeam: { some: { id: user.id } } },
        { deliveryTeam: { some: { id: user.id } } },
      ],
    },
    orderBy: { startDatetime: "asc" },
    include: {
      contract: {
        select: {
          contractNumber: true,
          customer: { select: { id: true, name: true } },
        },
      },
      servicePackage: { select: { id: true, title: true, category: true } },
      fieldTeam: { where: { id: user.id }, select: { id: true } },
      studioTeam: { where: { id: user.id }, select: { id: true } },
      deliveryTeam: { where: { id: user.id }, select: { id: true } },
    },
  })

  const projects = projectsRaw.map((p) => {
    const myTeamTypes: string[] = []
    if (p.fieldTeam.length) myTeamTypes.push("field")
    if (p.studioTeam.length) myTeamTypes.push("studio")
    if (p.deliveryTeam.length) myTeamTypes.push("delivery")
    return {
      id: p.id,
      contractNumber: p.contract.contractNumber,
      customerId: p.contract.customer.id,
      customerName: p.contract.customer.name,
      packageTitle: p.servicePackage.title,
      category: p.servicePackage.category,
      status: p.status,
      startDatetime: iso(p.startDatetime),
      deliveryDeadline: iso(p.deliveryDeadline),
      myTeamTypes,
    }
  })

  const tasksOut = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    order: t.order,
    deadline: iso(t.deadline),
    estimatedMinutes: t.estimatedMinutes,
    actualMinutes: t.actualMinutes,
    createdAt: iso(t.createdAt),
    project: {
      id: t.project.id,
      status: t.project.status,
      contractNumber: t.project.contract.contractNumber,
      customerName: t.project.contract.customer.name,
      packageTitle: t.project.servicePackage.title,
      category: t.project.servicePackage.category,
      deliveryDeadline: iso(t.project.deliveryDeadline),
      startDatetime: iso(t.project.startDatetime),
    },
  }))

  return NextResponse.json({
    user: user
      ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.firstName + " " + user.lastName,
          role: user.role,
          isAvailable: user.isAvailable,
        }
      : null,
    tasks: tasksOut,
    projects,
  })
}
