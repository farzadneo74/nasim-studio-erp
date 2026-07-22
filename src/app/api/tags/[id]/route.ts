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

  const existing = await db.tag.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Tag not found" }, { status: 404 })

  const data: Record<string, unknown> = {}

  if (typeof body.name === "string") {
    const n = body.name.trim()
    if (!n) return NextResponse.json({ error: "Name is required" }, { status: 400 })
    if (n !== existing.name) {
      const dup = await db.tag.findUnique({ where: { name: n } })
      if (dup) {
        return NextResponse.json({ error: "A tag with this name already exists" }, { status: 409 })
      }
    }
    data.name = n
  }

  if (typeof body.color === "string") {
    const c = body.color.trim()
    if (!/^#[0-9a-fA-F]{6}$/.test(c)) {
      return NextResponse.json({ error: "Invalid color (must be #RRGGBB)" }, { status: 400 })
    }
    data.color = c
  }

  const updated = await db.tag.update({
    where: { id },
    data,
    include: { _count: { select: { customers: true } } },
  })

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    color: updated.color,
    _count: { customers: updated._count.customers },
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

  const existing = await db.tag.findUnique({
    where: { id },
    include: { _count: { select: { customers: true } } },
  })
  if (!existing) return NextResponse.json({ error: "Tag not found" }, { status: 404 })

  if (existing._count.customers > 0) {
    return NextResponse.json(
      { error: "Cannot delete a tag that is assigned to customers" },
      { status: 409 }
    )
  }

  await db.tag.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

