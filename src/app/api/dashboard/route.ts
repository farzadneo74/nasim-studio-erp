import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { CAN_ACCESS_FULL_FINANCE, CAN_SEE_BALANCE, PROJECT_STATUSES, normalizeStatus } from "@/lib/constants"
import { getEffectivePrice } from "@/lib/pricing"
import { formatRials } from "@/lib/format"
import { toJalali, JALALI_MONTHS } from "@/lib/jalali"

export async function GET() {
  const role = await getCurrentRole()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const seeFinance = CAN_ACCESS_FULL_FINANCE.includes(role)
  const seeBalance = CAN_SEE_BALANCE.includes(role)

  const [projects, payments, expenses, customers, salaryRecords, notifications, leavePending] = await Promise.all([
    db.project.findMany({
      include: {
        servicePackage: true,
        contract: { include: { customer: true } },
        fieldTeam: true,
        studioTeam: true,
        deliveryTeam: true,
        payments: true,
      },
    }),
    db.payment.findMany({ where: seeFinance ? {} : { isConfirmed: true } }),
    db.expense.findMany(),
    db.customer.count(),
    db.salaryRecord.findMany({ include: { user: true } }),
    db.notification.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    db.leaveRequest.count({ where: { status: "pending" } }),
  ])

  // KPIs
  const today = new Date()
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const confirmedPayments = payments.filter((p) => p.isConfirmed)
  const todaysIncome = confirmedPayments
    .filter((p) => new Date(p.datePaid) >= startToday)
    .reduce((s, p) => s + Number(p.amount), 0)

  const totalRevenue = confirmedPayments.reduce((s, p) => s + Number(p.amount), 0)
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0)

  const pendingSettlement = projects.reduce((sum, p) => {
    const eff = getEffectivePrice({
      pricingStrategy: p.pricingStrategy as never,
      calculatedPrice: p.calculatedPrice,
      lockedPrice: p.lockedPrice,
      isPriceFrozen: p.isPriceFrozen,
      isReadyForDelivery: p.isReadyForDelivery,
      readyDate: p.readyDate,
      priceAtReadyTime: p.priceAtReadyTime,
      packageCurrentPrice: p.servicePackage.currentPrice,
      totalConfirmedPaid: p.payments.filter((x) => x.isConfirmed).reduce((s, x) => s + Number(x.amount), 0),
    })
    const paid = p.payments.filter((x) => x.isConfirmed).reduce((s, x) => s + Number(x.amount), 0)
    return sum + Math.max(0, eff - paid)
  }, 0)

  const unpaidSalaries = salaryRecords.filter((s) => !s.isPaid).reduce((sum, s) => sum + Number(s.amount), 0)
  const scheduledCount = projects.filter((p) => normalizeStatus(p.status) === "scheduled").length
  // "active" = in-production (everything except scheduled, ready, delivered)
  const activeCount = projects.filter((p) =>
    ["running", "managing", "editing", "qc", "render"].includes(normalizeStatus(p.status))
  ).length
  const readyCount = projects.filter((p) => normalizeStatus(p.status) === "ready").length
  const deliveredCount = projects.filter((p) => normalizeStatus(p.status) === "delivered").length

  // status distribution — normalized to the canonical 8-status flow
  // (legacy "shooting"/"culling" rows count under "running"/"managing")
  const statusDist = PROJECT_STATUSES.map((st) => ({
    status: st,
    count: projects.filter((p) => normalizeStatus(p.status) === st).length,
  }))

  // revenue trend (last 6 months)
  const months: { label: string; revenue: number; expense: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const next = new Date(today.getFullYear(), today.getMonth() - i + 1, 1)
    const rev = confirmedPayments
      .filter((p) => new Date(p.datePaid) >= d && new Date(p.datePaid) < next)
      .reduce((s, p) => s + Number(p.amount), 0)
    const exp = expenses
      .filter((e) => new Date(e.date) >= d && new Date(e.date) < next)
      .reduce((s, e) => s + Number(e.amount), 0)
    months.push({ label: JALALI_MONTHS[toJalali(d).jm - 1], revenue: rev, expense: exp })
  }

  // recent projects (limited fields per role)
  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)
    .map((p) => {
      const eff = getEffectivePrice({
        pricingStrategy: p.pricingStrategy as never,
        calculatedPrice: p.calculatedPrice,
        lockedPrice: p.lockedPrice,
        isPriceFrozen: p.isPriceFrozen,
        isReadyForDelivery: p.isReadyForDelivery,
        readyDate: p.readyDate,
        priceAtReadyTime: p.priceAtReadyTime,
        packageCurrentPrice: p.servicePackage.currentPrice,
        totalConfirmedPaid: p.payments.filter((x) => x.isConfirmed).reduce((s, x) => s + Number(x.amount), 0),
      })
      const paid = p.payments.filter((x) => x.isConfirmed).reduce((s, x) => s + Number(x.amount), 0)
      return {
        id: p.id,
        title: p.contract.customer.name,
        package: p.servicePackage.title,
        category: p.servicePackage.category,
        status: p.status,
        startDatetime: p.startDatetime,
        effectivePrice: seeBalance ? eff : null,
        balance: seeBalance ? Math.max(0, eff - paid) : null,
        team: [...p.fieldTeam, ...p.studioTeam, ...p.deliveryTeam].map((u) => ({
          id: u.id,
          name: u.firstName + " " + u.lastName,
        })),
      }
    })

  // upcoming shoots (next 14 days)
  const upcoming = projects
    .filter((p) => p.startDatetime && new Date(p.startDatetime) >= today && new Date(p.startDatetime) <= new Date(today.getTime() + 14 * 86400000))
    .sort((a, b) => new Date(a.startDatetime!).getTime() - new Date(b.startDatetime!).getTime())
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      title: p.contract.customer.name,
      package: p.servicePackage.title,
      category: p.servicePackage.category,
      start: p.startDatetime,
      end: p.endDatetime,
    }))

  return NextResponse.json({
    role,
    kpis: {
      todaysIncome: seeFinance ? todaysIncome : null,
      totalRevenue: seeFinance ? totalRevenue : null,
      totalExpenses: seeFinance ? totalExpenses : null,
      netProfit: seeFinance ? totalRevenue - totalExpenses : null,
      pendingSettlement: seeBalance ? pendingSettlement : null,
      unpaidSalaries: seeFinance ? unpaidSalaries : null,
      customers,
      scheduledCount,
      activeCount,
      readyCount,
      deliveredCount,
      leavePending,
    },
    statusDist,
    revenueTrend: seeFinance ? months : null,
    recentProjects,
    upcoming,
    notifications,
    seeFinance,
    seeBalance,
    formatted: {
      todaysIncome: formatRials(todaysIncome),
      totalRevenue: formatRials(totalRevenue),
      pendingSettlement: formatRials(pendingSettlement),
      unpaidSalaries: formatRials(unpaidSalaries),
    },
  })
}
