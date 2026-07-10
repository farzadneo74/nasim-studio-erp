import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { getEffectivePrice } from "@/lib/pricing"
import { CAN_ACCESS_FULL_FINANCE, CAN_SEE_BALANCE, CAN_MANAGE_CUSTOMERS } from "@/lib/constants"

// GET /api/customers/[id]/projects
// Returns the customer's projects with payments/balance + customer's notes.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id } = await params
  const seeFinance = CAN_ACCESS_FULL_FINANCE.includes(role)
  const seeBalance = CAN_SEE_BALANCE.includes(role)

  const customer = await db.customer.findUnique({
    where: { id },
    include: { tags: true, referrer: true, referred: true, notes: { orderBy: { createdAt: "desc" } } },
  })
  if (!customer) return NextResponse.json({ error: "not_found" }, { status: 404 })

  // Fetch the customer's notes via raw SQL so the `attachments` column (added
  // later via schema migration) is returned even when the runtime Prisma
  // client hasn't yet been refreshed.
  type NoteRow = {
    id: string
    authorName: string | null
    content: string
    attachments: string | null
    createdAt: Date
  }
  const noteRows = (await db.$queryRawUnsafe(
    `SELECT id, authorName, content, attachments, createdAt FROM CustomerNote WHERE customerId = ? ORDER BY createdAt DESC`,
    id
  )) as NoteRow[]
  function parseAttachments(raw: string | null): unknown[] {
    if (!raw) return []
    try {
      const v = JSON.parse(raw)
      return Array.isArray(v) ? v : []
    } catch {
      return []
    }
  }
  const customerNotes = noteRows.map((n) => ({
    id: n.id,
    authorName: n.authorName,
    content: n.content,
    attachments: parseAttachments(n.attachments),
    createdAt: new Date(n.createdAt).toISOString(),
  }))

  let projects: any[]
  try {
    projects = await db.project.findMany({
      where: { contract: { customerId: id } },
      include: {
        servicePackage: true,
        contract: true,
        fieldTeam: true,
        studioTeam: true,
        deliveryTeam: true,
        payments: {
          orderBy: { datePaid: "desc" },
          include: {
            recordedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
        notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
      },
      orderBy: { startDatetime: "asc" },
    })
  } catch {
    // Stale Prisma client fallback — drop the recordedBy include and attach
    // users via raw SQL + a separate User query.
    const base = await db.project.findMany({
      where: { contract: { customerId: id } },
      include: {
        servicePackage: true,
        contract: true,
        fieldTeam: true,
        studioTeam: true,
        deliveryTeam: true,
        payments: { orderBy: { datePaid: "desc" } },
        notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
      },
      orderBy: { startDatetime: "asc" },
    })
    // Use raw SQL to read recordedById for all payments (the runtime client may not expose it).
    const allPayIds = base.flatMap((p) => (p.payments || []).map((pay) => pay.id))
    let idMap = new Map<string, string | null>()
    if (allPayIds.length > 0) {
      try {
        const rows: Array<{ id: string; recordedById: string | null }> =
          await db.$queryRawUnsafe(
            `SELECT id, recordedById FROM Payment WHERE id IN (${allPayIds.map((_) => "?").join(",")})`,
            ...allPayIds
          )
        idMap = new Map(rows.map((r) => [r.id, r.recordedById]))
      } catch {
        // ignore
      }
    }
    const userIds = Array.from(
      new Set(
        Array.from(idMap.values()).filter((rid): rid is string => typeof rid === "string" && rid.length > 0)
      )
    )
    const users =
      userIds.length > 0
        ? await db.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true, role: true },
          })
        : []
    const userMap = new Map(users.map((u) => [u.id, u]))
    projects = base.map((p) => ({
      ...p,
      payments: (p.payments || []).map((pay) => {
        const rid = idMap.get(pay.id) ?? null
        return {
          ...pay,
          recordedBy: rid ? userMap.get(rid) ?? null : null,
        }
      }),
    }))
  }

  const projectsOut = projects.map((p) => {
    const confirmedPaid = p.payments
      .filter((x) => x.isConfirmed)
      .reduce((s, x) => s + Number(x.amount), 0)
    const eff = getEffectivePrice({
      pricingStrategy: p.pricingStrategy as never,
      calculatedPrice: p.calculatedPrice,
      lockedPrice: p.lockedPrice,
      isPriceFrozen: p.isPriceFrozen,
      isReadyForDelivery: p.isReadyForDelivery,
      readyDate: p.readyDate,
      priceAtReadyTime: p.priceAtReadyTime,
      packageCurrentPrice: p.servicePackage.currentPrice,
      totalConfirmedPaid: confirmedPaid,
    })
    return {
      id: p.id,
      contractNumber: p.contract.contractNumber,
      title: p.servicePackage.title,
      category: p.servicePackage.category,
      status: p.status,
      pricingStrategy: p.pricingStrategy,
      isPriceFrozen: p.isPriceFrozen,
      isReadyForDelivery: p.isReadyForDelivery,
      startDatetime: p.startDatetime ? p.startDatetime.toISOString() : null,
      endDatetime: p.endDatetime ? p.endDatetime.toISOString() : null,
      deliveryDeadline: p.deliveryDeadline ? p.deliveryDeadline.toISOString() : null,
      actualStartDatetime: p.actualStartDatetime ? p.actualStartDatetime.toISOString() : null,
      actualEndDatetime: p.actualEndDatetime ? p.actualEndDatetime.toISOString() : null,
      printedDescription: p.printedDescription,
      effectivePrice: seeBalance ? eff : null,
      calculatedPrice: seeFinance ? Number(p.calculatedPrice) : null,
      discountAmount: seeFinance ? Number(p.discountAmount ?? 0) : 0,
      totalPaid: seeBalance ? confirmedPaid : null,
      balance: seeBalance ? Math.max(0, eff - confirmedPaid) : null,
      isDelivered: p.status === "delivered",
      team: [...p.fieldTeam, ...p.studioTeam, ...p.deliveryTeam].map((u) => ({
        id: u.id,
        name: u.firstName + " " + u.lastName,
        role: u.role,
      })),
      payments: seeFinance
        ? p.payments.map((pay) => ({
            id: pay.id,
            amount: Number(pay.amount),
            paymentType: pay.paymentType,
            method: pay.method,
            datePaid: pay.datePaid.toISOString(),
            note: pay.note,
            isConfirmed: pay.isConfirmed,
            recordedBy: pay.recordedBy
              ? {
                  id: pay.recordedBy.id,
                  firstName: pay.recordedBy.firstName,
                  lastName: pay.recordedBy.lastName,
                  fullName: pay.recordedBy.firstName + " " + pay.recordedBy.lastName,
                  role: pay.recordedBy.role,
                }
              : null,
          }))
        : seeBalance
        ? p.payments
            .filter((pay) => pay.isConfirmed)
            .map((pay) => ({
              id: pay.id,
              amount: Number(pay.amount),
              paymentType: pay.paymentType,
              method: pay.method,
              datePaid: pay.datePaid.toISOString(),
              note: pay.note,
              isConfirmed: pay.isConfirmed,
              recordedBy: pay.recordedBy
                ? {
                    id: pay.recordedBy.id,
                    firstName: pay.recordedBy.firstName,
                    lastName: pay.recordedBy.lastName,
                    fullName: pay.recordedBy.firstName + " " + pay.recordedBy.lastName,
                    role: pay.recordedBy.role,
                  }
                : null,
            }))
        : [],
      notesCount: p.notes.length,
    }
  })

  return NextResponse.json({
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      customerType: customer.customerType,
      tags: customer.tags.map((t) => ({ id: t.id, name: t.name, color: t.color })),
      referrer: customer.referrer ? { id: customer.referrer.id, name: customer.referrer.name } : null,
      referred: customer.referred.map((r) => ({ id: r.id, name: r.name })),
      creditBalance: seeFinance ? Number(customer.creditBalance) : null,
      totalRevenue: seeFinance ? Number(customer.totalRevenue) : null,
      lastInteraction: customer.lastInteraction ? customer.lastInteraction.toISOString() : null,
    },
    projects: projectsOut,
    notes: customerNotes,
    seeFinance,
    seeBalance,
    canManage: CAN_MANAGE_CUSTOMERS.includes(role),
  })
}
