import { NextResponse } from "next/server"
import { masterDb } from "@/lib/master-db"
import { requireSuperAdmin, getStudioStats, getPlatformSettings, SUBSCRIPTION_PLANS } from "@/lib/super-admin"

export const dynamic = "force-dynamic"

/**
 * GET /api/super-admin/overview
 * آمار کلی پلتفرم برای داشبورد super-admin
 */
export async function GET() {
  try {
    await requireSuperAdmin()
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const studios = await masterDb.studio.findMany({
    include: { _count: { select: { memberships: true, smsTransactions: true } } },
    orderBy: { createdAt: "desc" },
  })

  const studioStats = await Promise.all(
    studios.map(async (s) => {
      const stats = await getStudioStats(s.dbName)
      return {
        id: s.id,
        name: s.name,
        nameEn: s.nameEn,
        dbName: s.dbName,
        plan: s.plan,
        isActive: s.isActive,
        subscriptionStart: s.subscriptionStart,
        subscriptionEnd: s.subscriptionEnd,
        ownerName: s.ownerName,
        ownerPhone: s.ownerPhone,
        city: s.city,
        smsCreditRial: s.smsCreditRial,
        kavenegarStatus: s.kavenegarStatus,
        storageUsedBytes: Number(s.storageUsedBytes),
        storageQuotaBytes: Number(s.storageQuotaBytes),
        maxStorageBytes: Number(s.maxStorageBytes),
        maxEmployees: s.maxEmployees,
        maxProjects: s.maxProjects,
        maxCustomers: s.maxCustomers,
        ...stats,
        membershipCount: s._count.memberships,
        smsTxCount: s._count.smsTransactions,
      }
    })
  )

  const totals = {
    studios: studios.length,
    activeStudios: studios.filter((s) => s.isActive).length,
    trialStudios: studios.filter((s) => s.plan === "trial").length,
    basicStudios: studios.filter((s) => s.plan === "basic").length,
    proStudios: studios.filter((s) => s.plan === "pro").length,
    enterpriseStudios: studios.filter((s) => s.plan === "enterprise").length,
    suspendedStudios: studios.filter((s) => s.plan === "suspended").length,
    totalSmsCreditRial: studios.reduce((sum, s) => sum + s.smsCreditRial, 0),
    totalStorageUsedBytes: studios.reduce((sum, s) => sum + Number(s.storageUsedBytes), 0),
    totalEmployees: studioStats.reduce((sum, s) => sum + s.employees, 0),
    totalProjects: studioStats.reduce((sum, s) => sum + s.projects, 0),
    totalCustomers: studioStats.reduce((sum, s) => sum + s.customers, 0),
  }

  const nearLimitStudios = studioStats.filter((s) => {
    if (s.maxEmployees <= 0) return false
    return s.employees >= Math.floor(s.maxEmployees * 0.8)
  })

  const expiringSoon = studios.filter((s) => {
    if (!s.subscriptionEnd) return false
    const daysLeft = (s.subscriptionEnd.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    return daysLeft > 0 && daysLeft <= 7
  })

  const expired = studios.filter((s) => {
    if (!s.subscriptionEnd) return false
    return s.subscriptionEnd.getTime() < Date.now()
  })

  const settings = await getPlatformSettings()

  return NextResponse.json({
    totals,
    studios: studioStats,
    nearLimitStudios: nearLimitStudios.map((s) => ({
      id: s.id, name: s.name, employees: s.employees,
      maxEmployees: s.maxEmployees, plan: s.plan,
    })),
    expiringSoon: expiringSoon.map((s) => ({
      id: s.id, name: s.name, subscriptionEnd: s.subscriptionEnd, plan: s.plan,
    })),
    expired: expired.map((s) => ({
      id: s.id, name: s.name, subscriptionEnd: s.subscriptionEnd, plan: s.plan,
    })),
    plans: SUBSCRIPTION_PLANS.map((p) => ({
      id: p.id, name: p.name, nameEn: p.nameEn,
      maxEmployees: p.maxEmployees, monthlyPriceToman: p.monthlyPriceToman,
      durationDays: p.durationDays,
    })),
    settings,
  })
}
