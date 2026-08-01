"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useApi } from "@/lib/api/client"
import { useIsSuperAdmin } from "@/lib/hooks/use-is-super-admin"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import {
  ShieldCheck, Building2, Users, Wallet, TrendingUp, AlertTriangle, Clock,
  MessageSquare, Settings, Plus, RefreshCw, Crown, Server, Activity,
  DollarSign, Phone, MapPin, Send, Database, Zap, Ban, CheckCircle2,
  Sparkles, ArrowUpRight, ArrowDownRight, Radio, HardDrive, Calendar,
  ChevronLeft, LogOut, FileText, Eye, FolderKanban, UserCheck,
} from "lucide-react"
import { formatJalaliDate } from "@/lib/jalali"
import { toPersianDigits, formatToman } from "@/lib/format"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"

// ============== Types ==============
interface Studio {
  id: string
  name: string
  nameEn?: string | null
  dbName: string
  plan: string
  isActive: boolean
  subscriptionEnd?: string | null
  subscriptionStart?: string | null
  ownerName?: string | null
  ownerPhone?: string | null
  city?: string | null
  smsCreditRial: number
  kavenegarStatus: string
  storageUsedBytes: number
  storageQuotaBytes: number
  maxStorageBytes?: number
  maxEmployees: number
  maxProjects: number
  maxCustomers: number
  employees: number
  projects: number
  customers: number
  membershipCount: number
  smsTxCount: number
}

interface Totals {
  studios: number
  activeStudios: number
  trialStudios: number
  basicStudios: number
  proStudios: number
  enterpriseStudios: number
  suspendedStudios: number
  totalSmsCreditRial: number
  totalStorageUsedBytes: number
  totalEmployees: number
  totalProjects: number
  totalCustomers: number
}

interface Plan {
  id: string
  name: string
  nameEn: string
  maxEmployees: number
  monthlyPriceToman: number
  durationDays: number
}

interface OverviewData {
  totals: Totals
  studios: Studio[]
  nearLimitStudios: { id: string; name: string; employees: number; maxEmployees: number; plan: string }[]
  expiringSoon: { id: string; name: string; subscriptionEnd: string; plan: string }[]
  expired: { id: string; name: string; subscriptionEnd: string; plan: string }[]
  plans: Plan[]
  settings: Record<string, string>
}

