// Jalali (Shamsi) calendar conversion + Persian digit helpers.
// Uses the validated `jalaali-js` package for all conversions to guarantee
// that toJalali ↔ jalaliToGregorian round-trip exactly.

import * as jalaali from "jalaali-js"

function div(a: number, b: number) {
  return Math.floor(a / b)
}
function mod(a: number, b: number) {
  return a - Math.floor(a / b) * b
}

export interface JalaliDate {
  jy: number
  jm: number
  jd: number
}

export function toJalali(date: Date): JalaliDate {
  const r = jalaali.toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate())
  return { jy: r.jy, jm: r.jm, jd: r.jd }
}

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
]

// JS getDay(): 0=Sunday ... 6=Saturday
export const PERSIAN_WEEKDAYS = [
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
  "شنبه",
]

export const PERSIAN_WEEKDAYS_SHORT = ["ی", "د", "س", "چ", "پ", "ج", "ش"]

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => PERSIAN_DIGITS[+d] ?? d)
}

export function formatJalaliDate(date: Date): string {
  const { jy, jm, jd } = toJalali(date)
  return `${toPersianDigits(jd)} ${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}`
}

export function formatJalaliDateTime(date: Date): string {
  const h = date.getHours()
  const m = date.getMinutes()
  const hh = toPersianDigits(String(h).padStart(2, "0"))
  const mm = toPersianDigits(String(m).padStart(2, "0"))
  return `${formatJalaliDate(date)} • ${hh}:${mm}`
}

export function formatJalaliShort(date: Date): string {
  const { jy, jm, jd } = toJalali(date)
  return `${toPersianDigits(jy)}/${toPersianDigits(String(jm).padStart(2, "0"))}/${toPersianDigits(
    String(jd).padStart(2, "0")
  )}`
}

// Convert an ISO/date to the value expected by <input type="date"> in Jalali? 
// Native date inputs are Gregorian only. For forms we keep Gregorian datetime-local
// but display Jalali elsewhere.
export function jalaliMonthLabel(year: number, monthIndex: number): string {
  return `${JALALI_MONTHS[monthIndex]} ${toPersianDigits(year)}`
}

// Build a grid of weeks for a Jalali month. monthIndex 0..11 (فروردین..اسفند).
// Returns array of weeks, each 7 cells {day: number|null, jd, jy, jm, isToday}.
export function buildJalaliMonthGrid(
  jy: number,
  jm: number,
  today: JalaliDate
): { day: number | null; jy: number; jm: number; jd: number; isToday: boolean }[][] {
  // First, find the weekday of the 1st day of the Jalali month.
  // We need a Gregorian date for the 1st of the Jalali month. Convert Jalali->Gregorian.
  const firstGreg = jalaliToGregorian(jy, jm, 1)
  // Persian week starts on Saturday (شنبه). JS getDay: 0=Sunday..6=Saturday.
  // We want Saturday=0 index. So offset = (getDay()+1) % 7.
  const firstWeekday = (firstGreg.getDay() + 1) % 7
  const daysInMonth = jm <= 6 ? 31 : jm <= 11 ? 30 : isLeapJalali(jy) ? 30 : 29

  const cells: { day: number | null; jy: number; jm: number; jd: number; isToday: boolean }[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, jy, jm, jd: 0, isToday: false })
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      jy,
      jm,
      jd: d,
      isToday: today.jy === jy && today.jm === jm && today.jd === d,
    })
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, jy, jm, jd: 0, isToday: false })
  const weeks: typeof cells[] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

function isLeapJalali(jy: number): boolean {
  return jalaali.isLeapJalaaliYear(jy)
}

// Jalali → Gregorian (validated library implementation — round-trips with toJalali).
export function jalaliToGregorian(jy: number, jm: number, jd: number): Date {
  const r = jalaali.toGregorian(jy, jm, jd)
  return new Date(r.gy, r.gm - 1, r.gd)
}

