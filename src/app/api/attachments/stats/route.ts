import { NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentStudioDbName, getCurrentRole } from "@/lib/auth-helpers"
import { getStorageStats } from "@/lib/attachment-service"

export const dynamic = "force-dynamic"

// GET /api/attachments/stats — comprehensive storage statistics for the current studio.
export async function GET() {
  try {
    const role = await getCurrentRole()
    if (!["admin", "manager"].includes(role)) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 })
    }
    const db = await getCurrentStudioDb()
    if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
    const studioId = await getCurrentStudioDbName()
    if (!studioId) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

    const stats = await getStorageStats(db, studioId)
    return NextResponse.json(stats)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

