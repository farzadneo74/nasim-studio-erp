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
      defaultTasks: safeParseItems(p.defaultTasks),
      defaultEquipment: safeParseItems(p.defaultEquipment),
      // ✅ سود معرف پیش‌فرض (Rials) → تبدیل به Toman در response (÷10)
      defaultReferralReward: Number(p.defaultReferralReward ?? 0),
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }))
  )
}

/**
 * Normalize pricing strategy — preserve the canonical strategies. Legacy
 * values from before the engine upgrade (e.g. old "fixed") are silently
 * upgraded to "variable" for backward compat.
 */
function normalizeStrategy(s: string): string {
  if (s === "fixed" || s === "variable" || s === "delayed") return s
  return "variable"
}

/**
 * Parse tasks/equipment JSON. Supports both legacy string arrays and new
 * {name, price} object arrays.
 */
function safeParseItems(s: string | null | undefined): Array<{ name: string; price: number }> {
  if (!s) return []
  try {
    const v = JSON.parse(s)
    if (!Array.isArray(v)) return []
    return v.map((item: any) => {
      if (typeof item === "string") return { name: item, price: 0 }
      if (typeof item === "object" && item !== null) {
        return {
          name: String(item.name ?? ""),
          price: Number(item.price ?? 0) || 0,
        }
      }
      return { name: String(item), price: 0 }
    }).filter((item) => item.name.trim().length > 0)
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
  // ✅ Accept canonical strategies: fixed | variable | delayed. Legacy rows
  // are upgraded via normalizeStrategy, but new POSTs accept "fixed" as a
  // first-class strategy.
  const pricingStrategy = PRICING_STRATEGIES.includes(pricingStrategyRaw as never)
    ? pricingStrategyRaw
    : ""
  if (!pricingStrategy) {
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

  // ✅ از این پس tasks و equipment به‌صورت {name, price} ذخیره می‌شن
  // اما با backward-compat: اگه string فرستاده شد، به {name, price: 0} تبدیل می‌شه
  const tasks = Array.isArray(body.defaultTasks)
    ? body.defaultTasks.map((t: any) => {
        if (typeof t === "string") return { name: t.trim(), price: 0 }
        if (typeof t === "object" && t !== null) {
          return { name: String(t.name ?? "").trim(), price: Number(t.price ?? 0) || 0 }
        }
        return null
      }).filter((t: any) => t && t.name.length > 0)
    : []

  const equipment = Array.isArray(body.defaultEquipment)
    ? body.defaultEquipment.map((t: any) => {
        if (typeof t === "string") return { name: t.trim(), price: 0 }
        if (typeof t === "object" && t !== null) {
          return { name: String(t.name ?? "").trim(), price: Number(t.price ?? 0) || 0 }
        }
        return null
      }).filter((t: any) => t && t.name.length > 0)
    : []

  const isActive = body.isActive === undefined ? true : Boolean(body.isActive)

  // ✅ سود معرف پیش‌فرض — Toman (از UI) → Rials (در DB)
  const referralRewardToman = Math.max(0, Number(body.defaultReferralReward || 0))
  const referralRewardRials = referralRewardToman * 10

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
      defaultReferralReward: referralRewardRials,
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
      defaultTasks: safeParseItems(created.defaultTasks),
      defaultEquipment: safeParseItems(created.defaultEquipment),
      defaultReferralReward: Number(created.defaultReferralReward ?? 0),
      isActive: created.isActive,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    },
    { status: 201 }
  )
}
// trigger recompile 1783508240386221699

