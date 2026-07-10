import { NextResponse } from "next/server"
import { getCurrentStudioDb } from "@/lib/auth-helpers"

// GET /api/holidays — returns all holidays from the DB.
// Persian fixed holidays have jalaliYear=0 (recurring, matched by month/day).
// Lunar holidays have specific gregorianDate + jalaliYear (matched by ISO date).
export async function GET() {
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const rows = await db.holiday.findMany({ orderBy: { gregorianDate: "asc" } })
  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      gregorian: r.jalaliYear === 0 ? "" : r.gregorianDate.toISOString().slice(0, 10),
      jalaliYear: r.jalaliYear,
      jm: r.jalaliMonth,
      jd: r.jalaliDay,
      title: r.title,
      type: r.type, // fixed | lunar
      isEstimated: r.isEstimated,
      source: r.source,
    })),
    source: "DB (persian-calendar/events seed) — verify lunar against calendar.ut.ac.ir",
  })
}
