import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { getEffectivePrice } from "@/lib/pricing"

export const dynamic = "force-dynamic"

// GET /api/customers/export
// Returns a CSV (Excel-compatible, UTF-8 with BOM) of all customers with ALL
// DB fields (name, phone, customerType, city, address, profileImage, extraPhones,
// birthDate, engagementDate, weddingDate, creditBalance, totalRevenue,
// totalProjects, lastInteraction, referrer name, tags, createdAt) and Persian
// column headers. RBAC: admin / manager / sales.
function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ""
  const s = String(v)
  // Wrap in quotes; double any embedded quotes.
  if (s.includes(",") || s.includes("\"") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toToman(rials: number): string {
  // DB amounts are stored in Rials; export as Toman.
  return String(Math.round(rials / 10))
}

interface ExtraPhone {
  label: string
  phone: string
}

function parseExtraPhones(raw: string | null | undefined): ExtraPhone[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x): x is ExtraPhone => x && typeof x === "object" && typeof (x as ExtraPhone).phone === "string")
      .map((x) => ({ label: String(x.label ?? ""), phone: String(x.phone) }))
  } catch {
    return []
  }
}

function jalali(d: Date | null): string {
  if (!d) return ""
  try {
    return new Date(d).toLocaleString("fa-IR")
  } catch {
    return ""
  }
}

function jalaliDate(d: Date | null): string {
  if (!d) return ""
  try {
    return new Date(d).toLocaleDateString("fa-IR")
  } catch {
    return ""
  }
}

export async function GET() {
  const role = await getCurrentRole()
  if (!["admin", "manager", "sales"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const seeFinance = role === "admin" || role === "manager"

  const rows = await db.customer.findMany({
    include: {
      tags: true,
      referrer: { select: { id: true, name: true } },
      contracts: {
        select: {
          projects: {
            select: {
              pricingStrategy: true,
              calculatedPrice: true,
              lockedPrice: true,
              isPriceFrozen: true,
              isReadyForDelivery: true,
              readyDate: true,
              priceAtReadyTime: true,
              servicePackage: { select: { currentPrice: true } },
              payments: { where: { isConfirmed: true }, select: { amount: true } },
            },
          },
        },
      },
    },
    orderBy: [{ lastInteraction: "desc" }, { createdAt: "desc" }],
    take: 500,
  })

  // Persian column headers — ALL customer DB fields.
  const headers = seeFinance
    ? [
        "نام",
        "تلفن اصلی",
        "نوع مشتری",
        "شهر",
        "نشانی",
        "تصویر پروفایل",
        "تلفن‌های اضافی",
        "تاریخ تولد",
        "تاریخ عقد",
        "تاریخ ازدواج",
        "بدهی مشتری (تومان)",
        "اعتبار مشتری (تومان)",
        "درآمد کل (تومان)",
        "تعداد پروژه‌ها",
        "معرف",
        "تگ‌ها",
        "آخرین تعامل",
        "تاریخ عضویت",
      ]
    : [
        "نام",
        "تلفن اصلی",
        "نوع مشتری",
        "شهر",
        "نشانی",
        "تصویر پروفایل",
        "تلفن‌های اضافی",
        "تاریخ تولد",
        "تاریخ عقد",
        "تاریخ ازدواج",
        "تعداد پروژه‌ها",
        "معرف",
        "تگ‌ها",
        "آخرین تعامل",
        "تاریخ عضویت",
      ]

  const lines: string[] = []
  lines.push(headers.map(csvEscape).join(","))

  for (const c of rows) {
    let debt = 0
    if (seeFinance) {
      for (const ct of c.contracts) {
        for (const p of ct.projects) {
          const totalPaid = p.payments.reduce((s, x) => s + Number(x.amount), 0)
          const eff = getEffectivePrice({
            pricingStrategy: p.pricingStrategy as never,
            calculatedPrice: p.calculatedPrice,
            lockedPrice: p.lockedPrice,
            isPriceFrozen: p.isPriceFrozen,
            isReadyForDelivery: p.isReadyForDelivery,
            readyDate: p.readyDate,
            priceAtReadyTime: p.priceAtReadyTime,
            packageCurrentPrice: p.servicePackage.currentPrice,
            totalConfirmedPaid: totalPaid,
          })
          const owed = eff - totalPaid
          if (owed > 0) debt += owed
        }
      }
    }
    const customerTypeLabel = c.customerType === "company" ? "حقوقی" : "حقیقی"
    const tagsStr = c.tags.map((t) => t.name).join(" / ")
    const extraPhonesStr = parseExtraPhones(c.extraPhones)
      .map((p) => `${p.label || "دیگر"}: ${p.phone}`)
      .join(" / ")
    const referrerName = c.referrer?.name ?? ""
    const lastInteraction = jalali(c.lastInteraction)
    const createdAt = jalali(c.createdAt)
    const birthDate = jalaliDate(c.birthDate)
    const engagementDate = jalaliDate(c.engagementDate)
    const weddingDate = jalaliDate(c.weddingDate)
    const profileImageCell = c.profileImage ? "دارد" : "—"

    if (seeFinance) {
      lines.push(
        [
          csvEscape(c.name),
          csvEscape(c.phone),
          csvEscape(customerTypeLabel),
          csvEscape(c.city),
          csvEscape(c.address),
          csvEscape(profileImageCell),
          csvEscape(extraPhonesStr),
          csvEscape(birthDate),
          csvEscape(engagementDate),
          csvEscape(weddingDate),
          csvEscape(toToman(debt)),
          csvEscape(toToman(Number(c.creditBalance))),
          csvEscape(toToman(Number(c.totalRevenue))),
          csvEscape(c.totalProjects),
          csvEscape(referrerName),
          csvEscape(tagsStr),
          csvEscape(lastInteraction),
          csvEscape(createdAt),
        ].join(",")
      )
    } else {
      lines.push(
        [
          csvEscape(c.name),
          csvEscape(c.phone),
          csvEscape(customerTypeLabel),
          csvEscape(c.city),
          csvEscape(c.address),
          csvEscape(profileImageCell),
          csvEscape(extraPhonesStr),
          csvEscape(birthDate),
          csvEscape(engagementDate),
          csvEscape(weddingDate),
          csvEscape(c.totalProjects),
          csvEscape(referrerName),
          csvEscape(tagsStr),
          csvEscape(lastInteraction),
          csvEscape(createdAt),
        ].join(",")
      )
    }
  }

  // Prepend UTF-8 BOM so Excel reads Persian correctly.
  const csv = "\uFEFF" + lines.join("\r\n")

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers.csv"`,
      "Cache-Control": "no-store",
    },
  })
}
