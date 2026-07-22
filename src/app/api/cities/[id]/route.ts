import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { CAN_MANAGE_CUSTOMERS } from "@/lib/constants"

export const dynamic = "force-dynamic"

// PATCH /api/cities/[id] — update name/province.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole()
  if (!CAN_MANAGE_CUSTOMERS.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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

  const existing = await db.city.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "City not found" }, { status: 404 })
  }

  const data: { name?: string; province?: string | null } = {}
  if (typeof body.name === "string") {
    const n = body.name.trim()
    if (!n) {
      return NextResponse.json({ error: "نام شهر الزامی است" }, { status: 400 })
    }
    if (n !== existing.name) {
      const dup = await db.city.findUnique({ where: { name: n } })
      if (dup) {
        return NextResponse.json({ error: "این شهر قبلاً ثبت شده است" }, { status: 409 })
      }
    }
    data.name = n
  }
  if ("province" in body) {
    const p = body.province
    data.province = typeof p === "string" && p.trim() ? p.trim() : null
  }

  const updated = await db.city.update({
    where: { id },
    data,
    select: { id: true, name: true, province: true, createdAt: true },
  })
  return NextResponse.json({ item: updated })
}

// DELETE /api/cities/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole()
  if (!CAN_MANAGE_CUSTOMERS.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id } = await params
  const existing = await db.city.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "City not found" }, { status: 404 })
  }
  await db.city.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

