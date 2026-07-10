import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

// Roles that may browse QR templates (read-only for non-admins)
const GET_ROLES = ["admin", "manager", "sales"]

function safeParseLayoutConfig(s: string | null): Record<string, unknown> {
  if (!s) return {}
  try {
    const v = JSON.parse(s)
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function shape(t: {
  id: string
  name: string
  discountPercent: number
  maxUses: number
  pixelSize: number
  dpi: number
  layoutConfig: string
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}) {
  const layout = safeParseLayoutConfig(t.layoutConfig)
  // pixelSize is the OUTPUT CANVAS WIDTH. Height lives in layoutConfig.height.
  // For legacy rows that only stored an aspect, derive height from width.
  const width = t.pixelSize
  const rawHeight = typeof layout.height === "number" ? layout.height : undefined
  const height =
    rawHeight && Number.isFinite(rawHeight) && rawHeight > 0
      ? Math.max(64, Math.min(4000, Math.round(rawHeight)))
      : layout.aspect === "square"
      ? width
      : Math.round(width * 1.4)
  return {
    id: t.id,
    name: t.name,
    discountPercent: t.discountPercent,
    maxUses: t.maxUses,
    pixelSize: t.pixelSize,
    width,
    height,
    dpi: t.dpi,
    layoutConfig: layout,
    description: t.description ?? null,
    isActive: t.isActive,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }
}

// GET /api/qr-templates?activeOnly=true
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

  const rows = await db.qrTemplate.findMany({
    where,
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  })

  return NextResponse.json(rows.map(shape))
}

interface CreateBody {
  name?: string
  discountPercent?: number
  maxUses?: number
  pixelSize?: number
  width?: number
  height?: number
  dpi?: number
  layoutConfig?: Record<string, unknown> | null
  description?: string | null
  isActive?: boolean
}

// POST /api/qr-templates {name, discountPercent, maxUses, width, height, dpi, layoutConfig?, description?, isActive?}
//
// The OUTPUT CANVAS is defined by two independent pixel dimensions:
//   - width  → stored in `pixelSize` (DB column)
//   - height → stored in `layoutConfig.height` (JSON field)
// Both are required for precise control of the print/export canvas. The QR
// code itself is rendered at a fixed 45% of the canvas width.
//
// Backward-compat: if a legacy client sends only `pixelSize`, it is treated
// as the width and height is derived as width × 1.4 (portrait default).
export async function POST(req: NextRequest) {
  const role = await getCurrentRole()
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const body = (await req.json().catch(() => ({}))) as CreateBody

  const name = String(body.name || "").trim()
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }
  if (name.length > 80) {
    return NextResponse.json({ error: "Name too long (max 80)" }, { status: 400 })
  }

  const discountPercent = Number(body.discountPercent ?? 10)
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    return NextResponse.json({ error: "Invalid discountPercent (0..100)" }, { status: 400 })
  }

  const maxUses = Math.max(1, Math.min(1000, Number(body.maxUses ?? 1)))
  if (!Number.isFinite(maxUses)) {
    return NextResponse.json({ error: "Invalid maxUses" }, { status: 400 })
  }

  // Width (output canvas WIDTH) — allow up to 4000px for print-quality exports.
  // `width` is preferred; fall back to `pixelSize` for legacy clients.
  const rawWidth = body.width !== undefined ? Number(body.width) : Number(body.pixelSize ?? 1200)
  const width = Math.max(64, Math.min(4000, Math.round(rawWidth)))
  if (!Number.isFinite(width)) {
    return NextResponse.json({ error: "Invalid width" }, { status: 400 })
  }

  // Height (output canvas HEIGHT) — independent of width.
  // If omitted, default to portrait (width × 1.4) for backward compatibility.
  const inlineHeight =
    body.layoutConfig &&
    typeof body.layoutConfig === "object" &&
    !Array.isArray(body.layoutConfig) &&
    typeof (body.layoutConfig as Record<string, unknown>).height === "number"
      ? Number((body.layoutConfig as Record<string, unknown>).height)
      : undefined
  const rawHeight =
    body.height !== undefined
      ? Number(body.height)
      : inlineHeight !== undefined
      ? inlineHeight
      : Math.round(width * 1.4)
  const height = Math.max(64, Math.min(4000, Math.round(rawHeight)))
  if (!Number.isFinite(height)) {
    return NextResponse.json({ error: "Invalid height" }, { status: 400 })
  }

  const dpi = Math.max(72, Math.min(600, Number(body.dpi ?? 150)))
  if (!Number.isFinite(dpi)) {
    return NextResponse.json({ error: "Invalid dpi" }, { status: 400 })
  }

  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim().slice(0, 500)
      : null

  // Merge user-supplied layoutConfig with the computed height so we don't
  // clobber other layout fields (colors, fonts, etc.) if they ever exist.
  const userLayout =
    body.layoutConfig &&
    typeof body.layoutConfig === "object" &&
    !Array.isArray(body.layoutConfig)
      ? (body.layoutConfig as Record<string, unknown>)
      : {}
  // Drop any legacy `aspect` since width + height are now authoritative.
  const { aspect: _dropAspect, ...restLayout } = userLayout
  const layoutConfig = JSON.stringify({ ...restLayout, height })

  const isActive = body.isActive === undefined ? true : Boolean(body.isActive)

  const created = await db.qrTemplate.create({
    data: {
      name,
      discountPercent,
      maxUses,
      pixelSize: width,
      dpi,
      layoutConfig,
      description,
      isActive,
    },
  })

  return NextResponse.json(shape(created), { status: 201 })
}
