import { NextResponse } from "next/server"
import { getCurrentStudioDb } from "@/lib/auth-helpers"
import { getEffectivePrice } from "@/lib/pricing"
import { Prisma } from "@prisma/client"

export async function GET() {
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  // Fetch all customers with their contracts/projects/payments for debt calculation
  const projectsInclude = {
    contract: { include: { customer: true } },
    servicePackage: true,
    payments: true,
  } satisfies Prisma.ProjectInclude

  const [totalCustomers, allCustomers, projectsResult] = await Promise.all([
    db.customer.count(),
    db.customer.findMany({
      select: {
        id: true,
        creditBalance: true,
        createdAt: true,
        customerType: true,
      },
    }),
    db.project.findMany({
      include: projectsInclude,
    }),
  ])

  // Compute total debt = sum over all projects of max(0, effectivePrice - totalConfirmedPaid)
  let totalDebt = 0
  for (const p of projectsResult) {
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
    totalDebt += Math.max(0, eff - paid)
  }

  // Compute total credit
  const totalCredit = allCustomers.reduce((s, c) => s + Number(c.creditBalance), 0)

  // New customers this month
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const newThisMonth = allCustomers.filter((c) => new Date(c.createdAt) >= startOfMonth).length

  // Count by type
  const individualCount = allCustomers.filter((c) => c.customerType === "individual").length
  const companyCount = allCustomers.filter((c) => c.customerType === "company").length

  return NextResponse.json({
    totalCustomers,
    totalDebt,
    totalCredit,
    newThisMonth,
    individualCount,
    companyCount,
  })
}
