import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

// GET: any authenticated role (demo role always present).
export async function GET() {
  await getCurrentRole()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const tags = await db.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { customers: true } } },
  })

  return NextResponse.json(
    tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      _count: { customers: t._count.customers },
    }))
  )
}

export async function POST(req: NextRequest) {
  const role = await getCurrentRole()
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const name = String(body.name || "").trim()
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })

  const color = String(body.color || "").trim() || "#94a3b8"
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    return NextResponse.json({ error: "Invalid color (must be #RRGGBB)" }, { status: 400 })
  }

  const existing = await db.tag.findUnique({ where: { name } })
  if (existing) {
    return NextResponse.json({ error: "A tag with this name already exists" }, { status: 409 })
  }

  const created = await db.tag.create({
    data: { name, color },
    include: { _count: { select: { customers: true } } },
  })

  return NextResponse.json(
    {
      id: created.id,
      name: created.name,
      color: created.color,
      _count: { customers: created._count.customers },
    },
    { status: 201 }
  )
}
