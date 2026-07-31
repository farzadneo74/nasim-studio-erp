import { NextResponse } from "next/server"
import { masterDb } from "@/lib/master-db"
import { requireSuperAdmin } from "@/lib/super-admin"

export const dynamic = "force-dynamic"

/**
 * GET /api/super-admin/sms-logs
 * دریافت لاگ‌های SMS همه استودیوها (با فیلتر اختیاری)
 * query: ?studioId=xxx&type=charge|send|refund|adjustment&limit=100
 */
export async function GET(req: Request) {
  try {
    await requireSuperAdmin()
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(req.url)
  const studioId = url.searchParams.get("studioId")
  const type = url.searchParams.get("type")
  const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 500)

  // ساخت where
  const where: { studioId?: string; type?: string } = {}
  if (studioId) where.studioId = studioId
  if (type) where.type = type

  const transactions = await masterDb.smsTransaction.findMany({
    where,
    include: {
      studio: {
        select: { name: true, dbName: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  // آمار کلی
  const stats = {
    total: transactions.length,
    totalChargedRial: transactions
      .filter((t) => t.type === "charge")
      .reduce((sum, t) => sum + t.amountRial, 0),
    totalSentRial: transactions
      .filter((t) => t.type === "send")
      .reduce((sum, t) => sum + Math.abs(t.amountRial), 0),
    sent: transactions.filter((t) => t.type === "send").length,
    delivered: transactions.filter((t) => t.status === "delivered").length,
    failed: transactions.filter((t) => t.status === "failed").length,
  }

  return NextResponse.json({
    transactions: transactions.map((t) => ({
      id: t.id,
      studioId: t.studioId,
      studioName: t.studio.name,
      studioDbName: t.studio.dbName,
      type: t.type,
      amountRial: t.amountRial,
      receptor: t.receptor,
      messageSnippet: t.messageSnippet,
      description: t.description,
      kavenegarMessageId: t.kavenegarMessageId,
      status: t.status,
      createdAt: t.createdAt,
    })),
    stats,
  })
}
