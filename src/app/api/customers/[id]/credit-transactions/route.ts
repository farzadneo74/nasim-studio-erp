import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { PrismaClient } from "@prisma/client"
import type { Role } from "@/lib/constants"

export const dynamic = "force-dynamic"

/** Resolve first user of the given role (used as the "current user" in demo mode). */
async function getUserIdByRole(db: PrismaClient, role: Role): Promise<string | null> {
  const u = await db.user.findFirst({ where: { role }, select: { id: true } })
  return u?.id ?? null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole()
  if (!["admin", "manager"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params

  const customer = await db.customer.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 })

  const txs = await db.creditTransaction.findMany({
    where: { customerId: id },
    orderBy: { createdAt: "desc" },
    include: {
      relatedContract: { select: { contractNumber: true } },
      createdBy: { select: { firstName: true, lastName: true } },
    },
  })

  return NextResponse.json({
    items: txs.map((t) => ({
      id: t.id,
      amount: Number(t.amount),
      transactionType: t.transactionType,
      note: t.note,
      contractNumber: t.relatedContract?.contractNumber ?? null,
      createdBy: t.createdBy
        ? `${t.createdBy.firstName} ${t.createdBy.lastName}`.trim()
        : null,
      createdAt: t.createdAt,
    })),
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole()
  if (!["admin", "manager"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params

  const customer = await db.customer.findUnique({
    where: { id },
    select: { id: true, creditBalance: true },
  })
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount === 0) {
    return NextResponse.json({ error: "Amount must be a non-zero number" }, { status: 400 })
  }
  const note = typeof body.note === "string" ? body.note.trim() : ""

  // Resolve current user (first user of current role) for attribution.
  const createdById = await getUserIdByRole(db, role as Role)

  // Create the credit transaction. createdById is a String scalar known to the
  // runtime Prisma client; if not (stale client), create without it and patch
  // via raw SQL.
  let tx: any
  try {
    tx = await db.creditTransaction.create({
      data: {
        customerId: id,
        amount,
        transactionType: "manual_adjustment",
        note: note || null,
        createdById: createdById ?? null,
      },
    })
  } catch {
    tx = await db.creditTransaction.create({
      data: {
        customerId: id,
        amount,
        transactionType: "manual_adjustment",
        note: note || null,
      },
    })
    if (createdById) {
      try {
        await db.$executeRawUnsafe(
          `UPDATE CreditTransaction SET createdById = ? WHERE id = ?`,
          createdById,
          tx.id
        )
      } catch {
        // ignore — leave createdById null
      }
    }
  }

  // Update customer's credit balance (sign-aware increment; negative amounts subtract).
  await db.customer.update({
    where: { id },
    data: { creditBalance: { increment: amount } },
  })

  return NextResponse.json({
    id: tx.id,
    amount: Number(tx.amount),
    transactionType: tx.transactionType,
    note: tx.note,
    createdById: createdById ?? null,
    createdAt: tx.createdAt,
  }, { status: 201 })
}
