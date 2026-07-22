import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { toJalali, jalaliToGregorian } from "@/lib/jalali"
import { getEffectivePrice } from "@/lib/pricing"

export const dynamic = "force-dynamic"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

/**
 * Recompute SalaryRecords for the current Jalali month.
 *
 * For each project whose `actualEndDatetime` (delivery date) falls within the
 * current Jalali month, walk the field/studio/delivery teams and find the
 * matching active SalaryRule (by role + applyOn). If a SalaryRecord already
 * exists for (userId, projectId, ruleUsedId) it is skipped — this keeps the
 * operation idempotent.
 *
 * The created records have `period` set to "YYYY-MM" (Jalali).
 *
 * Returns `{ created, period }`.
 */
export async function POST() {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return forbidden()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const now = new Date()
  const j = toJalali(now)
  const period = `${j.jy}-${String(j.jm).padStart(2, "0")}`

  // Compute Gregorian bounds of the current Jalali month.
  const startGreg = jalaliToGregorian(j.jy, j.jm, 1)
  // Next-month start (handles wrap to next year automatically via jalaliToGregorian)
  const nextJm = j.jm === 12 ? 1 : j.jm + 1
  const nextJy = j.jm === 12 ? j.jy + 1 : j.jy
  const endGreg = jalaliToGregorian(nextJy, nextJm, 1)

  const projects = await db.project.findMany({
    where: {
      status: "delivered",
      actualEndDatetime: {
        gte: startGreg,
        lt: endGreg,
      },
    },
    include: {
      servicePackage: true,
      fieldTeam: true,
      studioTeam: true,
      payments: { where: { isConfirmed: true } },
    },
  })

  const activeRules = await db.salaryRule.findMany({ where: { isActive: true } })
  if (activeRules.length === 0) {
    return NextResponse.json({ created: 0, period })
  }

  let created = 0

  for (const project of projects) {
    const totalPaid = project.payments.reduce((s, p) => s + Number(p.amount), 0)
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

    const teamMap: {
      userId: string
      role: string
      applyOn: "field_work" | "studio_work" | "delivery"
    }[] = [
      ...project.fieldTeam.map((u) => ({
        userId: u.id,
        role: u.role,
        applyOn: "field_work" as const,
      })),
      ...project.studioTeam.map((u) => ({
        userId: u.id,
        role: u.role,
        applyOn: "studio_work" as const,
      })),
    ]

    for (const t of teamMap) {
      const rule = activeRules.find(
        (r) => r.role === t.role && r.applyOn === t.applyOn
      )
      if (!rule) continue

      // Idempotency: skip if a record already exists for this user+project+rule
      const exists = await db.salaryRecord.findFirst({
        where: {
          userId: t.userId,
          projectId: project.id,
          ruleUsedId: rule.id,
        },
        select: { id: true },
      })
      if (exists) continue

      const amt =
        rule.commissionType === "percent"
          ? Math.round((eff * Number(rule.commissionValue)) / 100)
          : Number(rule.commissionValue)

      await db.salaryRecord.create({
        data: {
          userId: t.userId,
          projectId: project.id,
          amount: amt,
          ruleUsedId: rule.id,
          isPaid: false,
          period,
        },
      })
      created++
    }
  }

  return NextResponse.json({ created, period })
}

