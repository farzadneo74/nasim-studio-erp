import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { CAN_MANAGE_CUSTOMERS } from "@/lib/constants"

export const dynamic = "force-dynamic"

/**
 * GET /api/cities
 * Returns ONLY cities the user has created — no hardcoded/seeded defaults
 * are injected here. If the DB is empty, the response is an empty list.
 * Visible to anyone who can manage customers.
 */
export async function GET() {
  const role = await getCurrentRole()
  if (!CAN_MANAGE_CUSTOMERS.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const rows = await db.city.findMany({
    orderBy: [{ name: "asc" }],
  })

  return NextResponse.json({
    items: rows.map((c) => ({
      id: c.id,
      name: c.name,
      province: c.province,
    })),
  })
}

/**
 * POST /api/cities
 * Body: { name, province? }
 * Anyone who can manage customers (admin/manager/sales) can create a city,
 * so the searchable combobox in the customer form can add a new city inline
 * when the typed text doesn't match any existing one.
 * Idempotent on name — returns the existing record if the name matches.
 */
export async function POST(req: NextRequest) {
  const role = await getCurrentRole()
  if (!CAN_MANAGE_CUSTOMERS.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }
  const province =
    typeof body.province === "string" && body.province.trim()
      ? body.province.trim()
      : null

  // Idempotent: return existing if name matches
  const existing = await db.city.findUnique({ where: { name } })
  if (existing) {
    return NextResponse.json({
      id: existing.id,
      name: existing.name,
      province: existing.province,
    })
  }

  const created = await db.city.create({
    data: { name, province },
  })

  return NextResponse.json(
    {
      id: created.id,
      name: created.name,
      province: created.province,
    },
    { status: 201 }
  )
}

