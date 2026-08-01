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
      // ✅ اطلاعات پروژه مرتبط
      relatedProject: {
        select: {
          id: true,
          contract: { select: { contractNumber: true } },
          servicePackage: { select: { title: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // ✅ Batch-lookup referrer customers to avoid N+1 queries.
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
      // ignore
    }
  }

  return NextResponse.json(
    txs.map((t) => {
      const refId = (t as any).referrerCustomerId as string | null
      const ref = refId ? referrerMap.get(refId) ?? null : null
      const proj = (t as any).relatedProject
      return {
        id: t.id,
        customerId: t.customerId,
        amount: Number(t.amount),
        transactionType: t.transactionType,
        note: t.note,
        createdAt: t.createdAt,
        isSettled: (t as any).isSettled ?? false,
        settledAt: (t as any).settledAt ?? null,
        customer: {
          id: t.customer.id,
          name: t.customer.name,
          phone: t.customer.phone,
          creditBalance: Number(t.customer.creditBalance),
        },
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
      }
    })
  )
}

