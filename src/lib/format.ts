import { Decimal } from "@prisma/client/runtime/library"
import { toPersianDigits, formatJalaliDate, formatJalaliDateTime, toJalali } from "./jalali"

// All DB amounts are stored in Rials. UI displays in Toman (÷10) per user request.
function rialsToToman(v: Decimal | number | string | null | undefined): number {
  if (v == null) return 0
  const n = typeof v === "number" ? v : Number(v.toString())
  if (Number.isNaN(n)) return 0
  return Math.round(n / 10)
}

export function formatRials(v: Decimal | number | string | null | undefined): string {
  // Despite the name, displays Toman with "تومان" suffix removed (callers add it).
  // Returns the grouped Persian-digit number.
  const t = rialsToToman(v)
  const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(t)
  return toPersianDigits(grouped)
}

// alias used in many places already
export const formatToman = formatRials

export function formatRialsShort(v: Decimal | number | string | null | undefined): string {
  const t = rialsToToman(v)
  if (t >= 1_000_000_000) return toPersianDigits((t / 1_000_000_000).toFixed(1)) + " میلیارد"
  if (t >= 1_000_000) return toPersianDigits((t / 1_000_000).toFixed(1)) + " میلیون"
  if (t >= 1_000) return toPersianDigits((t / 1_000).toFixed(0)) + " هزار"
  return toPersianDigits(t)
}

export const formatTomanShort = formatRialsShort

// For input fields: user types Toman, we may need to convert to Rials before sending to API.
export function tomanToRials(toman: number | string): number {
  const t = typeof toman === "string" ? Number(toman.replace(/,/g, "")) : toman
  return Math.round(t * 10)
}

// Parse a Toman input string (with possible Persian digits + commas) to a number
export function parseTomanInput(s: string): number {
  const persianToLatin = s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
  return Number(persianToLatin.replace(/,/g, "")) || 0
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—"
  return formatJalaliDate(new Date(d))
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—"
  return formatJalaliDateTime(new Date(d))
}

export function formatTime(d: Date | string | null | undefined): string {
  if (!d) return "—"
  const date = new Date(d)
  const h = String(date.getHours()).padStart(2, "0")
  const m = String(date.getMinutes()).padStart(2, "0")
  return toPersianDigits(`${h}:${m}`)
}

export function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return "—"
  const diff = Date.now() - new Date(d).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return "لحظاتی پیش"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${toPersianDigits(min)} دقیقه پیش`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${toPersianDigits(hr)} ساعت پیش`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${toPersianDigits(day)} روز پیش`
  const mon = Math.floor(day / 30)
  if (mon < 12) return `${toPersianDigits(mon)} ماه پیش`
  return `${toPersianDigits(Math.floor(mon / 12))} سال پیش`
}

export function daysUntil(d: Date | string | null | undefined): number {
  if (!d) return 0
  const diff = new Date(d).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function jalaliTodayString(): string {
  const t = toJalali(new Date())
  return formatJalaliDate(new Date())
}

export { toPersianDigits, formatJalaliDate, formatJalaliDateTime }

