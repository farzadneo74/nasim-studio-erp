import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

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

// PATCH /api/qr-templates/[id]
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
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>

  const existing = await db.qrTemplate.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 })
  }

  const data: Record<string, unknown> = {}

  if (typeof body.name === "string") {
    const n = body.name.trim()
    if (!n) return NextResponse.json({ error: "Name is required" }, { status: 400 })
    if (n.length > 80) return NextResponse.json({ error: "Name too long (max 80)" }, { status: 400 })
    data.name = n
  }

  if (body.discountPercent !== undefined) {
    const v = Number(body.discountPercent)
    if (!Number.isFinite(v) || v < 0 || v > 100) {
      return NextResponse.json({ error: "Invalid discountPercent" }, { status: 400 })
    }
    data.discountPercent = v
  }

  if (body.maxUses !== undefined) {
    const v = Math.max(1, Math.min(1000, Number(body.maxUses)))
    if (!Number.isFinite(v)) return NextResponse.json({ error: "Invalid maxUses" }, { status: 400 })
    data.maxUses = v
  }

  // Compute the next layoutConfig BEFORE we write data so width + height
  // always land in their canonical columns together.
  // pixelSize = OUTPUT CANVAS WIDTH, layoutConfig.height = OUTPUT CANVAS HEIGHT.
  const nextWidth =
    body.width !== undefined
      ? Math.max(64, Math.min(4000, Math.round(Number(body.width))))
      : body.pixelSize !== undefined
      ? Math.max(64, Math.min(4000, Math.round(Number(body.pixelSize))))
      : existing.pixelSize
  if (!Number.isFinite(nextWidth)) {
    return NextResponse.json({ error: "Invalid width" }, { status: 400 })
  }

  // Resolve the existing height from the stored layoutConfig (if any), else
  // derive from the existing width.
  const existingLayout = safeParseLayoutConfig(existing.layoutConfig)
  const existingHeight =
    typeof existingLayout.height === "number" &&
    Number.isFinite(existingLayout.height) &&
    existingLayout.height > 0
      ? existingLayout.height
      : existingLayout.aspect === "square"
      ? existing.pixelSize
      : Math.round(existing.pixelSize * 1.4)

  // Pull `height` out of an inline layoutConfig object on the request body
  // (so a client can still send `{ layoutConfig: { height: 1000 } }`).
  const inlineLayoutHeight =
    body.layoutConfig &&
    typeof body.layoutConfig === "object" &&
    !Array.isArray(body.layoutConfig) &&
    typeof (body.layoutConfig as Record<string, unknown>).height === "number"
      ? Number((body.layoutConfig as Record<string, unknown>).height)
      : undefined

  const nextHeight = Math.max(
    64,
    Math.min(
      4000,
      Math.round(
        body.height !== undefined
          ? Number(body.height)
          : inlineLayoutHeight !== undefined
          ? inlineLayoutHeight
          : existingHeight
      )
    )
  )
  if (!Number.isFinite(nextHeight)) {
    return NextResponse.json({ error: "Invalid height" }, { status: 400 })
  }

  if (body.width !== undefined || body.pixelSize !== undefined) {
    data.pixelSize = nextWidth
  }

  if (body.dpi !== undefined) {
    const v = Math.max(72, Math.min(600, Number(body.dpi)))
    if (!Number.isFinite(v)) return NextResponse.json({ error: "Invalid dpi" }, { status: 400 })
    data.dpi = v
  }

  if (typeof body.description === "string") {
    data.description = body.description.trim().slice(0, 500) || null
  }

  // Merge the computed height into the user-supplied layoutConfig (if any).
  // Width/height are now authoritative — drop any legacy `aspect` key.
  const userLayout =
    body.layoutConfig &&
    typeof body.layoutConfig === "object" &&
    !Array.isArray(body.layoutConfig)
      ? (body.layoutConfig as Record<string, unknown>)
      : existingLayout
  const { aspect: _dropAspect, ...restLayout } = userLayout
  // Always persist the resolved height so future reads are deterministic.
  data.layoutConfig = JSON.stringify({ ...restLayout, height: nextHeight })

  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive
  }

  const updated = await db.qrTemplate.update({ where: { id }, data })
  return NextResponse.json(shape(updated))
}

// DELETE /api/qr-templates/[id]
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

  const existing = await db.qrTemplate.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 })
  }

  await db.qrTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
