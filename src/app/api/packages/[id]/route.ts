import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import {
  PACKAGE_CATEGORIES,
  PACKAGE_QUALITIES,
  PRICING_STRATEGIES,
} from "@/lib/constants"

export const dynamic = "force-dynamic"

/**
 * Legacy "fixed" strategy is treated as "variable" everywhere now.
 * Old DB rows (still strategy="fixed") stay compatible via this normalizer.
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

  if (typeof body.pricingStrategy === "string") {
    // Legacy "fixed" is silently upgraded to "variable".
    const normalized =
      body.pricingStrategy === "delayed"
        ? "delayed"
        : body.pricingStrategy === "variable" || body.pricingStrategy === "fixed"
          ? "variable"
          : ""
    if (!normalized || !PRICING_STRATEGIES.includes(normalized as never)) {
      return NextResponse.json({ error: "Invalid pricing strategy" }, { status: 400 })
    }
    data.pricingStrategy = normalized
  }

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
    const tasks = body.defaultTasks.map(String).filter((s) => s.trim().length > 0)
    data.defaultTasks = JSON.stringify(tasks)
  }

  if (Array.isArray(body.defaultEquipment)) {
    const equipment = body.defaultEquipment
      .map(String)
      .filter((s) => s.trim().length > 0)
    data.defaultEquipment = JSON.stringify(equipment)
  }

  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive
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
    defaultTasks: safeParseTasks(updated.defaultTasks),
    defaultEquipment: safeParseStringArray(updated.defaultEquipment),
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

