import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { ROLES } from "@/lib/constants"

export const dynamic = "force-dynamic"

function publicUser(u: {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  role: string
  isAvailable: boolean
  bankName: string | null
  iban: string | null
  cardNumber: string | null
  address: string | null
  createdAt: Date
}) {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone,
    email: u.email,
    role: u.role,
    isAvailable: u.isAvailable,
    bankName: u.bankName,
    iban: u.iban,
    cardNumber: u.cardNumber,
    address: u.address,
    createdAt: u.createdAt,
  }
}

// GET: admin/manager only.
export async function GET() {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const users = await db.user.findMany({
    orderBy: [{ role: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      role: true,
      isAvailable: true,
      bankName: true,
      iban: true,
      cardNumber: true,
      address: true,
      createdAt: true,
    },
  })

  return NextResponse.json(users.map(publicUser))
}

// POST: admin only.
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

  const firstName = String(body.firstName || "").trim()
  const lastName = String(body.lastName || "").trim()
  const phone = String(body.phone || "").trim()
  if (!firstName) return NextResponse.json({ error: "First name is required" }, { status: 400 })
  if (!lastName) return NextResponse.json({ error: "Last name is required" }, { status: 400 })
  if (!phone) return NextResponse.json({ error: "Phone is required" }, { status: 400 })

  const userRole = String(body.role || "")
  if (!ROLES.includes(userRole as never)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  }

  const email =
    typeof body.email === "string" && body.email.trim() ? body.email.trim() : null

  // phone uniqueness
  const dup = await db.user.findUnique({ where: { phone } })
  if (dup) {
    return NextResponse.json({ error: "A user with this phone already exists" }, { status: 409 })
  }

  const isAvailable = body.isAvailable === undefined ? true : Boolean(body.isAvailable)

  const created = await db.user.create({
    data: {
      firstName,
      lastName,
      phone,
      email,
      role: userRole,
      isAvailable,
      personalMeta: "{}",
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      role: true,
      isAvailable: true,
      bankName: true,
      iban: true,
      cardNumber: true,
      address: true,
      createdAt: true,
    },
  })

  return NextResponse.json(publicUser(created), { status: 201 })
}
