"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  ChevronUp,
  ChevronDown,
  Filter,
  X,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import DatePicker from "react-multi-date-picker"
import persian from "react-date-object/calendars/persian"
import persian_fa from "react-date-object/locales/persian_fa"
import gregorian from "react-date-object/calendars/gregorian"
import gregorian_en from "react-date-object/locales/gregorian_en"
import DateObject from "react-date-object"

import { useApi } from "@/lib/api/client"
import { useWorkspace } from "@/stores/workspace"
import {
  STATUS_LABELS,
  STATUS_COLORS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  PROJECT_STATUSES,
  PACKAGE_CATEGORIES,
  type ProjectStatus,
  type PackageCategory,
} from "@/lib/constants"
import { formatDateTime, formatDate, formatTime as fmtTime, toPersianDigits } from "@/lib/format"
import {
  toJalali,
  jalaliToGregorian,
  JALALI_MONTHS,
  PERSIAN_WEEKDAYS,
  PERSIAN_WEEKDAYS_SHORT,
} from "@/lib/jalali"
import { useHolidays, findHolidayByDate, findHoliday } from "@/lib/holidays/use-holidays"

import { PageHeader } from "./_shared"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// ---------- Types ----------
interface CalTeamMember {
  id: string
  firstName: string
  lastName: string
  role: string
  team: "field" | "studio" | "delivery"
}
interface CalEvent {
  id: string
  projectId: string | null
  title: string
  customer: string
  packageTitle: string
  start: string | null
  end: string | null
  category: string | null
  status: string | null
  team: CalTeamMember[]
  isLeave: boolean
}

type ViewMode = "month" | "week" | "day"

// ---------- Date helpers ----------
function startOfDayLocal(d: Date) {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}
function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
function startOfPersianWeek(d: Date) {
  const s = startOfDayLocal(d)
  const offset = (s.getDay() + 1) % 7
  s.setDate(s.getDate() - offset)
  return s
}
function sameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
function formatTime(d: Date | string | null) {
  if (!d) return "—"
  return fmtTime(d)
}
function toLocalInputValue(d: Date | string | null) {
  if (!d) return ""
  const date = typeof d === "string" ? new Date(d) : d
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
function initials(first: string, last: string) {
  return (first[0] ?? "") + (last[0] ?? "")
}
function eventColor(ev: CalEvent) {
  if (ev.isLeave) return { bg: "#94a3b822", border: "#94a3b8" }
  const cat = (ev.category ?? "mix") as PackageCategory
  const c = CATEGORY_COLORS[cat] ?? "#a855f7"
  return { bg: c + "22", border: c }
}
function isFriday(greg: Date) {
  return greg.getDay() === 5
}

const WEEK_HEADER = [6, 0, 1, 2, 3, 4, 5].map((i) => PERSIAN_WEEKDAYS_SHORT[i])
const WEEK_HEADER_FULL = [6, 0, 1, 2, 3, 4, 5].map((i) => PERSIAN_WEEKDAYS[i])

// Hour columns: 5:00 → 23:00
const HOUR_START = 5
const HOUR_END = 23
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i)
const HOUR_COL_PX = 64 // min width per hour column

