import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { CAN_MANAGE_CUSTOMERS } from "@/lib/constants"
import { getEffectivePrice } from "@/lib/pricing"
import { Prisma } from "@prisma/client"

export const dynamic = "force-dynamic"

function iso(d: Date | null): string | null {
  return d ? d.toISOString() : null
}

interface ExtraPhone {
  label: string
  phone: string
}

function parseExtraPhones(raw: string | null | undefined): ExtraPhone[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x): x is ExtraPhone => x && typeof x === "object" && typeof (x as ExtraPhone).phone === "string")
      .map((x) => ({ label: String(x.label ?? ""), phone: String(x.phone) }))
  } catch {
    return []
  }
}

function parseOptionalDate(v: unknown): Date | null {
  if (typeof v !== "string" || !v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole()
  if (!CAN_MANAGE_CUSTOMERS.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const seeFinance = ["admin", "manager"].includes(role)

  const { id } = await params

  const c = await db.customer.findUnique({
    where: { id },
    include: {
      tags: true,
      referrer: { select: { id: true, name: true, phone: true } },
      referred: { select: { id: true, name: true, phone: true, customerType: true } },
      contracts: {
        select: {
          id: true
          , _count: { select: { projects: true } }
          , projects: {
            select: {
              pricingStrategy: true,
              calculatedPrice: true,
              lockedPrice: true,
              isPriceFrozen: true,
              isReadyForDelivery: true,
              readyDate: true,
              priceAtReadyTime: true,
              servicePackage: { select: { currentPrice: true } },
              payments: { where: { isConfirmed: true }, select: { amount: true } },
            },
          },
        },
      },
      creditTxs: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { relatedContract: { select: { contractNumber: true } } },
      },
    },
  })

  if (!c) return NextResponse.json({ error: "Customer not found" }, { status: 404 })

  const contractsCount = c.contracts.length
  const projectsCount = c.contracts.reduce(
    (s, ct) => s + (ct._count?.projects ?? 0),
    0
  )

  // Compute debt and total paid across all projects (admin/manager only)
  let debt = 0
  let totalPaidAll = 0
  if (seeFinance) {
    for (const ct of c.contracts) {
      for (const p of ct.projects) {
        const totalPaid = p.payments.filter(x => x.isConfirmed).reduce((s, x) => s + Number(x.amount), 0)
        totalPaidAll += totalPaid
        const eff = getEffectivePrice({
          pricingStrategy: p.pricingStrategy as never,
          calculatedPrice: p.calculatedPrice,
          lockedPrice: p.lockedPrice,
          isPriceFrozen: p.isPriceFrozen,
          isReadyForDelivery: p.isReadyForDelivery,
          readyDate: p.readyDate,
          priceAtReadyTime: p.priceAtReadyTime,
          packageCurrentPrice: p.servicePackage.currentPrice,
          totalConfirmedPaid: totalPaid,
        })
        const owed = eff - totalPaid
        if (owed > 0) debt += owed
      }
    }
  }

  const base: Record<string, unknown> = {
    id: c.id,
    name: c.name,
    phone: c.phone,
    customerType: c.customerType,
    profileImage: c.profileImage,
    extraPhones: parseExtraPhones(c.extraPhones),
    instagramId: c.instagramId,
    birthDate: iso(c.birthDate),
    engagementDate: iso(c.engagementDate),
    weddingDate: iso(c.weddingDate),
    city: c.city,
    address: c.address,
    referrerId: c.referrerId,
    referrer: c.referrer
      ? { id: c.referrer.id, name: c.referrer.name, phone: c.referrer.phone }
      : null,
    referred: c.referred.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      customerType: r.customerType,
    })),
    tags: c.tags.map((t) => ({ id: t.id, name: t.name, color: t.color })),
    totalProjects: c.totalProjects,
    contractsCount,
    projectsCount,
    lastInteraction: c.lastInteraction ? c.lastInteraction.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
  }

  if (seeFinance) {
    base.familyMeta = c.familyMeta
    base.totalRevenue = Number(c.totalRevenue)
    base.totalPaidAll = totalPaidAll
    // USD equivalent: نرخ دلار از system settings خوانده می‌شود (key: "usd_rate_toman")
    // مقدار پیش‌فرض: 60000 تومان برای هر دلار (در صورت تنظیم نشدن)
    let usdRate = 60000 // Toman per USD (default fallback)
    try {
      const setting = await db.systemSetting.findUnique({ where: { key: "usd_rate_toman" } })
      if (setting?.value) {
        const parsed = Number(setting.value)
        if (Number.isFinite(parsed) && parsed > 0) usdRate = parsed
      }
    } catch { /* ignore — table may not exist yet */ }
    base.totalPaidUsd = usdRate > 0 ? Math.round(totalPaidAll / 10 / usdRate) : 0 // Rials -> Toman -> USD
    base.creditBalance = Number(c.creditBalance)
    base.credit = Number(c.creditBalance)
    base.debt = debt
    base.creditTxs = c.creditTxs.map((tx) => ({
      id: tx.id,
      amount: Number(tx.amount),
      transactionType: tx.transactionType,
      note: tx.note,
      contractNumber: tx.relatedContract?.contractNumber ?? null,
      createdAt: tx.createdAt.toISOString(),
    }))
  }

  return NextResponse.json(base)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole()
  if (!CAN_MANAGE_CUSTOMERS.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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

  const existing = await db.customer.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Customer not found" }, { status: 404 })

  const data: Prisma.CustomerUncheckedUpdateInput = {}

  if (typeof body.name === "string") {
    const n = body.name.trim()
    if (!n) return NextResponse.json({ error: "Name is required" }, { status: 400 })
    data.name = n
  }

  if (typeof body.phone === "string") {
    const p = body.phone.trim()
    if (!p) return NextResponse.json({ error: "Phone is required" }, { status: 400 })
    if (p !== existing.phone) {
      const dup = await db.customer.findUnique({ where: { phone: p } })
      if (dup) {
        return NextResponse.json({ error: "A customer with this phone already exists" }, { status: 409 })
      }
    }
    data.phone = p
  }

  if (typeof body.customerType === "string") {
    if (body.customerType !== "individual" && body.customerType !== "company") {
      return NextResponse.json({ error: "Invalid customer type" }, { status: 400 })
    }
    data.customerType = body.customerType
  }

  // referrer: null clears, string sets (must not be self)
  if ("referrerId" in body) {
    const r = body.referrerId
    if (r === null || r === "") {
      data.referrerId = null
    } else if (typeof r === "string") {
      if (r === id) {
        return NextResponse.json({ error: "A customer cannot refer themselves" }, { status: 400 })
      }
      const ref = await db.customer.findUnique({ where: { id: r }, select: { id: true } })
      if (!ref) return NextResponse.json({ error: "Referrer not found" }, { status: 400 })
      data.referrerId = r
    }
  }

  // Optional new fields
  if ("profileImage" in body) {
    const v = body.profileImage
    if (v === null || v === "") data.profileImage = null
    else if (typeof v === "string") data.profileImage = v
  }

  if (Array.isArray(body.extraPhones)) {
    const cleaned: ExtraPhone[] = (body.extraPhones as ExtraPhone[])
      .filter((x) => x && typeof x === "object" && typeof x.phone === "string" && x.phone.trim().length > 0)
      .map((x) => ({ label: String(x.label ?? "").trim(), phone: String(x.phone).trim() }))
    data.extraPhones = JSON.stringify(cleaned)
  }

  if ("instagramId" in body) {
    const v = body.instagramId
    if (v === null || v === "") data.instagramId = null
    else if (typeof v === "string") data.instagramId = v.trim().replace(/^@/, "")
  }

  if ("birthDate" in body) data.birthDate = parseOptionalDate(body.birthDate)
  if ("engagementDate" in body) data.engagementDate = parseOptionalDate(body.engagementDate)
  if ("weddingDate" in body) data.weddingDate = parseOptionalDate(body.weddingDate)

  if ("city" in body) {
    const v = body.city
    if (v === null || v === "") data.city = null
    else if (typeof v === "string") data.city = v.trim()
  }
  if ("address" in body) {
    const v = body.address
    if (v === null || v === "") data.address = null
    else if (typeof v === "string") data.address = v.trim()
  }

  if (typeof body.familyMeta === "string") {
    // validate JSON
    try {
      JSON.parse(body.familyMeta)
      data.familyMeta = body.familyMeta
    } catch {
      return NextResponse.json({ error: "Invalid family metadata JSON" }, { status: 400 })
    }
  }

  if (body.lastInteraction !== undefined) {
    if (body.lastInteraction === null) {
      data.lastInteraction = null
    } else if (typeof body.lastInteraction === "string") {
      data.lastInteraction = new Date(body.lastInteraction)
    }
  }

  const updated = await db.customer.update({
    where: { id },
    data,
    include: { tags: true },
  })

  // Helper to shape the response consistently (incl. new fields)
  const shape = (
    cust: { id: string; name: string; phone: string; customerType: string; referrerId: string | null; familyMeta: string; profileImage: string | null; extraPhones: string; birthDate: Date | null; engagementDate: Date | null; weddingDate: Date | null; city: string | null; address: string | null; tags: { id: string; name: string; color: string }[] }
  ) => ({
    id: cust.id,
    name: cust.name,
    phone: cust.phone,
    customerType: cust.customerType,
    referrerId: cust.referrerId,
    familyMeta: cust.familyMeta,
    profileImage: cust.profileImage,
    extraPhones: parseExtraPhones(cust.extraPhones),
    birthDate: iso(cust.birthDate),
    engagementDate: iso(cust.engagementDate),
    weddingDate: iso(cust.weddingDate),
    city: cust.city,
    address: cust.address,
    tags: cust.tags.map((t) => ({ id: t.id, name: t.name, color: t.color })),
  })

  // tags: set (full replace) when tagIds provided
  if (Array.isArray(body.tagIds)) {
    const tagIds = body.tagIds.map(String)
    await db.customer.update({
      where: { id },
      data: { tags: { set: tagIds.map((t) => ({ id: t })) } },
    })
    const refreshed = await db.customer.findUnique({
      where: { id },
      include: { tags: true },
    })
    return NextResponse.json(refreshed ? shape(refreshed) : shape(updated))
  }

  return NextResponse.json(shape(updated))
}

export async function DELETE(
  _req: NextRequest,
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

  const c = await db.customer.findUnique({
    where: { id },
    include: {
      contracts: { select: { id: true } },
      referred: { select: { id: true } },
    },
  })
  if (!c) return NextResponse.json({ error: "Customer not found" }, { status: 404 })

  if (c.contracts.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete a customer with existing contracts/projects" },
      { status: 409 }
    )
  }
  if (c.referred.length > 0) {
    // detach referrals instead of blocking — but spec says block on contracts/projects.
    // Clear referrer pointers on referred customers to keep referential integrity.
    await db.customer.updateMany({
      where: { referrerId: id },
      data: { referrerId: null },
    })
  }

  await db.customer.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

