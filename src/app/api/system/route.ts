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

// PUT: admin only. Bulk-upsert multiple settings at once.
// Body: { settings: { [key: string]: any } } — each value is JSON-stringified before storage.
// Common keys include:
//   - referral_strategy ("none" | "fixed" | "percent" | "per_project")
//   - referral_fixed_amount_toman (number)
//   - referral_percent (number)
//   - referral_percent_duration_days (number)
//   - usd_rate_toman (number)
// Returns the updated map of saved keys → values.
export async function PUT(req: NextRequest) {
  const role = await getCurrentRole()
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
  }
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // Accept either { settings: { ... } } or a flat object of key/value pairs.
  const incoming =
    body.settings && typeof body.settings === "object" && !Array.isArray(body.settings)
      ? (body.settings as Record<string, unknown>)
      : (() => {
          // Treat the body itself as a flat map of settings (excluding known non-setting keys).
          const out: Record<string, unknown> = {}
          for (const [k, v] of Object.entries(body)) {
            if (k === "settings") continue
            out[k] = v
          }
          return out
        })()

  if (Object.keys(incoming).length === 0) {
    return NextResponse.json({ error: "No settings provided" }, { status: 400 })
  }

  // Whitelist the recognized referral/credit keys (plus usd_rate_toman) to avoid
  // accidental overwrites of unrelated system settings (e.g. studio_logo).
  const ALLOWED_KEYS = new Set([
    "referral_strategy",
    "referral_fixed_amount_toman",
    "referral_percent",
    "referral_percent_duration_days",
    "usd_rate_toman",
  ])

  // Validate referral_strategy enum if present.
  if ("referral_strategy" in incoming) {
    const v = String(incoming.referral_strategy)
    if (!["none", "fixed", "percent", "per_project"].includes(v)) {
      return NextResponse.json(
        { error: "Invalid referral_strategy. Must be one of: none, fixed, percent, per_project" },
        { status: 400 }
      )
    }
  }

  const saved: Record<string, string> = {}
  for (const [key, rawValue] of Object.entries(incoming)) {
    if (!ALLOWED_KEYS.has(key)) continue // silently skip unknown keys
    let valueStr: string
    if (typeof rawValue === "string") {
      // Try to detect a JSON-stringified value; otherwise treat as a plain string.
      valueStr = rawValue
    } else {
      try {
        valueStr = JSON.stringify(rawValue)
      } catch {
        continue
      }
    }
    await db.systemSetting.upsert({
      where: { key },
      update: { value: valueStr },
      create: { key, value: valueStr },
    })
    saved[key] = valueStr
  }

  return NextResponse.json({ ok: true, saved })
}