// ============== Helpers ==============
function formatBytes(bytes: number): string {
  if (bytes === 0) return "۰ بایت"
  const units = ["بایت", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${toPersianDigits((bytes / Math.pow(1024, i)).toFixed(1))} ${units[i]}`
}

function formatRial(rial: number): string {
  return toPersianDigits(rial.toLocaleString("en-US")) + " ریال"
}

function formatRialShort(rial: number): string {
  const abs = Math.abs(rial)
  if (abs >= 1_000_000_000) return toPersianDigits((rial / 1_000_000_000).toFixed(1)) + " میلیارد"
  if (abs >= 1_000_000) return toPersianDigits((rial / 1_000_000).toFixed(1)) + " میلیون"
  if (abs >= 1_000) return toPersianDigits((rial / 1_000).toFixed(0)) + " هزار"
  return toPersianDigits(rial)
}

function planColor(plan: string): string {
  switch (plan) {
    case "trial": return "from-slate-500 to-slate-600"
    case "basic": return "from-emerald-500 to-teal-600"
    case "pro": return "from-violet-500 to-purple-600"
    case "enterprise": return "from-amber-500 to-orange-600"
    case "suspended": return "from-rose-500 to-red-600"
    default: return "from-slate-500 to-slate-600"
  }
}

function planBadgeColor(plan: string): string {
  switch (plan) {
    case "trial": return "bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300 border-slate-200 dark:border-slate-800"
    case "basic": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
    case "pro": return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800"
    case "enterprise": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800"
    case "suspended": return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800"
    default: return "bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300 border-slate-200 dark:border-slate-800"
  }
}

function planName(plan: string, plans: Plan[]): string {
  return plans.find((p) => p.id === plan)?.name ?? plan
}

function daysLeft(end?: string | null): number {
  if (!end) return 0
  return Math.ceil((new Date(end).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
}

// ============== Main View ==============
export function SuperAdminView() {
  const { data: isSuperAdmin, isLoading: saLoading } = useIsSuperAdmin()

  if (saLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-rose-200 dark:border-rose-900" />
          <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-t-rose-500" />
        </div>
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md text-center"
        >
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 shadow-lg shadow-rose-500/30">
            <ShieldCheck className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold">دسترسی محدود</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            این صفحه فقط برای مدیر پلتفرم (super-admin) قابل دسترسی است.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <HeroHeader />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto gap-1 rounded-xl border bg-card/50 p-1 backdrop-blur">
          <TabsTrigger value="overview" className="gap-1.5 rounded-lg data-[state=active]:bg-gradient-to-l data-[state=active]:from-rose-500/10 data-[state=active]:to-amber-500/10 data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400">
            <Activity className="h-3.5 w-3.5" /> نمای کلی
          </TabsTrigger>
          <TabsTrigger value="studios" className="gap-1.5 rounded-lg data-[state=active]:bg-gradient-to-l data-[state=active]:from-sky-500/10 data-[state=active]:to-blue-500/10 data-[state=active]:text-sky-600 dark:data-[state=active]:text-sky-400">
            <Building2 className="h-3.5 w-3.5" /> استودیوها
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-1.5 rounded-lg data-[state=active]:bg-gradient-to-l data-[state=active]:from-amber-500/10 data-[state=active]:to-orange-500/10 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400">
            <MessageSquare className="h-3.5 w-3.5" /> پیامک
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-1.5 rounded-lg data-[state=active]:bg-gradient-to-l data-[state=active]:from-violet-500/10 data-[state=active]:to-purple-500/10 data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400">
            <DollarSign className="h-3.5 w-3.5" /> پلن‌ها
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5 rounded-lg data-[state=active]:bg-gradient-to-l data-[state=active]:from-emerald-500/10 data-[state=active]:to-teal-500/10 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400">
            <Settings className="h-3.5 w-3.5" /> تنظیمات
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 rounded-lg data-[state=active]:bg-gradient-to-l data-[state=active]:from-slate-500/10 data-[state=active]:to-gray-500/10 data-[state=active]:text-slate-600 dark:data-[state=active]:text-slate-400">
            <FileText className="h-3.5 w-3.5" /> لاگ‌ها
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="studios" className="mt-6">
          <StudiosTab />
        </TabsContent>
        <TabsContent value="sms" className="mt-6">
          <SmsTab />
        </TabsContent>
        <TabsContent value="plans" className="mt-6">
          <PlansTab />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <SettingsTab />
        </TabsContent>
        <TabsContent value="logs" className="mt-6">
          <LogsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============== Hero Header ==============
function HeroHeader() {
  const api = useApi()
  const apiRef = React.useRef(api)
  apiRef.current = api

  const { data } = useQuery<OverviewData>({
    queryKey: ["super-admin-overview"],
    queryFn: () => apiRef.current.get<OverviewData>("/api/super-admin/overview"),
    staleTime: 30 * 1000,
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl border border-rose-200/50 bg-gradient-to-l from-rose-500/10 via-amber-500/5 to-transparent p-6 dark:border-rose-800/50"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 opacity-30">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-rose-400/30 to-amber-400/30 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-gradient-to-br from-violet-400/20 to-sky-400/20 blur-3xl" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 shadow-lg shadow-rose-500/30"
          >
            <Crown className="h-7 w-7 text-white" />
            <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-background">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              پنل مدیریت پلتفرم
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              مدیریت کامل استودیوها، اشتراک‌ها، شارژ SMS و تنظیمات پلتفرم نسیم
            </p>
          </div>
        </div>

        {data && (
          <div className="flex flex-wrap gap-3">
            <QuickStat icon={Building2} label="استودیوها" value={toPersianDigits(data.totals.studios)} color="text-sky-500" />
            <QuickStat icon={Users} label="کارمندان" value={toPersianDigits(data.totals.totalEmployees)} color="text-emerald-500" />
            <QuickStat icon={Wallet} label="شارژ SMS" value={formatRialShort(data.totals.totalSmsCreditRial)} color="text-amber-500" />
          </div>
        )}
      </div>
    </motion.div>
  )
}

function QuickStat({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card/50 px-3 py-2 backdrop-blur">
      <Icon className={`h-4 w-4 ${color}`} />
      <div>
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div className="text-sm font-bold">{value}</div>
      </div>
    </div>
  )
}

// ============== Overview Tab ==============
function OverviewTab() {
  const api = useApi()
  const apiRef = React.useRef(api)
  apiRef.current = api

  const { data, isLoading, refetch } = useQuery<OverviewData>({
    queryKey: ["super-admin-overview"],
    queryFn: () => apiRef.current.get<OverviewData>("/api/super-admin/overview"),
    staleTime: 30 * 1000,
  })

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    )
  }

  const { totals, nearLimitStudios, expiringSoon, expired, plans } = data

  return (
    <div className="space-y-6">
      {/* Stats cards with animation */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="کل استودیوها"
          value={toPersianDigits(totals.studios)}
          subtitle={`${toPersianDigits(totals.activeStudios)} فعال`}
          icon={Building2}
          gradient="from-sky-500 to-blue-600"
          delay={0}
        />
        <StatCard
          title="کل کارمندان"
          value={toPersianDigits(totals.totalEmployees)}
          subtitle="در همه استودیوها"
          icon={Users}
          gradient="from-emerald-500 to-teal-600"
          delay={0.1}
        />
        <StatCard
          title="کل پروژه‌ها"
          value={toPersianDigits(totals.totalProjects)}
          subtitle={`${toPersianDigits(totals.totalCustomers)} مشتری`}
          icon={TrendingUp}
          gradient="from-violet-500 to-purple-600"
          delay={0.2}
        />
        <StatCard
          title="موجودی SMS کل"
          value={formatRialShort(totals.totalSmsCreditRial)}
          subtitle="بین همه استودیوها"
          icon={MessageSquare}
          gradient="from-amber-500 to-orange-600"
          delay={0.3}
        />
      </div>

      {/* Plan distribution - Modern donut-like cards */}
      <Card className="overflow-hidden border-2 border-violet-200/50 dark:border-violet-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              <Crown className="h-4 w-4" />
            </div>
            توزیع پلن‌ها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <PlanDistributionCard label="تستی" count={totals.trialStudios} total={totals.studios} gradient="from-slate-500 to-slate-600" delay={0} />
            <PlanDistributionCard label="پایه" count={totals.basicStudios} total={totals.studios} gradient="from-emerald-500 to-teal-600" delay={0.1} />
            <PlanDistributionCard label="حرفه‌ای" count={totals.proStudios} total={totals.studios} gradient="from-violet-500 to-purple-600" delay={0.2} />
            <PlanDistributionCard label="سازمانی" count={totals.enterpriseStudios} total={totals.studios} gradient="from-amber-500 to-orange-600" delay={0.3} />
            <PlanDistributionCard label="معلق" count={totals.suspendedStudios} total={totals.studios} gradient="from-rose-500 to-red-600" delay={0.4} />
          </div>
        </CardContent>
      </Card>

      {/* Alerts - 3 columns */}
      <div className="grid gap-4 lg:grid-cols-3">
        <AlertCard
          title="نزدیک محدودیت کارمند"
          icon={AlertTriangle}
          color="amber"
          items={nearLimitStudios}
          emptyText="هیچ استودیویی نزدیک محدودیت نیست."
          renderItem={(s) => ({
            name: s.name,
            badge: `${toPersianDigits(s.employees)}/${toPersianDigits(s.maxEmployees)}`,
          })}
        />
        <AlertCard
          title="اشتراک در حال اتمام"
          icon={Clock}
          color="orange"
          items={expiringSoon}
          emptyText="هیچ اشتراکی در حال اتمام نیست."
          renderItem={(s) => ({
            name: s.name,
            badge: `${toPersianDigits(daysLeft(s.subscriptionEnd))} روز`,
          })}
        />
        <AlertCard
          title="اشتراک منقضی شده"
          icon={Ban}
          color="rose"
          items={expired}
          emptyText="هیچ اشتراکی منقضی نشده."
          renderItem={(s) => ({
            name: s.name,
            badge: "منقضی",
          })}
        />
      </div>

      {/* Storage summary with animated bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white">
              <Database className="h-4 w-4" />
            </div>
            فضای ذخیره‌سازی
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">مجموع فضای مصرف شده</span>
            <span className="font-bold text-lg">{formatBytes(totals.totalStorageUsedBytes)}</span>
          </div>
          <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "30%" }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-l from-sky-500 via-violet-500 to-emerald-500"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> به‌روزرسانی
        </Button>
      </div>
    </div>
  )
}

function StatCard({ title, value, subtitle, icon: Icon, gradient, delay }: {
  title: string; value: string; subtitle?: string; icon: React.ElementType; gradient: string; delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-xs font-medium text-muted-foreground">{title}</div>
              <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
              {subtitle && <div className="mt-1 text-[11px] text-muted-foreground">{subtitle}</div>}
            </div>
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg transition-transform group-hover:scale-110`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
          {/* Decorative gradient line */}
          <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-l ${gradient} opacity-0 transition-opacity group-hover:opacity-100`} />
        </CardContent>
      </Card>
    </motion.div>
  )
}

function PlanDistributionCard({ label, count, total, gradient, delay }: {
  label: string; count: number; total: number; gradient: string; delay: number
}) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      className="relative overflow-hidden rounded-xl border bg-card p-4 text-center"
    >
      <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-white shadow`}>
        <span className="text-sm font-bold">{toPersianDigits(count)}</span>
      </div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: delay + 0.2 }}
          className={`h-full rounded-full bg-gradient-to-l ${gradient}`}
        />
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">{toPersianDigits(Math.round(pct))}٪</div>
    </motion.div>
  )
}

