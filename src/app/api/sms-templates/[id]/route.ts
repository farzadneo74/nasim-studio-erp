import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole()
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const existing = await db.sMSTemplate.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "SMS template not found" }, { status: 404 })
  }

  const data: Record<string, unknown> = {}

  if (typeof body.name === "string") {
    const n = body.name.trim()
    if (!n) return NextResponse.json({ error: "Name is required" }, { status: 400 })
    data.name = n
  }

  if (typeof body.templateText === "string") {
    const t = body.templateText.trim()
    if (!t) return NextResponse.json({ error: "Template text is required" }, { status: 400 })
    data.templateText = t
  }

  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive
  }

  const updated = await db.sMSTemplate.update({ where: { id }, data })

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    templateText: updated.templateText,
    isActive: updated.isActive,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole()
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params

  const existing = await db.sMSTemplate.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    return NextResponse.json({ error: "SMS template not found" }, { status: 404 })
  }

  await db.sMSTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

