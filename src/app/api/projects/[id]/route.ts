import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import {
  CAN_SEE_BALANCE,
  CAN_ACCESS_FULL_FINANCE,
  PRICING_STRATEGIES,
  isTechnicalRole,
  type Role,
} from "@/lib/constants"
import { getEffectivePrice } from "@/lib/pricing"

type Ctx = { params: Promise<{ id: string }> }

function userBrief(u: { id: string; firstName: string; lastName: string; role: string; isAvailable?: boolean }) {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    fullName: u.firstName + " " + u.lastName,
    role: u.role,
    isAvailable: u.isAvailable,
  }
}

async function scopeProjectForRole(role: Role, project: any, db: Awaited<ReturnType<typeof getCurrentStudioDb>> & {}, params: { id: string }) {
  const seeBalance = CAN_SEE_BALANCE.includes(role)
  const seeFinance = CAN_ACCESS_FULL_FINANCE.includes(role)
  const canSeePhone = role === "admin" || role === "manager" || role === "sales" || role === "photographer"

  // Parse customTasksJson / customEquipmentJson (both legacy string arrays and {name, price} objects).
  const parseItems = (s: string | null | undefined): { name: string; price: number }[] => {
    if (!s) return []
    try {
      const v = JSON.parse(s)
      if (!Array.isArray(v)) return []
      return v.map((item: any) => {
        if (typeof item === "string") return { name: item, price: 0 }
        if (item && typeof item === "object") {
          return { name: String(item.name ?? ""), price: Number(item.price ?? 0) || 0 }
        }
        return { name: String(item), price: 0 }
      }).filter((item) => item.name.trim().length > 0)
    } catch { return [] }
  }
  const safeParseItemsInline = parseItems

  const totalPaid = project.payments
    .filter((p: any) => p.isConfirmed)
    .reduce((s: number, p: any) => s + Number(p.amount), 0)

  const eff = getEffectivePrice({
    pricingStrategy: project.pricingStrategy as never,
    calculatedPrice: project.calculatedPrice,
    lockedPrice: project.lockedPrice,
    isPriceFrozen: project.isPriceFrozen,
    isReadyForDelivery: project.isReadyForDelivery,
    readyDate: project.readyDate,
    priceAtReadyTime: project.priceAtReadyTime,
    packageCurrentPrice: project.servicePackage.currentPrice,
    totalConfirmedPaid: totalPaid,
    // ✅ اصلاح قیمت و تخفیف — روی قیمت «زنده» اعمال می‌شوند
    priceAdjustment: (project as any).priceAdjustment ?? 0,
    discountAmount: (project as any).discountAmount ?? 0,
  })

  const salaryRecords = project.salaryRecords || []

  // ✅ محاسبه printPhotoTotal به‌صورت دستی (چون total یه فیلد محاسباتی است)
  let printPhotoTotal = 0
  if (seeBalance) {
    try {
      const photos = await db.projectPrintPhoto.findMany({
        where: { projectId: params.id },
        include: { printPhotoPrice: { select: { price: true } } },
      })
      printPhotoTotal = photos.reduce((sum, p) => {
        const unitPrice = p.exemptFromPriceUpdate && p.frozenPrice
          ? Number(p.frozenPrice)
          : Number(p.printPhotoPrice?.price ?? 0)
        return sum + (unitPrice * p.quantity)
      }, 0)
    } catch {
      printPhotoTotal = 0
    }
  }

  return {
    id: project.id,
    contract: {
      id: project.contract.id,
      contractNumber: project.contract.contractNumber,
      dateCreated: project.contract.dateCreated,
      printedTerms: project.contract.printedTerms,
      isClosed: project.contract.isClosed,
      customer: {
        id: project.contract.customer.id,
        name: project.contract.customer.name,
        phone: canSeePhone ? project.contract.customer.phone : undefined,
        customerType: project.contract.customer.customerType,
        referrerId: project.contract.customer.referrerId,
      },
    },
    servicePackage: {
      id: project.servicePackage.id,
      title: project.servicePackage.title,
      category: project.servicePackage.category,
      currentPrice: seeFinance ? Number(project.servicePackage.currentPrice) : null,
      basePrice: seeFinance ? Number(project.servicePackage.basePrice) : null,
      pricingStrategy: project.servicePackage.pricingStrategy,
      defaultDescription: project.servicePackage.defaultDescription,
      defaultTasks: project.servicePackage.defaultTasks,
      defaultEquipment: project.servicePackage.defaultEquipment,
    },
    pricingStrategy: project.pricingStrategy,
    calculatedPrice: seeFinance ? Number(project.calculatedPrice) : null,
    lockedPrice: seeFinance ? (project.lockedPrice ? Number(project.lockedPrice) : null) : null,
    isPriceFrozen: seeFinance ? project.isPriceFrozen : null,
    exemptFromPhotoPriceUpdate: project.exemptFromPhotoPriceUpdate ?? false,
    discountAmount: seeFinance ? Number(project.discountAmount ?? 0) : null,
    // ✅ اصلاح قیمت، سود معرف override، آدرس و مکان اجرا
    priceAdjustment: seeFinance ? Number((project as any).priceAdjustment ?? 0) : null,
    referralRewardOverride:
      seeFinance && (project as any).referralRewardOverride != null
        ? Number((project as any).referralRewardOverride)
        : null,
    projectAddress: (project as any).projectAddress ?? null,
    projectLocationId: (project as any).projectLocationId ?? null,
    // ✅ آتلیه — flag for studio-shoot projects
    isStudio: Boolean((project as any).isStudio),
    startDatetime: project.startDatetime,
    endDatetime: project.endDatetime,
    deliveryDeadline: project.deliveryDeadline,
    status: project.status,
    printedDescription: project.printedDescription,
    // ✅ Per-project overrides (parsed from JSON)
    customTasks: safeParseItemsInline((project as any).customTasksJson),
    customEquipment: safeParseItemsInline((project as any).customEquipmentJson),
    isReadyForDelivery: project.isReadyForDelivery,
    readyDate: project.readyDate,
    priceAtReadyTime: seeFinance ? (project.priceAtReadyTime ? Number(project.priceAtReadyTime) : null) : null,
    effectivePrice: seeBalance ? eff : null,
    totalPaid: seeBalance ? totalPaid : null,
    balance: seeBalance ? Math.max(0, eff - totalPaid) : null,
    printPhotoTotal: seeBalance ? printPhotoTotal : null,
    fieldTeam: project.fieldTeam.map(userBrief),
    studioTeam: project.studioTeam.map(userBrief),
    tasks: (project.tasks || []).map((t: any) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      order: t.order,
      deadline: t.deadline,
      estimatedMinutes: t.estimatedMinutes,
      actualMinutes: t.actualMinutes,
      assignedTo: t.assignedTo ? userBrief(t.assignedTo) : null,
      createdAt: t.createdAt,
    })),
    notes: (project.notes || []).map((n: any) => ({
      id: n.id,
      noteType: n.noteType,
      content: n.content,
      attachmentUrl: n.attachmentUrl,
      previewUrl: n.previewUrl,
      createdAt: n.createdAt,
      author: n.author ? userBrief(n.author) : null,
    })),
    payments: (project.payments || []).map((p: any) => ({
      id: p.id,
      amount: Number(p.amount),
      paymentType: p.paymentType,
      method: p.method,
      datePaid: p.datePaid,
      note: p.note,
      isConfirmed: p.isConfirmed,
      createdAt: p.createdAt,
      recordedBy: p.recordedBy
        ? {
            id: p.recordedBy.id,
            firstName: p.recordedBy.firstName,
            lastName: p.recordedBy.lastName,
            fullName: p.recordedBy.firstName + " " + p.recordedBy.lastName,
            role: p.recordedBy.role,
          }
        : null,
    })),
    smsAssignments: (project.smsAssignments || []).map((a: any) => ({
      id: a.id,
      automationId: a.automationId,
      automationName: a.automation?.name ?? "—",
      templateName: a.automation?.template?.name ?? "—",
      templateText: a.automation?.template?.templateText ?? "",
      triggerEvent: a.automation?.triggerEvent ?? "",
      defaultOffsetDays: a.automation?.offsetDays ?? 0,
      offsetDaysOverride: a.offsetDaysOverride,
      effectiveOffsetDays:
        a.offsetDaysOverride != null ? a.offsetDaysOverride : a.automation?.offsetDays ?? 0,
      enabled: a.enabled,
      createdAt: a.createdAt,
    })),
    salaryRecords: seeFinance
      ? salaryRecords.map((s: any) => ({
          id: s.id,
          amount: Number(s.amount),
          isPaid: s.isPaid,
          user: s.user ? userBrief(s.user) : null,
          ruleUsed: s.ruleUsed
            ? {
                id: s.ruleUsed.id,
                role: s.ruleUsed.role,
                commissionType: s.ruleUsed.commissionType,
                commissionValue: Number(s.ruleUsed.commissionValue),
                applyOn: s.ruleUsed.applyOn,
              }
            : null,
        }))
      : [],
    // Note: `expenses` back-relation on Project was removed in GE schema change.
    // Kept as an empty array for backward-compatible response shape.
    expenses: [],
    role,
    seeFinance,
    seeBalance,
  }
}

