import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { TASK_STATUSES, type TaskStatus, type Role } from "@/lib/constants"
import { PrismaClient } from "@prisma/client"

type Ctx = { params: Promise<{ id: string }> }

async function assertOnTeam(db: PrismaClient, role: Role, projectId: string) {
  if (["admin", "manager", "sales"].includes(role)) return true
  const userId = (await db.user.findFirst({ where: { role }, select: { id: true } }))?.id
  if (!userId) return false
  const p = await db.project.findUnique({
    where: { id: projectId },
    include: { fieldTeam: { select: { id: true } }, studioTeam: { select: { id: true } }, deliveryTeam: { select: { id: true } } },
  })
  if (!p) return false
  return (
    p.fieldTeam.some((u) => u.id === userId) ||
    p.studioTeam.some((u) => u.id === userId) ||
    p.deliveryTeam.some((u) => u.id === userId)
  )
}

export async function GET(_req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id } = await params
  const ok = await assertOnTeam(db, role, id)
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const tasks = await db.task.findMany({
    where: { projectId: id },
    orderBy: { order: "asc" },
    include: {
      assignedTo: { select: { id: true, firstName: true, lastName: true, role: true, isAvailable: true } },
    },
  })

  return NextResponse.json(
    tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      order: t.order,
      deadline: t.deadline,
      estimatedMinutes: t.estimatedMinutes,
      actualMinutes: t.actualMinutes,
      assignedTo: t.assignedTo
        ? {
            id: t.assignedTo.id,
            firstName: t.assignedTo.firstName,
            lastName: t.assignedTo.lastName,
            fullName: t.assignedTo.firstName + " " + t.assignedTo.lastName,
            role: t.assignedTo.role,
          }
        : null,
      createdAt: t.createdAt,
    }))
  )
}

interface CreateBody {
  title?: string
  assignedToId?: string
  deadline?: string
  estimatedMinutes?: number
}

export async function POST(req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  if (!["admin", "manager", "sales", "photographer", "editor", "qc", "logistics"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id } = await params
  const ok = await assertOnTeam(db, role, id)
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = (await req.json().catch(() => ({}))) as CreateBody
  if (!body.title || !body.title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  const maxOrder = (await db.task.aggregate({ where: { projectId: id }, _max: { order: true } }))._max.order ?? -1

  const task = await db.task.create({
    data: {
      projectId: id,
      title: body.title.trim(),
      assignedToId: body.assignedToId || null,
      deadline: body.deadline ? new Date(body.deadline) : null,
      estimatedMinutes: body.estimatedMinutes ? Number(body.estimatedMinutes) : null,
      status: "todo",
      order: maxOrder + 1,
    },
  })

  return NextResponse.json({
    id: task.id,
    title: task.title,
    status: task.status,
    order: task.order,
    deadline: task.deadline,
    estimatedMinutes: task.estimatedMinutes,
    actualMinutes: task.actualMinutes,
    assignedTo: null,
    createdAt: task.createdAt,
  }, { status: 201 })
}
