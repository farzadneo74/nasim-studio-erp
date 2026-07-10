import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentRole } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

const TRIGGER_EVENTS = ["before_event", "after_event", "after_ready", "after_photo_select"] as const
type TriggerEvent = (typeof TRIGGER_EVENTS)[number]
type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const existing = await db.smsAutomation.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "یافت نشد" }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (typeof body.name === "string") { const n = body.name.trim(); if (!n) return NextResponse.json({ error: "نام الزامی" }, { status: 400 }); data.name = n }
  if (typeof body.templateId === "string" && body.templateId.trim()) {
    const tpl = await db.sMSTemplate.findUnique({ where: { id: body.templateId.trim() } })
    if (!tpl) return NextResponse.json({ error: "قالب یافت نشد" }, { status: 404 })
    data.templateId = body.templateId.trim()
  }
  if (typeof body.triggerEvent === "string") { if (!TRIGGER_EVENTS.includes(body.triggerEvent as TriggerEvent)) return NextResponse.json({ error: "رویداد نامعتبر" }, { status: 400 }); data.triggerEvent = body.triggerEvent }
  if (body.offsetDays !== undefined) { const v = Number(body.offsetDays); if (!Number.isFinite(v)) return NextResponse.json({ error: "روز نامعتبر" }, { status: 400 }); data.offsetDays = Math.round(v) }
  if (typeof body.isActive === "boolean") data.isActive = body.isActive

  const updated = await db.smsAutomation.update({ where: { id }, data, include: { template: true } })
  return NextResponse.json({
    id: updated.id, name: updated.name, templateId: updated.templateId, templateName: updated.template?.name ?? "—",
    templateText: updated.template?.templateText ?? "", triggerEvent: updated.triggerEvent, offsetDays: updated.offsetDays,
    isActive: updated.isActive, createdAt: updated.createdAt, updatedAt: updated.updatedAt,
  })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params
  const existing = await db.smsAutomation.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: "یافت نشد" }, { status: 404 })

  await db.projectSmsAssignment.deleteMany({ where: { automationId: id } })
  await db.smsAutomation.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
