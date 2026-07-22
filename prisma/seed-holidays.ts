// Seed Iranian holidays into the DB from the open-source persian-calendar/events dataset.
// - Persian (Shamsi) fixed holidays: stored once (recurring, matched by jalaliMonth/Day).
// - Hijri (Lunar) holidays: converted to Gregorian for the current + next 3 Hijri years,
//   stored as specific dates, marked isEstimated=true (to be verified against calendar.ut.ac.ir).
// Run: bun prisma/seed-holidays.ts

import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

interface HolidayEntry {
  month: number
  day: number
  title: string
  holiday: boolean
  calendar: string // Persian | Gregorian | Hijri
  type: string // Iran | Afghanistan | ...
}

function currentHijriYear(): number {
  const fmt = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura", { year: "numeric" })
  return parseInt(fmt.format(new Date()).replace(/\D/g, ""), 10)
}

function hijriToGregorian(hy: number, hm: number, hd: number): Date | null {
  try {
    const fmt = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    })
    // 1 Muharram 1448 ≈ June 26 2026
    const roughStart = new Date(2026, 5, 26)
    const yearsOffset = hy - 1448
    roughStart.setTime(roughStart.getTime() + yearsOffset * 354.367 * 86400000)
    for (let i = -3; i < 370; i++) {
      const d = new Date(roughStart)
      d.setDate(d.getDate() + i)
      const parts = fmt.formatToParts(d)
      const yPart = parts.find((p) => p.type === "year")?.value
      const mPart = parts.find((p) => p.type === "month")?.value
      const dPart = parts.find((p) => p.type === "day")?.value
      if (!yPart || !mPart || !dPart) continue
      const iy = parseInt(yPart.replace(/\D/g, ""), 10)
      const im = parseInt(mPart, 10)
      const id = parseInt(dPart, 10)
      if (iy === hy && im === hm && id === hd) return d
    }
    return null
  } catch {
    return null
  }
}

function gregorianToJalali(d: Date): { jy: number; jm: number; jd: number } {
  try {
    const fmt = new Intl.DateTimeFormat("en-US-u-ca-persian", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    })
    const parts = fmt.formatToParts(d)
    return {
      jy: parseInt(parts.find((p) => p.type === "year")?.value ?? "0", 10),
      jm: parseInt(parts.find((p) => p.type === "month")?.value ?? "0", 10),
      jd: parseInt(parts.find((p) => p.type === "day")?.value ?? "0", 10),
    }
  } catch {
    return { jy: 0, jm: 0, jd: 0 }
  }
}

async function main() {
  console.log("Fetching holidays from persian-calendar/events...")
  const res = await fetch("https://raw.githubusercontent.com/persian-calendar/events/main/events.json")
  if (!res.ok) throw new Error("fetch failed: " + res.status)
  const json = (await res.json()) as { data: HolidayEntry[] }
  console.log(`Got ${json.data.length} entries`)

  // Clear existing
  await db.holiday.deleteMany({})
  console.log("Cleared existing holidays")

  // 1. Persian (Shamsi) fixed holidays — store with a representative Gregorian date
  //    (we use a placeholder year so they're recurring; matched by jalaliMonth/Day client-side)
  const persianHolidays = json.data.filter(
    (e) => e.calendar === "Persian" && e.type === "Iran" && e.holiday
  )
  const persianSeen = new Set<string>()
  let persianCount = 0
  for (const e of persianHolidays) {
    const key = `${e.month}/${e.day}`
    if (persianSeen.has(key)) continue
    persianSeen.add(key)
    // Store with a sentinel gregorianDate (year 1) — these are matched by jalaliMonth/Day
    const greg = new Date(1, 0, e.day) // placeholder; client matches by jalali
    const j = gregorianToJalali(greg)
    await db.holiday.create({
      data: {
        gregorianDate: new Date(Date.UTC(2024, e.month - 1, e.day)), // placeholder, not used for matching
        jalaliYear: 0, // 0 = recurring (matched by month/day only)
        jalaliMonth: e.month,
        jalaliDay: e.day,
        title: e.title,
        type: "fixed",
        isOfficial: true,
        isEstimated: false,
        source: "persian-calendar/events",
      },
    })
    persianCount++
  }
  console.log(`Seeded ${persianCount} Persian fixed holidays`)

  // 2. Hijri (Lunar) holidays — convert to Gregorian for current + next 3 Hijri years
  const hijriHolidays = json.data.filter(
    (e) => e.calendar === "Hijri" && e.type === "Iran" && e.holiday
  )
  const hyNow = currentHijriYear()
  const currentGregorianYear = new Date().getFullYear()
  let hijriCount = 0
  for (const hy of [hyNow, hyNow + 1, hyNow + 2, hyNow + 3]) {
    for (const e of hijriHolidays) {
      const g = hijriToGregorian(hy, e.month, e.day)
      if (!g) continue
      const j = gregorianToJalali(g)
      if (!j.jm) continue
      const isEstimated = g.getFullYear() > currentGregorianYear // future years need verification
      await db.holiday.create({
        data: {
          gregorianDate: new Date(Date.UTC(g.getFullYear(), g.getMonth(), g.getDate())),
          jalaliYear: j.jy,
          jalaliMonth: j.jm,
          jalaliDay: j.jd,
          title: e.title,
          type: "lunar",
          isOfficial: true,
          isEstimated,
          source: "persian-calendar/events",
        },
      })
      hijriCount++
    }
  }
  console.log(`Seeded ${hijriCount} Hijri (lunar) holidays across 4 Hijri years`)

  console.log("✅ Holiday seed complete.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })

