import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

// GET: admin/manager.
export async function GET() {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const rows = await db.systemSetting.findMany({
    orderBy: { key: "asc" },
  })

  return NextResponse.json(
    rows.map((s) => ({
      id: s.id,
      key: s.key,
      value: s.value,
    }))
  )
}

// PATCH: admin only. Body: { key, value } — upserts a setting (value should be a JSON string).
export async function PATCH(req: NextRequest) {
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

  const key = String(body.key || "").trim()
  if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 })

  let valueStr: string
  if (typeof body.value === "string") {
    valueStr = body.value
  } else {
    // Accept structured payloads too — store as JSON string.
    try {
      valueStr = JSON.stringify(body.value)
    } catch {
      return NextResponse.json({ error: "Invalid value" }, { status: 400 })
    }
  }

  const upserted = await db.systemSetting.upsert({
    where: { key },
    update: { value: valueStr },
    create: { key, value: valueStr },
  })

  return NextResponse.json({
    id: upserted.id,
    key: upserted.key,
    value: upserted.value,
  })
}
