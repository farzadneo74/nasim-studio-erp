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
      // ✅ اطلاعات پروژه مرتبط
      relatedProject: {
        select: {
          id: true,
          contract: { select: { contractNumber: true } },
          servicePackage: { select: { title: true } },
        },
      },
    },
  })

  // ✅ Lookup referrer customers in a single query (avoid N+1).
  const referrerIds = Array.from(
    new Set(
      txs
        .map((t) => (t as any).referrerCustomerId)
        .filter((rid): rid is string => typeof rid === "string" && rid.length > 0)
    )
  )
  const referrerMap = new Map<string, { id: string; name: string; phone: string }>()
  if (referrerIds.length > 0) {
    try {
      const referrers = await db.customer.findMany({
        where: { id: { in: referrerIds } },
        select: { id: true, name: true, phone: true },
      })
      for (const r of referrers) {
        referrerMap.set(r.id, { id: r.id, name: r.name, phone: r.phone })
      }
    } catch {
      // ignore — leave map empty
    }
  }

  return NextResponse.json({
    items: txs.map((t) => {
      const refId = (t as any).referrerCustomerId as string | null
      const ref = refId ? referrerMap.get(refId) ?? null : null
      const proj = (t as any).relatedProject
      return {
        id: t.id,
        amount: Number(t.amount),
        transactionType: t.transactionType,
        note: t.note,
        contractNumber: t.relatedContract?.contractNumber ?? null,
        // ✅ اطلاعات معرف و پروژه مرتبط
        referrerCustomerId: refId ?? null,
        referrerCustomerName: ref?.name ?? null,
        referrerCustomerPhone: ref?.phone ?? null,
        relatedProjectId: (t as any).relatedProjectId ?? null,
        relatedProject: proj
          ? {
              id: proj.id,
              contractNumber: proj.contract?.contractNumber ?? null,
              packageTitle: proj.servicePackage?.title ?? null,
            }
          : null,
        createdBy: t.createdBy
          ? `${t.createdBy.firstName} ${t.createdBy.lastName}`.trim()
          : null,
        createdAt: t.createdAt,
        isSettled: (t as any).isSettled ?? false,
        settledAt: (t as any).settledAt ?? null,
      }
    }),
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

