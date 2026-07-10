"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  Wallet,
  Clock,
  Users,
  Film,
  CheckCircle2,
  CalendarClock,
  AlertCircle,
  Bell,
  Plus,
  Pin,
  PinOff,
  Trash2,
  Search,
  StickyNote,
  CheckSquare,
  X,
  Paperclip,
  Upload,
  File as FileIcon,
  Music,
  Video,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Maximize2,
  Archive,
  Download,
  AlertTriangle,
  ChevronDown,
} from "lucide-react"
import { toast } from "sonner"
import { useApi } from "@/lib/api/client"
import { useWorkspace } from "@/stores/workspace"
import { STATUS_LABELS, STATUS_COLORS, STATUS_FLOW, CATEGORY_COLORS, CATEGORY_LABELS, type ProjectStatus } from "@/lib/constants"
import { formatRials, formatRialsShort, formatDateTime, timeAgo, toPersianDigits } from "@/lib/format"
import { PageHeader, StatCard, SectionCard, EmptyState } from "./_shared"
import { RemindersWidget, EnhancedNotificationsWidget } from "./_dashboard-widgets"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface DashboardData {
  role: string
  kpis: {
    todaysIncome: number | null
    totalRevenue: number | null
    totalExpenses: number | null
    netProfit: number | null
    pendingSettlement: number | null
    unpaidSalaries: number | null
    customers: number
    scheduledCount: number
    activeCount: number
    readyCount: number
    deliveredCount: number
    leavePending: number
  }
  statusDist: { status: string; count: number }[]
  revenueTrend: { label: string; revenue: number; expense: number }[] | null
  recentProjects: {
    id: string
    title: string
    package: string
    category: string
    status: string
    startDatetime: string
    effectivePrice: number | null
    balance: number | null
    team: { id: string; name: string }[]
  }[]
  upcoming: { id: string; title: string; package: string; category: string; start: string; end: string }[]
  notifications: { id: string; title: string; message: string; read: boolean; createdAt: string }[]
  seeFinance: boolean
  seeBalance: boolean
}

