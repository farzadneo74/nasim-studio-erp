import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { PrismaClient } from "@prisma/client"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import {
  CAN_SEE_BALANCE,
  CAN_ACCESS_FULL_FINANCE,
  PROJECT_STATUSES,
  PACKAGE_CATEGORIES,
  PRICING_STRATEGIES,
  isTechnicalRole,
  type ProjectStatus,
  type Role,
} from "@/lib/constants"
import { getEffectivePrice } from "@/lib/pricing"

// ---- Types ----
interface ListItem {
  id: string
  contractNumber: string
  customer: { id: string; name: string; phone?: string }
  package: { id: string; title: string; category: string }
  status: string
  startDatetime: string | null
  endDatetime: string | null
  deliveryDeadline: string | null
  effectivePrice: number | null
  totalPaid: number | null
  balance: number | null
  calculatedPrice: number | null
  lockedPrice: number | null
  isPriceFrozen: boolean | null
  team: { id: string; firstName: string; lastName: string; role: string }[]
}

function iso(d: Date | null): string | null {
  return d ? d.toISOString() : null
}

async function getUserByRole(db: PrismaClient, role: Role) {
  // For technical roles, find the first user of that role to scope projects.
  if (isTechnicalRole(role)) {
    const u = await db.user.findFirst({ where: { role }, select: { id: true } })
    return u?.id ?? null
  }
  return null
}

