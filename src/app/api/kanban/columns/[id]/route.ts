import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentRole } from "@/lib/auth-helpers"
import { getCurrentStudioUserId } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"
type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  if (!["admin", "manager", "sales"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (typeof body.title === "string") data.title = body.title.trim()
  if (typeof body.color === "string") data.color = body.color
  if (typeof body.order === "number") data.order = body.order
  await db.kanbanColumn.update({ where: { id }, data })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  if (!["admin", "manager", "sales"].includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id } = await params
  await db.kanbanColumn.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
