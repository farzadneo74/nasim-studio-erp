import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { PrismaClient } from "@prisma/client"

type Ctx = { params: Promise<{ id: string }> }

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

async function recomputeFreeze(db: PrismaClient, projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { servicePackage: true, payments: true },
  })
  if (!project) return
  if (project.pricingStrategy !== "variable" || project.isPriceFrozen) return
  const totalConfirmedPaid = project.payments
    .filter((p) => p.isConfirmed)
    .reduce((s, p) => s + Number(p.amount), 0)
  const calc = Number(project.calculatedPrice)
  if (totalConfirmedPaid >= calc * 0.7) {
    await db.project.update({ where: { id: projectId }, data: { isPriceFrozen: true } })
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return forbidden()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { isConfirmed, amount, note } = body as {
    isConfirmed?: boolean
    amount?: number
    note?: string
  }

  const existing = await db.payment.findUnique({
    where: { id },
    include: {
      project: {
        include: { contract: { include: { customer: true } }, servicePackage: true },
      },
    },
  })
  if (!existing) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 })
  }

  const wasConfirmed = existing.isConfirmed
  const willBeConfirmed = isConfirmed !== undefined ? Boolean(isConfirmed) : wasConfirmed
  const newAmount = amount !== undefined ? Number(amount) : Number(existing.amount)
  if (amount !== undefined && newAmount <= 0) {
    return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 })
  }

  const updated = await db.payment.update({
    where: { id },
    data: {
      ...(isConfirmed !== undefined ? { isConfirmed: willBeConfirmed } : {}),
      ...(amount !== undefined ? { amount: newAmount } : {}),
      ...(note !== undefined ? { note: note || null } : {}),
    },
  })

  // Update customer revenue cache if confirmation state changed OR amount changed on a confirmed payment
  const customerId = existing.project.contract.customer.id
  if (!wasConfirmed && willBeConfirmed) {
    // newly confirmed -> add amount
    await db.customer.update({
      where: { id: customerId },
      data: {
        totalRevenue: { increment: newAmount },
        lastInteraction: new Date(),
      },
    })
    await recomputeFreeze(db, existing.projectId)
  } else if (wasConfirmed && !willBeConfirmed) {
    // un-confirming -> subtract original amount
    await db.customer.update({
      where: { id: customerId },
      data: {
        totalRevenue: { decrement: Number(existing.amount) },
      },
    })
  } else if (wasConfirmed && willBeConfirmed && amount !== undefined && newAmount !== Number(existing.amount)) {
    // amount changed on already-confirmed payment -> adjust delta
    const delta = newAmount - Number(existing.amount)
    if (delta !== 0) {
      await db.customer.update({
        where: { id: customerId },
        data: {
          totalRevenue: { increment: delta },
          lastInteraction: new Date(),
        },
      })
      await recomputeFreeze(db, existing.projectId)
    }
  }

  return NextResponse.json({
    id: updated.id,
    projectId: updated.projectId,
    amount: Number(updated.amount),
    paymentType: updated.paymentType,
    method: updated.method,
    datePaid: updated.datePaid,
    note: updated.note,
    isConfirmed: updated.isConfirmed,
    createdAt: updated.createdAt,
  })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return forbidden()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params

  const existing = await db.payment.findUnique({
    where: { id },
    include: { project: { include: { contract: { include: { customer: true } } } } },
  })
  if (!existing) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 })
  }

  await db.payment.delete({ where: { id } })

  // If it was confirmed, decrement customer revenue
  if (existing.isConfirmed) {
    await db.customer.update({
      where: { id: existing.project.contract.customer.id },
      data: { totalRevenue: { decrement: Number(existing.amount) } },
    })
  }

  return NextResponse.json({ ok: true })
}

