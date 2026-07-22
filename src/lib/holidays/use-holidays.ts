"use client"

import { useQuery } from "@tanstack/react-query"
import { useApi } from "@/lib/api/client"

export interface Holiday {
  id: string
  gregorian: string // ISO YYYY-MM-DD for lunar holidays; "" for recurring Persian
  jalaliYear: number // 0 = recurring
  jm: number
  jd: number
  title: string
  type: "fixed" | "lunar"
  isEstimated: boolean
  source: string
}

/** Fetch Iranian official holidays from /api/holidays (DB-backed). */
export function useHolidays() {
  const api = useApi()
  const { data } = useQuery({
    queryKey: ["holidays"],
    queryFn: () => api.get<{ items: Holiday[]; source: string }>("/api/holidays"),
    staleTime: 24 * 3600 * 1000,
  })
  return data?.items ?? []
}

/**
 * Check if a Gregorian Date is a holiday. Matches:
 *  - Recurring Persian holidays (jalaliYear=0) by Jalali (jm, jd)
 *  - Lunar holidays (jalaliYear>0) by their specific Gregorian ISO date
 */
export function findHolidayByDate(
  holidays: Holiday[],
  date: Date
): Holiday | undefined {
  // Convert date to Jalali using Intl
  let jm = 0
  let jd = 0
  try {
    const fmt = new Intl.DateTimeFormat("en-US-u-ca-persian", {
      month: "numeric",
      day: "numeric",
    })
    const parts = fmt.formatToParts(date)
    jm = parseInt(parts.find((p) => p.type === "month")?.value ?? "0", 10)
    jd = parseInt(parts.find((p) => p.type === "day")?.value ?? "0", 10)
  } catch {
    /* ignore */
  }
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  return holidays.find((h) => {
    if (h.jalaliYear === 0) return h.jm === jm && h.jd === jd // recurring Persian
    return h.gregorian === iso // specific lunar date
  })
}

/** Legacy: match by Jalali (jm, jd) for recurring Persian holidays. */
export function findHoliday(holidays: Holiday[], jm: number, jd: number): Holiday | undefined {
  return holidays.find((h) => h.jalaliYear === 0 && h.jm === jm && h.jd === jd)
}