export async function GET(req: Request) {
  const role = await getCurrentRole()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const url = new URL(req.url)
  const search = url.searchParams.get("search")?.trim() || ""
  const status = url.searchParams.get("status")?.trim() || ""
  const category = url.searchParams.get("category")?.trim() || ""
  const teamMemberId = url.searchParams.get("teamMemberId")?.trim() || ""
  const from = url.searchParams.get("from")?.trim() || ""
  const to = url.searchParams.get("to")?.trim() || ""
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10) || 10))

  const seeBalance = CAN_SEE_BALANCE.includes(role)
  const seeFinance = CAN_ACCESS_FULL_FINANCE.includes(role)

  // Build where clause
  const where: Prisma.ProjectWhereInput = {}

  if (status) {
    const statusList = status.split(",").filter((s) => PROJECT_STATUSES.includes(s as ProjectStatus))
    if (statusList.length) where.status = { in: statusList }
  }
  if (category) {
    const catList = category.split(",").filter((c) => PACKAGE_CATEGORIES.includes(c as never))
    if (catList.length) where.servicePackage = { category: { in: catList } }
  }
  if (from || to) {
    where.startDatetime = {}
    if (from) where.startDatetime.gte = new Date(from)
    if (to) where.startDatetime.lte = new Date(to + "T23:59:59")
  }
  if (search) {
    where.OR = [
      { contract: { contractNumber: { contains: search } } },
      { contract: { customer: { name: { contains: search } } } },
      { contract: { customer: { phone: { contains: search } } } },
    ]
  }
  if (teamMemberId) {
    where.OR = [
      { fieldTeam: { some: { id: teamMemberId } } },
      { studioTeam: { some: { id: teamMemberId } } },
    ]
  }

  // Technical roles: scope to projects they're on
  const scopedUserId = await getUserByRole(db, role)
  if (scopedUserId) {
    where.OR = [
      { fieldTeam: { some: { id: scopedUserId } } },
      { studioTeam: { some: { id: scopedUserId } } },
    ]
  }

  const [total, projects] = await Promise.all([
    db.project.count({ where }),
    db.project.findMany({
      where,
      include: {
        contract: { include: { customer: true } },
        servicePackage: true,
        fieldTeam: { select: { id: true, firstName: true, lastName: true, role: true } },
        studioTeam: { select: { id: true, firstName: true, lastName: true, role: true } },
        payments: { where: { isConfirmed: true }, select: { amount: true } },
      },
      orderBy: { startDatetime: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  const items = projects.map((p): ListItem => {
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

    const team = [
      ...p.fieldTeam,
      ...p.studioTeam,
      
    ].map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
    }))

    // Phone: visible for admin/manager/sales; omitted for editor/qc/logistics
    const canSeePhone = role === "admin" || role === "manager" || role === "sales" || role === "photographer"

    return {
      id: p.id,
      contractNumber: p.contract.contractNumber,
      customer: {
        id: p.contract.customer.id,
        name: p.contract.customer.name,
        phone: canSeePhone ? p.contract.customer.phone : undefined,
      },
      package: {
        id: p.servicePackage.id,
        title: p.servicePackage.title,
        category: p.servicePackage.category,
      },
      status: p.status,
      startDatetime: iso(p.startDatetime),
      endDatetime: iso(p.endDatetime),
      deliveryDeadline: iso(p.deliveryDeadline),
      effectivePrice: seeBalance ? eff : null,
      totalPaid: seeBalance ? totalPaid : null,
      balance: seeBalance ? Math.max(0, eff - totalPaid) : null,
      calculatedPrice: seeFinance ? Number(p.calculatedPrice) : null,
      lockedPrice: seeFinance ? (p.lockedPrice ? Number(p.lockedPrice) : null) : null,
      isPriceFrozen: seeFinance ? p.isPriceFrozen : null,
      team,
    }
  })

  return NextResponse.json({ items, total, page, limit, role })
}

// ---- POST: create project (wizard payload) ----
interface ExtraPhoneInput {
  label?: string
  phone?: string
}

interface SmsAssignmentInput {
  automationId?: string
  enabled?: boolean
  offsetDaysOverride?: number | null
}

interface CreateBody {
  customerId?: string
  newCustomer?: {
    name: string
    phone: string
    customerType?: string
    profileImage?: string
    extraPhones?: ExtraPhoneInput[]
    city?: string
    address?: string
    birthDate?: string
    engagementDate?: string
    weddingDate?: string
    tags?: string[] // tag ids
    referrerId?: string | null
  }
  servicePackageId?: string
  referralCode?: string
  manualDiscount?: number
  discountAmount?: number // Toman (will be converted to Rials × 10)
  startDatetime?: string
  endDatetime?: string
  deliveryDeadline?: string
  fieldTeamIds?: string[]
  studioTeamIds?: string[]
  printedDescription?: string
  customDescription?: string
  customTasks?: string[]
  customEquipment?: string[]
  isPriceFrozen?: boolean
  pricingStrategy?: string
  priceAdjustment?: number // Toman (will be converted to Rials × 10) — adjustment to base price
  smsAssignments?: SmsAssignmentInput[]
  // contract
  createNewContract?: boolean
  existingContractId?: string
}

function parseOptionalDate(v: unknown): Date | null {
  if (typeof v !== "string" || !v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

export async function POST(req: Request) {
  const role = await getCurrentRole()
  if (!["admin", "manager", "sales"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const body = (await req.json().catch(() => ({}))) as CreateBody

  // --- Validate customer ---
  let customerId = body.customerId
  if (!customerId && body.newCustomer?.name && body.newCustomer?.phone) {
    const existing = await db.customer.findUnique({ where: { phone: body.newCustomer.phone } })
    if (existing) {
      customerId = existing.id
    } else {
      // Persist new city preset if provided and not already present
      const cityName =
        typeof body.newCustomer.city === "string" && body.newCustomer.city.trim()
          ? body.newCustomer.city.trim()
          : null
      if (cityName) {
        const exists = await db.city.findUnique({ where: { name: cityName } })
        if (!exists) {
          await db.city.create({ data: { name: cityName } }).catch(() => null)
        }
      }

      // Normalize extraPhones
      let extraPhonesJson = "[]"
      if (Array.isArray(body.newCustomer.extraPhones)) {
        const cleaned: ExtraPhoneInput[] = (body.newCustomer.extraPhones as ExtraPhoneInput[])
          .filter(
            (x) => x && typeof x === "object" && typeof x.phone === "string" && x.phone.trim().length > 0
          )
          .map((x) => ({
            label: String(x.label ?? "").trim(),
            phone: String(x.phone).trim(),
          }))
        extraPhonesJson = JSON.stringify(cleaned)
      }

      const tagIds =
        Array.isArray(body.newCustomer.tags) && body.newCustomer.tags.length
          ? body.newCustomer.tags.map(String)
          : []

      const created = await db.customer.create({
        data: {
          name: body.newCustomer.name,
          phone: body.newCustomer.phone,
          customerType: body.newCustomer.customerType || "individual",
          profileImage:
            typeof body.newCustomer.profileImage === "string" &&
            body.newCustomer.profileImage.length > 0
              ? body.newCustomer.profileImage
              : null,
          extraPhones: extraPhonesJson,
          city: cityName,
          address:
            typeof body.newCustomer.address === "string" && body.newCustomer.address.trim()
              ? body.newCustomer.address.trim()
              : null,
          birthDate: parseOptionalDate(body.newCustomer.birthDate),
          engagementDate: parseOptionalDate(body.newCustomer.engagementDate),
          weddingDate: parseOptionalDate(body.newCustomer.weddingDate),
          referrerId: body.newCustomer.referrerId || null,
          familyMeta: "{}",
          tags: tagIds.length ? { connect: tagIds.map((id) => ({ id })) } : undefined,
        },
      })
      customerId = created.id
    }
  }
  if (!customerId) {
    return NextResponse.json({ error: "Customer is required" }, { status: 400 })
  }

  // --- Validate package ---
  const pkg = body.servicePackageId
    ? await db.servicePackage.findUnique({ where: { id: body.servicePackageId } })
    : null
  if (!pkg) {
    return NextResponse.json({ error: "Service package not found" }, { status: 400 })
  }

  // --- Pricing ---
  const strategy = PRICING_STRATEGIES.includes(body.pricingStrategy as never)
    ? body.pricingStrategy!
    : pkg.pricingStrategy
  const basePrice = Number(pkg.currentPrice)
  // discountAmount is sent in Toman; convert to Rials for storage.
  // Support both `discountAmount` (new field) and `manualDiscount` (legacy, Rials) for back-compat.
  const discountToman = Math.max(0, Number(body.discountAmount || 0))
  const discountRialsLegacy = Math.max(0, Number(body.manualDiscount || 0))
  // If discountAmount was sent, prefer it (×10 for Rials); otherwise fall back to legacy.
  const discountRials = discountToman > 0 ? discountToman * 10 : discountRialsLegacy
  // Price adjustment (positive = increase, negative = decrease) — sent in Toman
  const priceAdjustmentToman = Number(body.priceAdjustment || 0)
  const priceAdjustmentRials = priceAdjustmentToman * 10
  const adjustedBasePrice = Math.max(0, basePrice + priceAdjustmentRials)
  const calculatedPrice = Math.max(0, adjustedBasePrice - discountRials)

  // --- Referral code validation ---
  let referralCodeId: string | null = null
  let referrerId: string | null = null
  let discountPercent = 0
  if (body.referralCode) {
    const code = await db.referralCode.findUnique({
      where: { code: body.referralCode },
      include: { owner: true },
    })
    if (code && !code.isExpired && code.usedCount < code.maxUses) {
      if (!code.validUntil || new Date(code.validUntil) >= new Date()) {
        referralCodeId = code.id
        referrerId = code.ownerId
        discountPercent = code.discountPercent
      }
    }
  }

  // --- Contract ---
  let contractId = body.existingContractId || null
  if (!contractId || body.createNewContract) {
    const seq = (await db.contract.count()) + 1
    const year = new Date().getFullYear()
    const contractNumber = `CT-${seq}-${year}`
    const contract = await db.contract.create({
      data: {
        contractNumber,
        customerId,
        dateCreated: new Date(),
        printedTerms: body.printedDescription || pkg.defaultDescription,
        isClosed: false,
      },
    })
    contractId = contract.id
  } else {
    // verify contract exists
    const c = await db.contract.findUnique({ where: { id: contractId } })
    if (!c) return NextResponse.json({ error: "Contract not found" }, { status: 400 })
  }

  // --- Tasks (from customTasks or default from package) ---
  let defaultTasks: string[] = []
  if (Array.isArray(body.customTasks) && body.customTasks.length > 0) {
    defaultTasks = body.customTasks.filter((t) => typeof t === "string" && t.trim())
  } else {
    try {
      defaultTasks = JSON.parse(pkg.defaultTasks || "[]")
      if (!Array.isArray(defaultTasks)) defaultTasks = []
    } catch {
      defaultTasks = []
    }
  }

  // --- Create project + side effects in transaction ---
  const project = await db.$transaction(async (tx) => {
    const proj = await tx.project.create({
      data: {
        contractId: contractId!,
        servicePackageId: pkg.id,
        pricingStrategy: strategy,
        calculatedPrice,
        lockedPrice: null,
        isPriceFrozen: Boolean(body.isPriceFrozen) && (role === "admin" || role === "manager"),
        discountAmount: discountRials,
        startDatetime: body.startDatetime ? new Date(body.startDatetime) : null,
        endDatetime: body.endDatetime ? new Date(body.endDatetime) : null,
        deliveryDeadline: body.deliveryDeadline ? new Date(body.deliveryDeadline) : null,
        status: "scheduled",
        printedDescription: body.customDescription || body.printedDescription || pkg.defaultDescription,
        fieldTeam: body.fieldTeamIds?.length ? { connect: body.fieldTeamIds.map((id) => ({ id })) } : undefined,
        studioTeam: body.studioTeamIds?.length ? { connect: body.studioTeamIds.map((id) => ({ id })) } : undefined,
      },
    })

    // Create default tasks
    if (defaultTasks.length) {
      await tx.task.createMany({
        data: defaultTasks.map((title, i) => ({
          projectId: proj.id,
          title,
          status: "todo",
          order: i,
        })),
      })
    }

    // SMS assignments: create ProjectSmsAssignment rows for enabled automations
    if (Array.isArray(body.smsAssignments) && body.smsAssignments.length > 0) {
      // Filter to enabled with a valid automationId
      const wanted = body.smsAssignments.filter(
        (a) => a && a.automationId && a.enabled !== false
      )
      if (wanted.length) {
        // Verify these automations exist
        const ids = Array.from(new Set(wanted.map((a) => String(a.automationId!))))
        const valid = await tx.smsAutomation.findMany({
          where: { id: { in: ids } },
          select: { id: true },
        })
        const validSet = new Set(valid.map((v) => v.id))
        for (const a of wanted) {
          const aid = String(a.automationId!)
          if (!validSet.has(aid)) continue
          const override =
            typeof a.offsetDaysOverride === "number" && Number.isFinite(a.offsetDaysOverride)
              ? Math.round(a.offsetDaysOverride)
              : null
          await tx.projectSmsAssignment.create({
            data: {
              projectId: proj.id,
              automationId: aid,
              enabled: a.enabled !== false,
              offsetDaysOverride: override,
            },
          })
        }
      }
    }

    // Referral: create Referral + reward CreditTransaction + increment usedCount
    if (referralCodeId && referrerId) {
      await tx.referral.create({
        data: {
          referrerId,
          referredId: customerId,
          usedCodeId: referralCodeId,
          relatedProjectId: proj.id,
          note: `Referral applied on project creation (${discountPercent}% discount)`,
        },
      })
      const reward = Math.round(calculatedPrice * 0.1)
      await tx.creditTransaction.create({
        data: {
          customerId: referrerId,
          amount: reward,
          transactionType: "reward_referral",
          relatedContractId: contractId!,
          note: `10% referral reward from new project`,
        },
      })
      await tx.customer.update({
        where: { id: referrerId },
        data: { creditBalance: { increment: reward } },
      })
      await tx.referralCode.update({
        where: { id: referralCodeId },
        data: { usedCount: { increment: 1 } },
      })
    }

    // Update customer caches
    await tx.customer.update({
      where: { id: customerId },
      data: {
        totalProjects: { increment: 1 },
        lastInteraction: new Date(),
      },
    })

    return proj
  })

  return NextResponse.json({ id: project.id, status: project.status, customerId }, { status: 201 })
}

