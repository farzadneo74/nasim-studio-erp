import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import {
  PACKAGE_CATEGORIES,
  PACKAGE_QUALITIES,
} from "@/lib/constants"

export const dynamic = "force-dynamic"

/**
 * Pricing strategy is NOT editable after creation. This function is only
 * used to normalize legacy DB rows that may still carry the legacy "fixed"
 * value — those are upgraded to "variable" for backward compat (legacy
 * "fixed" was treated as "variable" in the old engine). The new "fixed"
 * strategy is a first-class option and is preserved as-is.
 */
function normalizeStrategy(s: string): string {
  if (s === "fixed" || s === "variable" || s === "delayed") return s
  // Legacy "fixed" rows from before the new engine upgrade → variable.
  return "variable"
}

function safeParseItems(s: string | null | undefined): Array<{ name: string; price: number }> {
  if (!s) return []
  try {
    const v = JSON.parse(s)
    if (!Array.isArray(v)) return []
    return v.map((item: any) => {
      if (typeof item === "string") return { name: item, price: 0 }
      if (typeof item === "object" && item !== null) {
        return { name: String(item.name ?? ""), price: Number(item.price ?? 0) || 0 }
      }
      return { name: String(item), price: 0 }
    }).filter((item) => item.name.trim().length > 0)
  } catch {
    return []
  }
}

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

  const existing = await db.servicePackage.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 })
  }

  const data: Record<string, unknown> = {}

  if (typeof body.title === "string") {
    const t = body.title.trim()
    if (!t) return NextResponse.json({ error: "Title is required" }, { status: 400 })
    data.title = t
  }

  if (typeof body.category === "string") {
    if (!PACKAGE_CATEGORIES.includes(body.category as never)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 })
    }
    data.category = body.category
  }

  if (typeof body.quality === "string") {
    data.quality = PACKAGE_QUALITIES.includes(body.quality as never)
      ? body.quality
      : "fullhd"
  }

  // ✅ pricingStrategy is NOT editable after creation — silently ignore it
  // (per product decision: "استراتژی قیمت‌گذاری بعد از ایجاد قابل تغییر نیست").
  // The check below intentionally does nothing with body.pricingStrategy.

  if (body.basePrice !== undefined) {
    const v = Number(body.basePrice)
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: "Invalid base price" }, { status: 400 })
    }
    data.basePrice = v
  }

  if (body.currentPrice !== undefined) {
    const v = Number(body.currentPrice)
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: "Invalid current price" }, { status: 400 })
    }
    data.currentPrice = v
  }

  if (typeof body.defaultDescription === "string") {
    data.defaultDescription = body.defaultDescription.trim() || null
  }

  if (Array.isArray(body.defaultTasks)) {
    const tasks = body.defaultTasks.map((t: any) => {
      if (typeof t === "string") return { name: t.trim(), price: 0 }
      if (typeof t === "object" && t !== null) {
        return { name: String(t.name ?? "").trim(), price: Number(t.price ?? 0) || 0 }
      }
      return null
    }).filter((t: any) => t && t.name.length > 0)
    data.defaultTasks = JSON.stringify(tasks)
  }

  if (Array.isArray(body.defaultEquipment)) {
    const equipment = body.defaultEquipment.map((t: any) => {
      if (typeof t === "string") return { name: t.trim(), price: 0 }
      if (typeof t === "object" && t !== null) {
        return { name: String(t.name ?? "").trim(), price: Number(t.price ?? 0) || 0 }
      }
      return null
    }).filter((t: any) => t && t.name.length > 0)
    data.defaultEquipment = JSON.stringify(equipment)
  }

  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive
  }

  // ✅ سود معرف پیش‌فرض — Toman (از UI) → Rials (در DB)
  if (body.defaultReferralReward !== undefined) {
    const toman = Math.max(0, Number(body.defaultReferralReward || 0))
    data.defaultReferralReward = toman * 10
  }

  const updated = await db.servicePackage.update({ where: { id }, data })

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    quality: updated.quality,
    category: updated.category,
    basePrice: Number(updated.basePrice),
    currentPrice: Number(updated.currentPrice),
    pricingStrategy: normalizeStrategy(updated.pricingStrategy),
    defaultDescription: updated.defaultDescription,
    defaultTasks: safeParseItems(updated.defaultTasks),
    defaultEquipment: safeParseItems(updated.defaultEquipment),
    defaultReferralReward: Number(updated.defaultReferralReward ?? 0),
    isActive: updated.isActive,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
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

  const existing = await db.servicePackage.findUnique({
    where: { id },
    select: { id: true, projects: { select: { id: true }, take: 1 } },
  })
  if (!existing) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 })
  }

  if (existing.projects.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete a package that has existing projects" },
      { status: 409 }
    )
  }

  await db.servicePackage.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

