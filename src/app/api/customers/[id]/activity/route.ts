import { NextResponse } from "next/server"
import { getCurrentStudioDb } from "@/lib/auth-helpers"
import { formatRials } from "@/lib/format"
import { toJalali, JALALI_MONTHS } from "@/lib/jalali"

type Ctx = { params: Promise<{ id: string }> }

interface ActivityItem {
  id: string
  type: "project_created" | "project_status" | "payment" | "note" | "credit" | "contract"
  title: string
  description: string
  date: string // ISO
  amount?: string | null // formatted Rials
  metadata?: Record<string, unknown>
}

export async function GET(_req: Request, { params }: Ctx) {
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id } = await params

  // Verify customer exists
  const customer = await db.customer.findUnique({
    where: { id },
    select: { id: true, name: true },
  })
  if (!customer) return NextResponse.json({ error: "مشتری یافت نشد" }, { status: 404 })

  const activities: ActivityItem[] = []

  // Fetch all related data in parallel
  const [contracts, projects, payments, notes, creditTxs] = await Promise.all([
    db.contract.findMany({
      where: { customerId: id },
      select: { id: true, contractNumber: true, dateCreated: true },
    }),
    db.project.findMany({
      where: { contract: { customerId: id } },
      select: {
        id: true,
        status: true,
        startDatetime: true,
        createdAt: true,
        calculatedPrice: true,
        servicePackage: { select: { title: true, category: true } },
        contract: { select: { contractNumber: true } },
      },
    }),
    db.payment.findMany({
      where: { project: { contract: { customerId: id } } },
      select: {
        id: true,
        amount: true,
        paymentType: true,
        method: true,
        isConfirmed: true,
        datePaid: true,
        project: { select: { id: true, contract: { select: { contractNumber: true } } } },
      },
    }),
    db.customerNote.findMany({
      where: { customerId: id },
      select: { id: true, content: true, authorName: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.creditTransaction.findMany({
      where: { customerId: id },
      select: {
        id: true,
        amount: true,
        transactionType: true,
        note: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ])

  // Contracts
  for (const c of contracts) {
    activities.push({
      id: `contract-${c.id}`,
      type: "contract",
      title: `قرارداد ${c.contractNumber} ثبت شد`,
      description: "قرارداد جدید برای مشتری ایجاد شد",
      date: c.dateCreated.toISOString(),
    })
  }

  // Projects
  for (const p of projects) {
    activities.push({
      id: `project-${p.id}`,
      type: "project_created",
      title: `پروژه «${p.servicePackage.title}» ایجاد شد`,
      description: `دسته: ${p.servicePackage.category} · قرارداد ${p.contract.contractNumber}`,
      date: p.createdAt.toISOString(),
      metadata: { projectId: p.id, status: p.status },
    })
    if (p.startDatetime) {
      activities.push({
        id: `project-schedule-${p.id}`,
        type: "project_status",
        title: `زمان‌بندی پروژه «${p.servicePackage.title}»`,
        description: `تاریخ شروع: ${formatJalaliDate(p.startDatetime)}`,
        date: p.startDatetime.toISOString(),
        metadata: { projectId: p.id },
      })
    }
  }

  // Payments
  for (const pay of payments) {
    const typeLabel: Record<string, string> = {
      deposit: "پیش‌پرداخت",
      installment: "قسط",
      settlement: "تسویه",
    }
    activities.push({
      id: `payment-${pay.id}`,
      type: "payment",
      title: `${typeLabel[pay.paymentType] ?? pay.paymentType} — ${formatRials(pay.amount)} تومان`,
      description: `${pay.isConfirmed ? "✅ تأیید شده" : "⏳ در انتظار تأیید"} · روش: ${methodLabel(pay.method)} · قرارداد ${pay.project.contract.contractNumber}`,
      date: pay.datePaid.toISOString(),
      amount: formatRials(pay.amount),
      metadata: { confirmed: pay.isConfirmed, method: pay.method },
    })
  }

  // Notes
  for (const n of notes) {
    activities.push({
      id: `note-${n.id}`,
      type: "note",
      title: `یادداشت توسط ${n.authorName ?? "نامشخص"}`,
      description: n.content.length > 120 ? n.content.slice(0, 120) + "…" : n.content,
      date: n.createdAt.toISOString(),
    })
  }

  // Credit transactions
  for (const ct of creditTxs) {
    const typeLabel: Record<string, string> = {
      reward_referral: "پاداش معرفی",
      manual_adjustment: "تنظیم دستی",
      used: "مصرف اعتبار",
    }
    activities.push({
      id: `credit-${ct.id}`,
      type: "credit",
      title: `${typeLabel[ct.transactionType] ?? ct.transactionType} — ${formatRials(ct.amount)} تومان`,
      description: ct.note || (Number(ct.amount) > 0 ? "افزایش اعتبار" : "کاهش اعتبار"),
      date: ct.createdAt.toISOString(),
      amount: formatRials(ct.amount),
    })
  }

  // Sort by date descending (most recent first)
  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Limit to 30 most recent
  return NextResponse.json({ items: activities.slice(0, 30), total: activities.length })
}

function methodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: "نقدی",
    card: "کارت به کارت",
    pos: "پوز",
    cheque: "چک",
  }
  return labels[method] ?? method
}

function formatJalaliDate(d: Date): string {
  const j = toJalali(d)
  return `${j.jd} ${JALALI_MONTHS[j.jm - 1]} ${j.jy}`
}
