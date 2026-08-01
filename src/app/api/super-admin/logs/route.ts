import { NextResponse } from "next/server"
import { masterDb } from "@/lib/master-db"
import { requireSuperAdmin } from "@/lib/super-admin"
import { getStudioDb } from "@/lib/studio-db"

export const dynamic = "force-dynamic"

/**
 * GET /api/super-admin/logs
 * لاگ‌های جامع و حرفه‌ای از فعالیت استودیوها
 *
 * شامل:
 *  - نشست‌های اخیر (login/logout)
 *  - پروژه‌های ایجاد شده اخیر
 *  - پرداخت‌های اخیر
 *  - تراکنش‌های SMS
 *  - تراکنش‌های اعتبار
 *  - آمار فعالیت هر استودیو
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

  // ✅ نشست‌های اخیر (login activity)
  const recentSessions = await masterDb.session.findMany({
    take: 30,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { phone: true, name: true } } },
  })

  // ✅ تراکنش‌های SMS اخیر
  const recentSmsTx = await masterDb.smsTransaction.findMany({
    take: 30,
    orderBy: { createdAt: "desc" },
    include: { studio: { select: { name: true, dbName: true } } },
  })

  // ✅ رویدادهای اشتراک اخیر
  const recentSubEvents = await masterDb.subscriptionEvent.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    include: { studio: { select: { name: true } } },
  })

  // ✅ آمار کامل هر استودیو
  const studioDetails = []
  for (const s of studios) {
    let projectCount = 0, customerCount = 0, employeeCount = 0
    let paymentTotal = 0, creditTxCount = 0, noteCount = 0, taskCount = 0

    try {
      const db = getStudioDb(s.dbName)
      projectCount = await db.project.count()
      customerCount = await db.customer.count()
      employeeCount = await db.user.count()
      noteCount = await db.projectNote.count()
      taskCount = await db.task.count()
      creditTxCount = await db.creditTransaction.count()

      // جمع پرداخت‌ها
      const payments = await db.payment.findMany({
        where: { isConfirmed: true },
        select: { amount: true },
      })
      paymentTotal = payments.reduce((sum, p) => sum + Number(p.amount), 0)
    } catch {
      // ignore
    }

    studioDetails.push({
      id: s.id,
      name: s.name,
      nameEn: s.nameEn,
      dbName: s.dbName,
      plan: s.plan,
      isActive: s.isActive,
      ownerName: s.ownerName,
      ownerPhone: s.ownerPhone,
      city: s.city,
      smsCreditRial: s.smsCreditRial,
      kavenegarStatus: s.kavenegarStatus,
      storageUsedBytes: Number(s.storageUsedBytes),
      storageQuotaBytes: Number(s.storageQuotaBytes),
      maxEmployees: s.maxEmployees,
      subscriptionStart: s.subscriptionStart,
      subscriptionEnd: s.subscriptionEnd,
      createdAt: s.createdAt,
      // آمار
      stats: {
        projects: projectCount,
        customers: customerCount,
        employees: employeeCount,
        notes: noteCount,
        tasks: taskCount,
        creditTxs: creditTxCount,
        paymentTotalRials: paymentTotal,
        smsTxCount: s._count.smsTransactions,
        membershipCount: s._count.memberships,
      },
    })
  }

  // ✅ آمار کلی پلتفرم
  const totals = {
    studios: studioDetails.length,
    activeStudios: studioDetails.filter((s) => s.isActive).length,
    totalProjects: studioDetails.reduce((s, x) => s + x.stats.projects, 0),
    totalCustomers: studioDetails.reduce((s, x) => s + x.stats.customers, 0),
    totalEmployees: studioDetails.reduce((s, x) => s + x.stats.employees, 0),
    totalPaymentsRials: studioDetails.reduce((s, x) => s + x.stats.paymentTotalRials, 0),
    totalNotes: studioDetails.reduce((s, x) => s + x.stats.notes, 0),
    totalTasks: studioDetails.reduce((s, x) => s + x.stats.tasks, 0),
    totalCreditTxs: studioDetails.reduce((s, x) => s + x.stats.creditTxs, 0),
    totalSmsTx: recentSmsTx.length,
    totalSessions: recentSessions.length,
  }

  return NextResponse.json({
    totals,
    studios: studioDetails,
    recentSessions: recentSessions.map((s) => ({
      id: s.id,
      token: s.token.slice(0, 8) + "...",
      userId: s.userId,
      userName: s.user?.name ?? "—",
      userPhone: s.user?.phone ?? "—",
      studioId: s.studioId,
      role: s.role,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    })),
    recentSmsTx: recentSmsTx.map((t) => ({
      id: t.id,
      studioName: t.studio.name,
      type: t.type,
      amountRial: t.amountRial,
      receptor: t.receptor,
      messageSnippet: t.messageSnippet,
      status: t.status,
      createdAt: t.createdAt,
    })),
    recentSubEvents: recentSubEvents.map((e) => ({
      id: e.id,
      studioName: e.studio.name,
      eventType: e.eventType,
      fromPlan: e.fromPlan,
      toPlan: e.toPlan,
      amountPaidToman: e.amountPaidToman,
      note: e.note,
      createdAt: e.createdAt,
    })),
  })
}