function AlertCard({ title, icon: Icon, color, items, emptyText, renderItem }: {
  title: string
  icon: React.ElementType
  color: "amber" | "orange" | "rose"
  items: { id: string; name: string; [k: string]: unknown }[]
  emptyText: string
  renderItem: (item: { id: string; name: string; [k: string]: unknown }) => { name: string; badge: string }
}) {
  const colorMap = {
    amber: { bg: "border-amber-200 dark:border-amber-800/50", icon: "text-amber-500", badge: "text-amber-600 border-amber-200 dark:border-amber-800" },
    orange: { bg: "border-orange-200 dark:border-orange-800/50", icon: "text-orange-500", badge: "text-orange-600 border-orange-200 dark:border-orange-800" },
    rose: { bg: "border-rose-200 dark:border-rose-800/50", icon: "text-rose-500", badge: "text-rose-600 border-rose-200 dark:border-rose-800" },
  }
  const c = colorMap[color]

  return (
    <Card className={c.bg}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className={`h-4 w-4 ${c.icon}`} /> {title}
          {items.length > 0 && (
            <Badge variant="outline" className={c.badge}>{toPersianDigits(items.length)}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">{emptyText}</p>
        ) : (
          items.map((item) => {
            const r = renderItem(item)
            return (
              <div key={item.id} className="flex items-center justify-between rounded-lg border bg-card/50 p-2 text-xs">
                <span className="font-medium">{r.name}</span>
                <Badge variant="outline" className={c.badge}>{r.badge}</Badge>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

// ============== Studios Tab ==============
function StudiosTab() {
  const api = useApi()
  const apiRef = React.useRef(api)
  apiRef.current = api

  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ["super-admin-overview"],
    queryFn: () => apiRef.current.get<OverviewData>("/api/super-admin/overview"),
    staleTime: 30 * 1000,
  })

  const [selectedStudio, setSelectedStudio] = React.useState<string | null>(null)

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {data.studios.map((studio, i) => (
          <StudioCard key={studio.id} studio={studio} plans={data.plans} onOpen={() => setSelectedStudio(studio.id)} delay={i * 0.1} />
        ))}
      </div>

      {selectedStudio && (
        <StudioDetailDialog studioId={selectedStudio} plans={data.plans} onClose={() => setSelectedStudio(null)} />
      )}
    </div>
  )
}

function StudioCard({ studio, plans, onOpen, delay }: { studio: Studio; plans: Plan[]; onOpen: () => void; delay: number }) {
  const days = daysLeft(studio.subscriptionEnd)
  const storagePct = studio.storageQuotaBytes > 0 ? Math.min(100, (studio.storageUsedBytes / studio.storageQuotaBytes) * 100) : 0
  const employeePct = studio.maxEmployees > 0 ? Math.min(100, (studio.employees / studio.maxEmployees) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="group relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1">
        {/* Plan gradient header */}
        <div className={`h-2 w-full bg-gradient-to-l ${planColor(studio.plan)}`} />

        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${planColor(studio.plan)} text-white shadow-lg`}>
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">{studio.name}</h3>
                  <Badge className={`border ${planBadgeColor(studio.plan)}`} variant="outline">
                    {planName(studio.plan, plans)}
                  </Badge>
                  {!studio.isActive && <Badge variant="destructive">غیرفعال</Badge>}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground" dir="ltr">{studio.nameEn || "—"}</div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {studio.ownerName && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {studio.ownerName}</span>}
                  {studio.ownerPhone && <span className="flex items-center gap-1" dir="ltr"><Phone className="h-3 w-3" /> {studio.ownerPhone}</span>}
                  {studio.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {studio.city}</span>}
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onOpen} className="shrink-0">
              مدیریت
            </Button>
          </div>

          {/* Stats grid */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat label="کارمندان" value={`${toPersianDigits(studio.employees)}/${studio.maxEmployees > 0 ? toPersianDigits(studio.maxEmployees) : "∞"}`} pct={employeePct} warn={studio.maxEmployees > 0 && studio.employees >= studio.maxEmployees} icon={Users} />
            <MiniStat label="پروژه‌ها" value={toPersianDigits(studio.projects)} icon={TrendingUp} />
            <MiniStat label="مشتریان" value={toPersianDigits(studio.customers)} icon={Building2} />
            <MiniStat label="شارژ SMS" value={formatRialShort(studio.smsCreditRial)} icon={MessageSquare} />
          </div>

          {/* Storage bar */}
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <HardDrive className="h-3 w-3" /> فضای ذخیره‌سازی
              </span>
              <span className="font-medium">{formatBytes(studio.storageUsedBytes)} / {formatBytes(studio.storageQuotaBytes)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${storagePct}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className={`h-full rounded-full ${storagePct > 90 ? "bg-gradient-to-l from-rose-500 to-red-500" : storagePct > 70 ? "bg-gradient-to-l from-amber-500 to-orange-500" : "bg-gradient-to-l from-emerald-500 to-teal-500"}`}
              />
            </div>
          </div>

          {/* Status badges */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            {studio.subscriptionEnd && (
              <Badge variant="outline" className={`gap-1 ${days < 0 ? "text-rose-600 border-rose-200 dark:border-rose-800" : days <= 7 ? "text-orange-600 border-orange-200 dark:border-orange-800" : ""}`}>
                <Calendar className="h-3 w-3" />
                {days < 0 ? "منقضی شده" : `${toPersianDigits(days)} روز مانده`}
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              <Radio className="h-3 w-3" />
              {studio.kavenegarStatus === "active" ? "✓ Kavenegar فعال" : studio.kavenegarStatus === "pending" ? "⏳ در انتظار" : "✗ Kavenegar غیرفعال"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function MiniStat({ label, value, pct, warn, icon: Icon }: { label: string; value: string; pct?: number; warn?: boolean; icon: React.ElementType }) {
  return (
    <div className={`rounded-xl border p-3 ${warn ? "border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/20" : ""}`}>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={`mt-1 text-sm font-bold ${warn ? "text-rose-600" : ""}`}>{value}</div>
      {pct !== undefined && (
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${pct > 90 ? "bg-rose-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

// ============== Studio Detail Dialog ==============
function StudioDetailDialog({ studioId, plans, onClose }: { studioId: string; plans: Plan[]; onClose: () => void }) {
  const api = useApi()
  const apiRef = React.useRef(api)
  apiRef.current = api
  const qc = useQueryClient()

  interface StudioDetail {
    studio: Studio & {
      studioPhone?: string | null
      address?: string | null
      notes?: string | null
      kavenegarApikey?: string | null
      kavenegarSender?: string | null
      kavenegarLocalId?: string | null
      createdAt?: string
    }
    stats: { employees: number; projects: number; customers: number }
    memberships: { id: string; userId: string; userName: string; userPhone: string; role: string; isActive: boolean; createdAt: string }[]
    recentSmsTransactions: unknown[]
    subscriptionHistory: unknown[]
  }

  const { data, isLoading } = useQuery<StudioDetail>({
    queryKey: ["super-admin-studio", studioId],
    queryFn: () => apiRef.current.get<StudioDetail>(`/api/super-admin/studios/${studioId}`),
  })

  const [editMode, setEditMode] = React.useState(false)
  const [chargeOpen, setChargeOpen] = React.useState(false)
  const [planOpen, setPlanOpen] = React.useState(false)

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${planColor(data?.studio.plan || "trial")} text-white shadow`}>
              <Building2 className="h-5 w-5" />
            </div>
            {isLoading ? "در حال بارگذاری..." : data?.studio.name}
          </DialogTitle>
          <DialogDescription>مدیریت کامل استودیو</DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <Skeleton className="h-64 rounded-lg" />
        ) : (
          <div className="space-y-4">
            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditMode(!editMode)} className="gap-1.5">
                <Settings className="h-3.5 w-3.5" /> {editMode ? "انصراف" : "ویرایش"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setChargeOpen(true)} className="gap-1.5">
                <Wallet className="h-3.5 w-3.5" /> شارژ SMS
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPlanOpen(true)} className="gap-1.5">
                <Crown className="h-3.5 w-3.5" /> تغییر اشتراک
              </Button>
            </div>

            {/* Studio info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">اطلاعات استودیو</CardTitle>
              </CardHeader>
              <CardContent>
                {editMode ? (
                  <EditStudioForm studio={data.studio} onSaved={() => {
                    setEditMode(false)
                    qc.invalidateQueries({ queryKey: ["super-admin-studio", studioId] })
                    qc.invalidateQueries({ queryKey: ["super-admin-overview"] })
                  }} />
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <InfoRow label="نام" value={data.studio.name} />
                    <InfoRow label="نام انگلیسی" value={data.studio.nameEn ?? "—"} dir="ltr" />
                    <InfoRow label="پلن" value={planName(data.studio.plan, plans)} />
                    <InfoRow label="وضعیت" value={data.studio.isActive ? "فعال" : "غیرفعال"} />
                    <InfoRow label="مالک" value={data.studio.ownerName ?? "—"} />
                    <InfoRow label="تلفن مالک" value={data.studio.ownerPhone ?? "—"} dir="ltr" />
                    <InfoRow label="شهر" value={data.studio.city ?? "—"} />
                    <InfoRow label="تلفن استودیو" value={data.studio.studioPhone ?? "—"} dir="ltr" />
                    <InfoRow label="حداکثر کارمندان" value={toPersianDigits(data.studio.maxEmployees)} />
                    <InfoRow label="انقضای اشتراک" value={data.studio.subscriptionEnd ? formatJalaliDate(new Date(data.studio.subscriptionEnd)) : "—"} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Kavenegar info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4 text-amber-500" /> وضعیت Kavenegar (SMS)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoRow label="وضعیت" value={
                    data.studio.kavenegarStatus === "active" ? "✅ فعال" :
                    data.studio.kavenegarStatus === "pending" ? "⏳ در انتظار" :
                    data.studio.kavenegarStatus === "suspended" ? "⛔ تعلیق شده" :
                    "❌ غیرفعال"
                  } />
                  <InfoRow label="موجودی SMS" value={formatRial(data.studio.smsCreditRial)} />
                  <InfoRow label="API Key (child)" value={data.studio.kavenegarApikey ? `${data.studio.kavenegarApikey.slice(0, 8)}...` : "—"} dir="ltr" />
                  <InfoRow label="شماره فرستنده" value={data.studio.kavenegarSender ?? "—"} dir="ltr" />
                </div>
              </CardContent>
            </Card>

            {/* Memberships */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-emerald-500" /> کارمندان ({toPersianDigits(data.memberships.length)})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-48">
                  <div className="space-y-1.5">
                    {data.memberships.map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-lg border bg-card/50 p-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-500 text-[10px] font-bold text-white">
                            {m.userName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium">{m.userName}</div>
                            <div className="text-muted-foreground" dir="ltr">{m.userPhone}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{m.role}</Badge>
                          {!m.isActive && <Badge variant="destructive">غیرفعال</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>

      {chargeOpen && data && (
        <ChargeSmsDialog studioId={studioId} studioName={data.studio.name} currentCredit={data.studio.smsCreditRial}
          onClose={() => setChargeOpen(false)}
          onCharged={() => {
            setChargeOpen(false)
            qc.invalidateQueries({ queryKey: ["super-admin-studio", studioId] })
            qc.invalidateQueries({ queryKey: ["super-admin-overview"] })
          }} />
      )}

      {planOpen && data && (
        <ChangePlanDialog studioId={studioId} studioName={data.studio.name} currentPlan={data.studio.plan} plans={plans}
          onClose={() => setPlanOpen(false)}
          onChanged={() => {
            setPlanOpen(false)
            qc.invalidateQueries({ queryKey: ["super-admin-studio", studioId] })
            qc.invalidateQueries({ queryKey: ["super-admin-overview"] })
          }} />
      )}
    </Dialog>
  )
}

function InfoRow({ label, value, dir }: { label: string; value: string; dir?: "ltr" | "rtl" }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-medium" dir={dir}>{value}</div>
    </div>
  )
}

// ============== Edit Studio Form ==============
function EditStudioForm({ studio, onSaved }: { studio: Studio & { studioPhone?: string | null; address?: string | null; notes?: string | null; ownerName?: string | null; ownerPhone?: string | null; city?: string | null; kavenegarApikey?: string | null; kavenegarSender?: string | null; maxEmployees?: number }; onSaved: () => void }) {
  const api = useApi()
  const [form, setForm] = React.useState({
    name: studio.name,
    nameEn: studio.nameEn ?? "",
    ownerName: studio.ownerName ?? "",
    ownerPhone: studio.ownerPhone ?? "",
    city: studio.city ?? "",
    studioPhone: studio.studioPhone ?? "",
    address: studio.address ?? "",
    notes: studio.notes ?? "",
    kavenegarApikey: studio.kavenegarApikey ?? "",
    kavenegarSender: studio.kavenegarSender ?? "",
    maxEmployees: studio.maxEmployees,
  })
  const [saving, setSaving] = React.useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.patch(`/api/super-admin/studios/${studio.id}`, form)
      toast.success("اطلاعات استودیو آپدیت شد")
      onSaved()
    } catch {
      toast.error("خطا در ذخیره")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">نام</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">نام انگلیسی</Label>
          <Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} dir="ltr" />
        </div>
        <div>
          <Label className="text-xs">نام مالک</Label>
          <Input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">تلفن مالک</Label>
          <Input value={form.ownerPhone} onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })} dir="ltr" />
        </div>
        <div>
          <Label className="text-xs">شهر</Label>
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">تلفن استودیو</Label>
          <Input value={form.studioPhone} onChange={(e) => setForm({ ...form, studioPhone: e.target.value })} dir="ltr" />
        </div>
        <div>
          <Label className="text-xs">حداکثر کارمندان</Label>
          <Input type="number" value={form.maxEmployees} onChange={(e) => setForm({ ...form, maxEmployees: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">شماره فرستنده Kavenegar</Label>
          <Input value={form.kavenegarSender} onChange={(e) => setForm({ ...form, kavenegarSender: e.target.value })} dir="ltr" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Kavenegar API Key (child)</Label>
        <Input value={form.kavenegarApikey} onChange={(e) => setForm({ ...form, kavenegarApikey: e.target.value })} dir="ltr" />
      </div>
      <div>
        <Label className="text-xs">نشانی</Label>
        <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} />
      </div>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
      </Button>
    </div>
  )
}

// ============== Charge SMS Dialog ==============
function ChargeSmsDialog({ studioId, studioName, currentCredit, onClose, onCharged }: {
  studioId: string; studioName: string; currentCredit: number;
  onClose: () => void; onCharged: () => void
}) {
  const api = useApi()
  const [amount, setAmount] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const handleCharge = async (isPositive: boolean) => {
    const amt = Number(amount) * (isPositive ? 1 : -1)
    if (!amt) return
    setSaving(true)
    try {
      await api.post(`/api/super-admin/studios/${studioId}/charge-sms`, { amountRial: amt, description: description || undefined })
      toast.success(`${isPositive ? "افزایش" : "کاهش"} شارژ SMS انجام شد`)
      onCharged()
    } catch {
      toast.error("خطا در شارژ")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
              <Wallet className="h-4 w-4" />
            </div>
            شارژ SMS — {studioName}
          </DialogTitle>
          <DialogDescription>موجودی فعلی: {formatRial(currentCredit)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>مبلغ (ریال)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="مثلاً 50000" dir="ltr" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[10000, 50000, 100000, 500000].map((v) => (
                <Button key={v} size="sm" variant="outline" onClick={() => setAmount(String(v))} className="text-xs">
                  {toPersianDigits(v.toLocaleString("en-US"))}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label>توضیحات (اختیاری)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="مثلاً شارژ ماهانه" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleCharge(false)} disabled={saving || !amount} className="gap-1.5">
            <ArrowDownRight className="h-4 w-4 text-rose-500" /> کاهش شارژ
          </Button>
          <Button onClick={() => handleCharge(true)} disabled={saving || !amount} className="gap-1.5">
            <ArrowUpRight className="h-4 w-4 text-emerald-500" /> افزایش شارژ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============== Change Plan Dialog ==============
function ChangePlanDialog({ studioId, studioName, currentPlan, plans, onClose, onChanged }: {
  studioId: string; studioName: string; currentPlan: string; plans: Plan[];
  onClose: () => void; onChanged: () => void
}) {
  const api = useApi()
  const [plan, setPlan] = React.useState(currentPlan)
  const [durationDays, setDurationDays] = React.useState(30)
  const [note, setNote] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const handleChange = async () => {
    setSaving(true)
    try {
      await api.post(`/api/super-admin/studios/${studioId}/subscription`, { plan, durationDays, note: note || undefined })
      toast.success("اشتراک تغییر کرد")
      onChanged()
    } catch {
      toast.error("خطا در تغییر اشتراک")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              <Crown className="h-4 w-4" />
            </div>
            تغییر اشتراک — {studioName}
          </DialogTitle>
          <DialogDescription>اشتراک فعلی: {planName(currentPlan, plans)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>پلن جدید</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {p.maxEmployees > 0 ? `تا ${toPersianDigits(p.maxEmployees)} کارمند` : "نامحدود"}
                    {p.monthlyPriceToman > 0 && ` — ${formatToman(p.monthlyPriceToman)}/ماه`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>مدت (روز)</Label>
            <Input type="number" value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value))} />
          </div>
          <div>
            <Label>یادداشت (اختیاری)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleChange} disabled={saving || plan === currentPlan}>
            {saving ? "در حال تغییر..." : "تغییر اشتراک"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============== SMS Tab ==============
function SmsTab() {
  const api = useApi()
  const apiRef = React.useRef(api)
  apiRef.current = api

  interface SmsLog {
    id: string; studioId: string; studioName: string; studioDbName: string;
    type: string; amountRial: number; receptor?: string | null;
    messageSnippet?: string | null; description?: string | null;
    kavenegarMessageId?: string | null; status: string; createdAt: string;
  }

  const { data, isLoading } = useQuery<{ transactions: SmsLog[]; stats: { total: number; totalChargedRial: number; totalSentRial: number; sent: number; delivered: number; failed: number } }>({
    queryKey: ["super-admin-sms-logs"],
    queryFn: () => apiRef.current.get("/api/super-admin/sms-logs?limit=200"),
    staleTime: 30 * 1000,
  })

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    )
  }

  const deliveryRate = Math.round((data.stats.delivered / Math.max(data.stats.sent, 1)) * 100)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="کل تراکنش‌ها" value={toPersianDigits(data.stats.total)} icon={Activity} gradient="from-sky-500 to-blue-600" delay={0} />
        <StatCard title="کل شارژ شده" value={formatRialShort(data.stats.totalChargedRial)} icon={Plus} gradient="from-emerald-500 to-teal-600" delay={0.1} />
        <StatCard title="کل مصرف شده" value={formatRialShort(data.stats.totalSentRial)} icon={Send} gradient="from-amber-500 to-orange-600" delay={0.2} />
        <StatCard title="نرخ تحویل" value={`${toPersianDigits(deliveryRate)}٪`} icon={CheckCircle2} gradient="from-violet-500 to-purple-600" delay={0.3} />
      </div>

      {/* Transaction log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
              <MessageSquare className="h-4 w-4" />
            </div>
            آخرین تراکنش‌های SMS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-1.5">
              {data.transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <MessageSquare className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">هنوز تراکنشی ثبت نشده.</p>
                </div>
              ) : (
                data.transactions.map((tx, i) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.5) }}
                    className="flex items-start justify-between rounded-xl border bg-card/50 p-3 text-xs hover:bg-accent/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={
                          tx.type === "charge" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" :
                          tx.type === "send" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border-amber-200 dark:border-amber-800" :
                          tx.type === "refund" ? "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300 border-sky-200 dark:border-sky-800" :
                          "bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                        }>
                          {tx.type === "charge" ? "شارژ" : tx.type === "send" ? "ارسال" : tx.type === "refund" ? "بازگشت" : "تنظیم"}
                        </Badge>
                        <span className="font-medium">{tx.studioName}</span>
                      </div>
                      {tx.receptor && <div className="mt-1 text-muted-foreground" dir="ltr">گیرنده: {tx.receptor}</div>}
                      {tx.messageSnippet && <div className="mt-0.5 text-muted-foreground">پیام: {tx.messageSnippet}...</div>}
                      {tx.description && <div className="mt-0.5 text-muted-foreground">{tx.description}</div>}
                    </div>
                    <div className="shrink-0 text-left">
                      <div className={`font-bold ${tx.amountRial >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {tx.amountRial >= 0 ? "+" : ""}{formatRialShort(tx.amountRial)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{formatJalaliDate(new Date(tx.createdAt))}</div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

// ============== Plans Tab ==============
function PlansTab() {
  const api = useApi()
  const apiRef = React.useRef(api)
  apiRef.current = api

  const { data } = useQuery<OverviewData>({
    queryKey: ["super-admin-overview"],
    queryFn: () => apiRef.current.get<OverviewData>("/api/super-admin/overview"),
    staleTime: 60 * 1000,
  })

  if (!data) return <Skeleton className="h-96 rounded-2xl" />

  const planCounts: Record<string, number> = {
    trial: data.totals.trialStudios,
    basic: data.totals.basicStudios,
    pro: data.totals.proStudios,
    enterprise: data.totals.enterpriseStudios,
    suspended: data.totals.suspendedStudios,
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              <Crown className="h-4 w-4" />
            </div>
            پلن‌های اشتراک
          </CardTitle>
          <CardDescription>تعریف پلن‌ها و قیمت‌گذاری — قابل تنظیم در تب «تنظیمات»</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.plans.filter((p) => p.id !== "suspended").map((plan, i) => (
              <PlanCard key={plan.id} plan={plan} activeCount={planCounts[plan.id] || 0} delay={i * 0.1} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PlanCard({ plan, activeCount, delay }: { plan: Plan; activeCount: number; delay: number }) {
  const gradient = planColor(plan.id)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="group relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1">
        {/* Gradient header */}
        <div className={`relative h-24 bg-gradient-to-br ${gradient} p-4`}>
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/20 blur-xl" />
          </div>
          <div className="relative flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-white/80">{plan.nameEn}</div>
              <div className="text-xl font-bold text-white">{plan.name}</div>
            </div>
            <Crown className="h-8 w-8 text-white/80" />
          </div>
        </div>

        <CardContent className="p-5">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">
              {plan.monthlyPriceToman > 0 ? toPersianDigits(plan.monthlyPriceToman.toLocaleString("en-US")) : "رایگان"}
            </span>
            {plan.monthlyPriceToman > 0 && <span className="text-xs text-muted-foreground">تومان / ماه</span>}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" /> حداکثر کارمندان
              </span>
              <span className="font-bold">{plan.maxEmployees > 0 ? toPersianDigits(plan.maxEmployees) : "نامحدود"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" /> مدت اشتراک
              </span>
              <span className="font-bold">{toPersianDigits(plan.durationDays)} روز</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-4 w-4" /> استودیوهای فعال
              </span>
              <span className="font-bold text-sky-600 dark:text-sky-400">{toPersianDigits(activeCount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ============== Settings Tab ==============
function SettingsTab() {
  const api = useApi()
  const apiRef = React.useRef(api)
  apiRef.current = api
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<{ settings: Record<string, string> }>({
    queryKey: ["super-admin-platform-settings"],
    queryFn: () => apiRef.current.get("/api/super-admin/platform-settings"),
  })

  const [form, setForm] = React.useState<Record<string, string>>({})
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (data?.settings) setForm(data.settings)
  }, [data])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put("/api/super-admin/platform-settings", { settings: form })
      toast.success("تنظیمات ذخیره شد")
      qc.invalidateQueries({ queryKey: ["super-admin-platform-settings"] })
    } catch {
      toast.error("خطا در ذخیره")
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />

  const update = (k: string, v: string) => setForm({ ...form, [k]: v })

  return (
    <div className="space-y-6">
      {/* Kavenegar Settings */}
      <Card className="overflow-hidden border-2 border-amber-200/50 dark:border-amber-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
              <Zap className="h-4 w-4" />
            </div>
            تنظیمات Kavenegar (حساب اصلی)
          </CardTitle>
          <CardDescription>
            این API Key حساب اصلی شما در کاوه‌نگار است. با این کلید می‌توانید برای هر استودیوی فرزند بسازید.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Master API Key (کلید والد)</Label>
            <Input value={form["kavenegar.master_apikey"] || ""} onChange={(e) => update("kavenegar.master_apikey", e.target.value)} dir="ltr" placeholder="کلید API حساب اصلی کاوه‌نگار" type="password" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">شماره فرستنده پیش‌فرض</Label>
              <Input value={form["kavenegar.default_sender"] || ""} onChange={(e) => update("kavenegar.default_sender", e.target.value)} dir="ltr" placeholder="مثلاً 1000596446" />
            </div>
            <div>
              <Label className="text-xs">نام قالب OTP</Label>
              <Input value={form["kavenegar.otp_template"] || ""} onChange={(e) => update("kavenegar.otp_template", e.target.value)} dir="ltr" placeholder="مثلاً nasim-otp" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border bg-card/50 p-4">
            <div>
              <div className="text-sm font-medium">حساب reseller فعال است؟</div>
              <div className="text-xs text-muted-foreground">
                اگر حساب شما در کاوه‌نگار به‌عنوان reseller فعال شده، این گزینه را روشن کنید.
              </div>
            </div>
            <Switch checked={form["kavenegar.reseller_enabled"] === "true"} onCheckedChange={(v) => update("kavenegar.reseller_enabled", v ? "true" : "false")} />
          </div>
        </CardContent>
      </Card>

      {/* Pricing Settings */}
      <Card className="overflow-hidden border-2 border-violet-200/50 dark:border-violet-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              <DollarSign className="h-4 w-4" />
            </div>
            قیمت‌گذاری پلن‌ها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <PlanSettingInput label="پایه — حداکثر کارمندان" value={form["subscription.basic_max_employees"]} onChange={(v) => update("subscription.basic_max_employees", v)} />
            <PlanSettingInput label="پایه — قیمت ماهانه (تومان)" value={form["subscription.basic_monthly_price_toman"]} onChange={(v) => update("subscription.basic_monthly_price_toman", v)} dir="ltr" />
            <PlanSettingInput label="حرفه‌ای — حداکثر کارمندان" value={form["subscription.pro_max_employees"]} onChange={(v) => update("subscription.pro_max_employees", v)} />
            <PlanSettingInput label="حرفه‌ای — قیمت ماهانه (تومان)" value={form["subscription.pro_monthly_price_toman"]} onChange={(v) => update("subscription.pro_monthly_price_toman", v)} dir="ltr" />
            <PlanSettingInput label="سازمانی — حداکثر کارمندان" value={form["subscription.enterprise_max_employees"]} onChange={(v) => update("subscription.enterprise_max_employees", v)} />
            <PlanSettingInput label="سازمانی — قیمت ماهانه (تومان)" value={form["subscription.enterprise_monthly_price_toman"]} onChange={(v) => update("subscription.enterprise_monthly_price_toman", v)} dir="ltr" />
            <PlanSettingInput label="مدت دوره تستی (روز)" value={form["subscription.trial_days"]} onChange={(v) => update("subscription.trial_days", v)} dir="ltr" />
            <PlanSettingInput label="هزینه هر پیامک (ریال)" value={form["sms.cost_per_message_rial"]} onChange={(v) => update("sms.cost_per_message_rial", v)} dir="ltr" />
          </div>
        </CardContent>
      </Card>

      {/* Platform Info */}
      <Card className="overflow-hidden border-2 border-sky-200/50 dark:border-sky-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white">
              <Server className="h-4 w-4" />
            </div>
            اطلاعات پلتفرم
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <PlanSettingInput label="نام پلتفرم" value={form["platform.name"]} onChange={(v) => update("platform.name", v)} />
            <PlanSettingInput label="نام مدیر پلتفرم" value={form["platform.owner_name"]} onChange={(v) => update("platform.owner_name", v)} />
            <PlanSettingInput label="تلفن پشتیبانی" value={form["platform.support_phone"]} onChange={(v) => update("platform.support_phone", v)} dir="ltr" />
            <PlanSettingInput label="پلن پیش‌فرض" value={form["subscription.default_plan"]} onChange={(v) => update("subscription.default_plan", v)} dir="ltr" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" /> در حال ذخیره...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" /> ذخیره تنظیمات
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

function PlanSettingInput({ label, value, onChange, dir }: { label: string; value?: string; onChange: (v: string) => void; dir?: "ltr" | "rtl" }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={value || ""} onChange={(e) => onChange(e.target.value)} dir={dir} className="mt-1" />
    </div>
  )
}

// ============== Logs Tab ==============
function LogsTab() {
  const api = useApi()
  const apiRef = React.useRef(api)
  apiRef.current = api

  const { data, isLoading } = useQuery({
    queryKey: ["super-admin-logs"],
    queryFn: () => apiRef.current.get<any>("/api/super-admin/logs"),
    staleTime: 30 * 1000,
  })

  if (isLoading || !data) {
    return <Skeleton className="h-96 rounded-2xl" />
  }

  const { totals, studios, recentSessions, recentSmsTx, recentSubEvents } = data

  return (
    <div className="space-y-6">
      {/* آمار کلی پلتفرم */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500 to-gray-600 text-white">
              <Activity className="h-4 w-4" />
            </div>
            آمار جامع پلتفرم
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <LogStat label="استودیوها" value={toPersianDigits(totals.studios)} sub={`${toPersianDigits(totals.activeStudios)} فعال`} icon={Building2} color="text-sky-500" />
            <LogStat label="پروژه‌ها" value={toPersianDigits(totals.totalProjects)} icon={FolderKanban} color="text-violet-500" />
            <LogStat label="مشتریان" value={toPersianDigits(totals.totalCustomers)} icon={Users} color="text-emerald-500" />
            <LogStat label="کارمندان" value={toPersianDigits(totals.totalEmployees)} icon={UserCheck} color="text-amber-500" />
            <LogStat label="جمع پرداخت‌ها" value={formatRialShort(totals.totalPaymentsRials)} sub="ریال" icon={Wallet} color="text-rose-500" />
            <LogStat label="یادداشت‌ها" value={toPersianDigits(totals.totalNotes)} icon={FileText} color="text-sky-500" />
            <LogStat label="تسک‌ها" value={toPersianDigits(totals.totalTasks)} icon={CheckCircle2} color="text-emerald-500" />
            <LogStat label="تراکنش‌های اعتبار" value={toPersianDigits(totals.totalCreditTxs)} icon={TrendingUp} color="text-violet-500" />
            <LogStat label="تراکنش‌های SMS" value={toPersianDigits(totals.totalSmsTx)} icon={MessageSquare} color="text-amber-500" />
            <LogStat label="نشست‌های اخیر" value={toPersianDigits(totals.totalSessions)} icon={Radio} color="text-slate-500" />
          </div>
        </CardContent>
      </Card>

      {/* اطلاعات کامل استودیوها */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white">
              <Building2 className="h-4 w-4" />
            </div>
            اطلاعات کامل استودیوها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-right text-muted-foreground">
                  <th className="py-2 pl-2 font-medium">استودیو</th>
                  <th className="py-2 font-medium">پلن</th>
                  <th className="py-2 font-medium">مالک</th>
                  <th className="py-2 font-medium">پروژه</th>
                  <th className="py-2 font-medium">مشتری</th>
                  <th className="py-2 font-medium">کارمند</th>
                  <th className="py-2 font-medium">پرداخت‌ها</th>
                  <th className="py-2 font-medium">SMS</th>
                  <th className="py-2 font-medium">فضا</th>
                  <th className="py-2 font-medium">اشتراک</th>
                  <th className="py-2 font-medium">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {studios.map((s: any) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 pl-2">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-[9px] text-muted-foreground" dir="ltr">{s.nameEn || "—"}</div>
                    </td>
                    <td className="py-2">
                      <Badge className={planColor(s.plan)} variant="outline">{s.plan}</Badge>
                    </td>
                    <td className="py-2">
                      <div className="text-[10px]">{s.ownerName || "—"}</div>
                      <div className="text-[9px] text-muted-foreground" dir="ltr">{s.ownerPhone || "—"}</div>
                    </td>
                    <td className="py-2 text-center font-bold">{toPersianDigits(s.stats.projects)}</td>
                    <td className="py-2 text-center font-bold">{toPersianDigits(s.stats.customers)}</td>
                    <td className="py-2 text-center font-bold">{toPersianDigits(s.stats.employees)}</td>
                    <td className="py-2 text-center text-[10px]">{formatRialShort(s.stats.paymentTotalRials)}</td>
                    <td className="py-2 text-center text-[10px]">{toPersianDigits(s.smsCreditRial)} ر</td>
                    <td className="py-2 text-center text-[10px]">{formatBytes(s.storageUsedBytes)}</td>
                    <td className="py-2 text-center text-[10px]">
                      {s.subscriptionEnd ? `${toPersianDigits(daysLeft(s.subscriptionEnd))} روز` : "—"}
                    </td>
                    <td className="py-2 text-center">
                      <Badge variant={s.isActive ? "default" : "destructive"} className="text-[9px]">
                        {s.isActive ? "فعال" : "غیرفعال"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* نشست‌های اخیر */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <Radio className="h-4 w-4" />
            </div>
            نشست‌های اخیر (ورود به سیستم)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-80">
            <div className="space-y-1.5">
              {recentSessions.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">نشستی ثبت نشده.</p>
              ) : (
                recentSessions.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border bg-card/50 p-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-500 text-[9px] font-bold text-white">
                        {s.userName?.charAt(0) || "?"}
                      </div>
                      <div>
                        <div className="font-medium">{s.userName}</div>
                        <div className="text-[9px] text-muted-foreground" dir="ltr">{s.userPhone}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.role && <Badge variant="outline" className="text-[9px]">{s.role}</Badge>}
                      <span className="text-[9px] text-muted-foreground">{formatJalaliDate(new Date(s.createdAt))}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* رویدادهای اشتراک */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              <Crown className="h-4 w-4" />
            </div>
            رویدادهای اشتراک
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-60">
            <div className="space-y-1.5">
              {recentSubEvents.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">رویدادی ثبت نشده.</p>
              ) : (
                recentSubEvents.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between rounded-lg border bg-card/50 p-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px]">{e.eventType}</Badge>
                      <span className="font-medium">{e.studioName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground">{e.fromPlan || "—"} → {e.toPlan}</span>
                      <span className="text-[9px] text-muted-foreground">{formatJalaliDate(new Date(e.createdAt))}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* تراکنش‌های SMS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
              <MessageSquare className="h-4 w-4" />
            </div>
            تراکنش‌های SMS اخیر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-60">
            <div className="space-y-1.5">
              {recentSmsTx.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">تراکنشی ثبت نشده.</p>
              ) : (
                recentSmsTx.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border bg-card/50 p-2.5 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px]">{t.type}</Badge>
                        <span className="font-medium">{t.studioName}</span>
                      </div>
                      {t.receptor && <div className="mt-0.5 text-[9px] text-muted-foreground" dir="ltr">{t.receptor}</div>}
                    </div>
                    <div className="shrink-0 text-left">
                      <div className={`font-bold ${t.amountRial >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {t.amountRial >= 0 ? "+" : ""}{formatRialShort(t.amountRial)}
                      </div>
                      <div className="text-[9px] text-muted-foreground">{formatJalaliDate(new Date(t.createdAt))}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

function LogStat({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      {sub && <div className="text-[9px] text-muted-foreground">{sub}</div>}
    </div>
  )
}