// ---------- Main ----------
export function CalendarView() {
  const api = useApi()
  const role = useWorkspace((s) => s.role)
  const openProject = useWorkspace((s) => s.openProject)
  const canReschedule = role === "admin" || role === "manager"
  const holidays = useHolidays()

  const [viewMode, setViewMode] = React.useState<ViewMode>("month")
  const [cursor, setCursor] = React.useState<Date>(new Date())
  const [teamMemberId, setTeamMemberId] = React.useState<string>("")
  const [statusFilter, setStatusFilter] = React.useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = React.useState<string[]>([])
  const [showLeaves, setShowLeaves] = React.useState(true)
  const [selectedEvent, setSelectedEvent] = React.useState<CalEvent | null>(null)

  const range = React.useMemo(() => {
    if (viewMode === "month") {
      const cursorJ = toJalali(cursor)
      const firstGreg = jalaliToGregorian(cursorJ.jy, cursorJ.jm, 1)
      const firstWeekday = (firstGreg.getDay() + 1) % 7
      const start = addDays(startOfDayLocal(firstGreg), -firstWeekday)
      const end = addDays(start, 42)
      return { start, end }
    }
    if (viewMode === "week") {
      const start = startOfPersianWeek(cursor)
      const end = addDays(start, 7)
      return { start, end }
    }
    const start = startOfDayLocal(cursor)
    const end = addDays(start, 1)
    return { start, end }
  }, [viewMode, cursor])

  const queryString = React.useMemo(() => {
    const params = new URLSearchParams()
    params.set("start", range.start.toISOString())
    params.set("end", range.end.toISOString())
    if (teamMemberId) params.set("teamMemberId", teamMemberId)
    if (statusFilter.length) params.set("status", statusFilter.join(","))
    if (categoryFilter.length) params.set("category", categoryFilter.join(","))
    params.set("includeLeaves", String(showLeaves))
    return params.toString()
  }, [range, teamMemberId, statusFilter, categoryFilter, showLeaves])

  const { data: events = [], isLoading } = useQuery<CalEvent[]>({
    queryKey: ["calendar-events", queryString, role],
    queryFn: () => api.get<CalEvent[]>(`/api/calendar/events?${queryString}`),
  })

  const { data: users = [] } = useQuery<
    { id: string; firstName: string; lastName: string; role: string }[]
  >({
    queryKey: ["users-list"],
    queryFn: async () => {
      try {
        return await api.get<
          { id: string; firstName: string; lastName: string; role: string }[]
        >("/api/users")
      } catch {
        return []
      }
    },
  })

  const eventsByDay = React.useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    for (const ev of events) {
      if (!ev.start) continue
      const key = startOfDayLocal(new Date(ev.start)).toDateString()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    }
    return map
  }, [events])

  const periodLabel = React.useMemo(() => {
    if (viewMode === "month") {
      const cursorJ = toJalali(cursor)
      return `${JALALI_MONTHS[cursorJ.jm - 1]} ${toPersianDigits(cursorJ.jy)}`
    }
    if (viewMode === "week") {
      const start = startOfPersianWeek(cursor)
      const end = addDays(start, 6)
      return `${formatDate(start)} – ${formatDate(end)}`
    }
    const cursorJ = toJalali(cursor)
    return `${PERSIAN_WEEKDAYS[cursor.getDay()]} ${toPersianDigits(cursorJ.jd)} ${JALALI_MONTHS[cursorJ.jm - 1]} ${toPersianDigits(cursorJ.jy)}`
  }, [viewMode, cursor])

  function goPrev() {
    if (viewMode === "month") setCursor(jalaliMonthPrev(cursor))
    else if (viewMode === "week") setCursor(addDays(cursor, -7))
    else setCursor(addDays(cursor, -1))
  }
  function goNext() {
    if (viewMode === "month") setCursor(jalaliMonthNext(cursor))
    else if (viewMode === "week") setCursor(addDays(cursor, 7))
    else setCursor(addDays(cursor, 1))
  }
  function goToday() {
    setCursor(new Date())
  }
  function toggleStatus(s: string) {
    setStatusFilter((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))
  }
  function toggleCategory(c: string) {
    setCategoryFilter((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))
  }

  return (
    <div className="pb-10">
      <PageHeader
        title="تقویم"
        description="برنامه زمان‌بندی اجرایی عکاسی و در دسترس بودن تیم"
        icon="📅"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && setViewMode(v as ViewMode)}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="month">ماه</ToggleGroupItem>
          <ToggleGroupItem value="week">هفته</ToggleGroupItem>
          <ToggleGroupItem value="day">روز</ToggleGroupItem>
        </ToggleGroup>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={goPrev} aria-label="قبلی">
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goNext} aria-label="بعدی">
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={goToday}>
          امروز
        </Button>

        <div className="ml-1 text-sm font-medium">{periodLabel}</div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select
            value={teamMemberId || "__all"}
            onValueChange={(v) => setTeamMemberId(v === "__all" ? "" : v)}
          >
            <SelectTrigger size="sm" className="h-8 w-[170px]">
              <SelectValue placeholder="همه تیم" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">همه اعضای تیم</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                وضعیت
                {statusFilter.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {statusFilter.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="start">
              <div className="space-y-1">
                <div className="px-1 text-xs font-medium text-muted-foreground">
                  فیلتر بر اساس وضعیت
                </div>
                {PROJECT_STATUSES.map((s) => {
                  const active = statusFilter.includes(s)
                  return (
                    <button
                      key={s}
                      onClick={() => toggleStatus(s)}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent ${
                        active ? "bg-accent" : ""
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: STATUS_COLORS[s] }}
                        />
                        {STATUS_LABELS[s]}
                      </span>
                      {active && <X className="h-3 w-3 text-muted-foreground" />}
                    </button>
                  )
                })}
                {statusFilter.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-7 w-full text-xs"
                    onClick={() => setStatusFilter([])}
                  >
                    پاک کردن همه
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                دسته‌بندی
                {categoryFilter.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {categoryFilter.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="start">
              <div className="space-y-1">
                <div className="px-1 text-xs font-medium text-muted-foreground">
                  فیلتر بر اساس دسته‌بندی
                </div>
                {PACKAGE_CATEGORIES.map((c) => {
                  const active = categoryFilter.includes(c)
                  return (
                    <button
                      key={c}
                      onClick={() => toggleCategory(c)}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent ${
                        active ? "bg-accent" : ""
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: CATEGORY_COLORS[c] }}
                        />
                        {CATEGORY_LABELS[c]}
                      </span>
                      {active && <X className="h-3 w-3 text-muted-foreground" />}
                    </button>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-1.5 rounded-md border px-2 py-1">
            <Switch checked={showLeaves} onCheckedChange={setShowLeaves} />
            <span className="text-xs">مرخصی‌ها</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Always-visible Jalali mini-calendar (top on mobile, left sidebar on desktop) */}
        <div className="order-first w-full shrink-0 lg:order-none lg:w-[260px]">
          <JalaliMiniCalendar
            cursor={cursor}
            viewMode={viewMode}
            holidays={holidays}
            onPickDate={(d) => {
              setCursor(d)
              setViewMode("day")
            }}
            onPickWeek={(d) => {
              setCursor(d)
              setViewMode("week")
            }}
            onPickMonth={(d) => {
              setCursor(d)
              setViewMode("month")
            }}
          />
        </div>

        {/* Main calendar */}
        <div className="min-w-0 flex-1">
          {isLoading ? (
            <Skeleton className="h-[520px] rounded-xl" />
          ) : viewMode === "month" ? (
            <MonthView
              eventsByDay={eventsByDay}
              cursor={cursor}
              holidays={holidays}
              onEventClick={setSelectedEvent}
              onDayClick={(d) => {
                setCursor(d)
                setViewMode("day")
              }}
            />
          ) : viewMode === "week" ? (
            <RowDayListView
              eventsByDay={eventsByDay}
              days={Array.from({ length: 7 }, (_, i) => addDays(startOfPersianWeek(cursor), i))}
              holidays={holidays}
              onEventClick={setSelectedEvent}
            />
          ) : (
            <RowDayListView
              eventsByDay={eventsByDay}
              days={[cursor]}
              holidays={holidays}
              onEventClick={setSelectedEvent}
            />
          )}
        </div>
      </div>

      {selectedEvent && (
        <EventDialog
          event={selectedEvent}
          canReschedule={canReschedule}
          onClose={() => setSelectedEvent(null)}
          onOpenProject={() => {
            if (selectedEvent.projectId) openProject(selectedEvent.projectId)
            setSelectedEvent(null)
          }}
          onReschedule={async (start, end) => {
            try {
              await api.patch(`/api/projects/${selectedEvent.projectId}/schedule`, {
                startDatetime: start,
                endDatetime: end,
              })
              toast.success("زمان پروژه به‌روزرسانی شد")
              setSelectedEvent(null)
              setTimeout(() => window.location.reload(), 400)
            } catch {
              toast.error("به‌روزرسانی ناموفق بود")
            }
          }}
        />
      )}
    </div>
  )
}

function jalaliMonthPrev(cursor: Date): Date {
  const { jy, jm } = toJalali(cursor)
  const newJm = jm === 1 ? 12 : jm - 1
  const newJy = jm === 1 ? jy - 1 : jy
  return jalaliToGregorian(newJy, newJm, 1)
}
function jalaliMonthNext(cursor: Date): Date {
  const { jy, jm } = toJalali(cursor)
  const newJm = jm === 12 ? 1 : jm + 1
  const newJy = jm === 12 ? jy + 1 : jy
  return jalaliToGregorian(newJy, newJm, 1)
}

// ---------- Always-visible Jalali mini-calendar ----------
function JalaliMiniCalendar({
  cursor,
  viewMode,
  holidays,
  onPickDate,
  onPickWeek,
  onPickMonth,
}: {
  cursor: Date
  viewMode: ViewMode
  holidays: ReturnType<typeof useHolidays>
  onPickDate: (d: Date) => void
  onPickWeek: (d: Date) => void
  onPickMonth: (d: Date) => void
}) {
  const today = new Date()
  const todayJ = toJalali(today)
  const cursorJ = toJalali(cursor)
  const daysInMonth = cursorJ.jm <= 6 ? 31 : cursorJ.jm <= 11 ? 30 : 0
  const cells: { day: number; jm: number; jd: number; greg: Date | null }[] = []
  const firstGreg = jalaliToGregorian(cursorJ.jy, cursorJ.jm, 1)
  const firstWeekday = (firstGreg.getDay() + 1) % 7
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: 0, jm: cursorJ.jm, jd: 0, greg: null })
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, jm: cursorJ.jm, jd: d, greg: jalaliToGregorian(cursorJ.jy, cursorJ.jm, d) })
  }
  while (cells.length % 7 !== 0) cells.push({ day: 0, jm: cursorJ.jm, jd: 0, greg: null })

  // Compute the range of the current week (Sat..Fri) for highlighting in week view
  const currentWeekStart = startOfPersianWeek(cursor)
  const currentWeekEnd = addDays(currentWeekStart, 6)

  const prevMonth = () => onPickMonth(jalaliMonthPrev(cursor))
  const nextMonth = () => onPickMonth(jalaliMonthNext(cursor))

  return (
    <div className="w-full rounded-xl border bg-card p-3 shadow-sm lg:w-[260px]">
      <div className="mb-2 flex items-center justify-between">
        <button onClick={prevMonth} className="rounded p-1 hover:bg-accent" aria-label="ماه قبل">
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="text-sm font-semibold">
          {JALALI_MONTHS[cursorJ.jm - 1]} {toPersianDigits(cursorJ.jy)}
        </div>
        <button onClick={nextMonth} className="rounded p-1 hover:bg-accent" aria-label="ماه بعد">
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {WEEK_HEADER.map((d, i) => (
          <div
            key={i}
            className={cn(
              "py-1 text-center text-[10px] font-medium",
              i === 6 ? "text-rose-500" : "text-muted-foreground"
            )}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell, i) => {
          const inMonth = cell.day !== 0
          const isToday =
            inMonth &&
            todayJ.jy === cursorJ.jy &&
            todayJ.jm === cell.jm &&
            todayJ.jd === cell.jd
          const isCursorDay =
            inMonth &&
            toJalali(cursor).jd === cell.jd &&
            toJalali(cursor).jm === cell.jm
          const d = cell.greg
          const friday = d ? isFriday(d) : false
          const holiday = d ? findHolidayByDate(holidays, d) : undefined
          const isOff = friday || !!holiday
          // Week highlighting: in week view, faintly hatch days within the current week
          const inCurrentWeek =
            viewMode === "week" &&
            d !== null &&
            d >= currentWeekStart &&
            d <= currentWeekEnd
          return (
            <button
              key={i}
              onClick={() => {
                if (!d) return
                // In week view, clicking a date jumps to that date's WEEK (not day view)
                if (viewMode === "week") onPickWeek(d)
                else onPickDate(d)
              }}
              disabled={!inMonth}
              className={cn(
                "flex h-8 items-center justify-center rounded text-[11px] transition-colors",
                !inMonth && "opacity-0",
                isToday
                  ? "bg-primary text-primary-foreground font-bold"
                  : isCursorDay
                  ? "bg-accent font-semibold"
                  : inCurrentWeek
                  ? "bg-primary/10 font-medium ring-1 ring-primary/20"
                  : isOff
                  ? "text-rose-500 hover:bg-rose-500/10"
                  : "hover:bg-accent"
              )}
              title={holiday?.title}
            >
              {inMonth ? toPersianDigits(cell.day) : ""}
            </button>
          )
        })}
      </div>
      <div className="mt-2 border-t pt-2 text-[10px] text-muted-foreground">
        {viewMode === "week"
          ? "در حالت هفتگی، کلیک روی تاریخ → هفته آن تاریخ نمایش داده می‌شود."
          : "برای انتخاب تاریخ، روی روز کلیک کنید."}
      </div>
    </div>
  )
}

