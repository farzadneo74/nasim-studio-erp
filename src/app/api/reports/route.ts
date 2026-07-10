import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb, assertRole } from "@/lib/auth-helpers"
import { getEffectivePrice } from "@/lib/pricing"
import {
  PROJECT_STATUSES,
  PACKAGE_CATEGORIES,
  type PackageCategory,
} from "@/lib/constants"

/**
 * GET /api/reports?from=&to=
 *
 * Aggregated financial & operational report. Admin/manager only (403 otherwise).
 * Returns KPIs, monthly revenue vs expense trend, revenue breakdowns by
 * package category & package, project status distribution, debtors list,
 * unpaid salaries by user, and top customers by revenue.
 */
export async function GET(req: NextRequest) {
  const role = await getCurrentRole()
  try {
    assertRole(role, ["admin", "manager"])
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const today = new Date()
  // Default to last 90 days
  const fromDate = from ? new Date(from) : new Date(today.getTime() - 90 * 86400000)
  const toDate = to ? new Date(to) : today
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "invalid date range" }, { status: 400 })
  }

  const [projects, payments, expenses, salaryRecords] = await Promise.all([
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
    db.payment.findMany(),
    db.expense.findMany(),
    db.salaryRecord.findMany({ include: { user: true } }),
  ])

  const rangePayments = payments.filter((p) => {
    const d = new Date(p.datePaid)
    return d >= fromDate && d <= toDate
  })
  const confirmedPayments = rangePayments.filter((p) => p.isConfirmed)
  const rangeExpenses = expenses.filter((e) => {
    const d = new Date(e.date)
    return d >= fromDate && d <= toDate
  })

  const totalRevenue = confirmedPayments.reduce((s, p) => s + Number(p.amount), 0)
  const totalExpenses = rangeExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const netProfit = totalRevenue - totalExpenses

  // Helper: effective price for a project
  function effPrice(p: (typeof projects)[number]): number {
    return getEffectivePrice({
      pricingStrategy: p.pricingStrategy as never,
      calculatedPrice: p.calculatedPrice,
      lockedPrice: p.lockedPrice,
      isPriceFrozen: p.isPriceFrozen,
      isReadyForDelivery: p.isReadyForDelivery,
      readyDate: p.readyDate,
      priceAtReadyTime: p.priceAtReadyTime,
      packageCurrentPrice: p.servicePackage.currentPrice,
      totalConfirmedPaid: p.payments
        .filter((x) => x.isConfirmed)
        .reduce((s, x) => s + Number(x.amount), 0),
    })
  }

  // Average project value (by effective price) for projects whose start falls in range
  const rangeProjects = projects.filter((p) => {
    if (!p.startDatetime) return false
    const d = new Date(p.startDatetime)
    return d >= fromDate && d <= toDate
  })
  const totalEffValue = rangeProjects.reduce((s, p) => s + effPrice(p), 0)
  const avgProjectValue =
    rangeProjects.length > 0 ? Math.round(totalEffValue / rangeProjects.length) : 0

  // Monthly revenue vs expense trend (month buckets across the range)
  const trend: { label: string; revenue: number; expense: number }[] = []
  const cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1)
  const endCursor = new Date(toDate.getFullYear(), toDate.getMonth(), 1)
  while (cursor <= endCursor) {
    const monthStart = new Date(cursor)
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    const rev = confirmedPayments
      .filter((p) => {
        const d = new Date(p.datePaid)
        return d >= monthStart && d < monthEnd
      })
      .reduce((s, p) => s + Number(p.amount), 0)
    const exp = rangeExpenses
      .filter((e) => {
        const d = new Date(e.date)
        return d >= monthStart && d < monthEnd
      })
      .reduce((s, e) => s + Number(e.amount), 0)
    trend.push({
      label: monthStart.toLocaleString("en", {
        month: "short",
        year: "2-digit",
      }),
      revenue: rev,
      expense: exp,
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  // Revenue by package category (photo/video/mix) — based on payment → project → package.category
  const revByCat: Record<string, number> = {
    photo: 0,
    video: 0,
    mix: 0,
  }
  for (const pmt of confirmedPayments) {
    const proj = projects.find((p) => p.id === pmt.projectId)
    if (!proj) continue
    const cat = proj.servicePackage.category as PackageCategory
    if (!PACKAGE_CATEGORIES.includes(cat)) continue
    revByCat[cat] = (revByCat[cat] ?? 0) + Number(pmt.amount)
  }
  const revenueByCategory = Object.entries(revByCat).map(([name, value]) => ({
    name,
    value,
  }))

  // Revenue by service package (top N)
  const revByPkg: Record<string, number> = {}
  for (const pmt of confirmedPayments) {
    const proj = projects.find((p) => p.id === pmt.projectId)
    if (!proj) continue
    const title = proj.servicePackage.title
    revByPkg[title] = (revByPkg[title] ?? 0) + Number(pmt.amount)
  }
  const revenueByPackage = Object.entries(revByPkg)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  // Project status distribution (all projects, not range-filtered)
  const statusDist = PROJECT_STATUSES.map((st) => ({
    status: st,
    count: projects.filter((p) => p.status === st).length,
  }))

  // Debtors: projects where balance > 0
  const debtors = projects
    .map((p) => {
      const eff = effPrice(p)
      const paid = p.payments
        .filter((x) => x.isConfirmed)
        .reduce((s, x) => s + Number(x.amount), 0)
      const balance = Math.max(0, eff - paid)
      return {
        id: p.id,
        customer: p.contract.customer.name,
        package: p.servicePackage.title,
        effectivePrice: eff,
        paid,
        balance,
        status: p.status,
      }
    })
    .filter((d) => d.balance > 0)
    .sort((a, b) => b.balance - a.balance)

  // Unpaid salaries by user
  const unpaidMap: Record<string, number> = {}
  for (const s of salaryRecords) {
    if (s.isPaid) continue
    const name = `${s.user.firstName} ${s.user.lastName}`
    unpaidMap[name] = (unpaidMap[name] ?? 0) + Number(s.amount)
  }
  const unpaidSalaries = Object.entries(unpaidMap).map(([name, amount]) => ({
    name,
    amount,
  }))

  // Top customers by revenue (from confirmed payments in range)
  const custMap: Record<string, { name: string; revenue: number }> = {}
  for (const pmt of confirmedPayments) {
    const proj = projects.find((p) => p.id === pmt.projectId)
    if (!proj) continue
    const cid = proj.contract.customer.id
    const cname = proj.contract.customer.name
    if (!custMap[cid]) custMap[cid] = { name: cname, revenue: 0 }
    custMap[cid].revenue += Number(pmt.amount)
  }
  const topCustomers = Object.values(custMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  return NextResponse.json({
    kpis: {
      totalRevenue,
      totalExpenses,
      netProfit,
      avgProjectValue,
    },
    revenueTrend: trend,
    revenueByCategory,
    revenueByPackage,
    statusDist,
    debtors,
    unpaidSalaries,
    topCustomers,
    range: { from: fromDate.toISOString(), to: toDate.toISOString() },
  })
}
