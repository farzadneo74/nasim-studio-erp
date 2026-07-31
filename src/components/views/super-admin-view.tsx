"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
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
} from "lucide-react"
import { formatJalaliDate } from "@/lib/jalali"
import { toPersianDigits, formatToman } from "@/lib/format"

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

function planColor(plan: string): string {
  switch (plan) {
    case "trial": return "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300"
    case "basic": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
    case "pro": return "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300"
    case "enterprise": return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
    case "suspended": return "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300"
    default: return "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300"
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
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <Card className="mx-auto max-w-md mt-20 border-rose-200 dark:border-rose-900">
        <CardHeader className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-rose-500" />
          <CardTitle className="mt-2">دسترسی محدود</CardTitle>
          <CardDescription>
            این صفحه فقط برای مدیر پلتفرم (super-admin) قابل دسترسی است.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-sm">
          <Crown className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">پنل مدیریت پلتفرم</h1>
          <p className="text-sm text-muted-foreground">
            مدیریت کامل استودیوها، اشتراک‌ها، شارژ SMS و تنظیمات پلتفرم
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto">
          <TabsTrigger value="overview" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" /> نمای کلی
          </TabsTrigger>
          <TabsTrigger value="studios" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> استودیوها
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> پیامک
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-1.5">
            <DollarSign className="h-3.5 w-3.5" /> پلن‌ها
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" /> تنظیمات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="studios" className="mt-4">
          <StudiosTab />
        </TabsContent>
        <TabsContent value="sms" className="mt-4">
          <SmsTab />
        </TabsContent>
        <TabsContent value="plans" className="mt-4">
          <PlansTab />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <SettingsTab />
        </TabsContent>
      </Tabs>
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
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    )
  }

  const { totals, nearLimitStudios, expiringSoon, expired, plans } = data

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="کل استودیوها"
          value={toPersianDigits(totals.studios)}
          subtitle={`${toPersianDigits(totals.activeStudios)} فعال`}
          icon={Building2}
          color="from-sky-500 to-blue-500"
        />
        <StatCard
          title="کل کارمندان"
          value={toPersianDigits(totals.totalEmployees)}
          subtitle="در همه استودیوها"
          icon={Users}
          color="from-emerald-500 to-teal-500"
        />
        <StatCard
          title="کل پروژه‌ها"
          value={toPersianDigits(totals.totalProjects)}
          subtitle={`${toPersianDigits(totals.totalCustomers)} مشتری`}
          icon={TrendingUp}
          color="from-violet-500 to-purple-500"
        />
        <StatCard
          title="موجودی SMS کل"
          value={formatRial(totals.totalSmsCreditRial)}
          subtitle="بین همه استودیوها"
          icon={MessageSquare}
          color="from-amber-500 to-orange-500"
        />
      </div>

      {/* Plan distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-4 w-4" /> توزیع پلن‌ها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <PlanStat label="تستی" count={totals.trialStudios} color="bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300" />
            <PlanStat label="پایه" count={totals.basicStudios} color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" />
            <PlanStat label="حرفه‌ای" count={totals.proStudios} color="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300" />
            <PlanStat label="سازمانی" count={totals.enterpriseStudios} color="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" />
            <PlanStat label="معلق" count={totals.suspendedStudios} color="bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300" />
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Near limit */}
        <Card className={nearLimitStudios.length > 0 ? "border-amber-300 dark:border-amber-800" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> نزدیک محدودیت کارمند
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {nearLimitStudios.length === 0 ? (
              <p className="text-xs text-muted-foreground">هیچ استودیویی نزدیک محدودیت نیست.</p>
            ) : (
              nearLimitStudios.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span className="font-medium">{s.name}</span>
                  <Badge variant="outline" className="text-amber-600">
                    {toPersianDigits(s.employees)}/{toPersianDigits(s.maxEmployees)} کارمند
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Expiring soon */}
        <Card className={expiringSoon.length > 0 ? "border-orange-300 dark:border-orange-800" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-orange-500" /> اشتراک در حال اتمام
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expiringSoon.length === 0 ? (
              <p className="text-xs text-muted-foreground">هیچ اشتراکی در حال اتمام نیست.</p>
            ) : (
              expiringSoon.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span className="font-medium">{s.name}</span>
                  <Badge variant="outline" className="text-orange-600">
                    {toPersianDigits(daysLeft(s.subscriptionEnd))} روز
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Expired */}
        <Card className={expired.length > 0 ? "border-rose-300 dark:border-rose-800" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Ban className="h-4 w-4 text-rose-500" /> اشتراک منقضی شده
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expired.length === 0 ? (
              <p className="text-xs text-muted-foreground">هیچ اشتراکی منقضی نشده.</p>
            ) : (
              expired.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span className="font-medium">{s.name}</span>
                  <Badge variant="outline" className="text-rose-600">منقضی</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Storage summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" /> فضای ذخیره‌سازی
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <span>مجموع فضای مصرف شده</span>
            <span className="font-bold">{formatBytes(totals.totalStorageUsedBytes)}</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-gradient-to-l from-sky-500 to-emerald-500" style={{ width: "30%" }} />
          </div>
        </CardContent>
      </Card>

      {/* Refresh */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="ml-1.5 h-3.5 w-3.5" /> به‌روزرسانی
        </Button>
      </div>
    </div>
  )
}

function StatCard({
  title, value, subtitle, icon: Icon, color,
}: { title: string; value: string; subtitle?: string; icon: React.ElementType; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">{title}</div>
            <div className="mt-1 text-xl font-bold truncate">{value}</div>
            {subtitle && <div className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</div>}
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${color} text-white shadow-sm`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PlanStat({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`rounded-lg p-3 text-center ${color}`}>
      <div className="text-2xl font-bold">{toPersianDigits(count)}</div>
      <div className="text-xs">{label}</div>
    </div>
  )
}

// ============== Studios Tab ==============
function StudiosTab() {
  const api = useApi()
  const apiRef = React.useRef(api)
  apiRef.current = api
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ["super-admin-overview"],
    queryFn: () => apiRef.current.get<OverviewData>("/api/super-admin/overview"),
    staleTime: 30 * 1000,
  })

  const [selectedStudio, setSelectedStudio] = React.useState<string | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)

  if (isLoading || !data) {
    return <Skeleton className="h-96 rounded-lg" />
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="ml-1.5 h-4 w-4" /> استودیوی جدید
        </Button>
      </div>

      <div className="grid gap-3">
        {data.studios.map((studio) => (
          <StudioCard
            key={studio.id}
            studio={studio}
            plans={data.plans}
            onOpen={() => setSelectedStudio(studio.id)}
          />
        ))}
      </div>

      {selectedStudio && (
        <StudioDetailDialog
          studioId={selectedStudio}
          plans={data.plans}
          onClose={() => setSelectedStudio(null)}
        />
      )}

      {createOpen && (
        <CreateStudioDialog
          plans={data.plans}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            qc.invalidateQueries({ queryKey: ["super-admin-overview"] })
            toast.success("استودیوی جدید ساخته شد")
          }}
        />
      )}
    </div>
  )
}

function StudioCard({ studio, plans, onOpen }: { studio: Studio; plans: Plan[]; onOpen: () => void }) {
  const days = daysLeft(studio.subscriptionEnd)
  const storagePct = studio.storageQuotaBytes > 0
    ? Math.min(100, (studio.storageUsedBytes / studio.storageQuotaBytes) * 100)
    : 0

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-violet-500 text-white shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold">{studio.name}</h3>
                <Badge className={planColor(studio.plan)} variant="secondary">
                  {planName(studio.plan, plans)}
                </Badge>
                {!studio.isActive && (
                  <Badge variant="destructive">غیرفعال</Badge>
                )}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground" dir="ltr">
                {studio.nameEn || "—"}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {studio.ownerName && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {studio.ownerName}</span>}
                {studio.ownerPhone && <span className="flex items-center gap-1" dir="ltr"><Phone className="h-3 w-3" /> {studio.ownerPhone}</span>}
                {studio.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {studio.city}</span>}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onOpen}>
            مدیریت
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="کارمندان" value={`${toPersianDigits(studio.employees)}/${studio.maxEmployees > 0 ? toPersianDigits(studio.maxEmployees) : "∞"}`}
            warn={studio.maxEmployees > 0 && studio.employees >= studio.maxEmployees}
          />
          <MiniStat label="پروژه‌ها" value={toPersianDigits(studio.projects)} />
          <MiniStat label="مشتریان" value={toPersianDigits(studio.customers)} />
          <MiniStat label="شارژ SMS" value={formatRial(studio.smsCreditRial)} />
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">فضای ذخیره‌سازی</span>
            <span className="font-medium">
              {formatBytes(studio.storageUsedBytes)} / {formatBytes(studio.storageQuotaBytes)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full ${storagePct > 90 ? "bg-rose-500" : storagePct > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${storagePct}%` }}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {studio.subscriptionEnd && (
            <Badge variant="outline" className={days < 0 ? "text-rose-600" : days <= 7 ? "text-orange-600" : ""}>
              <Clock className="ml-1 h-3 w-3" />
              {days < 0 ? "منقضی شده" : `${toPersianDigits(days)} روز مانده`}
            </Badge>
          )}
          <Badge variant="outline">
            <MessageSquare className="ml-1 h-3 w-3" />
            Kavenegar: {studio.kavenegarStatus === "active" ? "فعال" : studio.kavenegarStatus === "pending" ? "در انتظار" : "غیرفعال"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

function MiniStat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-md border p-2 text-center ${warn ? "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/20" : ""}`}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-sm font-bold ${warn ? "text-rose-600" : ""}`}>{value}</div>
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
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
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
              <Button size="sm" variant="outline" onClick={() => setEditMode(!editMode)}>
                <Settings className="ml-1.5 h-3.5 w-3.5" /> {editMode ? "انصراف" : "ویرایش اطلاعات"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setChargeOpen(true)}>
                <Wallet className="ml-1.5 h-3.5 w-3.5" /> شارژ SMS
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPlanOpen(true)}>
                <Crown className="ml-1.5 h-3.5 w-3.5" /> تغییر اشتراک
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

            {/* Kavenegar SMS info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4" /> وضعیت Kavenegar (SMS)
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
                  <Users className="h-4 w-4" /> کارمندان ({toPersianDigits(data.memberships.length)})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-48">
                  <div className="space-y-1">
                    {data.memberships.map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-md border p-2 text-xs">
                        <div>
                          <div className="font-medium">{m.userName}</div>
                          <div className="text-muted-foreground" dir="ltr">{m.userPhone}</div>
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
        <ChargeSmsDialog
          studioId={studioId}
          studioName={data.studio.name}
          currentCredit={data.studio.smsCreditRial}
          onClose={() => setChargeOpen(false)}
          onCharged={() => {
            setChargeOpen(false)
            qc.invalidateQueries({ queryKey: ["super-admin-studio", studioId] })
            qc.invalidateQueries({ queryKey: ["super-admin-overview"] })
          }}
        />
      )}

      {planOpen && data && (
        <ChangePlanDialog
          studioId={studioId}
          studioName={data.studio.name}
          currentPlan={data.studio.plan}
          plans={plans}
          onClose={() => setPlanOpen(false)}
          onChanged={() => {
            setPlanOpen(false)
            qc.invalidateQueries({ queryKey: ["super-admin-studio", studioId] })
            qc.invalidateQueries({ queryKey: ["super-admin-overview"] })
          }}
        />
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
    } catch (e) {
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
      <div>
        <Label className="text-xs">یادداشت</Label>
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
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
      await api.post(`/api/super-admin/studios/${studioId}/charge-sms`, {
        amountRial: amt,
        description: description || undefined,
      })
      toast.success(`${isPositive ? "افزایش" : "کاهش"} شارژ SMS انجام شد`)
      onCharged()
    } catch (e) {
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
            <Wallet className="h-5 w-5" /> شارژ SMS — {studioName}
          </DialogTitle>
          <DialogDescription>
            موجودی فعلی: {formatRial(currentCredit)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>مبلغ (ریال)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="مثلاً 50000"
              dir="ltr"
            />
            <div className="mt-1 flex flex-wrap gap-1">
              {[10000, 50000, 100000, 500000].map((v) => (
                <Button key={v} size="sm" variant="outline" onClick={() => setAmount(String(v))}>
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
          <Button variant="outline" onClick={() => handleCharge(false)} disabled={saving || !amount}>
            <Ban className="ml-1.5 h-4 w-4" /> کاهش شارژ
          </Button>
          <Button onClick={() => handleCharge(true)} disabled={saving || !amount}>
            <Plus className="ml-1.5 h-4 w-4" /> افزایش شارژ
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
      await api.post(`/api/super-admin/studios/${studioId}/subscription`, {
        plan, durationDays, note: note || undefined,
      })
      toast.success("اشتراک تغییر کرد")
      onChanged()
    } catch (e) {
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
            <Crown className="h-5 w-5" /> تغییر اشتراک — {studioName}
          </DialogTitle>
          <DialogDescription>اشتراک فعلی: {planName(currentPlan, plans)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>پلن جدید</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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

// ============== Create Studio Dialog ==============
function CreateStudioDialog({ plans, onClose, onCreated }: { plans: Plan[]; onClose: () => void; onCreated: () => void }) {
  const api = useApi()
  const [form, setForm] = React.useState({
    name: "", nameEn: "", ownerName: "", ownerPhone: "", city: "",
    studioPhone: "", plan: "trial", address: "", notes: "",
  })
  const [saving, setSaving] = React.useState(false)

  const handleCreate = async () => {
    if (!form.name) {
      toast.error("نام استودیو الزامی است")
      return
    }
    setSaving(true)
    try {
      await api.post("/api/super-admin/studios", form)
      onCreated()
    } catch (e: any) {
      const msg = e?.message || "خطا در ساخت استودیو"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" /> ساخت استودیوی جدید
          </DialogTitle>
          <DialogDescription>یک استودیوی جدید به پلتفرم اضافه کنید</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">نام استودیو *</Label>
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
          <div className="col-span-2">
            <Label className="text-xs">پلن اولیه</Label>
            <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.monthlyPriceToman > 0 ? `(${formatToman(p.monthlyPriceToman)}/ماه)` : "(رایگان)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">نشانی</Label>
            <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={saving || !form.name}>
            {saving ? "در حال ساخت..." : "ساخت استودیو"}
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
    id: string
    studioId: string
    studioName: string
    studioDbName: string
    type: string
    amountRial: number
    receptor?: string | null
    messageSnippet?: string | null
    description?: string | null
    kavenegarMessageId?: string | null
    status: string
    createdAt: string
  }

  const { data, isLoading } = useQuery<{ transactions: SmsLog[]; stats: { total: number; totalChargedRial: number; totalSentRial: number; sent: number; delivered: number; failed: number } }>({
    queryKey: ["super-admin-sms-logs"],
    queryFn: () => apiRef.current.get("/api/super-admin/sms-logs?limit=200"),
    staleTime: 30 * 1000,
  })

  if (isLoading || !data) {
    return <Skeleton className="h-96 rounded-lg" />
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="کل تراکنش‌ها" value={toPersianDigits(data.stats.total)} icon={Activity} color="from-sky-500 to-blue-500" />
        <StatCard title="کل شارژ شده" value={formatRial(data.stats.totalChargedRial)} icon={Plus} color="from-emerald-500 to-teal-500" />
        <StatCard title="کل مصرف شده" value={formatRial(data.stats.totalSentRial)} icon={Send} color="from-amber-500 to-orange-500" />
        <StatCard title="نرخ تحویل" value={`${toPersianDigits(Math.round((data.stats.delivered / Math.max(data.stats.sent, 1)) * 100))}٪`} icon={CheckCircle2} color="from-violet-500 to-purple-500" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">آخرین تراکنش‌های SMS</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-1">
              {data.transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">هیچ تراکنشی ثبت نشده.</p>
              ) : (
                data.transactions.map((tx) => (
                  <div key={tx.id} className="flex items-start justify-between rounded-md border p-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={
                          tx.type === "charge" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" :
                          tx.type === "send" ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" :
                          tx.type === "refund" ? "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300" :
                          "bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        }>
                          {tx.type === "charge" ? "شارژ" : tx.type === "send" ? "ارسال" : tx.type === "refund" ? "بازگشت" : "تنظیم"}
                        </Badge>
                        <span className="font-medium">{tx.studioName}</span>
                      </div>
                      {tx.receptor && (
                        <div className="mt-1 text-muted-foreground" dir="ltr">گیرنده: {tx.receptor}</div>
                      )}
                      {tx.messageSnippet && (
                        <div className="mt-0.5 text-muted-foreground">پیام: {tx.messageSnippet}...</div>
                      )}
                      {tx.description && (
                        <div className="mt-0.5 text-muted-foreground">{tx.description}</div>
                      )}
                    </div>
                    <div className="shrink-0 text-left">
                      <div className={`font-bold ${tx.amountRial >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {tx.amountRial >= 0 ? "+" : ""}{formatRial(tx.amountRial)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{formatJalaliDate(new Date(tx.createdAt))}</div>
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

  if (!data) return <Skeleton className="h-96 rounded-lg" />

  const planCounts: Record<string, number> = {
    trial: data.totals.trialStudios,
    basic: data.totals.basicStudios,
    pro: data.totals.proStudios,
    enterprise: data.totals.enterpriseStudios,
    suspended: data.totals.suspendedStudios,
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-4 w-4" /> پلن‌های اشتراک
          </CardTitle>
          <CardDescription>تعریف پلن‌ها و قیمت‌گذاری — قابل تنظیم در تب «تنظیمات»</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.plans.filter((p) => p.id !== "suspended").map((plan) => (
              <Card key={plan.id} className="relative overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">{plan.name}</h3>
                    <Badge className={planColor(plan.id)}>{plan.nameEn}</Badge>
                  </div>
                  <div className="mt-2 text-2xl font-bold">
                    {plan.monthlyPriceToman > 0 ? formatToman(plan.monthlyPriceToman) : "رایگان"}
                    <span className="text-xs font-normal text-muted-foreground">/ماه</span>
                  </div>
                  <Separator className="my-3" />
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">حداکثر کارمندان</span>
                      <span className="font-medium">{plan.maxEmployees > 0 ? toPersianDigits(plan.maxEmployees) : "نامحدود"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">مدت اشتراک</span>
                      <span className="font-medium">{toPersianDigits(plan.durationDays)} روز</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">استودیوهای فعال</span>
                      <span className="font-bold text-sky-600">{toPersianDigits(planCounts[plan.id] || 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
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
    } catch (e) {
      toast.error("خطا در ذخیره")
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) return <Skeleton className="h-96 rounded-lg" />

  const update = (k: string, v: string) => setForm({ ...form, [k]: v })

  return (
    <div className="space-y-4">
      {/* Kavenegar Master Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" /> تنظیمات Kavenegar (حساب اصلی)
          </CardTitle>
          <CardDescription>
            این API Key حساب اصلی شما در کاوه‌نگار است. با این کلید می‌توانید برای هر استودیوی个子ساخت بسازید.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Master API Key (کلید والد)</Label>
            <Input
              value={form["kavenegar.master_apikey"] || ""}
              onChange={(e) => update("kavenegar.master_apikey", e.target.value)}
              dir="ltr"
              placeholder="کلید API حساب اصلی کاوه‌نگار"
              type="password"
            />
          </div>
          <div>
            <Label className="text-xs">شماره فرستنده پیش‌فرض</Label>
            <Input
              value={form["kavenegar.default_sender"] || ""}
              onChange={(e) => update("kavenegar.default_sender", e.target.value)}
              dir="ltr"
              placeholder="مثلاً 1000596446"
            />
          </div>
          <div>
            <Label className="text-xs">نام قالب OTP</Label>
            <Input
              value={form["kavenegar.otp_template"] || ""}
              onChange={(e) => update("kavenegar.otp_template", e.target.value)}
              dir="ltr"
              placeholder="مثلاً nasim-otp"
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">حساب ресلر فعال است؟</div>
              <div className="text-xs text-muted-foreground">
                اگر حساب شما در کاوه‌نگار به‌عنوان ресلر (پشتیبانی مشتریان) فعال شده، این گزینه را روشن کنید.
              </div>
            </div>
            <Switch
              checked={form["kavenegar.reseller_enabled"] === "true"}
              onCheckedChange={(v) => update("kavenegar.reseller_enabled", v ? "true" : "false")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Subscription Plans Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4" /> قیمت‌گذاری پلن‌ها
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4" /> اطلاعات پلتفرم
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <PlanSettingInput label="نام پلتفرم" value={form["platform.name"]} onChange={(v) => update("platform.name", v)} />
            <PlanSettingInput label="نام مدیر پلتفرم" value={form["platform.owner_name"]} onChange={(v) => update("platform.owner_name", v)} />
            <PlanSettingInput label="تلفن پشتیبانی" value={form["platform.support_phone"]} onChange={(v) => update("platform.support_phone", v)} dir="ltr" />
            <PlanSettingInput label="پلن پیش‌فرض" value={form["subscription.default_plan"]} onChange={(v) => update("subscription.default_plan", v)} dir="ltr" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
        </Button>
      </div>
    </div>
  )
}

function PlanSettingInput({ label, value, onChange, dir }: { label: string; value?: string; onChange: (v: string) => void; dir?: "ltr" | "rtl" }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={value || ""} onChange={(e) => onChange(e.target.value)} dir={dir} />
    </div>
  )
}
