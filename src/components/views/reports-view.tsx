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
  PieChart,
  Pie,
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
import { formatRials, formatRialsShort } from "@/lib/format"
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
    package: string
    effectivePrice: number
    paid: number
    balance: number
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
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.revenueByCategory.map((d) => ({
                        ...d,
                        name: CATEGORY_LABELS[d.name as PackageCategory] ?? d.name,
                      }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      label={({ name, value }: { name: string; value: number }) =>
                        `${name}: ${formatRialsShort(value)}`
                      }
                      labelLine={false}
                    >
                      {data.revenueByCategory.map((d) => (
                        <Cell
                          key={d.name}
                          fill={CATEGORY_COLORS[d.name as PackageCategory] ?? "#94a3b8"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: number, n: string) => [formatRials(v) + " تومان", n]}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          </div>

          {/* Revenue by package + Status distribution */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <SectionCard
              title="درآمد بر اساس پکیج"
              description="پکیج‌های برتر از نظر درآمد — عنوان پکیج در راست، نمودار از راست به چپ"
              className="lg:col-span-2"
            >
              {data.revenueByPackage.length === 0 ? (
                <EmptyState title="درآمد پکیجی وجود ندارد" />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, data.revenueByPackage.length * 36)}>
                  <BarChart
                    data={data.revenueByPackage}
                    layout="vertical"
                    margin={{ left: 16, right: 60, top: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatRialsShort(v)}
                      reversed
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={180}
                      orientation="right"
                      tickFormatter={(v: string) =>
                        v.length > 28 ? v.slice(0, 26) + "…" : v
                      }
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: number) => formatRials(v) + " تومان"}
                      cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                    />
                    <Bar
                      dataKey="value"
                      name="درآمد"
                      fill="#0ea5e9"
                      radius={[4, 0, 0, 4]}
                      barSize={18}
                      label={{
                        position: "right",
                        fill: "var(--foreground)",
                        fontSize: 10,
                        formatter: (v: number) => formatRialsShort(v),
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>

            <SectionCard
              title="توزیع وضعیت‌های پروژه"
              description="تعداد در هر مرحله (برچسب‌ها چرخیده برای خوانایی)"
            >
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data.statusDist} margin={{ left: 20, right: 8, top: 8, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="status"
                    stroke="var(--muted-foreground)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-90}
                    textAnchor="end"
                    height={80}
                    tickFormatter={(v: string) =>
                      STATUS_LABELS[v as ProjectStatus] ?? v
                    }
                  />
                  <YAxis
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number, n: string) => [
                      v,
                      STATUS_LABELS[n as ProjectStatus] ?? n,
                    ]}
                    cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  />
                  <Bar dataKey="count" name="پروژه‌ها" radius={[4, 4, 0, 0]} barSize={28}>
                    {data.statusDist.map((s) => (
                      <Cell
                        key={s.status}
                        fill={STATUS_COLORS[s.status as ProjectStatus] ?? "#94a3b8"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>

          {/* Debtors table + Top customers */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <SectionCard
              title="بدهکاران"
              description="پروژه‌های دارای مانده باقی‌مانده"
              className="lg:col-span-2"
            >
              {data.debtors.length === 0 ? (
                <EmptyState
                  icon="✅"
                  title="مانده بدهی وجود ندارد"
                  description="همه پروژه‌های استودیو تسویه شده‌اند."
                />
              ) : (
                <div className="max-h-96 overflow-y-auto scroll-thin">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>مشتری</TableHead>
                        <TableHead className="hidden md:table-cell">پکیج</TableHead>
                        <TableHead className="text-right">قیمت مؤثر</TableHead>
                        <TableHead className="text-right">پرداخت‌شده</TableHead>
                        <TableHead className="text-right">مانده</TableHead>
                        <TableHead>وضعیت</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.debtors.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium">{d.customer}</TableCell>
                          <TableCell className="hidden max-w-[180px] truncate text-xs text-muted-foreground md:table-cell">
                            {d.package}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatRialsShort(d.effectivePrice)}
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatRialsShort(d.paid)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold text-rose-600">
                            {formatRialsShort(d.balance)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="text-[10px]"
                              style={{
                                background: STATUS_COLORS[d.status as ProjectStatus] + "22",
                                color: STATUS_COLORS[d.status as ProjectStatus],
                              }}
                            >
                              {STATUS_LABELS[d.status as ProjectStatus] ?? d.status}
                            </Badge>
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
              description="بر اساس درآمد در بازه انتخاب‌شده — نام در راست، نمودار از راست به چپ"
            >
              {data.topCustomers.length === 0 ? (
                <EmptyState title="هنوز مشتری‌ای وجود ندارد" />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, data.topCustomers.length * 48)}>
                  <BarChart
                    data={data.topCustomers}
                    layout="vertical"
                    margin={{ left: 16, right: 60, top: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatRialsShort(v)}
                      reversed
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={120}
                      orientation="right"
                      tickFormatter={(v: string) =>
                        v.length > 16 ? v.slice(0, 14) + "…" : v
                      }
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(v: number) => formatRials(v) + " تومان"}
                      cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                    />
                    <Bar
                      dataKey="revenue"
                      name="درآمد"
                      fill="#a855f7"
                      radius={[4, 0, 0, 4]}
                      barSize={20}
                      label={{
                        position: "right",
                        fill: "var(--foreground)",
                        fontSize: 10,
                        formatter: (v: number) => formatRialsShort(v),
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          </div>

          {/* Unpaid salaries — colored by role, RTL like other charts */}
          <div className="mt-4">
            <SectionCard
              title="حقوق پرداخت‌نشده بر اساس کاربر"
              description="پورسانت و پرداخت‌های هر پروژه در انتظار پرداخت — رنگ بر اساس نقش"
            >
              {data.unpaidSalaries.length === 0 ? (
                <EmptyState
                  icon="✅"
                  title="همه حقوق‌ها پرداخت شده"
                  description="هیچ پرداخت پورسانت معوقی وجود ندارد."
                />
              ) : (
                <>
                  {/* Legend by role */}
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {Object.entries(ROLE_COLORS).map(([role, color]) => (
                      <div key={role} className="flex items-center gap-1 text-[10px]">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                        <span className="text-muted-foreground">{ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role}</span>
                      </div>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={Math.max(200, data.unpaidSalaries.length * 44)}>
                    <BarChart
                      data={data.unpaidSalaries}
                      layout="vertical"
                      margin={{ left: 16, right: 60, top: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis
                        type="number"
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatRialsShort(v)}
                        reversed
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="var(--muted-foreground)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        width={140}
                        orientation="right"
                        tickFormatter={(v: string) =>
                          v.length > 18 ? v.slice(0, 16) + "…" : v
                        }
                      />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        formatter={(v: number) => formatRials(v) + " تومان"}
                        cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                      />
                      <Bar
                        dataKey="amount"
                        name="پرداخت‌نشده"
                        radius={[4, 0, 0, 4]}
                        barSize={20}
                        label={{
                          position: "right",
                          fill: "var(--foreground)",
                          fontSize: 10,
                          formatter: (v: number) => formatRialsShort(v),
                        }}
                      >
                        {data.unpaidSalaries.map((s, i) => (
                          <Cell
                            key={i}
                            fill={ROLE_COLORS[s.role as keyof typeof ROLE_COLORS] ?? "#f59e0b"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </>
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

