import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { PAYMENT_TYPES, PAYMENT_METHODS, type Role } from "@/lib/constants"
import { notifyPaymentApproval } from "@/lib/notify"
import { PrismaClient } from "@prisma/client"

type Ctx = { params: Promise<{ id: string }> }

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

/** Resolve first user of the given role (used as the "current user" in demo mode). */
async function getUserIdByRole(db: PrismaClient, role: Role): Promise<string | null> {
  const u = await db.user.findFirst({ where: { role }, select: { id: true } })
  return u?.id ?? null
}

function briefRecordedBy(u: { id: string; firstName: string; lastName: string; role: string } | null) {
  if (!u) return null
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    fullName: u.firstName + " " + u.lastName,
    role: u.role,
  }
}

export async function GET(req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return forbidden()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params

  // Special sentinel "all" — return all payments across projects (used by Finances view).
  // Real project ids are cuid()s, so this never collides.
  const url = new URL(req.url)
  const search = url.searchParams.get("search")?.trim().toLowerCase()
  const paymentType = url.searchParams.get("paymentType")
  const method = url.searchParams.get("method")
  const status = url.searchParams.get("status") // "confirmed" | "pending" | "all" (or null)
  const confirmedOnly = url.searchParams.get("confirmedOnly") === "true"
  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")

  const where: Record<string, unknown> = id === "all" ? {} : { projectId: id }
  if (paymentType) where.paymentType = paymentType
  if (method) where.method = method
  if (status === "confirmed" || confirmedOnly) where.isConfirmed = true
  if (status === "pending") where.isConfirmed = false
  if (from || to) {
    where.datePaid = {}
    if (from) (where.datePaid as { gte?: Date }).gte = new Date(from)
    if (to) (where.datePaid as { lte?: Date }).lte = new Date(to)
  }

  const payments = await (async () => {
    try {
      return await db.payment.findMany({
        where,
        include: {
          project: {
            include: {
              contract: { include: { customer: true } },
              servicePackage: true,
            },
          },
          recordedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
        orderBy: { datePaid: "desc" },
      })
    } catch {
      // Fallback: dev server may be running a stale Prisma client that
      // doesn't yet know about the recordedBy relation. Query without the
      // include, then attach recordedBy info via raw SQL + a User fetch.
      const base = await db.payment.findMany({
        where,
        include: {
          project: {
            include: {
              contract: { include: { customer: true } },
              servicePackage: true,
            },
          },
        },
        orderBy: { datePaid: "desc" },
      })
      // Use raw SQL to read recordedById (the runtime client may not expose it).
      let idMap = new Map<string, string | null>()
      if (base.length > 0) {
        try {
          const rows: Array<{ id: string; recordedById: string | null }> =
            await db.$queryRawUnsafe(
              `SELECT id, recordedById FROM Payment WHERE id IN (${base.map((_) => "?").join(",")})`,
              ...base.map((p) => p.id)
            )
          idMap = new Map(rows.map((r) => [r.id, r.recordedById]))
        } catch {
          // ignore — leave recordedBy null
        }
      }
      const userIds = Array.from(
        new Set(
          Array.from(idMap.values()).filter((id): id is string => typeof id === "string" && id.length > 0)
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
      return base.map((p) => {
        const rid = idMap.get(p.id) ?? null
        return {
          ...p,
          recordedBy: rid ? briefRecordedBy(userMap.get(rid) ?? null) : null,
        }
      })
    }
  })()

  let mapped = payments.map((p) => ({
    id: p.id,
    projectId: p.projectId,
    amount: Number(p.amount),
    paymentType: p.paymentType,
    method: p.method,
    datePaid: p.datePaid,
    note: p.note,
    isConfirmed: p.isConfirmed,
    createdAt: p.createdAt,
    recordedBy: briefRecordedBy(p.recordedBy),
    project: {
      id: p.project.id,
      customer: {
        id: p.project.contract.customer.id,
        name: p.project.contract.customer.name,
      },
      servicePackage: {
        id: p.project.servicePackage.id,
        title: p.project.servicePackage.title,
      },
    },
  }))

  if (search) {
    mapped = mapped.filter((p) =>
      p.project.customer.name.toLowerCase().includes(search) ||
      p.project.servicePackage.title.toLowerCase().includes(search) ||
      (p.note ?? "").toLowerCase().includes(search)
    )
  }

  return NextResponse.json(mapped)
}

export async function POST(req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return forbidden()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { amount, paymentType, method, datePaid, note, isConfirmed } = body as {
    amount?: number
    paymentType?: string
    method?: string
    datePaid?: string
    note?: string
    isConfirmed?: boolean
  }

  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 })
  }
  if (!paymentType || !PAYMENT_TYPES.includes(paymentType)) {
    return NextResponse.json({ error: "Invalid payment type" }, { status: 400 })
  }
  if (!method || !PAYMENT_METHODS.includes(method)) {
    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 })
  }
  // Mandatory note (Persian UI label: یادداشت). Reject empty / whitespace.
  if (typeof note !== "string" || note.trim().length === 0) {
    return NextResponse.json({ error: "Note is required" }, { status: 400 })
  }

  const project = await db.project.findUnique({
    where: { id },
    include: {
      contract: { include: { customer: true } },
      servicePackage: true,
      payments: true,
    },
  })
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  // Resolve current user (first user of current role) for attribution.
  const recordedById = await getUserIdByRole(db, role)

  // Create the payment. recordedById is a String scalar that should be known
  // to the runtime Prisma client; if it isn't (stale client), drop it.
  let payment: any
  try {
    payment = await db.payment.create({
      data: {
        projectId: id,
        amount: Number(amount),
        paymentType,
        method,
        datePaid: datePaid ? new Date(datePaid) : new Date(),
        note: note.trim(),
        isConfirmed: Boolean(isConfirmed),
        recordedById: recordedById ?? null,
      },
      include: {
        recordedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    })
  } catch {
    // Stale client fallback — create without recordedById, then attach user.
    payment = await db.payment.create({
      data: {
        projectId: id,
        amount: Number(amount),
        paymentType,
        method,
        datePaid: datePaid ? new Date(datePaid) : new Date(),
        note: note.trim(),
        isConfirmed: Boolean(isConfirmed),
      },
    })
    if (recordedById) {
      try {
        await db.$executeRaw`UPDATE Payment SET recordedById = ${recordedById} WHERE id = ${payment.id}`
        const u = await db.user.findUnique({
          where: { id: recordedById },
          select: { id: true, firstName: true, lastName: true, role: true },
        })
        payment.recordedBy = u
      } catch {
        // ignore — leave recordedBy null
      }
    }
  }

  // Notify managers/admins that a new payment was recorded and may need approval.
  // Skip the notification when the payment is already created as confirmed
  // (no approval workflow needed in that case).
  if (!payment.isConfirmed) {
    await notifyPaymentApproval(
      payment.id,
      Number(amount),
      project.contract.customer.name
    )
  }

  // Side effects when confirmed
  if (payment.isConfirmed) {
    await db.customer.update({
      where: { id: project.contract.customer.id },
      data: {
        totalRevenue: { increment: Number(amount) },
        lastInteraction: new Date(),
      },
    })

    // Recompute total confirmed paid for the project, auto-freeze for variable strategy
    const allPayments = await db.payment.findMany({ where: { projectId: id, isConfirmed: true } })
    const totalConfirmedPaid = allPayments.reduce((s, p) => s + Number(p.amount), 0)

    if (project.pricingStrategy === "variable" && !project.isPriceFrozen) {
      const calc = Number(project.calculatedPrice)
      if (totalConfirmedPaid >= calc * 0.7) {
        await db.project.update({
          where: { id },
          data: { isPriceFrozen: true },
        })
      }
    }
  }

  return NextResponse.json({
    id: payment.id,
    projectId: payment.projectId,
    amount: Number(payment.amount),
    paymentType: payment.paymentType,
    method: payment.method,
    datePaid: payment.datePaid,
    note: payment.note,
    isConfirmed: payment.isConfirmed,
    createdAt: payment.createdAt,
    recordedBy: briefRecordedBy(payment.recordedBy),
  })
}
