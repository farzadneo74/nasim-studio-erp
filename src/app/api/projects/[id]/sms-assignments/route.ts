import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentRole } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ items: [] })
  const { id } = await params
  const project = await db.project.findUnique({ where: { id }, select: { id: true } })
  if (!project) return NextResponse.json({ error: "پروژه یافت نشد" }, { status: 404 })
  const rows = await db.projectSmsAssignment.findMany({ where: { projectId: id }, include: { automation: { include: { template: true } } }, orderBy: { createdAt: "asc" } })
  return NextResponse.json({
    items: rows.map((a) => ({
      id: a.id, projectId: a.projectId, automationId: a.automationId,
      automationName: a.automation?.name ?? "—", templateText: a.automation?.template?.templateText ?? "",
      templateName: a.automation?.template?.name ?? "—", triggerEvent: a.automation?.triggerEvent ?? "",
      offsetDays: a.automation?.offsetDays ?? 0, defaultOffsetDays: a.automation?.offsetDays ?? 0,
      offsetDaysOverride: a.offsetDaysOverride,
      effectiveOffsetDays: a.offsetDaysOverride != null ? a.offsetDaysOverride : a.automation?.offsetDays ?? 0,
      enabled: a.enabled, createdAt: a.createdAt,
    })),
  })
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const automationId = String(body.automationId || "").trim()
  if (!automationId) return NextResponse.json({ error: "automationId الزامی" }, { status: 400 })
  const project = await db.project.findUnique({ where: { id }, select: { id: true } })
  if (!project) return NextResponse.json({ error: "پروژه یافت نشد" }, { status: 404 })
  const automation = await db.smsAutomation.findUnique({ where: { id: automationId }, select: { id: true } })
  if (!automation) return NextResponse.json({ error: "اتوماسیون یافت نشد" }, { status: 404 })
  const enabled = body.enabled === undefined ? true : Boolean(body.enabled)
  let offsetDaysOverride: number | null = null
  if (body.offsetDaysOverride !== undefined && body.offsetDaysOverride !== null) {
    const n = Number(body.offsetDaysOverride); if (Number.isFinite(n)) offsetDaysOverride = Math.round(n)
  }
  const existing = await db.projectSmsAssignment.findFirst({ where: { projectId: id, automationId }, select: { id: true } })
  let row
  if (existing) {
    row = await db.projectSmsAssignment.update({ where: { id: existing.id }, data: { enabled, offsetDaysOverride }, include: { automation: { include: { template: true } } } })
  } else {
    row = await db.projectSmsAssignment.create({ data: { projectId: id, automationId, enabled, offsetDaysOverride }, include: { automation: { include: { template: true } } } })
  }
  return NextResponse.json({
    id: row.id, projectId: row.projectId, automationId: row.automationId,
    automationName: row.automation?.name ?? "—", templateText: row.automation?.template?.templateText ?? "",
    templateName: row.automation?.template?.name ?? "—", triggerEvent: row.automation?.triggerEvent ?? "",
    offsetDays: row.automation?.offsetDays ?? 0, defaultOffsetDays: row.automation?.offsetDays ?? 0,
    offsetDaysOverride: row.offsetDaysOverride,
    effectiveOffsetDays: row.offsetDaysOverride != null ? row.offsetDaysOverride : row.automation?.offsetDays ?? 0,
    enabled: row.enabled, createdAt: row.createdAt,
  }, { status: existing ? 200 : 201 })
}
