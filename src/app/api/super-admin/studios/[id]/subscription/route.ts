import { NextResponse } from "next/server"
import { masterDb } from "@/lib/master-db"
import { requireSuperAdmin, getPlan } from "@/lib/super-admin"

export const dynamic = "force-dynamic"

/**
 * POST /api/super-admin/studios/[id]/subscription
 * تغییر اشتراک استودیو
 * body: { plan: "trial"|"basic"|"pro"|"enterprise"|"suspended", durationDays?: number, note?: string, amountPaidToman?: number }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin()
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const { plan: newPlan, durationDays, note, amountPaidToman } = body

  if (!newPlan) {
    return NextResponse.json({ error: "plan is required" }, { status: 400 })
  }

  const planDef = getPlan(newPlan)
  if (!planDef) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
  }

  const studio = await masterDb.studio.findUnique({ where: { id } })
  if (!studio) {
    return NextResponse.json({ error: "Studio not found" }, { status: 404 })
  }

  const oldPlan = studio.plan
  const duration = Number(durationDays) || planDef.durationDays || 30
  const startAt = new Date()
  const endAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000)

  // آپدیت استودیو
  const updated = await masterDb.studio.update({
    where: { id },
    data: {
      plan: newPlan,
      subscriptionStart: startAt,
      subscriptionEnd: endAt,
      maxEmployees: planDef.maxEmployees,
      maxProjects: planDef.maxProjects,
      maxCustomers: planDef.maxCustomers,
      maxStorageBytes: planDef.maxStorageBytes,
      storageQuotaBytes: planDef.maxStorageBytes,
      // اگه suspended شد، isActive=false
      isActive: newPlan !== "suspended",
    },
  })

  // ثبت رویداد اشتراک
  let eventType = "renew"
  if (oldPlan !== newPlan) {
    eventType = ["basic", "pro", "enterprise"].indexOf(newPlan) >
      ["basic", "pro", "enterprise"].indexOf(oldPlan)
      ? "upgrade" : "downgrade"
  }
  if (newPlan === "suspended") eventType = "suspend"
  if (oldPlan === "suspended" && newPlan !== "suspended") eventType = "reactivate"

  const event = await masterDb.subscriptionEvent.create({
    data: {
      studioId: id,
      eventType,
      fromPlan: oldPlan,
      toPlan: newPlan,
      amountPaidToman: amountPaidToman ? Number(amountPaidToman) : null,
      durationDays: duration,
      startAt,
      endAt,
      note: note || `تغییر اشتراک از ${getPlan(oldPlan).name} به ${planDef.name}`,
    },
  })

  return NextResponse.json({
    ok: true,
    studio: {
      id: updated.id,
      plan: updated.plan,
      subscriptionStart: updated.subscriptionStart,
      subscriptionEnd: updated.subscriptionEnd,
      maxEmployees: updated.maxEmployees,
      isActive: updated.isActive,
    },
    event,
  })
}
