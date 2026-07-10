import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { ROLES } from "@/lib/constants"

export const dynamic = "force-dynamic"

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

  const existing = await db.user.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const data: Record<string, unknown> = {}

  if (typeof body.role === "string") {
    if (!ROLES.includes(body.role as never)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }
    data.role = body.role
  }

  if (body.email !== undefined) {
    if (body.email === null || body.email === "") {
      data.email = null
    } else if (typeof body.email === "string") {
      data.email = body.email.trim()
    }
  }

  if (typeof body.isAvailable === "boolean") {
    data.isAvailable = body.isAvailable
  }

  if (typeof body.bankName === "string") {
    data.bankName = body.bankName.trim() || null
  }
  if (typeof body.iban === "string") {
    data.iban = body.iban.trim() || null
  }
  if (typeof body.cardNumber === "string") {
    data.cardNumber = body.cardNumber.trim() || null
  }
  if (typeof body.address === "string") {
    data.address = body.address.trim() || null
  }

  const updated = await db.user.update({
    where: { id },
    data,
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

  return NextResponse.json({
    id: updated.id,
    firstName: updated.firstName,
    lastName: updated.lastName,
    phone: updated.phone,
    email: updated.email,
    role: updated.role,
    isAvailable: updated.isAvailable,
    bankName: updated.bankName,
    iban: updated.iban,
    cardNumber: updated.cardNumber,
    address: updated.address,
    createdAt: updated.createdAt,
  })
}