export async function GET(_req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id } = await params

  // Try the full include set (with recordedBy on payments). Fall back to a
  // version without that include if the runtime Prisma client is stale.
  let project: any
  try {
    project = await db.project.findUnique({
      where: { id },
      include: {
        contract: { include: { customer: true } },
        servicePackage: true,
        fieldTeam: { select: { id: true, firstName: true, lastName: true, role: true, isAvailable: true } },
        studioTeam: { select: { id: true, firstName: true, lastName: true, role: true, isAvailable: true } },
        tasks: {
          orderBy: { order: "asc" },
          include: {
            assignedTo: { select: { id: true, firstName: true, lastName: true, role: true, isAvailable: true } },
          },
        },
        notes: {
          orderBy: { createdAt: "desc" },
          include: { author: { select: { id: true, firstName: true, lastName: true, role: true, isAvailable: true } } },
        },
        payments: {
          orderBy: { datePaid: "desc" },
          include: {
            recordedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
        salaryRecords: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true, isAvailable: true } },
            ruleUsed: true,
          },
        },
        smsAssignments: {
          include: { automation: { include: { template: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    })
  } catch {
    // Stale client fallback — drop the recordedBy include and attach users separately.
    project = await db.project.findUnique({
      where: { id },
      include: {
        contract: { include: { customer: true } },
        servicePackage: true,
        fieldTeam: { select: { id: true, firstName: true, lastName: true, role: true, isAvailable: true } },
        studioTeam: { select: { id: true, firstName: true, lastName: true, role: true, isAvailable: true } },
        tasks: {
          orderBy: { order: "asc" },
          include: {
            assignedTo: { select: { id: true, firstName: true, lastName: true, role: true, isAvailable: true } },
          },
        },
        notes: {
          orderBy: { createdAt: "desc" },
          include: { author: { select: { id: true, firstName: true, lastName: true, role: true, isAvailable: true } } },
        },
        payments: { orderBy: { datePaid: "desc" } },
        salaryRecords: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true, isAvailable: true } },
            ruleUsed: true,
          },
        },
        smsAssignments: {
          include: { automation: { include: { template: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (project) {
      // Use raw SQL to read recordedById (the runtime client may not expose it).
      let idMap = new Map<string, string | null>()
      if ((project.payments || []).length > 0) {
        try {
          const ids = (project.payments || []).map((p: any) => p.id)
          const rows: Array<{ id: string; recordedById: string | null }> =
            await db.$queryRawUnsafe(
              `SELECT id, recordedById FROM Payment WHERE id IN (${ids.map((_) => "?").join(",")})`,
              ...ids
            )
          idMap = new Map(rows.map((r) => [r.id, r.recordedById]))
        } catch {
          // ignore
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
      project.payments = (project.payments || []).map((p: any) => {
        const rid = idMap.get(p.id) ?? null
        return {
          ...p,
          recordedBy: rid ? userMap.get(rid) ?? null : null,
        }
      })
    }
  }

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Scope check for technical roles
  if (isTechnicalRole(role)) {
    const userId = (await db.user.findFirst({ where: { role }, select: { id: true } }))?.id
    if (userId) {
      const onTeam =
        project.fieldTeam.some((u) => u.id === userId) ||
        project.studioTeam.some((u) => u.id === userId)
      if (!onTeam) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  return NextResponse.json(await scopeProjectForRole(role, project, db!, { id }))
}

// ---- PATCH: update schedule/description/teams/pricing strategy/discount/actual times ----
interface CustomItem {
  name?: string
  price?: number
}
interface PatchBody {
  startDatetime?: string | null
  endDatetime?: string | null
  deliveryDeadline?: string | null
  printedDescription?: string
  fieldTeamIds?: string[]
  studioTeamIds?: string[]
  pricingStrategy?: string
  discountAmount?: number // Toman; will be converted to Rials × 10
  priceAdjustment?: number // Toman (positive = increase, negative = decrease)
  referralRewardOverride?: number | null // Toman; null = use package default
  projectAddress?: string | null
  projectLocationId?: string | null
  servicePackageId?: string
  isPriceFrozen?: boolean
  exemptFromPhotoPriceUpdate?: boolean
  // ✅ Editable tasks/equipment (override the package defaults for THIS project)
  customTasks?: CustomItem[]
  customEquipment?: CustomItem[]
  customDescription?: string
  // ✅ آتلیه — flag for studio-shoot projects
  isStudio?: boolean
}

export async function PATCH(req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  if (!["admin", "manager"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id } = await params
  const body = (await req.json().catch(() => ({}))) as PatchBody

  const project = await db.project.findUnique({ where: { id } })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const data: any = {}
  if (body.startDatetime !== undefined) data.startDatetime = body.startDatetime ? new Date(body.startDatetime) : null
  if (body.endDatetime !== undefined) data.endDatetime = body.endDatetime ? new Date(body.endDatetime) : null
  if (body.deliveryDeadline !== undefined) data.deliveryDeadline = body.deliveryDeadline ? new Date(body.deliveryDeadline) : null
  if (body.printedDescription !== undefined) data.printedDescription = body.printedDescription
  // ✅ customDescription → printedDescription (mirrors POST behavior)
  if (body.customDescription !== undefined) data.printedDescription = body.customDescription || null

  // ✅ Change service package (admin only) — preserves payments (we don't touch them).
  let packageChanged = false
  if (body.servicePackageId !== undefined && role === "admin" && typeof body.servicePackageId === "string" && body.servicePackageId.trim()) {
    const newPkg = await db.servicePackage.findUnique({
      where: { id: body.servicePackageId },
      select: { id: true, currentPrice: true, pricingStrategy: true, defaultTasks: true, defaultEquipment: true },
    })
    if (newPkg) {
      data.servicePackageId = newPkg.id
      packageChanged = true
      // Re-derive calculatedPrice with new package base + existing priceAdjustment/discount
      const basePrice = Number(newPkg.currentPrice)
      const adj = Number((project as any).priceAdjustment ?? 0)
      const disc = Number(project.discountAmount ?? 0)
      const adjustedBase = Math.max(0, basePrice + adj)
      data.calculatedPrice = Math.max(0, adjustedBase - disc)
    }
  }

  // ✅ Custom tasks/equipment — accept array of {name, price} and persist as JSON.
  // If the package changed AND no customTasks were provided, reset to the new package's defaults.
  function normalizeItems(arr: CustomItem[] | undefined): { name: string; price: number }[] {
    if (!Array.isArray(arr)) return []
    return (arr as any[])
      .map((t) => {
        if (typeof t === "string") return { name: t.trim(), price: 0 }
        if (t && typeof t === "object") {
          return { name: String(t.name ?? "").trim(), price: Number(t.price ?? 0) || 0 }
        }
        return null
      })
      .filter((t): t is { name: string; price: number } => !!t && t.name.length > 0)
  }

  if (Array.isArray(body.customTasks)) {
    const tasks = normalizeItems(body.customTasks)
    data.customTasksJson = JSON.stringify(tasks)
  } else if (packageChanged) {
    // Package changed but no explicit customTasks — clear override so package defaults apply
    data.customTasksJson = "[]"
  }

  if (Array.isArray(body.customEquipment)) {
    const equip = normalizeItems(body.customEquipment)
    data.customEquipmentJson = JSON.stringify(equip)
  } else if (packageChanged) {
    data.customEquipmentJson = "[]"
  }

  // Only admin can change pricing strategy
  if (body.pricingStrategy !== undefined && role === "admin" && PRICING_STRATEGIES.includes(body.pricingStrategy as never)) {
    data.pricingStrategy = body.pricingStrategy
  }

  // Discount amount (Toman → Rials). Allowed for admin/manager.
  // ✅ Also re-derive calculatedPrice using both priceAdjustment and discount.
  const pkgForPrice =
    body.discountAmount !== undefined || body.priceAdjustment !== undefined
      ? await db.servicePackage.findUnique({
          where: { id: project.servicePackageId },
          select: { currentPrice: true },
        })
      : null

  if (body.priceAdjustment !== undefined) {
    const toman = Number(body.priceAdjustment || 0) // allow negative
    data.priceAdjustment = toman * 10
  }
  if (body.referralRewardOverride !== undefined) {
    // null or 0/empty → null (use package default). Positive Toman → Rials.
    if (body.referralRewardOverride === null) {
      data.referralRewardOverride = null
    } else {
      const v = Number(body.referralRewardOverride)
      data.referralRewardOverride = Number.isFinite(v) && v > 0 ? v * 10 : null
    }
  }
  if (body.projectAddress !== undefined) {
    data.projectAddress =
      typeof body.projectAddress === "string" && body.projectAddress.trim()
        ? body.projectAddress.trim()
        : null
  }
  if (body.projectLocationId !== undefined) {
    data.projectLocationId =
      typeof body.projectLocationId === "string" && body.projectLocationId.trim()
        ? body.projectLocationId.trim()
        : null
  }

  if (body.discountAmount !== undefined) {
    const toman = Math.max(0, Number(body.discountAmount || 0))
    const rials = toman * 10
    data.discountAmount = rials
  }
  // ✅ Re-derive calculatedPrice = (pkg.currentPrice + priceAdjustment) - discount
  if (pkgForPrice && (body.discountAmount !== undefined || body.priceAdjustment !== undefined)) {
    const basePrice = Number(pkgForPrice.currentPrice)
    const adj =
      body.priceAdjustment !== undefined
        ? Number(body.priceAdjustment || 0) * 10
        : Number((project as any).priceAdjustment ?? 0)
    const disc =
      body.discountAmount !== undefined
        ? Math.max(0, Number(body.discountAmount || 0)) * 10
        : Number(project.discountAmount ?? 0)
    const adjustedBase = Math.max(0, basePrice + adj)
    data.calculatedPrice = Math.max(0, adjustedBase - disc)
  }

  // Team reassignments (full replace)
  // ✅ When fieldTeam changes, capture the BEFORE state so we can detect newly
  // added members and notify them after the update.
  let previousFieldTeamIds: string[] = []
  if (body.fieldTeamIds !== undefined) {
    try {
      const before = await db.project.findUnique({
        where: { id },
        select: { fieldTeam: { select: { id: true } } },
      })
      previousFieldTeamIds = (before?.fieldTeam ?? []).map((u) => u.id)
    } catch { /* ignore */ }
    data.fieldTeam = { set: body.fieldTeamIds.map((uid) => ({ id: uid })) }
  }
  // ✅ studioTeamIds is still accepted (the API still honors it to clear existing
  // studio team — e.g. passing `studioTeamIds: []` removes everyone). The UI no
  // longer sends this from the TeamTab, but the API contract is preserved.
  if (body.studioTeamIds !== undefined) data.studioTeam = { set: body.studioTeamIds.map((uid) => ({ id: uid })) }

  // ✅ Freeze toggles (admin/manager)
  if (body.isPriceFrozen !== undefined) data.isPriceFrozen = Boolean(body.isPriceFrozen)
  if (body.exemptFromPhotoPriceUpdate !== undefined) data.exemptFromPhotoPriceUpdate = Boolean(body.exemptFromPhotoPriceUpdate)
  // ✅ آتلیه — flag for studio-shoot projects
  if (body.isStudio !== undefined) data.isStudio = Boolean(body.isStudio)

  const updated = await db.project.update({ where: { id }, data: data as any })

  // ✅ Send a Notification to each newly-added fieldTeam member.
  if (body.fieldTeamIds !== undefined) {
    const prevSet = new Set(previousFieldTeamIds)
    const newlyAdded = body.fieldTeamIds.filter((uid) => !prevSet.has(uid))
    if (newlyAdded.length > 0) {
      // Resolve project title for a friendlier message
      let projectTitle = "پروژه"
      try {
        const proj = await db.project.findUnique({
          where: { id },
          select: { servicePackage: { select: { title: true } } },
        })
        projectTitle = proj?.servicePackage?.title || projectTitle
      } catch { /* ignore */ }
      for (const newMemberId of newlyAdded) {
        try {
          await db.notification.create({
            data: {
              userId: newMemberId,
              type: "info",
              title: "شما به پروژه اضافه شدید",
              message: `${projectTitle} — شما به تیم اجرایی این پروژه اضافه شدید`,
              link: "projects",
              refId: id,
            },
          })
        } catch { /* best-effort */ }
      }
    }
  }

  // ✅ When custom tasks are provided (or package changed), replace existing Task rows
  // so the project's task list reflects the new package defaults / user edits.
  if (Array.isArray(body.customTasks) || packageChanged) {
    try {
      await db.task.deleteMany({ where: { projectId: id } })
      // Use the explicit customTasks if provided; otherwise load from the (possibly new) package defaults.
      let taskTitles: string[] = []
      if (Array.isArray(body.customTasks)) {
        const normalized = normalizeItems(body.customTasks)
        taskTitles = normalized.map((t) => t.name)
      } else {
        // Package changed with no customTasks → use the new package's defaultTasks
        const newPkgId = (updated as any).servicePackageId
        const pkg = await db.servicePackage.findUnique({
          where: { id: newPkgId },
          select: { defaultTasks: true },
        })
        if (pkg?.defaultTasks) {
          try {
            const parsed = JSON.parse(pkg.defaultTasks)
            if (Array.isArray(parsed)) {
              taskTitles = parsed
                .map((t: any) => typeof t === "string" ? t : (t && typeof t === "object" ? String(t.name ?? "") : ""))
                .filter((s: string) => s.trim().length > 0)
            }
          } catch { /* ignore */ }
        }
      }
      if (taskTitles.length > 0) {
        await db.task.createMany({
          data: taskTitles.map((title, i) => ({
            projectId: id,
            title,
            status: "todo",
            order: i,
          })),
        })
      }
    } catch { /* defensive: tasks table might be stale on edge cases */ }
  }

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    startDatetime: updated.startDatetime,
    endDatetime: updated.endDatetime,
    deliveryDeadline: updated.deliveryDeadline,
    printedDescription: updated.printedDescription,
    pricingStrategy: updated.pricingStrategy,
    isPriceFrozen: updated.isPriceFrozen,
    exemptFromPhotoPriceUpdate: updated.exemptFromPhotoPriceUpdate,
    discountAmount: updated.discountAmount ? Number(updated.discountAmount) : 0,
    calculatedPrice: updated.calculatedPrice != null ? Number(updated.calculatedPrice) : null,
    // ✅ فیلدهای جدید
    priceAdjustment: Number((updated as any).priceAdjustment ?? 0),
    referralRewardOverride:
      (updated as any).referralRewardOverride != null
        ? Number((updated as any).referralRewardOverride)
        : null,
    projectAddress: (updated as any).projectAddress ?? null,
    projectLocationId: (updated as any).projectLocationId ?? null,
    servicePackageId: updated.servicePackageId,
    // ✅ آتلیه — flag for studio-shoot projects
    isStudio: Boolean((updated as any).isStudio),
    // ✅ Custom tasks/equipment (parsed back from JSON for the response)
    customTasks: safeParseItems((updated as any).customTasksJson),
    customEquipment: safeParseItems((updated as any).customEquipmentJson),
  })
}

// Parse a JSON array of {name, price} (or legacy string array). Returns [] on error.
function safeParseItems(s: string | null | undefined): { name: string; price: number }[] {
  if (!s) return []
  try {
    const v = JSON.parse(s)
    if (!Array.isArray(v)) return []
    return v.map((item: any) => {
      if (typeof item === "string") return { name: item, price: 0 }
      if (item && typeof item === "object") {
        return { name: String(item.name ?? ""), price: Number(item.price ?? 0) || 0 }
      }
      return { name: String(item), price: 0 }
    }).filter((item) => item.name.trim().length > 0)
  } catch {
    return []
  }
}

// ---- DELETE: hard-delete a project (admin/manager only).
// Allowed for any status, but typically used for delivered/archived projects.
// Cascades to tasks, projectNotes, payments, expenses, salaryRecords,
// projectSmsAssignments (all have onDelete: Cascade on the Project relation,
// or are deleted explicitly below to be safe with older schemas).
export async function DELETE(_req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  if (!["admin", "manager"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id } = await params

  const project = await db.project.findUnique({ where: { id }, select: { id: true } })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Defensive: delete child rows explicitly so this works even on schemas
  // without onDelete: Cascade. The Prisma schema declares Cascade on most,
  // but a few (Payment, Expense, SalaryRecord) use Restrict by default.
  try {
    await db.payment.deleteMany({ where: { projectId: id } })
  } catch {}
  try {
    await db.expense.deleteMany({ where: { relatedProjectId: id } })
  } catch {}
  try {
    await db.salaryRecord.deleteMany({ where: { projectId: id } })
  } catch {}
  try {
    await db.task.deleteMany({ where: { projectId: id } })
  } catch {}
  try {
    await db.projectNote.deleteMany({ where: { projectId: id } })
  } catch {}
  try {
    await db.projectSmsAssignment.deleteMany({ where: { projectId: id } })
  } catch {}
  // Disconnect team relations (M2M) — set to empty arrays.
  try {
    await db.project.update({
      where: { id },
      data: {
        fieldTeam: { set: [] },
        studioTeam: { set: [] },
      },
    })
  } catch {}
  // Referral codes for project — set to null.
  try {
    await db.referralCode.updateMany({ where: { relatedProjectId: id }, data: { relatedProjectId: null } })
  } catch {}
  try {
    await db.referral.updateMany({ where: { relatedProjectId: id }, data: { relatedProjectId: null } })
  } catch {}

  await db.project.delete({ where: { id } })

  return NextResponse.json({ ok: true, id })
}

