import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentRole } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

const TRIGGER_EVENTS = ["before_event", "after_event", "after_ready", "after_photo_select"] as const
type TriggerEvent = (typeof TRIGGER_EVENTS)[number]

export async function GET() {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ items: [] })
  const rows = await db.smsAutomation.findMany({ include: { template: true }, orderBy: [{ isActive: "desc" }, { name: "asc" }] })
  return NextResponse.json({
    items: rows.map((a) => ({
      id: a.id, name: a.name, templateId: a.templateId, templateName: a.template?.name ?? "—",
      templateText: a.template?.templateText ?? "", triggerEvent: a.triggerEvent, offsetDays: a.offsetDays,
      isActive: a.isActive, createdAt: a.createdAt, updatedAt: a.updatedAt,
    })),
  })
}

export async function POST(req: NextRequest) {
  const role = await getCurrentRole()
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  const name = String(body.name || "").trim()
  if (!name) return NextResponse.json({ error: "نام الزامی است" }, { status: 400 })
  const templateId = String(body.templateId || "").trim()
  if (!templateId) return NextResponse.json({ error: "قالب پیامک الزامی است" }, { status: 400 })
  const template = await db.sMSTemplate.findUnique({ where: { id: templateId } })
  if (!template) return NextResponse.json({ error: "قالب یافت نشد" }, { status: 404 })
  const triggerEvent = String(body.triggerEvent || "") as TriggerEvent
  if (!TRIGGER_EVENTS.includes(triggerEvent)) return NextResponse.json({ error: "رویداد نامعتبر" }, { status: 400 })
  const offsetDays = Math.round(Number(body.offsetDays))
  if (!Number.isFinite(offsetDays)) return NextResponse.json({ error: "تعداد روز نامعتبر" }, { status: 400 })
  const isActive = body.isActive === undefined ? true : Boolean(body.isActive)
  const created = await db.smsAutomation.create({ data: { name, templateId, triggerEvent, offsetDays, isActive }, include: { template: true } })
  return NextResponse.json({
    id: created.id, name: created.name, templateId: created.templateId, templateName: created.template?.name ?? "—",
    templateText: created.template?.templateText ?? "", triggerEvent: created.triggerEvent, offsetDays: created.offsetDays,
    isActive: created.isActive, createdAt: created.createdAt, updatedAt: created.updatedAt,
  }, { status: 201 })
}
