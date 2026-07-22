import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { CAN_MANAGE_CUSTOMERS } from "@/lib/constants"
import { getEffectivePrice } from "@/lib/pricing"
import { Prisma } from "@prisma/client"

export const dynamic = "force-dynamic"

// Allowed sort keys. `default` keeps server-side recency sort.
type SortKey = "default" | "name_asc" | "name_desc" | "debt_desc" | "credit_desc"

interface ExtraPhone {
  label: string
  phone: string
}

function iso(d: Date | null): string | null {
  return d ? d.toISOString() : null
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

/**
 * Compute customer debt (what they owe us) = sum over projects of
 * max(0, effectivePrice - totalConfirmedPaid).
 */
function computeCustomerDebt(customer: {
  contracts: Array<{
    projects: Array<{
      pricingStrategy: string
      calculatedPrice: Prisma.Decimal
      lockedPrice: Prisma.Decimal | null
      isPriceFrozen: boolean
      isReadyForDelivery: boolean
      readyDate: Date | null
      priceAtReadyTime: Prisma.Decimal | null
      servicePackage: { currentPrice: Prisma.Decimal }
      payments: Array<{ amount: Prisma.Decimal }>
    }>
  }>
}): number {
  let debt = 0
  for (const c of customer.contracts) {
    for (const p of c.projects) {
      const totalPaid = p.payments.reduce((s, x) => s + Number(x.amount), 0)
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
  return debt
}

function parseNum(v: string | null): number | null {
  if (v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Rials (DB) → Toman for filter comparison
function toToman(rials: number): number {
  return Math.round(rials / 10)
}

export async function GET(req: NextRequest) {
  const role = await getCurrentRole()
  if (!CAN_MANAGE_CUSTOMERS.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const seeFinance = ["admin", "manager"].includes(role)

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")?.trim() || ""
  const tagId = searchParams.get("tagId")?.trim() || ""
  const type = searchParams.get("type")?.trim() || ""
  const city = searchParams.get("city")?.trim() || ""
  const debtMin = parseNum(searchParams.get("debtMin"))
  const debtMax = parseNum(searchParams.get("debtMax"))
  const creditMin = parseNum(searchParams.get("creditMin"))
  const creditMax = parseNum(searchParams.get("creditMax"))
  const page = Math.max(1, Number(searchParams.get("page") || 1))
  const limit = Math.max(1, Math.min(50, Number(searchParams.get("limit") || 10)))
  const sortRaw = (searchParams.get("sort")?.trim() || "default") as SortKey
  const sort: SortKey = (
    ["default", "name_asc", "name_desc", "debt_desc", "credit_desc"] as SortKey[]
  ).includes(sortRaw)
    ? sortRaw
    : "default"

  const where: Prisma.CustomerWhereInput = {}
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
    ]
  }
  if (tagId) {
    // support comma-separated multiple tag ids => AND (must have all)
    const tagIds = tagId.split(",").map((t) => t.trim()).filter(Boolean)
    if (tagIds.length === 1) {
      where.tags = { some: { id: tagIds[0] } }
    } else if (tagIds.length > 1) {
      where.AND = tagIds.map((t) => ({ tags: { some: { id: t } } }))
    }
  }
  if (type === "individual" || type === "company") {
    where.customerType = type
  }
  if (city) {
    where.city = city
  }

  // If any debt/credit range filter is active, we MUST compute those client-side
  // (they're derived, not stored). Switch to the in-memory cap path.
  const hasMoneyFilter =
    debtMin !== null ||
    debtMax !== null ||
    creditMin !== null ||
    creditMax !== null

  const projectsInclude = {
    contracts: {
      select: {
        projects: {
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
  } satisfies Prisma.CustomerInclude

  const buildBase = (c: Prisma.CustomerGetPayload<{ include: typeof projectsInclude }> & { tags: { id: string; name: string; color: string }[] }) => {
    const debt = seeFinance ? computeCustomerDebt(c) : 0
    const base = {
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
      tags: c.tags.map((t) => ({ id: t.id, name: t.name, color: t.color })),
      totalProjects: c.totalProjects,
      lastInteraction: c.lastInteraction ? c.lastInteraction.toISOString() : null,
    }
    if (seeFinance) {
      return {
        ...base,
        totalRevenue: Number(c.totalRevenue),
        creditBalance: Number(c.creditBalance),
        credit: Number(c.creditBalance),
        debt,
      }
    }
    return base
  }

  // Pure server-side path: name sorts + default (no money filters, no money sort)
  if (
    (sort === "name_asc" || sort === "name_desc" || sort === "default") &&
    !hasMoneyFilter
  ) {
    const orderBy: Prisma.CustomerOrderByWithRelationInput[] =
      sort === "name_asc"
        ? [{ name: "asc" }]
        : sort === "name_desc"
        ? [{ name: "desc" }]
        : [{ lastInteraction: "desc" }, { createdAt: "desc" }]

    const [total, rows] = await Promise.all([
      db.customer.count({ where }),
      db.customer.findMany({
        where,
        include: { tags: true, ...projectsInclude },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    const items = rows.map((c) => buildBase(c as never))
    return NextResponse.json({ items, total, page, limit })
  }

  // In-memory path: money filters or money sorts. Fetch all matches (cap 500).
  const cap = 500
  const [total, rows] = await Promise.all([
    db.customer.count({ where }),
    db.customer.findMany({
      where,
      include: { tags: true, ...projectsInclude },
      take: cap,
    }),
  ])

  type Enriched = {
    row: Prisma.CustomerGetPayload<{ include: typeof projectsInclude }> & { tags: { id: string; name: string; color: string }[] }
    debt: number
    credit: number
  }
  let enriched: Enriched[] = rows.map((c) => ({
    row: c as never,
    debt: seeFinance ? computeCustomerDebt(c as never) : 0,
    credit: seeFinance ? Number((c as { creditBalance: Prisma.Decimal }).creditBalance) : 0,
  }))

  // Apply money filters (in Toman)
  if (debtMin !== null) {
    enriched = enriched.filter((e) => toToman(e.debt) >= debtMin)
  }
  if (debtMax !== null) {
    enriched = enriched.filter((e) => toToman(e.debt) <= debtMax)
  }
  if (creditMin !== null) {
    enriched = enriched.filter((e) => toToman(e.credit) >= creditMin)
  }
  if (creditMax !== null) {
    enriched = enriched.filter((e) => toToman(e.credit) <= creditMax)
  }

  // Sort
  if (sort === "debt_desc") {
    enriched.sort((a, b) => b.debt - a.debt)
  } else if (sort === "credit_desc") {
    enriched.sort((a, b) => b.credit - a.credit)
  } else if (sort === "name_asc") {
    enriched.sort((a, b) => a.row.name.localeCompare(b.row.name))
  } else if (sort === "name_desc") {
    enriched.sort((a, b) => b.row.name.localeCompare(a.row.name))
  } else {
    // default recency
    enriched.sort((a, b) => {
      const aT = a.row.lastInteraction?.getTime() ?? 0
      const bT = b.row.lastInteraction?.getTime() ?? 0
      if (aT !== bT) return bT - aT
      return b.row.createdAt.getTime() - a.row.createdAt.getTime()
    })
  }

  // For pagination totals when filters reduce the set, return the filtered count
  // so the pager doesn't show empty pages.
  const filteredTotal = enriched.length
  const paged = enriched.slice((page - 1) * limit, page * limit)
  const items = paged.map((e) => buildBase(e.row as never))

  return NextResponse.json({
    items,
    total: filteredTotal,
    page,
    limit,
    // Note: when filters reduce the set, total reflects filtered count
    // (caller's pager uses this).
  })
}

interface ExtraPhoneInput {
  label?: string
  phone?: string
}

export async function POST(req: NextRequest) {
  const role = await getCurrentRole()
  if (!CAN_MANAGE_CUSTOMERS.includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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

  const name = String(body.name || "").trim()
  const phone = String(body.phone || "").trim()
  const customerType = String(body.customerType || "individual")
  const referrerId = body.referrerId ? String(body.referrerId) : null
  const tagIds = Array.isArray(body.tagIds) ? body.tagIds.map(String) : []
  const familyMeta =
    typeof body.familyMeta === "string"
      ? body.familyMeta
      : JSON.stringify({ spouse: { name: "", birth: "" }, children: [] })

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })
  if (!phone) return NextResponse.json({ error: "Phone is required" }, { status: 400 })
  if (customerType !== "individual" && customerType !== "company") {
    return NextResponse.json({ error: "Invalid customer type" }, { status: 400 })
  }
  if (referrerId === "") {
    return NextResponse.json({ error: "Invalid referrer" }, { status: 400 })
  }

  // phone uniqueness
  const existing = await db.customer.findUnique({ where: { phone } })
  if (existing) {
    return NextResponse.json({ error: "A customer with this phone already exists" }, { status: 409 })
  }

  // referrer validity
  if (referrerId) {
    const ref = await db.customer.findUnique({ where: { id: referrerId }, select: { id: true } })
    if (!ref) return NextResponse.json({ error: "Referrer not found" }, { status: 400 })
  }

  // Optional new fields
  const profileImage =
    typeof body.profileImage === "string" && body.profileImage.length > 0
      ? body.profileImage
      : null

  let extraPhonesJson = "[]"
  if (Array.isArray(body.extraPhones)) {
    const cleaned: ExtraPhone[] = (body.extraPhones as ExtraPhoneInput[])
      .filter((x) => x && typeof x === "object" && typeof x.phone === "string" && x.phone.trim().length > 0)
      .map((x) => ({ label: String(x.label ?? "").trim(), phone: String(x.phone).trim() }))
    extraPhonesJson = JSON.stringify(cleaned)
  }

  function parseOptionalDate(v: unknown): Date | null {
    if (typeof v !== "string" || !v) return null
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }

  const birthDate = parseOptionalDate(body.birthDate)
  const engagementDate = parseOptionalDate(body.engagementDate)
  const weddingDate = parseOptionalDate(body.weddingDate)

  // city + address
  const city =
    typeof body.city === "string" && body.city.trim().length > 0 ? body.city.trim() : null
  const address =
    typeof body.address === "string" && body.address.trim().length > 0
      ? body.address.trim()
      : null

  const instagramId =
    typeof body.instagramId === "string" && body.instagramId.trim().length > 0
      ? body.instagramId.trim().replace(/^@/, "")
      : null

  const created = await db.customer.create({
    data: {
      name,
      phone,
      customerType,
      profileImage,
      extraPhones: extraPhonesJson,
      instagramId,
      birthDate,
      engagementDate,
      weddingDate,
      city,
      address,
      referrer: referrerId ? { connect: { id: referrerId } } : undefined,
      familyMeta,
      tags: tagIds.length ? { connect: tagIds.map((id) => ({ id })) } : undefined,
    },
    include: { tags: true },
  })

  return NextResponse.json({
    id: created.id,
    name: created.name,
    phone: created.phone,
    customerType: created.customerType,
    referrerId: created.referrerId,
    familyMeta: created.familyMeta,
    profileImage: created.profileImage,
    extraPhones: parseExtraPhones(created.extraPhones),
    instagramId: created.instagramId,
    birthDate: iso(created.birthDate),
    engagementDate: iso(created.engagementDate),
    weddingDate: iso(created.weddingDate),
    city: created.city,
    address: created.address,
    tags: created.tags.map((t) => ({ id: t.id, name: t.name, color: t.color })),
  }, { status: 201 })
}

