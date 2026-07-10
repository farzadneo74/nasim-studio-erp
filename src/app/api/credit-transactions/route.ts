import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { CREDIT_TX_TYPES } from "@/lib/constants"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export async function GET(req: Request) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return forbidden()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const url = new URL(req.url)
  const customerId = url.searchParams.get("customerId")
  const transactionType = url.searchParams.get("transactionType")
  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")

  const where: Record<string, unknown> = {}
  if (customerId) where.customerId = customerId
  if (transactionType && CREDIT_TX_TYPES.includes(transactionType as never)) {
    where.transactionType = transactionType
  }
  if (from || to) {
    where.createdAt = {}
    if (from) (where.createdAt as { gte?: Date }).gte = new Date(from)
    if (to) (where.createdAt as { lte?: Date }).lte = new Date(to)
  }

  const txs = await db.creditTransaction.findMany({
    where,
    include: {
      customer: true,
      relatedContract: true,
      createdBy: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(
    txs.map((t) => ({
      id: t.id,
      customerId: t.customerId,
      amount: Number(t.amount),
      transactionType: t.transactionType,
      note: t.note,
      createdAt: t.createdAt,
      customer: {
        id: t.customer.id,
        name: t.customer.name,
        phone: t.customer.phone,
        creditBalance: Number(t.customer.creditBalance),
      },
      relatedContract: t.relatedContract
        ? {
            id: t.relatedContract.id,
            contractNumber: t.relatedContract.contractNumber,
          }
        : null,
      createdBy: t.createdBy
        ? {
            id: t.createdBy.id,
            name: `${t.createdBy.firstName} ${t.createdBy.lastName}`,
          }
        : null,
    }))
  )
}
