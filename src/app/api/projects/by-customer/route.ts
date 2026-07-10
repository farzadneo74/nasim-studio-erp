import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { getEffectivePrice } from "@/lib/pricing"
import { CAN_ACCESS_FULL_FINANCE, CAN_SEE_BALANCE } from "@/lib/constants"

// GET /api/projects/by-customer
// Returns customers who have at least one project, with aggregated stats.
// Technical roles only see customers from projects they're a team member of.
export async function GET() {
  const role = await getCurrentRole()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const seeFinance = CAN_ACCESS_FULL_FINANCE.includes(role)
  const seeBalance = CAN_SEE_BALANCE.includes(role)

  const isTechnical = ["photographer", "editor", "qc", "logistics"].includes(role)

  const projects = await db.project.findMany({
    include: {
      servicePackage: true,
      contract: { include: { customer: { include: { tags: true } } } },
      fieldTeam: true,
      studioTeam: true,
      deliveryTeam: true,
      payments: true,
    },
  })

  // For technical roles we filter to only those where the user is on a team.
  let technicalUserId: string | null = null
  if (isTechnical) {
    const u = await db.user.findFirst({ where: { role } })
    technicalUserId = u?.id ?? null
  }

  const filtered = isTechnical
    ? projects.filter((p) =>
        technicalUserId
          ? p.fieldTeam.some((u) => u.id === technicalUserId) ||
            p.studioTeam.some((u) => u.id === technicalUserId) ||
            p.deliveryTeam.some((u) => u.id === technicalUserId)
          : false
      )
    : projects

  // Group by customer
  const map = new Map<
    string,
    {
      id: string
      name: string
      phone: string
      customerType: string
      tags: { id: string; name: string; color: string }[]
      projectCount: number
      activeCount: number
      deliveredCount: number
      totalRevenue: number
      totalBalance: number
      nextShoot: string | null
      lastInteraction: string | null
      projects: {
        id: string
        title: string
        category: string
        status: string
        startDatetime: string | null
        effectivePrice: number | null
        totalPaid: number | null
        balance: number | null
        isDelivered: boolean
      }[]
    }
  >()

  for (const p of filtered) {
    const c = p.contract.customer
    const confirmedPaid = p.payments
      .filter((x) => x.isConfirmed)
      .reduce((s, x) => s + Number(x.amount), 0)
    const eff = getEffectivePrice({
      pricingStrategy: p.pricingStrategy as never,
      calculatedPrice: p.calculatedPrice,
      lockedPrice: p.lockedPrice,
      isPriceFrozen: p.isPriceFrozen,
      isReadyForDelivery: p.isReadyForDelivery,
      readyDate: p.readyDate,
      priceAtReadyTime: p.priceAtReadyTime,
      packageCurrentPrice: p.servicePackage.currentPrice,
      totalConfirmedPaid: confirmedPaid,
    })

    const entry = map.get(c.id) ?? {
      id: c.id,
      name: c.name,
      phone: c.phone,
      customerType: c.customerType,
      tags: c.tags.map((t) => ({ id: t.id, name: t.name, color: t.color })),
      projectCount: 0,
      activeCount: 0,
      deliveredCount: 0,
      totalRevenue: 0,
      totalBalance: 0,
      nextShoot: null as string | null,
      lastInteraction: c.lastInteraction ? c.lastInteraction.toISOString() : null,
      projects: [],
    }

    entry.projectCount += 1
    if (p.status === "delivered") entry.deliveredCount += 1
    else entry.activeCount += 1
    if (seeFinance) entry.totalRevenue += confirmedPaid
    if (seeBalance) entry.totalBalance += Math.max(0, eff - confirmedPaid)

    if (p.startDatetime) {
      const start = p.startDatetime.toISOString()
      if (!entry.nextShoot || new Date(start) < new Date(entry.nextShoot)) {
        entry.nextShoot = start
      }
    }

    entry.projects.push({
      id: p.id,
      title: p.servicePackage.title,
      category: p.servicePackage.category,
      status: p.status,
      startDatetime: p.startDatetime ? p.startDatetime.toISOString() : null,
      effectivePrice: seeBalance ? eff : null,
      totalPaid: seeBalance ? confirmedPaid : null,
      balance: seeBalance ? Math.max(0, eff - confirmedPaid) : null,
      isDelivered: p.status === "delivered",
    })

    map.set(c.id, entry)
  }

  const items = Array.from(map.values()).sort((a, b) => b.projectCount - a.projectCount)

  return NextResponse.json({ items, seeFinance, seeBalance, role })
}
