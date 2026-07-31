import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb, getCurrentStudioUserId, getCurrentUser } from "@/lib/auth-helpers"
import { masterDb } from "@/lib/master-db"

export const dynamic = "force-dynamic"

/**
 * POST /api/customers/[id]/credit-transactions/settle
 *
 * تسویه اعتبار مشتری:
 *  - همه تراکنش‌های قبلی (که isSettled=false) رو isSettled=true می‌کنه
 *  - یک تراکنش settlement با مبلغ -(creditBalance) ثبت می‌کنه
 *  - creditBalance رو 0 می‌کنه
 *  - توضیحات اجباری + مشخص کردن انجام‌دهنده
 *
 * تراکنش‌های قبلی حذف نمی‌شن — فقط از محاسبه اعتبار فعلی کنار گذاشته می‌شن.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole()
  if (!role) return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
  if (!["admin", "manager"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params

  // ✅ توضیحات اجباری
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const note = String(body.note || "").trim()
  if (!note) {
    return NextResponse.json({ error: "توضیحات تسویه اجباری است" }, { status: 400 })
  }

  const customer = await db.customer.findUnique({
    where: { id },
    select: { id: true, creditBalance: true, name: true },
  })
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 })

  const currentBalance = Number(customer.creditBalance)
  if (currentBalance === 0) {
    return NextResponse.json({ error: "اعتبار از قبل صفر است" }, { status: 400 })
  }

  // ✅ مشخص کردن انجام‌دهنده
  const currentStudioUserId = await getCurrentStudioUserId()
  const authUser = await getCurrentUser()
  let settledByName = "ناشناس"
  if (authUser?.name) settledByName = authUser.name
  else if (currentStudioUserId) {
    const user = await db.user.findUnique({
      where: { id: currentStudioUserId },
      select: { firstName: true, lastName: true },
    })
    if (user) settledByName = `${user.firstName} ${user.lastName}`.trim()
  }

  // ۱. همه تراکنش‌های قبلی رو isSettled=true کن
  await db.creditTransaction.updateMany({
    where: { customerId: id, isSettled: false },
    data: { isSettled: true, settledAt: new Date() },
  })

  // ۲. یک تراکنش settlement ثبت کن
  const settlementNote = `تسویه توسط ${settledByName}: ${note}`
  try {
    await db.creditTransaction.create({
      data: {
        customerId: id,
        amount: -currentBalance,
        transactionType: "settlement",
        note: settlementNote,
        createdById: currentStudioUserId ?? null,
        isSettled: true,
        settledAt: new Date(),
      },
    })
  } catch {
    await db.creditTransaction.create({
      data: {
        customerId: id,
        amount: -currentBalance,
        transactionType: "settlement",
        note: settlementNote,
        isSettled: true,
        settledAt: new Date(),
      },
    })
  }

  // ۳. creditBalance رو 0 کن
  await db.customer.update({
    where: { id },
    data: { creditBalance: 0 },
  })

  return NextResponse.json({
    ok: true,
    message: `اعتبار ${customer.name} تسویه شد`,
    settledAmount: currentBalance,
    settledBy: settledByName,
    note: note,
    newBalance: 0,
  })
}
