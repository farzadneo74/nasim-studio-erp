"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  Legend,
} from "recharts"
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Scale,
  AlertTriangle,
  Lock,
} from "lucide-react"

import { useApi } from "@/lib/api/client"
import { useWorkspace } from "@/stores/workspace"
import {
  STATUS_LABELS,
  STATUS_COLORS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  ROLE_LABELS,
  type ProjectStatus,
  type PackageCategory,
  type Role,
} from "@/lib/constants"
import { formatRials, formatRialsShort, toPersianDigits } from "@/lib/format"
import { formatJalaliShort } from "@/lib/jalali"

import { PageHeader, StatCard, SectionCard, EmptyState } from "./_shared"
import { JalaliDatePicker } from "./_jalali-date-picker/jalali-date-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Role-based colors for salary chart
const ROLE_COLORS: Record<string, string> = {
  admin: "#ef4444",
  manager: "#f59e0b",
  sales: "#10b981",
  photographer: "#0ea5e9",
  editor: "#8b5cf6",
  qc: "#ec4899",
  logistics: "#6366f1",
}
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ReportData {
  kpis: {
    totalRevenue: number
    totalExpenses: number
    netProfit: number
    avgProjectValue: number
  }
  revenueTrend: { label: string; revenue: number; expense: number }[]
  revenueByCategory: { name: string; value: number }[]
  revenueByPackage: { name: string; value: number }[]
  statusDist: { status: string; count: number }[]
  debtors: {
    id: string
    customer: string
    customerId?: string
    package: string
    effectivePrice: number
    paid: number
    balance: number
    totalBalance?: number
    projectCount?: number
    status: string
  }[]
  unpaidSalaries: { name: string; amount: number; role?: string; userId?: string }[]
  topCustomers: { name: string; revenue: number }[]
  range: { from: string; to: string }
}

// ---------- Range presets ----------
type RangeKey = "30" | "90" | "180" | "365" | "all"
const RANGE_PRESETS: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "30", label: "۳۰ روز اخیر", days: 30 },
  { key: "90", label: "۹۰ روز اخیر", days: 90 },
  { key: "180", label: "۶ ماه اخیر", days: 180 },
  { key: "365", label: "۱۲ ماه اخیر", days: 365 },
  { key: "all", label: "کل دوره", days: null },
]

function toInputDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function fromInputDate(s: string): Date | null {
  if (!s) return null
  const d = new Date(s + "T00:00:00")
  return Number.isNaN(d.getTime()) ? null : d
}

const TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
} as const

