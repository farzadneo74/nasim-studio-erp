import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import {
  PACKAGE_CATEGORIES,
  PACKAGE_QUALITIES,
  PRICING_STRATEGIES,
} from "@/lib/constants"

export const dynamic = "force-dynamic"

const GET_ROLES = ["admin", "manager", "sales"]

export async function GET(req: NextRequest) {
  const role = await getCurrentRole()
  if (!GET_ROLES.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const activeOnly = searchParams.get("activeOnly") === "true"

  const where = activeOnly ? { isActive: true } : {}

  const rows = await db.servicePackage.findMany({
    where,
    orderBy: [{ category: "asc" }, { title: "asc" }],
  })

  return NextResponse.json(
    rows.map((p) => ({
      id: p.id,
      title: p.title,
      quality: p.quality,
      category: p.category,
      basePrice: Number(p.basePrice),
      currentPrice: Number(p.currentPrice),
      pricingStrategy: normalizeStrategy(p.pricingStrategy),
      defaultDescription: p.defaultDescription,
      defaultTasks: safeParseTasks(p.defaultTasks),
      defaultEquipment: safeParseStringArray(p.defaultEquipment),
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }))
  )
}

/**
 * Legacy "fixed" strategy is treated as "variable" everywhere now.
 * This keeps old DB rows (which may still have strategy="fixed") compatible
 * with the new pricing engine and UI.
 */
function normalizeStrategy(s: string): string {
  return s === "delayed" ? "delayed" : "variable"
}

function safeParseTasks(s: string | null): string[] {
  if (!s) return []
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

function safeParseStringArray(s: string | null | undefined): string[] {
  if (!s) return []
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
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

  const title = String(body.title || "").trim()
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 })

  const category = String(body.category || "")
  if (!PACKAGE_CATEGORIES.includes(category as never)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 })
  }

  const pricingStrategyRaw = String(body.pricingStrategy || "")
  // Legacy "fixed" strategy is upgraded to "variable" silently.
  const pricingStrategy =
    pricingStrategyRaw === "delayed"
      ? "delayed"
      : pricingStrategyRaw === "variable" || pricingStrategyRaw === "fixed"
        ? "variable"
        : ""
  if (!pricingStrategy || !PRICING_STRATEGIES.includes(pricingStrategy as never)) {
    return NextResponse.json({ error: "Invalid pricing strategy" }, { status: 400 })
  }

  const qualityRaw = String(body.quality || "fullhd")
  const quality = PACKAGE_QUALITIES.includes(qualityRaw as never)
    ? qualityRaw
    : "fullhd"

  const basePrice = Number(body.basePrice)
  const currentPrice = Number(body.currentPrice)
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    return NextResponse.json({ error: "Invalid base price" }, { status: 400 })
  }
  if (!Number.isFinite(currentPrice) || currentPrice < 0) {
    return NextResponse.json({ error: "Invalid current price" }, { status: 400 })
  }

  const defaultDescription =
    typeof body.defaultDescription === "string" && body.defaultDescription.trim()
      ? body.defaultDescription.trim()
      : null

  const tasks = Array.isArray(body.defaultTasks)
    ? body.defaultTasks.map(String).filter((s) => s.trim().length > 0)
    : []

  const equipment = Array.isArray(body.defaultEquipment)
    ? body.defaultEquipment.map(String).filter((s) => s.trim().length > 0)
    : []

  const isActive = body.isActive === undefined ? true : Boolean(body.isActive)

  const created = await db.servicePackage.create({
    data: {
      title,
      quality,
      category,
      basePrice,
      currentPrice,
      pricingStrategy,
      defaultDescription,
      defaultTasks: JSON.stringify(tasks),
      defaultEquipment: JSON.stringify(equipment),
      isActive,
    },
  })

  return NextResponse.json(
    {
      id: created.id,
      title: created.title,
      quality: created.quality,
      category: created.category,
      basePrice: Number(created.basePrice),
      currentPrice: Number(created.currentPrice),
      pricingStrategy: created.pricingStrategy,
      defaultDescription: created.defaultDescription,
      defaultTasks: safeParseTasks(created.defaultTasks),
      defaultEquipment: safeParseStringArray(created.defaultEquipment),
      isActive: created.isActive,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    },
    { status: 201 }
  )
}
// trigger recompile 1783508240386221699
