import { NextResponse } from "next/server"
import { masterDb } from "@/lib/master-db"
import { requireSuperAdmin } from "@/lib/super-admin"

export const dynamic = "force-dynamic"

/**
 * POST /api/super-admin/studios/[id]/charge-sms
 * شارژ SMS استودیو (افزایش اعتبار)
 * body: { amountRial: number, description?: string }
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
  const amountRial = Number(body.amountRial)

  if (!Number.isFinite(amountRial) || amountRial === 0) {
    return NextResponse.json({ error: "amountRial must be a non-zero number" }, { status: 400 })
  }

  const studio = await masterDb.studio.findUnique({ where: { id } })
  if (!studio) {
    return NextResponse.json({ error: "Studio not found" }, { status: 404 })
  }

  // اگر کاهش است، مطمئن شو موجودی کافیه
  if (amountRial < 0 && studio.smsCreditRial + amountRial < 0) {
    return NextResponse.json({
      error: `موجودی کافی نیست. موجودی فعلی: ${studio.smsCreditRial} ریال`,
    }, { status: 400 })
  }

  // آپدیت موجودی
  const updated = await masterDb.studio.update({
    where: { id },
    data: { smsCreditRial: { increment: amountRial } },
  })

  // ثبت تراکنش
  const tx = await masterDb.smsTransaction.create({
    data: {
      studioId: id,
      type: amountRial > 0 ? "charge" : "adjustment",
      amountRial,
      description: body.description || (amountRial > 0 ? "شارژ دستی" : "کاهش دستی"),
      status: "sent",
    },
  })

  return NextResponse.json({
    ok: true,
    newCreditRial: updated.smsCreditRial,
    transaction: tx,
  })
}
