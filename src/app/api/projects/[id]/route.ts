import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import {
  CAN_SEE_BALANCE,
  CAN_ACCESS_FULL_FINANCE,
  PRICING_STRATEGIES,
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

async function scopeProjectForRole(role: Role, project: any) {
  const seeBalance = CAN_SEE_BALANCE.includes(role)
  const seeFinance = CAN_ACCESS_FULL_FINANCE.includes(role)
  const canSeePhone = role === "admin" || role === "manager" || role === "sales" || role === "photographer"

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
  })

  const salaryRecords = project.salaryRecords || []

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
    discountAmount: seeFinance ? Number(project.discountAmount ?? 0) : null,
    startDatetime: project.startDatetime,
    endDatetime: project.endDatetime,
    deliveryDeadline: project.deliveryDeadline,
    status: project.status,
    printedDescription: project.printedDescription,
    isReadyForDelivery: project.isReadyForDelivery,
    readyDate: project.readyDate,
    priceAtReadyTime: seeFinance ? (project.priceAtReadyTime ? Number(project.priceAtReadyTime) : null) : null,
    actualStartDatetime: project.actualStartDatetime,
    actualEndDatetime: project.actualEndDatetime,
    effectivePrice: seeBalance ? eff : null,
    totalPaid: seeBalance ? totalPaid : null,
    balance: seeBalance ? Math.max(0, eff - totalPaid) : null,
    fieldTeam: project.fieldTeam.map(userBrief),
    studioTeam: project.studioTeam.map(userBrief),
    deliveryTeam: project.deliveryTeam.map(userBrief),
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
        deliveryTeam: { select: { id: true, firstName: true, lastName: true, role: true, isAvailable: true } },
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
        deliveryTeam: { select: { id: true, firstName: true, lastName: true, role: true, isAvailable: true } },
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
  if (["photographer", "editor", "qc", "logistics"].includes(role)) {
    const userId = (await db.user.findFirst({ where: { role }, select: { id: true } }))?.id
    if (userId) {
      const onTeam =
        project.fieldTeam.some((u) => u.id === userId) ||
        project.studioTeam.some((u) => u.id === userId) ||
        project.deliveryTeam.some((u) => u.id === userId)
      if (!onTeam) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  return NextResponse.json(await scopeProjectForRole(role, project))
}

// ---- PATCH: update schedule/description/teams/pricing strategy/discount/actual times ----
interface PatchBody {
  startDatetime?: string | null
  endDatetime?: string | null
  deliveryDeadline?: string | null
  printedDescription?: string
  fieldTeamIds?: string[]
  studioTeamIds?: string[]
  deliveryTeamIds?: string[]
  pricingStrategy?: string
  discountAmount?: number // Toman; will be converted to Rials × 10
  actualStartDatetime?: string | null
  actualEndDatetime?: string | null
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
  // Real execution times (manual override). Empty string clears them.
  if (body.actualStartDatetime !== undefined) {
    data.actualStartDatetime = body.actualStartDatetime ? new Date(body.actualStartDatetime) : null
  }
  if (body.actualEndDatetime !== undefined) {
    data.actualEndDatetime = body.actualEndDatetime ? new Date(body.actualEndDatetime) : null
  }

  // Only admin can change pricing strategy
  if (body.pricingStrategy !== undefined && role === "admin" && PRICING_STRATEGIES.includes(body.pricingStrategy as never)) {
    data.pricingStrategy = body.pricingStrategy
  }

  // Discount amount (Toman → Rials). Allowed for admin/manager.
  if (body.discountAmount !== undefined) {
    const toman = Math.max(0, Number(body.discountAmount || 0))
    const rials = toman * 10
    data.discountAmount = rials
    // Re-derive calculatedPrice = currentPackagePrice - discount, if package is available.
    const pkg = await db.servicePackage.findUnique({
      where: { id: project.servicePackageId },
      select: { currentPrice: true },
    })
    if (pkg) {
      data.calculatedPrice = Math.max(0, Number(pkg.currentPrice) - rials)
    }
  }

  // Team reassignments (full replace)
  if (body.fieldTeamIds !== undefined) data.fieldTeam = { set: body.fieldTeamIds.map((uid) => ({ id: uid })) }
  if (body.studioTeamIds !== undefined) data.studioTeam = { set: body.studioTeamIds.map((uid) => ({ id: uid })) }
  if (body.deliveryTeamIds !== undefined) data.deliveryTeam = { set: body.deliveryTeamIds.map((uid) => ({ id: uid })) }

  const updated = await db.project.update({ where: { id }, data })

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    startDatetime: updated.startDatetime,
    endDatetime: updated.endDatetime,
    deliveryDeadline: updated.deliveryDeadline,
    printedDescription: updated.printedDescription,
    pricingStrategy: updated.pricingStrategy,
    discountAmount: updated.discountAmount ? Number(updated.discountAmount) : 0,
    calculatedPrice: updated.calculatedPrice != null ? Number(updated.calculatedPrice) : null,
    actualStartDatetime: updated.actualStartDatetime,
    actualEndDatetime: updated.actualEndDatetime,
  })
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
        deliveryTeam: { set: [] },
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
