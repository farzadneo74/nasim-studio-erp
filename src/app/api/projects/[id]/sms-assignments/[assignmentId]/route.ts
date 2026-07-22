import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentRole } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string; assignmentId: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id, assignmentId } = await params
  const body = await req.json().catch(() => ({}))
  const existing = await db.projectSmsAssignment.findUnique({ where: { id: assignmentId } })
  if (!existing || existing.projectId !== id) return NextResponse.json({ error: "یافت نشد" }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (typeof body.enabled === "boolean") data.enabled = body.enabled
  if (body.offsetDaysOverride !== undefined) {
    if (body.offsetDaysOverride === null) data.offsetDaysOverride = null
    else { const n = Number(body.offsetDaysOverride); if (Number.isFinite(n)) data.offsetDaysOverride = Math.round(n) }
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "چیزی برای به‌روزرسانی نیست" }, { status: 400 })

  const updated = await db.projectSmsAssignment.update({ where: { id: assignmentId }, data, include: { automation: { include: { template: true } } } })
  return NextResponse.json({
    id: updated.id, projectId: updated.projectId, automationId: updated.automationId,
    automationName: updated.automation?.name ?? "—", templateText: updated.automation?.template?.templateText ?? "",
    templateName: updated.automation?.template?.name ?? "—", triggerEvent: updated.automation?.triggerEvent ?? "",
    offsetDays: updated.automation?.offsetDays ?? 0, defaultOffsetDays: updated.automation?.offsetDays ?? 0,
    offsetDaysOverride: updated.offsetDaysOverride,
    effectiveOffsetDays: updated.offsetDaysOverride != null ? updated.offsetDaysOverride : updated.automation?.offsetDays ?? 0,
    enabled: updated.enabled,
  })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id, assignmentId } = await params
  const existing = await db.projectSmsAssignment.findUnique({ where: { id: assignmentId }, select: { id: true, projectId: true } })
  if (!existing || existing.projectId !== id) return NextResponse.json({ error: "یافت نشد" }, { status: 404 })
  await db.projectSmsAssignment.delete({ where: { id: assignmentId } })
  return NextResponse.json({ ok: true })
}

