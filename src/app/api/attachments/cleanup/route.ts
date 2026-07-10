import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentStudioDbName, getCurrentRole, getCurrentUser } from "@/lib/auth-helpers"
import { softDelete, hardDelete } from "@/lib/attachment-service"

export const dynamic = "force-dynamic"

// POST /api/attachments/cleanup — bulk soft-delete or hard-delete by filter.
// Body: { filter: { ownerType?, category?, olderThanDays?, notAccessedSinceDays?, minSize? }, mode: "soft"|"hard" }
export async function POST(req: NextRequest) {
  try {
    const role = await getCurrentRole()
    if (!["admin", "manager"].includes(role)) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 })
    }
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
    const db = await getCurrentStudioDb()
    if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
    const studioId = await getCurrentStudioDbName()
    if (!studioId) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const filter = body.filter || {}
    const mode = body.mode === "hard" ? "hard" : "soft"

    const where: Record<string, unknown> = { studioId, isDeleted: false }
    if (filter.ownerType) where.ownerType = filter.ownerType
    if (filter.category) where.category = filter.category
    if (filter.minSize) where.sizeBytes = { gte: filter.minSize }
    if (filter.olderThanDays) {
      const cutoff = new Date(Date.now() - filter.olderThanDays * 24 * 60 * 60 * 1000)
      where.createdAt = { lt: cutoff }
    }
    if (filter.notAccessedSinceDays) {
      const cutoff = new Date(Date.now() - filter.notAccessedSinceDays * 24 * 60 * 60 * 1000)
      where.lastAccessAt = { lt: cutoff }
    }

    const targets = await db.attachment.findMany({
      where,
      select: { id: true, sizeBytes: true },
      take: 500, // safety cap per call
    })

    let affected = 0
    let freedBytes = 0
    for (const t of targets) {
      const ok = mode === "hard"
        ? await hardDelete(db, t.id, user.userId, user.name)
        : await softDelete(db, t.id, user.userId, user.name)
      if (ok) {
        affected++
        freedBytes += t.sizeBytes
      }
    }

    return NextResponse.json({ ok: true, affected, freedBytes, mode })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
