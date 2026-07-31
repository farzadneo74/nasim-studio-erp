import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

// GET: any authenticated user. List active project locations, searchable via ?search=.
export async function GET(req: NextRequest) {
  const role = await getCurrentRole()
  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const search = (searchParams.get("search") || "").trim()
  const includeInactive = searchParams.get("includeInactive") === "true"

  const where: Record<string, unknown> = {}
  if (!includeInactive) where.isActive = true
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { address: { contains: search } },
      { city: { contains: search } },
      { phone: { contains: search } },
      { notes: { contains: search } },
    ]
  }

  let rows: any[]
  try {
    rows = await db.projectLocation.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    })
  } catch {
    // Stale client fallback — projectLocation may not be exposed by the runtime client.
    return NextResponse.json({ items: [] })
  }

  return NextResponse.json({
    items: rows.map((l: any) => ({
      id: l.id,
      name: l.name,
      address: l.address ?? null,
      city: l.city ?? null,
      phone: l.phone ?? null,
      notes: l.notes ?? null,
      isActive: l.isActive,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    })),
  })
}

// POST: admin/manager only. Create a new project location.
export async function POST(req: NextRequest) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden: admin/manager only" }, { status: 403 })
  }
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const name = String(body.name || "").trim()
  if (!name) {
    return NextResponse.json({ error: "نام مکان الزامی است" }, { status: 400 })
  }
  const address =
    typeof body.address === "string" && body.address.trim() ? body.address.trim() : null
  const city =
    typeof body.city === "string" && body.city.trim() ? body.city.trim() : null
  const phone =
    typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null
  const notes =
    typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null

  let created: any
  try {
    created = await db.projectLocation.create({
      data: {
        name,
        address,
        city,
        phone,
        notes,
        isActive: true,
      },
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "ساخت مکان ناموفق بود" },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      id: created.id,
      name: created.name,
      address: created.address ?? null,
      city: created.city ?? null,
      phone: created.phone ?? null,
      notes: created.notes ?? null,
      isActive: created.isActive,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    },
    { status: 201 }
  )
}