// ---------- Month view (grid) ----------
function MonthView({
  eventsByDay,
  cursor,
  holidays,
  onEventClick,
  onDayClick,
}: {
  eventsByDay: Map<string, CalEvent[]>
  cursor: Date
  holidays: ReturnType<typeof useHolidays>
  onEventClick: (e: CalEvent) => void
  onDayClick: (d: Date) => void
}) {
  const today = new Date()
  const todayJ = toJalali(today)
  const cursorJ = toJalali(cursor)
  const daysInMonth = cursorJ.jm <= 6 ? 31 : cursorJ.jm <= 11 ? 30 : 0
  const cells: { day: number; jm: number; jd: number; greg: Date | null }[] = []
  const firstGreg = jalaliToGregorian(cursorJ.jy, cursorJ.jm, 1)
  const firstWeekday = (firstGreg.getDay() + 1) % 7
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: 0, jm: cursorJ.jm, jd: 0, greg: null })
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, jm: cursorJ.jm, jd: d, greg: jalaliToGregorian(cursorJ.jy, cursorJ.jm, d) })
  }
  while (cells.length % 7 !== 0) cells.push({ day: 0, jm: cursorJ.jm, jd: 0, greg: null })

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {WEEK_HEADER.map((d, i) => (
          <div
            key={i}
            className={cn(
              "px-2 py-2 text-center text-[11px] font-semibold tracking-wide",
              i === 6 ? "text-rose-500" : "text-muted-foreground"
            )}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const inMonth = cell.day !== 0
          const isToday =
            inMonth && todayJ.jy === cursorJ.jy && todayJ.jm === cell.jm && todayJ.jd === cell.jd
          const d = cell.greg
          const dayKey = d ? startOfDayLocal(d).toDateString() : `empty-${i}`
          const dayEvents = eventsByDay.get(dayKey) ?? []
          const visible = dayEvents.slice(0, 3)
          const overflow = dayEvents.length - visible.length
          const friday = d ? isFriday(d) : false
          const holiday = d ? findHolidayByDate(holidays, d) : undefined
          const isOff = friday || !!holiday
          return (
            <div
              key={i}
              className={cn(
                "min-h-[96px] border-b border-l p-1.5",
                (i + 1) % 7 === 0 && "border-l-0",
                !inMonth && "bg-muted/20",
                isOff && inMonth && "bg-rose-500/5"
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                {inMonth ? (
                  <button
                    onClick={() => d && onDayClick(d)}
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : isOff
                        ? "text-rose-500 hover:bg-rose-500/10"
                        : "text-foreground hover:bg-muted"
                    )}
                    title={holiday?.title}
                  >
                    {toPersianDigits(cell.day)}
                  </button>
                ) : (
                  <span className="h-6 w-6" />
                )}
                {isToday && <span className="text-[9px] font-semibold text-primary">امروز</span>}
                {!isToday && holiday && (
                  <span className="text-[8px] text-rose-500" title={holiday.title}>
                    تعطیل
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {visible.map((ev) => {
                  const c = eventColor(ev)
                  return (
                    <button
                      key={ev.id}
                      onClick={() => onEventClick(ev)}
                      className="block w-full truncate rounded-md border-r-2 px-1.5 py-0.5 text-right text-[11px] font-medium transition-transform hover:scale-[1.02]"
                      style={{ background: c.bg, borderRightColor: c.border, color: "var(--foreground)" }}
                      title={ev.title}
                    >
                      <span className="flex items-center gap-1">
                        {!ev.isLeave && ev.start && (
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {formatTime(ev.start)}
                          </span>
                        )}
                        <span className="truncate">{ev.customer}</span>
                      </span>
                    </button>
                  )
                })}
                {overflow > 0 && (
                  <button
                    onClick={() => d && onDayClick(d)}
                    className="block w-full px-1.5 text-right text-[10px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    +{toPersianDigits(overflow)} مورد دیگر
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Row-day-list view (week & day) ----------
// Each row = one day. Columns = hours (5..23). When a day has multiple customers,
// the row expands into nested sub-rows (one per customer), each showing that
// customer's events across the hour columns.
function RowDayListView({
  eventsByDay,
  days,
  holidays,
  onEventClick,
}: {
  eventsByDay: Map<string, CalEvent[]>
  days: Date[]
  holidays: ReturnType<typeof useHolidays>
  onEventClick: (e: CalEvent) => void
}) {
  const today = new Date()
  return (
    <div className="overflow-x-auto overflow-y-auto rounded-xl border bg-card shadow-sm scroll-thin" style={{ maxHeight: "70vh" }}>
      <div className="min-w-[760px]">
        {/* Hour header row — sticky at top so hours stay visible while scrolling */}
        <div
          className="grid border-b bg-muted/95 backdrop-blur sticky top-0 z-20"
          style={{ gridTemplateColumns: `180px repeat(${HOURS.length}, minmax(${HOUR_COL_PX}px, 1fr))` }}
        >
          <div className="border-l px-2 py-2 text-[11px] font-semibold text-muted-foreground">
            روز / ساعت
          </div>
          {HOURS.map((h) => (
            <div
              key={h}
              className="border-l px-1 py-2 text-center text-[11px] font-medium text-muted-foreground last:border-l-0"
            >
              {toPersianDigits(String(h).padStart(2, "0"))}:۰۰
            </div>
          ))}
        </div>

        {/* Day rows */}
        {days.map((day, di) => {
          const dayKey = startOfDayLocal(day).toDateString()
          const dayEvents = eventsByDay.get(dayKey) ?? []
          const isToday = sameLocalDay(day, today)
          const dj = toJalali(day)
          const friday = isFriday(day)
          const holiday = findHolidayByDate(holidays, day)
          const isOff = friday || !!holiday

          // Group this day's events by customer
          const byCustomer = new Map<string, CalEvent[]>()
          for (const ev of dayEvents) {
            if (!byCustomer.has(ev.customer)) byCustomer.set(ev.customer, [])
            byCustomer.get(ev.customer)!.push(ev)
          }
          const customerGroups = Array.from(byCustomer.entries())

          return (
            <div
              key={di}
              className={cn(
                "border-b last:border-b-0",
                isToday && "bg-primary/5",
                isOff && "bg-rose-500/5"
              )}
            >
              {/* Day label row */}
              <div
                className="grid items-center border-b bg-muted/20"
                style={{ gridTemplateColumns: `180px repeat(${HOURS.length}, minmax(${HOUR_COL_PX}px, 1fr))` }}
              >
                <div className="border-l px-2 py-2">
                  <div className={cn("text-xs font-semibold", isOff ? "text-rose-500" : "")}>
                    {PERSIAN_WEEKDAYS[day.getDay()]} {toPersianDigits(dj.jd)} {JALALI_MONTHS[dj.jm - 1]}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {isToday ? "امروز" : holiday ? holiday.title.slice(0, 18) : friday ? "جمعه" : ""}
                  </div>
                </div>
                <div className="col-span-full" />
              </div>

              {/* Customer sub-rows (or a single empty row if no events) */}
              {customerGroups.length === 0 ? (
                <div
                  className="grid h-10 items-center text-[11px] text-muted-foreground"
                  style={{ gridTemplateColumns: `180px repeat(${HOURS.length}, minmax(${HOUR_COL_PX}px, 1fr))` }}
                >
                  <div className="border-l px-2 text-muted-foreground/60">بدون رویداد</div>
                  <div className="col-span-full" />
                </div>
              ) : (
                customerGroups.map(([customer, evs]) => (
                  <CustomerSubRow
                    key={customer}
                    customer={customer}
                    events={evs}
                    onEventClick={onEventClick}
                  />
                ))
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Customer sub-row (one per customer within a day) ----------
function CustomerSubRow({
  customer,
  events,
  onEventClick,
}: {
  customer: string
  events: CalEvent[]
  onEventClick: (e: CalEvent) => void
}) {
  const c = eventColor(events[0])
  return (
    <div
      className="grid items-stretch border-b last:border-b-0"
      style={{ gridTemplateColumns: `180px repeat(${HOURS.length}, minmax(${HOUR_COL_PX}px, 1fr))` }}
    >
      {/* Customer label — full name always visible */}
      <div
        className="flex items-center gap-1.5 border-l px-2 py-1.5"
        style={{ background: c.bg }}
      >
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.border }} />
        <span className="min-w-0 break-words text-xs font-semibold leading-tight">{customer}</span>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          ({toPersianDigits(events.length)})
        </span>
      </div>
      {/* Hour cells with absolutely-positioned events */}
      <div className="relative col-span-full" style={{ height: 44 }}>
        {/* hour grid lines */}
        {HOURS.map((h, i) => (
          <div
            key={h}
            className={cn("absolute top-0 bottom-0 border-l", i === 0 && "border-l-0")}
            style={{ left: `${(i / HOURS.length) * 100}%`, width: `${100 / HOURS.length}%` }}
          />
        ))}
        {/* events */}
        {events.map((ev) => {
          const start = ev.start ? new Date(ev.start) : null
          const end = ev.end ? new Date(ev.end) : null
          if (!start) return null
          let startH = start.getHours() + start.getMinutes() / 60
          let endH = end ? end.getHours() + end.getMinutes() / 60 : startH + 1
          // clamp to visible window
          const clampedStart = Math.max(startH, HOUR_START)
          const clampedEnd = Math.min(endH, HOUR_END + 1)
          if (clampedEnd <= clampedStart) return null
          const leftPct = ((clampedStart - HOUR_START) / HOURS.length) * 100
          const widthPct = ((clampedEnd - clampedStart) / HOURS.length) * 100
          const evColor = eventColor(ev)
          return (
            <button
              key={ev.id}
              onClick={() => onEventClick(ev)}
              className="absolute top-1 bottom-1 overflow-hidden rounded-md border-r-2 px-1.5 py-0.5 text-right text-[10px] leading-tight shadow-sm hover:z-10 hover:scale-y-105 transition-transform"
              style={{
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                background: evColor.bg,
                borderRightColor: evColor.border,
              }}
              title={ev.packageTitle}
            >
              <div className="truncate font-semibold">{ev.packageTitle}</div>
              <div className="truncate text-[9px] text-muted-foreground">
                {formatTime(ev.start)} – {formatTime(ev.end)}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Event dialog ----------
function EventDialog({
  event,
  canReschedule,
  onClose,
  onOpenProject,
  onReschedule,
}: {
  event: CalEvent
  canReschedule: boolean
  onClose: () => void
  onOpenProject: () => void
  onReschedule: (start: string, end: string) => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [newStart, setNewStart] = React.useState(toLocalInputValue(event.start))
  const [newEnd, setNewEnd] = React.useState(toLocalInputValue(event.end))

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {!event.isLeave && event.category && (
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: CATEGORY_COLORS[event.category as PackageCategory] }}
              />
            )}
            {event.customer}
          </DialogTitle>
          <DialogDescription>{event.packageTitle}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {!event.isLeave && event.status && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">وضعیت:</span>
              <Badge
                variant="secondary"
                style={{
                  background: STATUS_COLORS[event.status as ProjectStatus] + "22",
                  color: STATUS_COLORS[event.status as ProjectStatus],
                }}
              >
                {STATUS_LABELS[event.status as ProjectStatus]}
              </Badge>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {formatDateTime(event.start)}
              {event.end ? ` – ${formatTime(event.end)}` : ""}
            </span>
          </div>
          {event.team.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">تیم:</span>
              <div className="flex -space-x-2 space-x-reverse">
                {event.team.map((t) => (
                  <Avatar key={t.id} className="h-6 w-6 border border-background">
                    <AvatarFallback className="text-[9px]">
                      {initials(t.firstName, t.lastName)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            </div>
          )}
          {canReschedule && !event.isLeave && event.projectId && (
            <>
              {!editing ? (
                <Button variant="outline" size="sm" className="w-full" onClick={() => setEditing(true)}>
                  تغییر زمان
                </Button>
              ) : (
                <div className="space-y-2 rounded-lg border p-3">
                  <div>
                    <Label className="text-xs">شروع جدید</Label>
                    <Input type="datetime-local" value={newStart} onChange={(e) => setNewStart(e.target.value)} dir="ltr" />
                  </div>
                  <div>
                    <Label className="text-xs">پایان جدید</Label>
                    <Input type="datetime-local" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} dir="ltr" />
                  </div>
                  <Button size="sm" className="w-full" onClick={() => onReschedule(newStart, newEnd)}>
                    ذخیره زمان
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          {event.projectId && (
            <Button variant="default" size="sm" onClick={onOpenProject} className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" /> باز کردن پروژه
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            بستن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
