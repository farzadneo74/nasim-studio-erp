import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { getEffectivePrice } from "@/lib/pricing"

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(_req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  if (!["admin", "manager"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params

  const project = await db.project.findUnique({
    where: { id },
    include: {
      servicePackage: true,
      payments: { where: { isConfirmed: true } },
    },
  })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

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

  if (eff <= 0) {
    return NextResponse.json({ error: "Effective price is zero" }, { status: 400 })
  }

  const updated = await db.project.update({
    where: { id },
    data: { lockedPrice: eff },
  })

  return NextResponse.json({
    id: updated.id,
    lockedPrice: Number(updated.lockedPrice),
    effectivePrice: eff,
  })
}
