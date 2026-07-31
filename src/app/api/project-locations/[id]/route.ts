import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

// PATCH: admin/manager only. Update an existing project location.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden: admin/manager only" }, { status: 403 })
  }
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const existing: any = await (db as any).projectLocation
    .findUnique({ where: { id } })
    .catch(() => null)
  if (!existing) {
    return NextResponse.json({ error: "مکان یافت نشد" }, { status: 404 })
  }

  const data: Record<string, unknown> = {}
  if (typeof body.name === "string") {
    const n = body.name.trim()
    if (!n) return NextResponse.json({ error: "نام مکان خالی نباید باشد" }, { status: 400 })
    data.name = n
  }
  if (typeof body.address === "string") data.address = body.address.trim() || null
  if (typeof body.city === "string") data.city = body.city.trim() || null
  if (typeof body.phone === "string") data.phone = body.phone.trim() || null
  if (typeof body.notes === "string") data.notes = body.notes.trim() || null
  if (typeof body.isActive === "boolean") data.isActive = body.isActive

  const updated: any = await (db as any).projectLocation.update({
    where: { id },
    data,
  })

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    address: updated.address ?? null,
    city: updated.city ?? null,
    phone: updated.phone ?? null,
    notes: updated.notes ?? null,
    isActive: updated.isActive,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  })
}

// DELETE: admin/manager only. Soft-delete (set isActive=false).
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden: admin/manager only" }, { status: 403 })
  }
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params

  const existing: any = await (db as any).projectLocation
    .findUnique({ where: { id } })
    .catch(() => null)
  if (!existing) {
    return NextResponse.json({ error: "مکان یافت نشد" }, { status: 404 })
  }

  // Soft-delete: set isActive=false (preserve historical references).
  await (db as any).projectLocation.update({
    where: { id },
    data: { isActive: false },
  })

  return NextResponse.json({ ok: true, id })
}
