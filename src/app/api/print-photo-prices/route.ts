import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentRole, assertRole } from "@/lib/auth-helpers"
import { PHOTO_LOCATION_LABELS } from "@/lib/constants"

export const dynamic = "force-dynamic"

const PHOTO_LOCATIONS = Object.keys(PHOTO_LOCATION_LABELS) // ["studio","outdoor","customer"]

function shape(p: {
  id: string
  size: string
  paperType: string
  laminateType: string
  photoLocation: string
  isFormal: boolean
  printOrder: string
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
    isFormal: p.isFormal,
    printOrder: p.printOrder,
    price: Number(p.price.toString()), // Rials
    isActive: p.isActive,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

// GET — list all print photo prices (any authenticated role).
// Ordered by size asc, then paperType asc, then laminateType asc.
export async function GET() {
  await getCurrentRole()
  const db = await getCurrentStudioDb()
  if (!db) {
    return NextResponse.json({ error: "No studio selected" }, { status: 400 })
  }

  const rows = await db.printPhotoPrice.findMany({
    orderBy: [{ size: "asc" }, { paperType: "asc" }, { laminateType: "asc" }],
  })

  return NextResponse.json(rows.map(shape))
}

// POST — admin/manager only. Create a new print photo price.
export async function POST(req: NextRequest) {
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

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const size = String(body.size || "").trim()
  if (!size) {
    return NextResponse.json({ error: "اندازه الزامی است" }, { status: 400 })
  }

  const paperType = String(body.paperType || "").trim()
  if (!paperType) {
    return NextResponse.json({ error: "جنس کاغذ الزامی است" }, { status: 400 })
  }

  // laminateType: "none" or any non-empty custom string
  const laminateRaw = String(body.laminateType ?? "none").trim()
  const laminateType = laminateRaw === "" ? "none" : laminateRaw

  const photoLocation = String(body.photoLocation || "").trim()
  if (!PHOTO_LOCATIONS.includes(photoLocation)) {
    return NextResponse.json(
      { error: "محل عکاسی نامعتبر است (studio | outdoor | customer)" },
      { status: 400 }
    )
  }

  // price is sent in Rials (the client converts Toman → Rials via tomanToRials).
  const priceNum = Number(body.price)
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    return NextResponse.json({ error: "قیمت نامعتبر است" }, { status: 400 })
  }

  const isActive = body.isActive === undefined ? true : Boolean(body.isActive)

  // Prevent exact duplicates (same size/paper/laminate/location)
  const dup = await db.printPhotoPrice.findFirst({
    where: { size, paperType, laminateType, photoLocation },
    select: { id: true },
  })
  if (dup) {
    return NextResponse.json(
      { error: "قیمتی با همین مشخصات قبلاً ثبت شده است" },
      { status: 409 }
    )
  }

  const isFormal = Boolean(body.isFormal)
  const printOrder = ["none", "first", "second"].includes(body.printOrder) ? body.printOrder : "none"

  const created = await db.printPhotoPrice.create({
    data: {
      size,
      paperType,
      laminateType,
      photoLocation,
      isFormal,
      printOrder,
      price: priceNum,
      isActive,
    },
  })

  return NextResponse.json(shape(created), { status: 201 })
}

