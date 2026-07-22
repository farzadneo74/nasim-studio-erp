import { NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentStudioDbName, getCurrentRole } from "@/lib/auth-helpers"
import { checkQuota } from "@/lib/attachment-service"

export const dynamic = "force-dynamic"

// GET /api/storage/quota — current studio's quota + usage.
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

    const q = await checkQuota(db, studioId, 0)
    return NextResponse.json(q)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
