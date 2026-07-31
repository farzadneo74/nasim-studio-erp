import { NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentRole } from "@/lib/auth-helpers"
import { hasPermission } from "@/lib/constants"

export const dynamic = "force-dynamic"

/**
 * GET /api/occasions
 * دریافت مناسبت‌های امروز و هفته آینده (تولد و سالگرد ازدواج مشتریان)
 *
 * query: ?days=7 (تعداد روزهای پیش‌رو، پیش‌فرض 7)
 */
export async function GET(req: Request) {
  const role = await getCurrentRole()
  if (!hasPermission(role, "customers") && !hasPermission(role, "dashboard")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(req.url)
  const daysAhead = Math.min(Number(url.searchParams.get("days")) || 7, 90)

  const db = await getCurrentStudioDb()
  if (!db) {
    return NextResponse.json({ error: "No studio selected" }, { status: 400 })
  }

  // تاریخ امروز و N روز آینده
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + daysAhead)

  // همه مشتریان با تاریخ تولد یا سالگرد
  const customers = await db.customer.findMany({
    where: {
      OR: [
        { birthDate: { not: null } },
        { weddingDate: { not: null } },
      ],
    },
    select: {
      id: true,
      name: true,
      phone: true,
      birthDate: true,
      weddingDate: true,
    },
  })

  const occasions: Array<{
    customerId: string
    customerName: string
    customerPhone: string | null
    type: "birthday" | "anniversary"
    date: string // ISO date
    daysLeft: number
    age?: number // برای تولد
    yearsMarried?: number // برای سالگرد
  }> = []

  for (const c of customers) {
    // بررسی تولد
    if (c.birthDate) {
      const birth = new Date(c.birthDate)
      // تولد امسال
      const thisYearBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate())
      // اگر هنوز نرسیده یا امروزه
      if (thisYearBirthday >= today && thisYearBirthday <= endDate) {
        const daysLeft = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
        occasions.push({
          customerId: c.id,
          customerName: c.name,
          customerPhone: c.phone,
          type: "birthday",
          date: thisYearBirthday.toISOString(),
          daysLeft,
          age: today.getFullYear() - birth.getFullYear(),
        })
      }
    }

    // بررسی سالگرد ازدواج
    if (c.weddingDate) {
      const wedding = new Date(c.weddingDate)
      const thisYearAnniversary = new Date(today.getFullYear(), wedding.getMonth(), wedding.getDate())
      if (thisYearAnniversary >= today && thisYearAnniversary <= endDate) {
        const daysLeft = Math.ceil((thisYearAnniversary.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
        occasions.push({
          customerId: c.id,
          customerName: c.name,
          customerPhone: c.phone,
          type: "anniversary",
          date: thisYearAnniversary.toISOString(),
          daysLeft,
          yearsMarried: today.getFullYear() - wedding.getFullYear(),
        })
      }
    }
  }

  // مرتب‌سازی بر اساس روزهای باقی‌مانده
  occasions.sort((a, b) => a.daysLeft - b.daysLeft)

  // آمار
  const stats = {
    total: occasions.length,
    today: occasions.filter((o) => o.daysLeft === 0).length,
    thisWeek: occasions.filter((o) => o.daysLeft <= 7).length,
    birthdays: occasions.filter((o) => o.type === "birthday").length,
    anniversaries: occasions.filter((o) => o.type === "anniversary").length,
  }

  return NextResponse.json({ occasions, stats })
}