export function ReportsView() {
  const api = useApi()
  const role = useWorkspace((s) => s.role)
  const canView = role === "admin" || role === "manager"

  // Default: last 90 days
  const [preset, setPreset] = React.useState<RangeKey>("90")
  const [fromDate, setFromDate] = React.useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 90)
    return toInputDate(d)
  })
  const [toDate, setToDate] = React.useState<string>(() => toInputDate(new Date()))

  React.useEffect(() => {
    if (preset === "all") {
      // Earliest sensible: 5 years ago
      const d = new Date()
      d.setFullYear(d.getFullYear() - 5)
      setFromDate(toInputDate(d))
      setToDate(toInputDate(new Date()))
      return
    }
    const presetCfg = RANGE_PRESETS.find((p) => p.key === preset)
    if (presetCfg?.days) {
      const d = new Date()
      d.setDate(d.getDate() - presetCfg.days)
      setFromDate(toInputDate(d))
      setToDate(toInputDate(new Date()))
    }
  }, [preset])

  const qs = React.useMemo(() => {
    const params = new URLSearchParams()
    const f = fromInputDate(fromDate)
    const t = fromInputDate(toDate)
    if (f) params.set("from", f.toISOString())
    if (t) {
      // include the entire end day
      t.setHours(23, 59, 59, 999)
      params.set("to", t.toISOString())
    }
    return params.toString()
  }, [fromDate, toDate])

  const { data, isLoading, isError, error } = useQuery<ReportData>({
    queryKey: ["reports", qs],
    queryFn: () => api.get<ReportData>(`/api/reports?${qs}`),
    enabled: canView,
    retry: false,
  })

  if (!canView) {
    return (
      <div>
        <PageHeader
          title="گزارش‌ها"
          description="بینش مالی و عملکرد استودیو"
          icon="📊"
        />
        <EmptyState
          icon={<Lock className="h-8 w-8" />}
          title="دسترسی محدود"
          description="فقط مدیران سیستم و مدیران می‌توانند گزارش‌های مالی را مشاهده کنند. برای بررسی، به یک نقش دموی دیگر تغییر دهید."
        />
      </div>
    )
  }

  if (isError) {
    return (
      <div>
        <PageHeader
          title="گزارش‌ها"
          description="بینش مالی و عملکرد استودیو"
          icon="📊"
        />
        <EmptyState
          icon={<AlertTriangle className="h-8 w-8" />}
          title="بارگذاری گزارش ناموفق بود"
          description={(error as Error)?.message || "لطفاً بعداً دوباره تلاش کنید."}
        />
      </div>
    )
  }

  return (
    <div className="pb-10">
      <PageHeader
        title="گزارش‌ها"
        description="بینش مالی و عملکرد استودیو"
        icon="📊"
        actions={
          <Select value={preset} onValueChange={(v) => setPreset(v as RangeKey)}>
            <SelectTrigger size="sm" className="h-8 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_PRESETS.map((p) => (
                <SelectItem key={p.key} value={p.key}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Date range selector — Jalali (Shamsi) calendar */}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">
            از تاریخ
          </Label>
          <JalaliDatePicker
            value={fromDate || null}
            onChange={(iso) => {
              setFromDate(iso || "")
              setPreset("all")
            }}
            placeholder="انتخاب تاریخ شروع"
            className="h-8 w-[160px] text-xs"
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">
            تا تاریخ
          </Label>
          <JalaliDatePicker
            value={toDate || null}
            onChange={(iso) => {
              setToDate(iso || "")
              setPreset("all")
            }}
            placeholder="انتخاب تاریخ پایان"
            className="h-8 w-[160px] text-xs"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => setPreset("90")}
        >
          بازگشت به ۹۰ روز اخیر
        </Button>
        {data?.range && (
          <div className="ml-auto text-xs text-muted-foreground">
            نمایش {formatJalaliShort(new Date(data.range.from))} – {formatJalaliShort(new Date(data.range.to))}
          </div>
        )}
      </div>

      {isLoading || !data ? (
        <ReportsSkeleton />
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="درآمد کل"
              value={`${formatRialsShort(data.kpis.totalRevenue)} تومان`}
              sub="پرداختی‌های تأییدشده در بازه"
              icon={<TrendingUp className="h-4 w-4" />}
              accent="#10b981"
            />
            <StatCard
              label="هزینه کل"
              value={`${formatRialsShort(data.kpis.totalExpenses)} تومان`}
              sub="همه دسته‌های هزینه"
              icon={<TrendingDown className="h-4 w-4" />}
              accent="#ef4444"
            />
            <StatCard
              label="سود خالص"
              value={`${formatRialsShort(data.kpis.netProfit)} تومان`}
              sub={data.kpis.netProfit >= 0 ? "سودآور" : "زیان‌ده"}
              icon={<Scale className="h-4 w-4" />}
              accent={data.kpis.netProfit >= 0 ? "#0ea5e9" : "#ef4444"}
            />
            <StatCard
              label="میانگین ارزش پروژه"
              value={`${formatRialsShort(data.kpis.avgProjectValue)} تومان`}
              sub="قیمت مؤثر هر پروژه"
              icon={<Wallet className="h-4 w-4" />}
              accent="#a855f7"
            />
          </div>

          {/* Revenue vs Expenses (Area) + Revenue by Category (Pie) */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <SectionCard
              title="درآمد در مقابل هزینه"
              description="روند ماهانه در بازه انتخاب‌شده"
              className="lg:col-span-2"
            >
              {data.revenueTrend.every((d) => d.revenue === 0 && d.expense === 0) ? (
                <EmptyState title="در این بازه داده‌ای وجود ندارد" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.revenueTrend} margin={{ left: -10, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="rev-r" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="exp-r" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="label"
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatRialsShort(v)}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: number) => formatRials(v) + " تومان"}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="درآمد"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#rev-r)"
                    />
                    <Area
                      type="monotone"
                      dataKey="expense"
                      name="هزینه"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fill="url(#exp-r)"
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: 11 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </SectionCard>

            <SectionCard
              title="درآمد بر اساس دسته‌بندی"
              description="تقسیم عکس / فیلم / ترکیبی"
            >
              {data.revenueByCategory.every((d) => d.value === 0) ? (
                <EmptyState title="درآمدی ثبت نشده است" />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {data.revenueByCategory.map((d) => {
                    const total = data.revenueByCategory.reduce((s, x) => s + x.value, 0)
                    const pct = total > 0 ? (d.value / total) * 100 : 0
                    const color = CATEGORY_COLORS[d.name as PackageCategory] ?? "#94a3b8"
                    return (
                      <div key={d.name} className="rounded-xl border p-4" style={{ borderColor: color + "40" }}>
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                          <span className="text-sm font-medium">{CATEGORY_LABELS[d.name as PackageCategory] ?? d.name}</span>
                        </div>
                        <div className="mt-2 text-xl font-bold">{formatRialsShort(d.value)}</div>
                        <div className="text-xs text-muted-foreground">{toPersianDigits(Math.round(pct))}٪ از کل</div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Revenue by package + Status distribution */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <SectionCard
              title="درآمد بر اساس پکیج"
              description="پکیج‌های برتر از نظر درآمد"
              className="lg:col-span-2"
            >
              {data.revenueByPackage.length === 0 ? (
                <EmptyState title="درآمد پکیجی وجود ندارد" />
              ) : (
                <div className="space-y-1.5">
                  {data.revenueByPackage.slice(0, 10).map((p, i) => {
                    const max = Math.max(...data.revenueByPackage.map((x) => x.value), 1)
                    const pct = (p.value / max) * 100
                    return (
                      <div key={i} className="flex items-center gap-2 rounded-lg border bg-card/50 p-2.5 text-sm">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                          {toPersianDigits(i + 1)}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium" title={p.name}>{p.name}</span>
                        <div className="hidden h-2 w-24 overflow-hidden rounded-full bg-muted sm:block">
                          <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="shrink-0 font-bold tabular-nums">{formatRialsShort(p.value)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="توزیع وضعیت‌های پروژه"
              description="تعداد پروژه در هر مرحله"
            >
              <div className="grid grid-cols-2 gap-2">
                {data.statusDist.map((s) => {
                  const color = STATUS_COLORS[s.status as ProjectStatus] ?? "#94a3b8"
                  return (
                    <div key={s.status} className="rounded-lg border p-3 text-center" style={{ borderColor: color + "40" }}>
                      <div className="text-2xl font-bold" style={{ color }}>{toPersianDigits(s.count)}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {STATUS_LABELS[s.status as ProjectStatus] ?? s.status}
                      </div>
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          </div>

          {/* Debtors table + Top customers */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <SectionCard
              title="بدهکاران"
              description="مجموع بدهی هر مشتری از همه پروژه‌ها"
              className="lg:col-span-2"
            >
              {data.debtors.length === 0 ? (
                <EmptyState icon="✅" title="مانده بدهی وجود ندارد" description="همه مشتریان تسویه شده‌اند." />
              ) : (
                <div className="max-h-96 overflow-y-auto scroll-thin">
                  <Table dir="rtl">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">نام مشتری</TableHead>
                        <TableHead className="text-center">تعداد پروژه</TableHead>
                        <TableHead className="text-right">مجموع بدهی</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.debtors.map((d) => (
                        <TableRow key={d.customerId || d.id}>
                          <TableCell className="text-right font-medium">{d.customer}</TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {toPersianDigits(d.projectCount ?? 1)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-rose-600 dark:text-rose-400">
                            {formatRialsShort(d.totalBalance ?? d.balance)} تومان
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="مشتریان برتر"
              description="بر اساس درآمد در بازه انتخاب‌شده"
            >
              {data.topCustomers.length === 0 ? (
                <EmptyState title="هنوز مشتری‌ای وجود ندارد" />
              ) : (
                <div className="space-y-1.5">
                  {data.topCustomers.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border bg-card/50 p-2.5 text-sm">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">
                        {toPersianDigits(i + 1)}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium" title={c.name}>{c.name}</span>
                      <span className="shrink-0 font-bold tabular-nums text-violet-600 dark:text-violet-400">
                        {formatRialsShort(c.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Unpaid salaries */}
          <div className="mt-4">
            <SectionCard
              title="حقوق پرداخت‌نشده بر اساس کاربر"
              description="پورسانت و پرداخت‌های هر پروژه در انتظار پرداخت"
            >
              {data.unpaidSalaries.length === 0 ? (
                <EmptyState icon="✅" title="همه حقوق‌ها پرداخت شده" description="هیچ پرداخت پورسانت معوقی وجود ندارد." />
              ) : (
                <div className="space-y-1.5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {Object.entries(ROLE_COLORS).map(([role, color]) => (
                      <div key={role} className="flex items-center gap-1 text-[10px]">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                        <span className="text-muted-foreground">{ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role}</span>
                      </div>
                    ))}
                  </div>
                  {data.unpaidSalaries.map((s, i) => {
                    const color = ROLE_COLORS[s.role as keyof typeof ROLE_COLORS] ?? "#f59e0b"
                    return (
                      <div key={i} className="flex items-center gap-2 rounded-lg border bg-card/50 p-2.5 text-sm">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color }} />
                        <span className="min-w-0 flex-1 truncate font-medium" title={s.name}>{s.name}</span>
                        <Badge variant="outline" className="shrink-0 text-[9px]">
                          {ROLE_LABELS[s.role as keyof typeof ROLE_LABELS] ?? s.role}
                        </Badge>
                        <span className="shrink-0 font-bold tabular-nums text-amber-600 dark:text-amber-400">
                          {formatRialsShort(s.amount)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </div>
  )
}

function ReportsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[330px] rounded-xl lg:col-span-2" />
        <Skeleton className="h-[330px] rounded-xl" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[330px] rounded-xl lg:col-span-2" />
        <Skeleton className="h-[330px] rounded-xl" />
      </div>
    </>
  )
}

