import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentRole, assertRole } from "@/lib/auth-helpers"
import { PHOTO_LOCATION_LABELS } from "@/lib/constants"

export const dynamic = "force-dynamic"

const PHOTO_LOCATIONS = Object.keys(PHOTO_LOCATION_LABELS)

function shape(p: {
  id: string
  size: string
  paperType: string
  laminateType: string
  photoLocation: string
  price: { toString(): string }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: p.id,
    size: p.size,
    paperType: p.paperType,
    laminateType: p.laminateType,
    photoLocation: p.photoLocation,
    price: Number(p.price.toString()),
    isActive: p.isActive,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

// PATCH — admin/manager only. Update any subset of fields.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole()
  try {
    assertRole(role, ["admin", "manager"])
  } catch {
    return NextResponse.json({ error: "Forbidden: admin/manager only" }, { status: 403 })
  }

  const db = await getCurrentStudioDb()
  if (!db) {
    return NextResponse.json({ error: "No studio selected" }, { status: 400 })
  }

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const existing = await db.printPhotoPrice.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "قیمت یافت نشد" }, { status: 404 })
  }

  const data: Record<string, unknown> = {}

  if (typeof body.size === "string") {
    const v = body.size.trim()
    if (!v) {
      return NextResponse.json({ error: "اندازه نمی‌تواند خالی باشد" }, { status: 400 })
    }
    data.size = v
  }

  if (typeof body.paperType === "string") {
    const v = body.paperType.trim()
    if (!v) {
      return NextResponse.json({ error: "جنس کاغذ نمی‌تواند خالی باشد" }, { status: 400 })
    }
    data.paperType = v
  }

  if (typeof body.laminateType === "string") {
    const v = body.laminateType.trim()
    data.laminateType = v === "" ? "none" : v
  }

  if (typeof body.photoLocation === "string") {
    if (!PHOTO_LOCATIONS.includes(body.photoLocation)) {
      return NextResponse.json(
        { error: "محل عکاسی نامعتبر است" },
        { status: 400 }
      )
    }
    data.photoLocation = body.photoLocation
  }

  if (body.price !== undefined) {
    const v = Number(body.price)
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: "قیمت نامعتبر است" }, { status: 400 })
    }
    data.price = v
  }

  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive
  }

  // Duplicate check (excluding the current row) if any identity field changed
  const identityChanged =
    "size" in data || "paperType" in data || "laminateType" in data || "photoLocation" in data
  if (identityChanged) {
    const size = (data.size as string) ?? existing.size
    const paperType = (data.paperType as string) ?? existing.paperType
    const laminateType = (data.laminateType as string) ?? existing.laminateType
    const photoLocation = (data.photoLocation as string) ?? existing.photoLocation
    const dup = await db.printPhotoPrice.findFirst({
      where: {
        size,
        paperType,
        laminateType,
        photoLocation,
        id: { not: id },
      },
      select: { id: true },
    })
    if (dup) {
      return NextResponse.json(
        { error: "قیمتی با همین مشخصات قبلاً ثبت شده است" },
        { status: 409 }
      )
    }
  }

  const updated = await db.printPhotoPrice.update({ where: { id }, data })
  return NextResponse.json(shape(updated))
}

// DELETE — admin/manager only. Hard delete.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole()
  try {
    assertRole(role, ["admin", "manager"])
  } catch {
    return NextResponse.json({ error: "Forbidden: admin/manager only" }, { status: 403 })
  }

  const db = await getCurrentStudioDb()
  if (!db) {
    return NextResponse.json({ error: "No studio selected" }, { status: 400 })
  }

  const { id } = await params

  const existing = await db.printPhotoPrice.findUnique({
    where: { id },
    select: { id: true, projectPhotos: { select: { id: true }, take: 1 } },
  })
  if (!existing) {
    return NextResponse.json({ error: "قیمت یافت نشد" }, { status: 404 })
  }

  if (existing.projectPhotos.length > 0) {
    return NextResponse.json(
      { error: "این قیمت در پروژه‌های چاپ عکس استفاده شده و قابل حذف نیست" },
      { status: 409 }
    )
  }

  await db.printPhotoPrice.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