// ============================================================
// وضعیت پروژه‌ها — interactive status-flow widget
// (replaces the old pie chart). Click a chip to jump to the
// Projects view pre-filtered by that status.
// ============================================================
function StatusFlowWidget({ statusDist }: { statusDist: { status: string; count: number }[] }) {
  const goToProjectsWithStatus = useWorkspace((s) => s.goToProjectsWithStatus)
  const total = statusDist.reduce((s, x) => s + (x.count || 0), 0)
  const countFor = (st: string) => statusDist.find((x) => x.status === st)?.count ?? 0

  return (
    <SectionCard
      title="وضعیت پروژه‌ها"
      description="جریان تولید استودیو — برای فیلتر پروژه‌ها روی هر مرحله کلیک کنید"
      actions={
        <Badge variant="secondary" className="text-[10px] tabular-nums">
          مجموع: {toPersianDigits(total)}
        </Badge>
      }
    >
      {/* Desktop (lg+): horizontal flow with arrow connectors (RTL: right→left).
          Mobile: vertical stack with down-arrow connectors. */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Flow chips */}
        <div className="flex-1">
          <div className="flex flex-col gap-1 lg:flex-row lg:items-stretch lg:gap-0">
            {STATUS_FLOW.map((st, i) => {
              const color = STATUS_COLORS[st]
              const label = STATUS_LABELS[st]
              const count = countFor(st)
              const isLast = i === STATUS_FLOW.length - 1
              return (
                <React.Fragment key={st}>
                  <button
                    type="button"
                    onClick={() => goToProjectsWithStatus(st as ProjectStatus)}
                    className="group relative flex flex-1 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-right transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:min-w-0"
                    style={{
                      background: color + "14",
                      borderColor: color + "55",
                    }}
                    title={`فیلتر پروژه‌های «${label}»`}
                    aria-label={`فیلتر پروژه‌های ${label}: ${count} پروژه`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-background"
                      style={{ background: color }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate text-[11px] font-medium leading-tight"
                        style={{ color }}
                      >
                        {label}
                      </span>
                      <span className="block text-base font-bold leading-tight tabular-nums text-foreground">
                        {toPersianDigits(count)}
                      </span>
                    </span>
                  </button>
                  {!isLast && (
                    <div className="flex items-center justify-center py-0.5 text-muted-foreground/50 lg:px-0.5 lg:py-0">
                      <ChevronDown className="h-4 w-4 lg:hidden" aria-hidden />
                      <ChevronLeft className="hidden h-4 w-4 lg:block" aria-hidden />
                    </div>
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* Pie chart — visual distribution of project statuses */}
        {total > 0 && (
          <div className="w-full shrink-0 lg:w-[260px]">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={STATUS_FLOW.map((st) => ({
                    name: STATUS_LABELS[st],
                    value: countFor(st),
                    color: STATUS_COLORS[st],
                    status: st,
                  })).filter((d) => d.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={65}
                  innerRadius={30}
                  paddingAngle={2}
                >
                  {STATUS_FLOW.map((st) => (
                    <Cell
                      key={st}
                      fill={STATUS_COLORS[st]}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                      style={{ cursor: "pointer" }}
                      onClick={() => goToProjectsWithStatus(st as ProjectStatus)}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, n: string) => [`${toPersianDigits(v)} پروژه`, n]}
                  contentStyle={{ fontSize: "11px", borderRadius: "8px", direction: "rtl" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center text-[10px] text-muted-foreground">
              توزیع {toPersianDigits(total)} پروژه فعال
            </div>
          </div>
        )}
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground">
        مسیر تولید: زمان‌بندی ← اجرا ← مدیریت ← ادیت ← کنترل کیفیت ← چاپ/رندر ← آماده تحویل ← تحویل. روی هر مرحله کلیک کنید تا پروژه‌های همان وضعیت در صفحه پروژه‌ها نمایش داده شوند.
      </p>
    </SectionCard>
  )
}

export function DashboardView() {
  const api = useApi()
  const { openProject, setPage } = useWorkspace()
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardData>("/api/dashboard"),
  })

  if (isLoading || !data) return <DashboardSkeleton />

  const { kpis, seeFinance, seeBalance } = data

  return (
    <div className="space-y-4">
      <PageHeader
        title="داشبورد"
        description="نگاهی کلی به عملیات استودیو"
        icon="🏠"
        actions={
          <Badge variant="outline" className="gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> زنده
          </Badge>
        }
      />

      {/* یادداشت‌ها */}
      <NotesWidget />

      {/* یادآوری‌ها و اعلان‌ها */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <RemindersWidget />
        <EnhancedNotificationsWidget />
      </div>

      {/* شاخص‌ها */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {seeFinance && (
          <StatCard
            label="درآمد امروز"
            value={`${formatRialsShort(kpis.todaysIncome ?? 0)} تومان`}
            sub="پرداخت‌های تأییدشده"
            icon={<Wallet className="h-4 w-4" />}
            accent="#10b981"
            trend={{ value: "۱۲٪ نسبت به میانگین", up: true }}
          />
        )}
        {seeBalance && (
          <StatCard
            label="مانده تسویه"
            value={`${formatRialsShort(kpis.pendingSettlement ?? 0)} تومان`}
            sub="در پروژه‌های فعال"
            icon={<Clock className="h-4 w-4" />}
            accent="#f59e0b"
          />
        )}
        {seeFinance && (
          <StatCard
            label="حقوق پرداخت‌نشده"
            value={`${formatRialsShort(kpis.unpaidSalaries ?? 0)} تومان`}
            sub="در انتظار پرداخت"
            icon={<AlertCircle className="h-4 w-4" />}
            accent="#ef4444"
          />
        )}
        <StatCard
          label="مشتریان"
          value={toPersianDigits(kpis.customers)}
          sub="ثبت‌شده در کل"
          icon={<Users className="h-4 w-4" />}
          accent="#0ea5e9"
        />
        <StatCard
          label="پروژه‌های فعال"
          value={toPersianDigits(kpis.activeCount)}
          sub="در حال تولید"
          icon={<Film className="h-4 w-4" />}
          accent="#a855f7"
        />
        <StatCard
          label="آماده تحویل"
          value={toPersianDigits(kpis.readyCount)}
          sub="تیک طلایی ثبت شده"
          icon={<CheckCircle2 className="h-4 w-4" />}
          accent="#22c55e"
        />
        <StatCard
          label="زمان‌بندی‌شده"
          value={toPersianDigits(kpis.scheduledCount)}
          sub="اجرای پیش‌رو"
          icon={<CalendarClock className="h-4 w-4" />}
          accent="#64748b"
        />
        <StatCard
          label="تحویل‌شده"
          value={toPersianDigits(kpis.deliveredCount)}
          sub="پروژه‌های تکمیل‌شده"
          icon={<CheckCircle2 className="h-4 w-4" />}
          accent="#0ea5e9"
        />
      </div>

      {/* نمودار درآمد در مقابل هزینه */}
      {seeFinance && data.revenueTrend && (
        <SectionCard
          title="درآمد در مقابل هزینه"
          description="۶ ماه گذشته"
        >
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.revenueTrend}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatRialsShort(v)}
                orientation="right"
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => formatRials(v) + " تومان"}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#rev)" />
              <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#exp)" />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>
      )}

      {/* وضعیت پروژه‌ها — جریان تعاملی قابل کلیک */}
      <StatusFlowWidget statusDist={data.statusDist} />

      {/* پروژه‌های اخیر و اجرای پیش‌رو */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
        <SectionCard
          title="پروژه‌های اخیر"
          description="آخرین فعالیت‌ها"
          className="lg:col-span-2"
          actions={
            <button onClick={() => setPage("projects")} className="text-xs text-muted-foreground hover:text-foreground">
              مشاهده همه ←
            </button>
          }
        >
          {data.recentProjects.length === 0 ? (
            <EmptyState title="هنوز پروژه‌ای ثبت نشده" />
          ) : (
            <div className="divide-y">
              {data.recentProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => openProject(p.id)}
                  className="flex w-full items-center gap-3 py-2.5 text-right hover:bg-muted/40 -mx-2 px-2 rounded-md"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white"
                    style={{ background: CATEGORY_COLORS[p.category as keyof typeof CATEGORY_COLORS] }}
                  >
                    {(CATEGORY_LABELS[p.category as keyof typeof CATEGORY_LABELS] ?? p.category)[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{p.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{p.package}</div>
                  </div>
                  <div className="flex -space-x-2 space-x-reverse">
                    {p.team.slice(0, 3).map((t) => (
                      <Avatar key={t.id} className="h-6 w-6 border-2 border-background">
                        <AvatarFallback className="text-[9px]">
                          {t.name.split(" ").map((x) => x[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <Badge
                    variant="secondary"
                    className="shrink-0 text-[10px]"
                    style={{
                      background: STATUS_COLORS[p.status as keyof typeof STATUS_COLORS] + "22",
                      color: STATUS_COLORS[p.status as keyof typeof STATUS_COLORS],
                    }}
                  >
                    {STATUS_LABELS[p.status as keyof typeof STATUS_LABELS] ?? p.status}
                  </Badge>
                  {seeBalance && p.balance != null && (
                    <div className="hidden w-24 shrink-0 text-left text-xs sm:block">
                      <div className="font-medium">{formatRialsShort(p.balance)}</div>
                      <div className="text-muted-foreground">مانده</div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="flex flex-col gap-3 sm:gap-4">
          <SectionCard title="اجرای پیش‌رو" description="۱۴ روز آینده">
            <ScrollArea className="h-[180px] pl-3">
              {data.upcoming.length === 0 ? (
                <EmptyState title="برنامهای نیست" />
              ) : (
                <div className="space-y-2">
                  {data.upcoming.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => openProject(u.id)}
                      className="flex w-full items-center gap-2 rounded-md border p-2 text-right hover:bg-muted/40"
                    >
                      <div
                        className="h-9 w-1 rounded-full"
                        style={{ background: CATEGORY_COLORS[u.category as keyof typeof CATEGORY_COLORS] }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{u.title}</div>
                        <div className="truncate text-xs text-muted-foreground">{u.package}</div>
                      </div>
                      <div className="text-left text-[11px] text-muted-foreground">
                        {formatDateTime(u.start)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Notes widget (iPhone-Notes-like) — dark-mode safe, mobile friendly, attachments
// ============================================================
type NoteKind = "note" | "todo"
interface NoteItem {
  text: string
  done: boolean
}
type AttachmentType = "image" | "audio" | "video" | "file"
interface Attachment {
  type: AttachmentType
  url: string
  name: string
  size: number
  mime: string
  thumbUrl?: string
}
interface UserNote {
  id: string
  title: string
  body: string
  kind: NoteKind
  items: NoteItem[]
  attachments: Attachment[]
  color: string
  pinned: boolean
  createdAt: string
  updatedAt: string
}

const NOTE_COLORS: { key: string; label: string; hex: string }[] = [
  { key: "", label: "بدون رنگ", hex: "#94a3b8" },
  { key: "yellow", label: "زرد", hex: "#f59e0b" },
  { key: "green", label: "سبز", hex: "#10b981" },
  { key: "pink", label: "صورتی", hex: "#ec4899" },
  { key: "purple", label: "بنفش", hex: "#a855f7" },
  { key: "rose", label: "قرمز", hex: "#ef4444" },
]

function colorOf(key: string): { hex: string; label: string } {
  return NOTE_COLORS.find((c) => c.key === key) ?? NOTE_COLORS[0]
}

function formatFileSize(bytes: number): string {
  if (!bytes) return "۰ بایت"
  const units = ["بایت", "KB", "MB", "GB"]
  let v = bytes
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${toPersianDigits(i === 0 ? v : v.toFixed(1))} ${units[i]}`
}

function previewOf(n: UserNote): string {
  if (n.kind === "todo") {
    const done = n.items.filter((i) => i.done).length
    return `${toPersianDigits(done)} از ${toPersianDigits(n.items.length)} مورد انجام شده`
  }
  return n.body?.trim() || "یادداشت خالی"
}

const ATTACHMENT_ACCEPT =
  "image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.csv"

function deriveAttachmentType(file: File): AttachmentType {
  if (file.type.startsWith("image/")) return "image"
  if (file.type.startsWith("audio/")) return "audio"
  if (file.type.startsWith("video/")) return "video"
  return "file"
}

// XHR-based uploader so we can report per-file progress.
function uploadAttachment(
  file: File,
  role: string,
  onProgress: (pct: number) => void,
  signal?: AbortSignal
): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const fd = new FormData()
    fd.append("file", file)
    xhr.open("POST", "/api/user-notes/upload")
    // Send credentials (cookies) so the nasim-session cookie is included.
    xhr.withCredentials = true
    xhr.setRequestHeader("x-demo-role", role)
    // Cross-origin preview: cookies may not be sent, so include the Bearer
    // token from localStorage — matches what src/lib/api/client.ts does.
    const token = typeof window !== "undefined" ? localStorage.getItem("nasim-session-token") : null
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as Attachment
          resolve(data)
        } catch (e) {
          reject(new Error("پاسخ سرور نامعتبر است"))
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText) as { error?: string }
          reject(new Error(data.error || `خطای بارگذاری (${xhr.status})`))
        } catch {
          reject(new Error(`خطای بارگذاری (${xhr.status})`))
        }
      }
    }
    xhr.onerror = () => reject(new Error("خطای شبکه"))
    xhr.onabort = () => reject(new Error("بارگذاری لغو شد"))
    if (signal) {
      signal.addEventListener("abort", () => xhr.abort())
    }
    xhr.send(fd)
  })
}

// ----------------------- Audio player with speed control -----------------------
function AudioPlayer({ att }: { att: Attachment }) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = React.useState(false)
  const [current, setCurrent] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const [rate, setRate] = React.useState(1)

  React.useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => setCurrent(a.currentTime)
    const onDur = () => setDuration(a.duration || 0)
    const onEnd = () => setPlaying(false)
    a.addEventListener("timeupdate", onTime)
    a.addEventListener("loadedmetadata", onDur)
    a.addEventListener("ended", onEnd)
    return () => {
      a.removeEventListener("timeupdate", onTime)
      a.removeEventListener("loadedmetadata", onDur)
      a.removeEventListener("ended", onEnd)
    }
  }, [])

  React.useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate
  }, [rate])

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) {
      a.pause()
      setPlaying(false)
    } else {
      a.play().then(() => setPlaying(true)).catch(() => {})
    }
  }

  const seek = (v: number) => {
    const a = audioRef.current
    if (!a || !duration) return
    a.currentTime = (v / 100) * duration
    setCurrent(a.currentTime)
  }

  const pct = duration > 0 ? (current / duration) * 100 : 0
  const fmt = (s: number) => {
    if (!Number.isFinite(s)) return "۰:۰۰"
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${toPersianDigits(m)}:${toPersianDigits(String(sec).padStart(2, "0"))}`
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-2.5">
      <div className="mb-2 flex items-center gap-2">
        <Music className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-xs">{att.name}</span>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {fmt(current)} / {fmt(duration)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8 shrink-0"
          onClick={toggle}
          aria-label={playing ? "توقف" : "پخش"}
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={pct}
          onChange={(e) => seek(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          dir="ltr"
          aria-label="پیشرفت پخش"
        />
        <Select value={String(rate)} onValueChange={(v) => setRate(Number(v))}>
          <SelectTrigger className="h-8 w-[68px] shrink-0 text-[11px]" dir="ltr">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0.5">0.5×</SelectItem>
            <SelectItem value="1">1×</SelectItem>
            <SelectItem value="1.5">1.5×</SelectItem>
            <SelectItem value="2">2×</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <audio ref={audioRef} src={att.url} preload="metadata" className="hidden" />
    </div>
  )
}

// ----------------------- Video player with speed control + fullscreen -----------------------
function VideoPlayer({ att }: { att: Attachment }) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const [rate, setRate] = React.useState(1)

  React.useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = rate
  }, [rate])

  const fullscreen = () => {
    const v = videoRef.current
    if (!v) return
    if (v.requestFullscreen) v.requestFullscreen().catch(() => {})
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-black">
      <video
        ref={videoRef}
        src={att.url}
        controls
        playsInline
        className="max-h-72 w-full"
      />
      <div className="flex items-center justify-between gap-2 bg-black/80 px-2 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-white/90">
          <Video className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{att.name}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Select value={String(rate)} onValueChange={(v) => setRate(Number(v))}>
            <SelectTrigger className="h-7 w-[64px] border-white/20 bg-transparent text-[11px] text-white hover:bg-white/10" dir="ltr">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.5">0.5×</SelectItem>
              <SelectItem value="1">1×</SelectItem>
              <SelectItem value="1.5">1.5×</SelectItem>
              <SelectItem value="2">2×</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-white hover:bg-white/10"
            onClick={fullscreen}
            aria-label="تمام صفحه"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ----------------------- Image lightbox with arrow-key navigation -----------------------
function ImageLightbox({
  images,
  index,
  onClose,
  onIndex,
}: {
  images: Attachment[]
  index: number
  onClose: () => void
  onIndex: (i: number) => void
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowRight") onIndex((index + 1) % images.length)
      else if (e.key === "ArrowLeft") onIndex((index - 1 + images.length) % images.length)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [index, images.length, onClose, onIndex])

  if (index < 0 || index >= images.length) return null
  const cur = images[index]

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-[95vw] border-none bg-black/95 p-0 sm:max-w-[95vw]"
        onClick={onClose}
      >
        <div className="relative flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <img
            src={cur.url}
            alt={cur.name}
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => onIndex((index + 1) % images.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                aria-label="بعدی"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => onIndex((index - 1 + images.length) % images.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                aria-label="قبلی"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                {toPersianDigits(index + 1)} / {toPersianDigits(images.length)}
              </div>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="بستن"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ----------------------- File download row -----------------------
function FileDownloadRow({ att }: { att: Attachment }) {
  return (
    <a
      href={att.url}
      download={att.name}
      className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2.5 transition hover:bg-muted/60"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <FileIcon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">{att.name}</div>
        <div className="text-[10px] text-muted-foreground">
          {formatFileSize(att.size)}
        </div>
      </div>
      <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
    </a>
  )
}

// ----------------------- Attachment viewer (renders all attachments of a note) -----------------------
function AttachmentViewer({ attachments }: { attachments: Attachment[] }) {
  const [lightboxIndex, setLightboxIndex] = React.useState(-1)
  const images = attachments.filter((a) => a.type === "image")
  return (
    <div className="space-y-2">
      {attachments.map((a, i) => {
        if (a.type === "image") {
          return (
            <button
              key={i}
              type="button"
              onClick={() => {
                const imgIdx = images.findIndex((x) => x.url === a.url)
                setLightboxIndex(imgIdx >= 0 ? imgIdx : 0)
              }}
              className="block overflow-hidden rounded-lg border bg-muted/40"
              title={a.name}
            >
              <img
                src={a.thumbUrl || a.url}
                alt={a.name}
                className="max-h-64 max-w-full object-cover"
                loading="lazy"
              />
            </button>
          )
        }
        if (a.type === "audio") return <AudioPlayer key={i} att={a} />
        if (a.type === "video") return <VideoPlayer key={i} att={a} />
        return <FileDownloadRow key={i} att={a} />
      })}
      {lightboxIndex >= 0 && (
        <ImageLightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(-1)}
          onIndex={setLightboxIndex}
        />
      )}
    </div>
  )
}

// ----------------------- Cleanup dialog -----------------------
function CleanupAttachmentsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const api = useApi()
  const qc = useQueryClient()
  const [keep, setKeep] = React.useState<"1week" | "1month" | "3month" | "none">("1month")
  const [submitting, setSubmitting] = React.useState(false)

  const options: { value: "1week" | "1month" | "3month" | "none"; label: string; desc: string }[] = [
    { value: "1week", label: "حفظ ۱ هفته اخیر", desc: "پیوست‌های قدیمی‌تر از ۷ روز حذف می‌شوند." },
    { value: "1month", label: "حفظ ۱ ماه اخیر", desc: "پیوست‌های قدیمی‌تر از ۳۰ روز حذف می‌شوند." },
    { value: "3month", label: "حفظ ۳ ماه اخیر", desc: "پیوست‌های قدیمی‌تر از ۹۰ روز حذف می‌شوند." },
    { value: "none", label: "حذف همه پیوست‌ها", desc: "تمام پیوست‌ها حذف می‌شوند (یادداشت‌ها باقی می‌مانند)." },
  ]

  const submit = async () => {
    setSubmitting(true)
    try {
      const res = await api.post<{ deletedCount: number }>("/api/user-notes/cleanup", {
        keepNewerThan: keep,
      })
      toast.success(`${toPersianDigits(res.deletedCount)} پیوست پاک شد`)
      qc.invalidateQueries({ queryKey: ["user-notes"] })
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "پاک‌سازی ناموفق بود")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>پاک‌سازی پیوست‌ها</DialogTitle>
          <DialogDescription>
            فایل‌های پیوست قدیمی را پاک کنید. خود یادداشت‌ها حفظ می‌شوند و فقط پیوست‌های آن‌ها حذف می‌شود.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          {options.map((o) => (
            <label
              key={o.value}
              className={cn(
                "flex cursor-pointer items-start gap-2 rounded-md border p-2.5 text-sm transition",
                keep === o.value
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
              )}
            >
              <input
                type="radio"
                name="cleanup-keep"
                value={o.value}
                checked={keep === o.value}
                onChange={() => setKeep(o.value)}
                className="mt-1 accent-primary"
              />
              <div className="min-w-0">
                <div className="font-medium">{o.label}</div>
                <div className="text-[11px] text-muted-foreground">{o.desc}</div>
              </div>
            </label>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            انصراف
          </Button>
          <Button variant="destructive" onClick={submit} disabled={submitting}>
            {submitting ? "در حال پاک‌سازی…" : "پاک‌سازی"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NotesWidget() {
  const api = useApi()
  const qc = useQueryClient()
  const role = useWorkspace((s) => s.role)
  const [editorOpen, setEditorOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<UserNote | null>(null)
  const [search, setSearch] = React.useState("")
  const [cleanupOpen, setCleanupOpen] = React.useState(false)

  const { data: notes, isLoading } = useQuery({
    queryKey: ["user-notes"],
    queryFn: () => api.get<{ items: UserNote[] }>("/api/user-notes").then((r) => r.items),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.del(`/api/user-notes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-notes"] })
      toast.success("یادداشت حذف شد")
    },
    onError: () => toast.error("حذف ناموفق بود"),
  })

  const pinMut = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      api.patch(`/api/user-notes/${id}`, { pinned }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-notes"] }),
    onError: () => toast.error("تغییر وضعیت سنجاق ناموفق بود"),
  })

  const sorted = React.useMemo(() => {
    if (!notes) return []
    const filtered = search.trim()
      ? notes.filter((n) => n.title.includes(search.trim()) || n.body.includes(search.trim()) || n.items.some((i) => i.text.includes(search.trim())))
      : notes
    return [...filtered].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }, [notes, search])

  function openNew(kind: NoteKind) {
    setEditing({ id: "", title: "", body: "", kind, items: [], attachments: [], color: "", pinned: false, createdAt: "", updatedAt: "" })
    setEditorOpen(true)
  }

  function openEdit(n: UserNote) {
    setEditing(n)
    setEditorOpen(true)
  }

  return (
    <SectionCard
      title="یادداشت‌ها"
      description="یادداشت‌ها و چک‌لیست‌های شخصی شما"
      actions={
        <div className="flex w-full items-center gap-1.5 sm:w-auto sm:gap-2">
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <Search className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو…"
              className="h-8 w-full min-w-0 pr-7 text-xs sm:w-32"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 shrink-0 gap-1 px-2"
            onClick={() => setCleanupOpen(true)}
            title="پاک‌سازی پیوست‌ها"
          >
            <Archive className="h-3.5 w-3.5" />
            <span className="sm:hidden">پاک‌سازی</span>
            <span className="hidden sm:inline">پاک‌سازی پیوست‌ها</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8 shrink-0 px-2 sm:px-3">
                <Plus className="h-3.5 w-3.5 sm:ml-1" />
                <span className="hidden sm:inline">یادداشت جدید</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => openNew("note")}>
                <StickyNote className="ml-2 h-3.5 w-3.5" /> یادداشت متنی
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openNew("todo")}>
                <CheckSquare className="ml-2 h-3.5 w-3.5" /> چک‌لیست
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="📝"
          title={search.trim() ? "موردی یافت نشد" : "هنوز یادداشتی ندارید"}
          description={search.trim() ? "عبارت دیگری را جستجو کنید." : "برای شروع، یک یادداشت جدید بسازید."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              onOpen={() => openEdit(n)}
              onDelete={() => deleteMut.mutate(n.id)}
              onTogglePin={() => pinMut.mutate({ id: n.id, pinned: !n.pinned })}
              deleting={deleteMut.isPending}
            />
          ))}
        </div>
      )}

      {editorOpen && editing && (
        <NoteEditorDialog
          open={editorOpen}
          onOpenChange={(v) => {
            setEditorOpen(v)
            if (!v) setEditing(null)
          }}
          initial={editing}
          role={role}
        />
      )}

      <CleanupAttachmentsDialog open={cleanupOpen} onOpenChange={setCleanupOpen} />
    </SectionCard>
  )
}

function NoteCard({
  note,
  onOpen,
  onDelete,
  onTogglePin,
  deleting,
}: {
  note: UserNote
  onOpen: () => void
  onDelete: () => void
  onTogglePin: () => void
  deleting: boolean
}) {
  const c = colorOf(note.color)
  const done = note.items.filter((i) => i.done).length
  const attCount = note.attachments?.length ?? 0

  // iOS-style swipe-to-delete confirmation state.
  const [confirming, setConfirming] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)

  // Escape key + outside-click cancel the confirming state.
  React.useEffect(() => {
    if (!confirming) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirming(false)
    }
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (wrapperRef.current && !wrapperRef.current.contains(target)) {
        setConfirming(false)
      }
    }
    window.addEventListener("keydown", onKey)
    // Defer so the click that opened the panel doesn't immediately close it.
    const t = window.setTimeout(() => {
      window.addEventListener("pointerdown", onPointer)
    }, 0)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("pointerdown", onPointer)
      window.clearTimeout(t)
    }
  }, [confirming])

  return (
    <div
      ref={wrapperRef}
      className="relative overflow-hidden rounded-xl"
      onClick={() => {
        // Click on the wrapper (outside the panel button) cancels confirming.
        if (confirming) setConfirming(false)
      }}
    >
      {/* Red delete panel — revealed when the card content slides left (RTL). */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        disabled={deleting}
        aria-label="حذف یادداشت"
        title="حذف"
        tabIndex={confirming ? 0 : -1}
        className="absolute inset-y-0 right-0 z-0 flex w-20 items-center justify-center bg-rose-600 text-white transition-colors hover:bg-rose-700 disabled:opacity-70"
      >
        <span className="flex flex-col items-center gap-1">
          <Trash2 className="h-4 w-4" />
          <span className="text-[11px] font-semibold">حذف</span>
        </span>
      </button>

      {/* Main card content — slides left when confirming. */}
      <div
        className={cn(
          // Semantic tokens so the card adapts to light/dark theme.
          "group relative z-10 min-w-0 cursor-pointer overflow-hidden rounded-xl border bg-card p-3 text-card-foreground shadow-sm transition duration-200 hover:shadow-md",
          note.pinned && "ring-1 ring-amber-400/40",
          confirming ? "-translate-x-20" : "translate-x-0"
        )}
        onClick={(e) => {
          if (confirming) {
            e.stopPropagation()
            setConfirming(false)
          } else {
            onOpen()
          }
        }}
      >
        {/* Subtle left border accent in the note's color tag (NOT a hard bg) */}
        <span
          className="absolute inset-y-0 right-0 w-1.5"
          style={{ background: c.hex }}
          aria-hidden
        />
        {/* Top row: color dot + pin */}
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: c.hex }}
              title={c.label}
            />
            {note.kind === "todo" ? (
              <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">چک‌لیست</Badge>
            ) : (
              <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">یادداشت</Badge>
            )}
            {attCount > 0 && (
              <Badge variant="outline" className="h-4 gap-1 px-1.5 text-[9px]">
                <Paperclip className="h-2.5 w-2.5" />
                {toPersianDigits(attCount)}
              </Badge>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onTogglePin}
              className={cn(
                "rounded p-1 text-muted-foreground transition hover:bg-muted",
                note.pinned && "text-amber-600"
              )}
              title={note.pinned ? "حذف سنجاق" : "سنجاق کردن"}
            >
              {note.pinned ? <Pin className="h-3.5 w-3.5 fill-amber-500 text-amber-600" /> : <PinOff className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setConfirming(true)
              }}
              disabled={deleting}
              className="rounded p-1 text-muted-foreground transition hover:bg-rose-500/10 hover:text-rose-600"
              title="حذف"
              aria-label="آماده‌سازی حذف"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="min-w-0 break-words text-sm font-semibold">
          {note.title || (note.kind === "todo" ? "چک‌لیست بدون عنوان" : "یادداشت بدون عنوان")}
        </div>

        {/* Preview */}
        {note.kind === "todo" ? (
          <div className="mt-1.5 min-w-0 space-y-1">
            {note.items.slice(0, 4).map((it, i) => (
              <div key={i} className="flex min-w-0 items-center gap-1.5 text-[11px]">
                <span
                  className={cn(
                    "inline-flex h-3 w-3 shrink-0 items-center justify-center rounded border",
                    it.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40"
                  )}
                >
                  {it.done && <CheckCircle2 className="h-2.5 w-2.5" />}
                </span>
                <span className={cn("min-w-0 truncate", it.done && "text-muted-foreground line-through")}>
                  {it.text || "—"}
                </span>
              </div>
            ))}
            {note.items.length > 4 && (
              <div className="text-[10px] text-muted-foreground">
                +{toPersianDigits(note.items.length - 4)} مورد دیگر…
              </div>
            )}
            {note.items.length === 0 && (
              <div className="text-[10px] text-muted-foreground">هنوز موردی اضافه نشده.</div>
            )}
            <div className="mt-1 text-[10px] text-muted-foreground">
              {toPersianDigits(done)} از {toPersianDigits(note.items.length)} انجام شده
            </div>
          </div>
        ) : (
          <div className="mt-1 min-w-0 line-clamp-3 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-muted-foreground">
            {note.body?.trim() || "یادداشت خالی"}
          </div>
        )}

        <div className="mt-2 text-[10px] text-muted-foreground/70">
          {timeAgo(note.updatedAt)}
        </div>
      </div>
    </div>
  )
}

interface PendingUpload {
  id: string
  file: File
  progress: number
  status: "uploading" | "done" | "error" | "cancelled"
  result?: Attachment
  error?: string
  controller?: AbortController
}

function NoteEditorDialog({
  open,
  onOpenChange,
  initial,
  role,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial: UserNote
  role: string
}) {
  const api = useApi()
  const qc = useQueryClient()
  const isEdit = !!initial.id

  const [title, setTitle] = React.useState(initial.title)
  const [body, setBody] = React.useState(initial.body)
  const [kind, setKind] = React.useState<NoteKind>(initial.kind)
  const [items, setItems] = React.useState<NoteItem[]>(initial.items.length ? initial.items : [{ text: "", done: false }])
  const [color, setColor] = React.useState(initial.color)
  const [pinned, setPinned] = React.useState(initial.pinned)
  const [attachments, setAttachments] = React.useState<Attachment[]>(initial.attachments ?? [])
  const [pending, setPending] = React.useState<PendingUpload[]>([])
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    setTitle(initial.title)
    setBody(initial.body)
    setKind(initial.kind)
    setItems(initial.items.length ? initial.items : [{ text: "", done: false }])
    setColor(initial.color)
    setPinned(initial.pinned)
    setAttachments(initial.attachments ?? [])
    setPending([])
  }, [initial.id, initial.kind])

  const anyUploading = pending.some((p) => p.status === "uploading")
  const overallPct =
    pending.length === 0
      ? 0
      : Math.round(
          pending.reduce((s, p) => s + (p.status === "done" ? 100 : p.progress), 0) / pending.length
        )

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        kind,
        color,
        pinned,
        attachments,
      }
      if (kind === "note") payload.body = body
      else payload.items = items.filter((i) => i.text.trim() !== "")
      if (isEdit) {
        return api.patch(`/api/user-notes/${initial.id}`, payload)
      }
      return api.post("/api/user-notes", payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-notes"] })
      toast.success(isEdit ? "یادداشت به‌روزرسانی شد" : "یادداشت ساخته شد")
      onOpenChange(false)
    },
    onError: (e: Error) => toast.error(e.message || "ذخیره ناموفق بود"),
  })

  const canSave =
    !anyUploading &&
    (title.trim() || body.trim() || items.some((i) => i.text.trim()) || attachments.length > 0)

  function addItem() {
    setItems((arr) => [...arr, { text: "", done: false }])
  }
  function removeItem(idx: number) {
    setItems((arr) => arr.filter((_, i) => i !== idx))
  }
  function updateItem(idx: number, patch: Partial<NoteItem>) {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function pickFiles() {
    fileInputRef.current?.click()
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const list = Array.from(files)
    const newPending: PendingUpload[] = list.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file: f,
      progress: 0,
      status: "uploading",
      controller: new AbortController(),
    }))
    setPending((arr) => [...arr, ...newPending])
    await Promise.all(
      newPending.map(async (p) => {
        try {
          const att = await uploadAttachment(p.file, role, (pct) => {
            setPending((arr) =>
              arr.map((x) => (x.id === p.id ? { ...x, progress: pct } : x))
            )
          }, p.controller?.signal)
          setPending((arr) =>
            arr.map((x) => (x.id === p.id ? { ...x, status: "done", result: att } : x))
          )
          setAttachments((arr) => [...arr, att])
        } catch (e) {
          const msg = e instanceof Error ? e.message : "بارگذاری ناموفق بود"
          setPending((arr) =>
            arr.map((x) => (x.id === p.id ? { ...x, status: x.status === "cancelled" ? "cancelled" : "error", error: msg } : x))
          )
          if (!msg.includes("لغو شد")) toast.error(`${p.file.name}: ${msg}`)
        }
      })
    )
    // Sweep completed/error/cancelled entries after a short delay so the user sees the result.
    setTimeout(() => {
      setPending((arr) => arr.filter((x) => x.status === "uploading"))
    }, 1200)
    // Reset the input so picking the same file again still fires onChange.
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function cancelUpload(id: string) {
    setPending((arr) =>
      arr.map((x) => {
        if (x.id === id && x.status === "uploading") {
          x.controller?.abort()
          return { ...x, status: "cancelled" }
        }
        return x
      })
    )
    // Remove cancelled entry after a short delay
    setTimeout(() => {
      setPending((arr) => arr.filter((x) => x.id !== id))
    }, 500)
  }

  function removeAttachment(idx: number) {
    setAttachments((arr) => arr.filter((_, i) => i !== idx))
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onOpenChange(false))}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "ویرایش یادداشت" : "یادداشت جدید"}</DialogTitle>
          <DialogDescription>
            {kind === "todo" ? "چک‌لیست — موارد را اضافه و علامت بزنید." : "یادداشت متنی ساده."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {([
              { k: "note", label: "یادداشت", icon: StickyNote },
              { k: "todo", label: "چک‌لیست", icon: CheckSquare },
            ] as const).map((opt) => (
              <button
                key={opt.k}
                onClick={() => setKind(opt.k)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition",
                  kind === opt.k
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <opt.icon className="h-3.5 w-3.5" /> {opt.label}
              </button>
            ))}
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">عنوان</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان یادداشت…" />
          </div>

          {kind === "note" ? (
            <div>
              <Label className="mb-1.5 block text-xs">متن</Label>
              <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="یادداشت خود را بنویسید…" className="whitespace-pre-wrap break-words" />
            </div>
          ) : (
            <div>
              <Label className="mb-1.5 block text-xs">موارد چک‌لیست</Label>
              <div className="space-y-1.5">
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Checkbox
                      checked={it.done}
                      onCheckedChange={(v) => updateItem(idx, { done: Boolean(v) })}
                    />
                    <Input
                      value={it.text}
                      onChange={(e) => updateItem(idx, { text: e.target.value })}
                      placeholder="مورد جدید…"
                      className={cn("text-xs", it.done && "text-muted-foreground line-through")}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-rose-600"
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-2 w-full" onClick={addItem}>
                <Plus className="ml-1 h-3.5 w-3.5" /> افزودن مورد
              </Button>
            </div>
          )}

          {/* Attachments */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <Label className="text-xs">پیوست‌ها</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 px-2 text-[11px]"
                onClick={pickFiles}
                disabled={anyUploading}
              >
                <Paperclip className="h-3 w-3" />
                افزودن فایل
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={ATTACHMENT_ACCEPT}
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            {pending.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {pending.map((p) => (
                  <div
                    key={p.id}
                    className={cn(
                      "rounded-md border p-2 text-xs",
                      p.status === "error" ? "border-rose-500/40 bg-rose-500/5" : "bg-muted/40"
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        {p.status === "done" ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                        ) : p.status === "error" ? (
                          <AlertTriangle className="h-3 w-3 shrink-0 text-rose-500" />
                        ) : (
                          <Upload className="h-3 w-3 shrink-0 animate-pulse text-muted-foreground" />
                        )}
                        <span className="truncate">{p.file.name}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">
                          {p.status === "done"
                            ? "کامل شد"
                            : p.status === "error"
                            ? "خطا"
                            : `${toPersianDigits(p.progress)}٪`}
                        </span>
                        {p.status === "uploading" && (
                          <button
                            type="button"
                            onClick={() => cancelUpload(p.id)}
                            className="rounded-full p-0.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
                            aria-label="لغو بارگذاری"
                            title="لغو بارگذاری"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    {p.status === "uploading" && (
                      <Progress value={p.progress} className="h-1" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {attachments.length > 0 ? (
              <div className="space-y-2">
                <AttachmentViewer attachments={attachments} />
                <div className="flex flex-wrap gap-1.5">
                  {attachments.map((a, i) => (
                    <span
                      key={i}
                      className="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-[10px]"
                    >
                      {a.type === "image" ? (
                        <ImageIcon className="h-2.5 w-2.5 shrink-0" />
                      ) : a.type === "audio" ? (
                        <Music className="h-2.5 w-2.5 shrink-0" />
                      ) : a.type === "video" ? (
                        <Video className="h-2.5 w-2.5 shrink-0" />
                      ) : (
                        <FileIcon className="h-2.5 w-2.5 shrink-0" />
                      )}
                      <span className="max-w-[140px] truncate">{a.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="rounded-full p-0.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
                        aria-label="حذف پیوست"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                می‌توانید تصویر، صدا، ویدیو یا فایل پیوست کنید.
              </p>
            )}
          </div>

          {/* Color tags */}
          <div>
            <Label className="mb-1.5 block text-xs">رنگ برچسب</Label>
            <div className="flex flex-wrap items-center gap-1.5">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.key || "none"}
                  onClick={() => setColor(c.key)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border-2 transition",
                    color === c.key ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                  )}
                  style={{ background: c.hex }}
                  title={c.label}
                >
                  {color === c.key && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs">
            <Checkbox checked={pinned} onCheckedChange={(v) => setPinned(Boolean(v))} />
            <span className="flex items-center gap-1">
              <Pin className="h-3 w-3" /> سنجاق کردن در بالا
            </span>
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>انصراف</Button>
          <Button disabled={!canSave || saveMut.isPending} onClick={() => saveMut.mutate()}>
            {saveMut.isPending
              ? "در حال ذخیره…"
              : anyUploading
              ? `در حال بارگذاری... (${toPersianDigits(overallPct)}٪)`
              : isEdit
              ? "ذخیره تغییرات"
              : "ساخت یادداشت"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DashboardSkeleton() {
  return (
    <div>
      <PageHeader title="داشبورد" description="در حال بارگذاری…" icon="🏠" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="mt-6 grid gap-3 sm:gap-4 lg:grid-cols-3">
        <Skeleton className="h-[300px] rounded-xl lg:col-span-2" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    </div>
  )
}
