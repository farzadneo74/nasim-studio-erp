import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { TASK_STATUSES, type TaskStatus, type Role } from "@/lib/constants"
import { PrismaClient } from "@prisma/client"

type Ctx = { params: Promise<{ id: string; taskId: string }> }

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

interface PatchBody {
  status?: string
  assignedToId?: string | null
  actualMinutes?: number
  estimatedMinutes?: number
  title?: string
  deadline?: string | null
  order?: number
}

export async function PATCH(req: Request, { params }: Ctx) {
  const role = await getCurrentRole() as Role
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id, taskId } = await params
  const ok = await assertOnTeam(db, role, id)
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = (await req.json().catch(() => ({}))) as PatchBody

  const task = await db.task.findFirst({ where: { id: taskId, projectId: id } })
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const data: any = {}
  if (body.status && TASK_STATUSES.includes(body.status as TaskStatus)) data.status = body.status
  if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null
  if (body.actualMinutes !== undefined) data.actualMinutes = Number(body.actualMinutes) || null
  if (body.estimatedMinutes !== undefined) data.estimatedMinutes = Number(body.estimatedMinutes) || null
  if (body.title !== undefined && body.title.trim()) data.title = body.title.trim()
  if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null
  if (body.order !== undefined) data.order = Number(body.order)

  const updated = await db.task.update({ where: { id: taskId }, data })
  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    status: updated.status,
    order: updated.order,
    deadline: updated.deadline,
    estimatedMinutes: updated.estimatedMinutes,
    actualMinutes: updated.actualMinutes,
    assignedToId: updated.assignedToId,
  })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const role = await getCurrentRole() as Role
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id, taskId } = await params
  if (!["admin", "manager"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const task = await db.task.findFirst({ where: { id: taskId, projectId: id } })
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })
  await db.task.delete({ where: { id: taskId } })
  return NextResponse.json({ ok: true })
}
