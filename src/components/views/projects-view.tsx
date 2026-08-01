"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  MoreHorizontal,
  Lock,
  ArrowLeft,
  ArrowRight,
  Snowflake,
  CheckCircle2,
  Clock,
  StickyNote,
  Send,
  Calendar as CalendarIcon,
  Wallet,
  Film,
  CheckCheck,
  Filter,
  X,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Mic,
  Trash2,
  ChevronDown,
  Loader2,
  User as UserIcon,
  Phone,
  MapPin,
  Tag as TagIcon,
  MessageSquare,
  Upload,
  Download,
  Pencil,
  Save,
  Play,
  Pause,
  Music,
  Video,
  Maximize2,
  File as FileIcon,
  Camera,
  UserCog,
  Check,
  Minus,
  Unlock,
} from "lucide-react"
import { toast } from "sonner"

import { useApi } from "@/lib/api/client"
import { useWorkspace } from "@/stores/workspace"
import {
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_FLOW,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  PRICING_STRATEGY_LABELS,
  PRICING_STRATEGIES,
  PAYMENT_TYPE_LABELS,
  PAYMENT_TYPES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  ROLE_LABELS,
  migrateRole,
  NOTE_TYPES,
  CUSTOMER_TYPES,
  TRIGGER_EVENT_LABELS,
  canTransition,
  normalizeStatus,
  tracksForCategory,
  STAGE_ASSIGNEE_ROLES,
  NEXT_STAGE,
  type ProjectStatus,
  type Role,
  type NoteType,
  type PaymentType,
  type PaymentMethod,
  type WorkflowTrack,
} from "@/lib/constants"
import {
  formatRials,
  formatRialsShort,
  formatDate,
  formatDateTime,
  timeAgo,
  tomanToRials,
  toPersianDigits,
} from "@/lib/format"
import { PageHeader, SectionCard, EmptyState, StatCard } from "./_shared"
import { TomanInput } from "./_toman-input"
import { JalaliDatePicker } from "./_jalali-date-picker/jalali-date-picker"
import {
  TimeWheelPicker,
  formatTime12h,
} from "./_time-wheel-picker/time-wheel-picker"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

// ============================================================
// Types
// ============================================================
interface CustomerGroup {
  id: string
  name: string
  phone: string
  customerType: string
  tags: { id: string; name: string; color: string }[]
  projectCount: number
  activeCount: number
  deliveredCount: number
  totalRevenue: number
  totalBalance: number
  nextShoot: string | null
  lastInteraction: string | null
  projects: {
    id: string
    title: string
    category: string
    status: string
    startDatetime: string | null
    effectivePrice: number | null
    totalPaid: number | null
    balance: number | null
    isDelivered: boolean
  }[]
}

interface CustomerProject {
  id: string
  contractNumber: string
  title: string
  category: string
  status: string
  pricingStrategy: string
  isPriceFrozen: boolean
  isReadyForDelivery: boolean
  startDatetime: string | null
  endDatetime: string | null
  deliveryDeadline: string | null
  printedDescription: string | null
  effectivePrice: number | null
  calculatedPrice: number | null
  discountAmount: number
  priceAdjustment: number
  packageCurrentPrice: number | null
  totalPaid: number | null
  balance: number | null
  // ✅ عکس‌های چاپی — جمع مبلغ + پرداخت + مانده
  printPhotoTotal: number | null
  printPhotoPaid: number | null
  printPhotoBalance: number | null
  isDelivered: boolean
  team: { id: string; name: string; role: string }[]
  payments: {
    id: string
    amount: number
    paymentType: string
    method: string
    datePaid: string
    note: string | null
    isConfirmed: boolean
    recordedBy?: {
      id: string
      firstName: string
      lastName: string
      fullName: string
      role: string
    } | null
  }[]
  notesCount: number
}

interface CustomerNote {
  id: string
  authorName: string | null
  content: string
  attachments: CustomerNoteAttachment[]
  createdAt: string
}

type CustomerNoteAttachmentType = "image" | "audio" | "video" | "file"
interface CustomerNoteAttachment {
  type: CustomerNoteAttachmentType
  url: string
  name: string
  size: number
  mime: string
  thumbUrl?: string
}

interface ProjectNoteItem {
  id: string
  noteType: string
  content: string | null
  attachmentUrl: string | null
  previewUrl: string | null
  isImage?: boolean
  createdAt: string
  author: {
    id: string
    firstName: string
    lastName: string
    fullName: string
    role: string
  } | null
}

// ============================================================
// Main view — 3 levels: customer list → customer projects → project detail
// ============================================================
export function ProjectsView() {
  const { activeProjectId, activeProjectCustomerId } = useWorkspace()

  if (activeProjectId) return <ProjectDetail />
  if (activeProjectCustomerId) return <CustomerProjects />
  return <CustomerList />
}

// ============================================================
// Helpers
// ============================================================
function parseStrArr(v: unknown): any[] {
  if (Array.isArray(v)) return v
  if (typeof v === "string" && v.trim()) {
    try {
      const parsed = JSON.parse(v)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function sameLocalDay(iso: string | null, gregorian: string): boolean {
  if (!iso || !gregorian) return false
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}` === gregorian
}

/** Combine a JalaliDatePicker ISO date with a "HH:MM" 24h time string into a single ISO datetime. */
function combineDateAndTime(dateIso: string | null, time: string): string | null {
  if (!dateIso) return null
  // ✅ FIX: زمان رو به UTC تبدیل می‌کنیم (Tehran time → UTC)
  // اینطوری getTehranHourMinute که از timeZone: "Asia/Tehran" استفاده می‌کنه،
  // دوباره اون رو به Tehran time تبدیل می‌کنه و زمان درست نشون داده می‌شه.
  // مثال: کاربر 15:00 وارد می‌کنه → UTC 11:30 ذخیره می‌شه → تقویم 15:00 نشون می‌ده
  const d = new Date(dateIso)
  if (Number.isNaN(d.getTime())) return null
  // تاریخ رو از JalaliDatePicker بگیر (که یه ISO date هست)
  const datePart = dateIso.split("T")[0] // YYYY-MM-DD
  if (time && /^\d{1,2}:\d{2}$/.test(time)) {
    const [h, m] = time.split(":").map(Number)
    // Tehran = UTC + 3:30 → UTC = Tehran - 3:30
    const tehranOffsetMinutes = 210
    let utcH = (h || 0) - 3  // 3 ساعت کم
    let utcM = (m || 0) - 30 // 30 دقیقه کم
    let finalDate = datePart
    // normalize minutes
    if (utcM < 0) { utcM += 60; utcH -= 1 }
    // normalize hours
    if (utcH < 0) { utcH += 24; finalDate = new Date(new Date(finalDate).getTime() - 86400000).toISOString().split("T")[0] }
    if (utcH >= 24) { utcH -= 24; finalDate = new Date(new Date(finalDate).getTime() + 86400000).toISOString().split("T")[0] }
    return `${finalDate}T${String(utcH).padStart(2, "0")}:${String(utcM).padStart(2, "0")}:00.000Z`
  }
  return `${datePart}T00:00:00.000Z`
}

// ============================================================
// Level 1: Customer list (customers who have projects)
// ============================================================
function CustomerList() {
  const api = useApi()
  const { openProjectCustomer, openProject, role, projectStatusFilter, setProjectStatusFilter, wizardOpen, wizardInitialCustomerId, openProjectWizard, closeProjectWizard } = useWorkspace()
  const [search, setSearch] = React.useState("")
  const [showCompletedOnly, setShowCompletedOnly] = React.useState<"all" | "active" | "delivered">("all")
  const [dateFilter, setDateFilter] = React.useState<string | null>(null)
  const [groupByPackage, setGroupByPackage] = React.useState(false)

  const canCreate = role === "admin" || role === "manager" || role === "sales"

  const { data, isLoading } = useQuery({
    queryKey: ["projects-by-customer"],
    queryFn: () => api.get<{ items: CustomerGroup[]; seeFinance: boolean; seeBalance: boolean }>("/api/projects/by-customer"),
  })

  const items = React.useMemo(() => {
    if (!data?.items) return []
    let list = data.items
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
    }
    if (showCompletedOnly === "active") list = list.filter((c) => c.activeCount > 0)
    // "تکمیل‌شده": only customers whose ALL projects are delivered (no active/incomplete project).
    if (showCompletedOnly === "delivered")
      list = list.filter((c) => c.projectCount > 0 && c.deliveredCount === c.projectCount && c.activeCount === 0)
    // status-flow filter (set by the dashboard's status-flow widget, or by the chip row below)
    if (projectStatusFilter) {
      list = list.filter((c) => c.projects.some((p) => normalizeStatus(p.status) === projectStatusFilter))
    }
    if (dateFilter) {
      // JalaliDatePicker returns an ISO string; sameLocalDay compares the YYYY-MM-DD.
      const gregorian = (() => {
        const d = new Date(dateFilter)
        if (Number.isNaN(d.getTime())) return ""
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, "0")
        const dd = String(d.getDate()).padStart(2, "0")
        return `${yyyy}-${mm}-${dd}`
      })()
      if (gregorian) list = list.filter((c) => c.projects.some((p) => sameLocalDay(p.startDatetime, gregorian)))
    }
    return list
  }, [data, search, showCompletedOnly, dateFilter, projectStatusFilter])

  // Group by package title (when toggle is on)
  const grouped = React.useMemo(() => {
    if (!groupByPackage) return null
    const map = new Map<string, CustomerGroup[]>()
    for (const c of items) {
      const titles = Array.from(new Set(c.projects.map((p) => p.title || "بدون پکیج")))
      for (const t of titles) {
        if (!map.has(t)) map.set(t, [])
        map.get(t)!.push(c)
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
  }, [items, groupByPackage])

  return (
    <div>
      <PageHeader
        title="پروژه‌ها"
        description="پروژه‌ها بر اساس مشتری گروه‌بندی شده‌اند. روی هر مشتری کلیک کنید تا پروژه‌هایش را ببینید."
        icon="🎬"
        actions={
          canCreate ? (
            <Button onClick={() => openProjectWizard(null)}>
              <Plus className="ml-1 h-4 w-4" /> پروژه جدید
            </Button>
          ) : null
        }
      />

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="جستجو بر اساس نام یا تلفن مشتری…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
          {([
            { k: "all", label: "همه" },
            { k: "active", label: "فعال" },
            { k: "delivered", label: "تکمیل‌شده" },
          ] as const).map((opt) => (
            <button
              key={opt.k}
              onClick={() => setShowCompletedOnly(opt.k)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition",
                showCompletedOnly === opt.k
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5">
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground">مشتریان با پروژه در تاریخ</span>
            <div className="min-w-[160px]">
              <JalaliDatePicker
                value={dateFilter}
                onChange={setDateFilter}
                placeholder="انتخاب تاریخ"
              />
            </div>
          </div>
          {dateFilter && (
            <button
              onClick={() => setDateFilter(null)}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="پاک کردن فیلتر تاریخ"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setGroupByPackage((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition",
            groupByPackage
              ? "border-primary/40 bg-primary/10 text-primary"
              : "bg-card text-muted-foreground hover:text-foreground"
          )}
          title="گروه‌بندی بر اساس پکیج"
        >
          <Filter className="h-3.5 w-3.5" />
          گروه‌بندی بر اساس پکیج
        </button>
      </div>

      {/* فیلتر جریان وضعیت — ردیف چیپ‌های وضعیت (هم‌سان با داشبورد) */}
      <div className="mb-4 -mx-1 flex flex-wrap items-center gap-1.5 overflow-x-auto px-1 py-1">
        <span className="ml-1 shrink-0 text-[11px] font-medium text-muted-foreground">وضعیت:</span>
        <button
          onClick={() => setProjectStatusFilter(null)}
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
            !projectStatusFilter
              ? "border-foreground/30 bg-foreground/5 text-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          همه
        </button>
        {STATUS_FLOW.map((st) => {
          const color = STATUS_COLORS[st]
          const active = projectStatusFilter === st
          return (
            <button
              key={st}
              onClick={() => setProjectStatusFilter(active ? null : (st as ProjectStatus))}
              className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition hover:shadow-sm"
              style={{
                background: active ? color + "22" : color + "0d",
                borderColor: active ? color + "99" : color + "44",
              }}
              title={`فیلتر پروژه‌های «${STATUS_LABELS[st]}»`}
              aria-pressed={active}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} aria-hidden />
              <span style={active ? { color } : undefined} className={active ? undefined : "text-foreground/80"}>
                {STATUS_LABELS[st]}
              </span>
            </button>
          )
        })}
        {projectStatusFilter && (
          <button
            onClick={() => setProjectStatusFilter(null)}
            className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground transition hover:text-foreground"
            title="پاک کردن فیلتر وضعیت"
          >
            <X className="h-3 w-3" /> پاک کردن
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="🎬"
          title="پروژه‌ای یافت نشد"
          description="هنوز پروژه‌ای ثبت نشده یا با فیلتر فعلی مطابقت ندارد."
        />
      ) : grouped ? (
        <div className="space-y-5">
          {grouped.map(([pkgTitle, custs]) => (
            <div key={pkgTitle}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Film className="h-4 w-4 text-muted-foreground" />
                  {pkgTitle}
                </h3>
                <Badge variant="secondary" className="text-[10px]">
                  {toPersianDigits(custs.length)} مشتری
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {custs.map((c) => (
                  <CustomerCard key={c.id} c={c} seeBalance={!!data?.seeBalance} onOpen={() => openProjectCustomer(c.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <CustomerCard key={c.id} c={c} seeBalance={!!data?.seeBalance} onOpen={() => openProjectCustomer(c.id)} />
          ))}
        </div>
      )}

      {wizardOpen && (
        <NewProjectWizard
          open={wizardOpen}
          initialCustomerId={wizardInitialCustomerId}
          onOpenChange={(v) => { if (!v) closeProjectWizard() }}
          onCreated={(customerId, newProjectId) => {
            closeProjectWizard()
            // Prefer opening the new project directly; otherwise fall back to the customer list.
            if (newProjectId) {
              openProject(newProjectId)
            } else if (customerId) {
              openProjectCustomer(customerId)
            }
          }}
        />
      )}
    </div>
  )
}

function CustomerCard({
  c,
  seeBalance,
  onOpen,
}: {
  c: CustomerGroup
  seeBalance: boolean
  onOpen: () => void
}) {
  return (
    <button
      onClick={onOpen}
      className="group flex flex-col rounded-xl border bg-card p-4 text-right shadow-sm transition hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-sky-500 to-violet-500 text-xs font-semibold text-white">
              {c.name.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{c.name}</div>
            <div className="text-xs text-muted-foreground" dir="ltr">
              {c.phone}
            </div>
          </div>
        </div>
        <Badge
          variant="secondary"
          className="shrink-0"
          style={{ background: c.customerType === "company" ? "#a855f722" : "#0ea5e922", color: c.customerType === "company" ? "#a855f7" : "#0ea5e9" }}
        >
          {c.customerType === "company" ? "حقوقی" : "حقیقی"}
        </Badge>
      </div>

      {c.tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {c.tags.slice(0, 3).map((t) => (
            <span
              key={t.id}
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ background: t.color + "22", color: t.color }}
            >
              {t.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center">
        <div>
          <div className="text-base font-bold">{toPersianDigits(c.projectCount)}</div>
          <div className="text-[10px] text-muted-foreground">پروژه</div>
        </div>
        <div>
          <div className="text-base font-bold text-emerald-600">{toPersianDigits(c.deliveredCount)}</div>
          <div className="text-[10px] text-muted-foreground">تکمیل‌شده</div>
        </div>
        <div>
          <div className="text-base font-bold text-sky-600">{toPersianDigits(c.activeCount)}</div>
          <div className="text-[10px] text-muted-foreground">فعال</div>
        </div>
      </div>

      {seeBalance && c.totalBalance > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs">
          <span className="text-amber-700 dark:text-amber-400">مانده قابل دریافت</span>
          <span className="font-semibold text-amber-700 dark:text-amber-400">
            {formatRialsShort(c.totalBalance)} تومان
          </span>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <ChevronLeft className="h-3 w-3 rotate-180" /> مشاهده پروژه‌ها
        </span>
        {c.nextShoot && (
          <span className="flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" /> {formatDate(c.nextShoot)}
          </span>
        )}
      </div>
    </button>
  )
}

// ============================================================
// New Project Wizard (3-step)
//   Step 1: Customer (existing search OR new with full fields)
//   Step 2: Package + Pricing + SMS automation assignments
//   Step 3: Schedule (Jalali dates + 12h time) + Team + Freeze price
// ============================================================
interface PkgOption {
  id: string
  title: string
  category: string
  quality: string
  basePrice: number
  currentPrice: number
  pricingStrategy: string
  defaultDescription: string | null
  defaultTasks: any[]
  defaultEquipment: any[]
  isActive: boolean
}
interface CustomerOption {
  id: string
  name: string
  phone: string
  customerType: string
}
interface UserOption {
  id: string
  firstName: string
  lastName: string
  role: string
  isAvailable: boolean
}
interface SmsAutomationOption {
  id: string
  name: string
  templateName: string
  templateText: string
  triggerEvent: string
  offsetDays: number
  isActive: boolean
}
interface TagOption {
  id: string
  name: string
  color: string
}
interface CityOption {
  id: string
  name: string
  province: string | null
}
interface ExtraPhone {
  label: string
  phone: string
}

const PHONE_LABELS: string[] = [
  "همسر",
  "برادر",
  "خواهر",
  "پدر",
  "مادر",
  "فرزند",
  "دیگر",
]

function NewProjectWizard({
  open,
  onOpenChange,
  onCreated,
  initialCustomerId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (customerId?: string, newProjectId?: string) => void
  // ✅ When provided, the wizard starts at step 2 with this customer pre-selected
  // (skipping the customer-picker step). Used by the "پروژه جدید برای این مشتری"
  // buttons in the customer profile sheet and CustomerProjects page.
  initialCustomerId?: string | null
}) {
  const api = useApi()
  const qc = useQueryClient()
  const { role } = useWorkspace()
  const [step, setStep] = React.useState(1)

  const canFreeze = role === "admin" || role === "manager"

  // ---- Step 1: customer ----
  const [customerMode, setCustomerMode] = React.useState<"existing" | "new">("existing")
  const [customerId, setCustomerId] = React.useState<string | null>(null)
  const [customerSearch, setCustomerSearch] = React.useState("")
  // ✅ Pre-selected customer's display name (when `initialCustomerId` is set),
  // shown in the dialog header so the user knows which customer the new project
  // is being created for.
  const [initialCustomerName, setInitialCustomerName] = React.useState<string | null>(null)
  // New-customer form
  const [newName, setNewName] = React.useState("")
  const [newPhone, setNewPhone] = React.useState("")
  const [newType, setNewType] = React.useState<"individual" | "company">("individual")
  const [newProfileImage, setNewProfileImage] = React.useState<string | null>(null)
  const [newExtraPhones, setNewExtraPhones] = React.useState<ExtraPhone[]>([])
  const [newCity, setNewCity] = React.useState("")
  const [newAddress, setNewAddress] = React.useState("")
  const [newBirthDate, setNewBirthDate] = React.useState<string | null>(null)
  const [newEngagementDate, setNewEngagementDate] = React.useState<string | null>(null)
  const [newWeddingDate, setNewWeddingDate] = React.useState<string | null>(null)
  const [newTagIds, setNewTagIds] = React.useState<string[]>([])
  const [newReferrerId, setNewReferrerId] = React.useState<string | null>(null)

  // ---- Step 2: package + pricing + sms + schedule ----
  const [packageId, setPackageId] = React.useState("")
  const [pricingStrategy, setPricingStrategy] = React.useState("")
  const [discountToman, setDiscountToman] = React.useState(0)
  const [priceAdjustmentToman, setPriceAdjustmentToman] = React.useState(0)
  // smsAssignments: { enabled, override (number | null = use default) }
  const [smsStates, setSmsStates] = React.useState<Record<string, { enabled: boolean; override: string }>>({})
  // Editable description + tasks/equipment (with prices) — customized per-project
  const [editedDescription, setEditedDescription] = React.useState("")
  const [editedTasks, setEditedTasks] = React.useState<{ name: string; price: number }[]>([])
  const [editedEquipment, setEditedEquipment] = React.useState<{ name: string; price: number }[]>([])
  // Package filters
  const [pkgCategoryFilter, setPkgCategoryFilter] = React.useState("all")
  const [pkgQualityFilter, setPkgQualityFilter] = React.useState("all")

  // ---- Step 3: team + schedule + multi-location + notes ----
  const [executionDate, setExecutionDate] = React.useState<string | null>(null)
  const [startTime, setStartTime] = React.useState("")
  const [endTime, setEndTime] = React.useState("")
  const [referralRewardToman, setReferralRewardToman] = React.useState(0)
  // ✅ Multi-select locations + schedule notes (replaces single ProjectLocationPicker)
  const [selectedLocationIds, setSelectedLocationIds] = React.useState<string[]>([])
  const [scheduleNotes, setScheduleNotes] = React.useState("")
  const [fieldTeamIds, setFieldTeamIds] = React.useState<string[]>([])
  const [isPriceFrozen, setIsPriceFrozen] = React.useState(false)
  // ✅ آتلیه — flag for studio-shoot projects (wizard step 3)
  const [isStudio, setIsStudio] = React.useState(false)

  // ---- Data fetches ----
  const { data: customerResults, isLoading: customersLoading } = useQuery({
    queryKey: ["wizard-customers-search", customerSearch],
    queryFn: () =>
      api
        .get<{ items: CustomerOption[] }>(
          `/api/customers?limit=20${customerSearch ? `&search=${encodeURIComponent(customerSearch)}` : ""}`
        )
        .then((r) => r.items)
        .catch(() => [] as CustomerOption[]),
    enabled: open && customerMode === "existing",
  })

  const { data: packages } = useQuery({
    queryKey: ["wizard-packages"],
    queryFn: () => api.get<PkgOption[]>("/api/packages?activeOnly=true"),
    enabled: open,
  })

  const { data: users } = useQuery({
    queryKey: ["wizard-users"],
    queryFn: () => api.get<UserOption[]>("/api/users").catch(() => [] as UserOption[]),
    enabled: open,
  })

  const { data: smsAutomations } = useQuery({
    queryKey: ["wizard-sms-automations"],
    queryFn: () =>
      api
        .get<{ items: SmsAutomationOption[] }>("/api/sms-automations")
        .then((r) => r.items)
        .catch(() => [] as SmsAutomationOption[]),
    enabled: open,
  })

  const { data: allTags } = useQuery({
    queryKey: ["wizard-tags"],
    queryFn: () => api.get<TagOption[]>("/api/tags").catch(() => [] as TagOption[]),
    enabled: open && customerMode === "new",
  })

  const { data: cities } = useQuery({
    queryKey: ["wizard-cities"],
    queryFn: () =>
      api
        .get<{ items: CityOption[] }>("/api/cities")
        .then((r) => r.items)
        .catch(() => [] as CityOption[]),
    enabled: open && customerMode === "new",
  })

  // Referrer search combobox state
  const [referrerQuery, setReferrerQuery] = React.useState("")
  const [referrerResults, setReferrerResults] = React.useState<CustomerOption[]>([])
  React.useEffect(() => {
    if (!open || customerMode !== "new") return
    let cancelled = false
    const params = new URLSearchParams({ limit: "20" })
    if (referrerQuery) params.set("search", referrerQuery)
    fetch(`/api/customers?${params.toString()}`, {
      headers: { "x-demo-role": role },
    })
      .then((r) => r.json())
      .then((data: { items: CustomerOption[] }) => {
        if (cancelled) return
        setReferrerResults(data.items || [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [open, customerMode, referrerQuery, role])

  // ✅ Initialize the wizard state when the dialog opens.
  //   - If `initialCustomerId` is provided → skip to step 2 with that customer
  //     pre-selected (used by the "پروژه جدید برای این مشتری" buttons).
  //   - Otherwise → start at step 1 with no customer (default flow).
  // We also fetch the pre-selected customer's name for display in the header.
  React.useEffect(() => {
    if (!open) return
    if (initialCustomerId) {
      setCustomerId(initialCustomerId)
      setCustomerMode("existing")
      setStep(2)
      // Best-effort name lookup for the dialog header.
      api
        .get<{ items: CustomerOption[] }>(`/api/customers?limit=1&search=${encodeURIComponent(initialCustomerId)}`)
        .then((r) => {
          const found = (r.items ?? []).find((c) => c.id === initialCustomerId)
          if (found) setInitialCustomerName(found.name)
        })
        .catch(() => {})
    } else {
      setStep(1)
      setCustomerId(null)
      setInitialCustomerName(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCustomerId])

  // Sync editable description/tasks/equipment when package changes
  const lastPkgIdRef = React.useRef<string>("")
  React.useEffect(() => {
    if (!packageId || packageId === lastPkgIdRef.current) return
    lastPkgIdRef.current = packageId
    const pkg = (packages ?? []).find((p) => p.id === packageId)
    if (pkg) {
      setEditedDescription(pkg.defaultDescription ?? "")
      // Convert tasks/equipment to {name, price} format (handle both string and object)
      setEditedTasks(
        (pkg.defaultTasks || []).map((t: any) =>
          typeof t === "string" ? { name: t, price: 0 } : { name: t.name || "", price: Number(t.price) || 0 }
        )
      )
      setEditedEquipment(
        (pkg.defaultEquipment || []).map((e: any) =>
          typeof e === "string" ? { name: e, price: 0 } : { name: e.name || "", price: Number(e.price) || 0 }
        )
      )
      // ✅ سود معرف پیش‌فرض از پکیج
      const pkgReward = (pkg as any).defaultReferralReward ?? 0
      setReferralRewardToman(Math.round(Number(pkgReward) / 10)) // Rials → Toman
      if (!pricingStrategy) setPricingStrategy(pkg.pricingStrategy)
    }
  }, [packageId, packages, pricingStrategy])

  // ---- Pricing preview ----
  const selectedPkg = (packages ?? []).find((p) => p.id === packageId) ?? null
  const basePriceToman = selectedPkg ? Math.round(selectedPkg.currentPrice / 10) : 0
  const adjustedPriceToman = Math.max(0, basePriceToman + priceAdjustmentToman)
  const finalPriceToman = Math.max(0, adjustedPriceToman - discountToman)

  // Filtered packages for step 2 grid
  const filteredPackages = (packages ?? []).filter((p) => {
    if (pkgCategoryFilter !== "all" && p.category !== pkgCategoryFilter) return false
    if (pkgQualityFilter !== "all" && p.quality !== pkgQualityFilter) return false
    return true
  })

  // ---- Submit ----
  const createMut = useMutation({
    mutationFn: async () => {
      // ✅ date + start time = startDatetime; date + end time = endDatetime
      const startIso = combineDateAndTime(executionDate, startTime)
      const endIso = combineDateAndTime(executionDate, endTime)

      const payload: Record<string, unknown> = {
        customerId,
        servicePackageId: packageId,
        // ✅ Strategy inherits from the package automatically (no UI selector in wizard).
        customDescription: editedDescription.trim() || undefined,
        customTasks: editedTasks.filter((t) => t.name.trim().length > 0),
        customEquipment: editedEquipment.filter((e) => e.name.trim().length > 0),
        discountAmount: discountToman > 0 ? discountToman : 0,
        priceAdjustment: priceAdjustmentToman || 0,
        // ✅ اعتبار معرف (Toman → API تبدیل به Rials می‌کنه)
        referralRewardOverride: referralRewardToman || 0,
        // ✅ Schedule: single execution date + start/end time. deliveryDeadline removed.
        startDatetime: startIso || undefined,
        endDatetime: endIso || undefined,
        deliveryDeadline: undefined, // explicitly removed from wizard
        fieldTeamIds,
        isPriceFrozen,
        // ✅ آتلیه — flag for studio-shoot projects
        isStudio,
      }

      // ✅ Build schedules array — one ProjectSchedule entry per selected location,
      // each carrying the same execution date/time and the schedule notes.
      if (selectedLocationIds.length > 0) {
        const trimmedNotes = scheduleNotes.trim()
        payload.schedules = selectedLocationIds.map((locId) => ({
          locationId: locId,
          startDatetime: startIso,
          endDatetime: endIso,
          note: trimmedNotes || undefined,
        }))
      }

      // SMS assignments: collect enabled ones (with override if provided)
      const enabledSms = (smsAutomations ?? [])
        .filter((a) => smsStates[a.id]?.enabled)
        .map((a) => {
          const ov = smsStates[a.id]?.override
          const num = ov === "" || ov == null ? null : Number(ov)
          return {
            automationId: a.id,
            enabled: true,
            offsetDaysOverride:
              num != null && Number.isFinite(num) ? Math.round(num) : null,
          }
        })
      if (enabledSms.length > 0) {
        payload.smsAssignments = enabledSms
      }

      const res = await api.post<{ id: string; customerId?: string }>("/api/projects", payload)
      return res
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["projects-by-customer"] })
      qc.invalidateQueries({ queryKey: ["customer-projects"] })
      qc.invalidateQueries({ queryKey: ["calendar-events"] })
      toast.success("پروژه با موفقیت ساخته شد")
      onCreated(
        customerMode === "existing" ? customerId ?? undefined : res.customerId,
        res.id
      )
      reset()
    },
    onError: (e: Error) => toast.error(e.message || "ساخت پروژه ناموفق بود"),
  })

  function reset() {
    setStep(1)
    setCustomerId(null)
    setCustomerSearch("")
    setPackageId("")
    setPricingStrategy("")
    setEditedDescription("")
    setEditedTasks([])
    setEditedEquipment([])
    setDiscountToman(0)
    setSmsStates({})
    setExecutionDate(null)
    setStartTime("")
    setEndTime("")
    setSelectedLocationIds([])
    setScheduleNotes("")
    setFieldTeamIds([])
    setIsPriceFrozen(false)
    // ✅ آتلیه — reset studio flag too
    setIsStudio(false)
    lastPkgIdRef.current = ""
  }

  function close() {
    onOpenChange(false)
    reset()
  }

  // ---- Step validation ----
  const step1Valid = !!customerId
  const step2Valid = !!packageId

  // ---- Team filters ----
  // تیم اجرایی: عکاس، تصویربردار، کادر حرفه‌ای
  // (تیم استودیو/ادیت و تدوین از wizard حذف شده — فقط تیم اجرایی انتخاب می‌شود.)
  const photographers = (users ?? []).filter((u) => ["photographer", "videographer", "pro_crew"].includes(migrateRole(u.role)))

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : close())}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {initialCustomerName
              ? `پروژه جدید برای ${initialCustomerName}`
              : "ساخت پروژه جدید"}
          </DialogTitle>
          <DialogDescription>
            {initialCustomerName
              ? "مشتری از قبل انتخاب شده — مستقیم به گام ۲ بروید."
              : "با طی کردن سه گام، پروژه را ثبت کنید."}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="mb-4 flex items-center justify-between gap-2">
          {[
            { n: 1, label: "انتخاب مشتری" },
            { n: 2, label: "پکیج، قیمت و پیامک" },
            { n: 3, label: "تیم و زمان اجرا" },
          ].map((s) => (
            <div key={s.n} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                  step >= s.n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {toPersianDigits(s.n)}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  step >= s.n ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
              {s.n < 3 && <div className="h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>

        {/* =====================================================
            Step 1: Customer
        ===================================================== */}
        {step === 1 && (
          <div className="space-y-4">
            <ExistingCustomerPicker
              search={customerSearch}
              onSearchChange={setCustomerSearch}
              results={customerResults ?? []}
              loading={customersLoading}
              selectedId={customerId}
              onSelect={(c) => setCustomerId(c.id)}
              onClear={() => setCustomerId(null)}
            />
            {!customerId && (
              <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-center text-xs text-muted-foreground">
                برای افزودن مشتری جدید، به بخش «مشتریان» مراجعه کنید.
              </div>
            )}
          </div>
        )}

        {/* =====================================================
            Step 2: Package + Pricing + SMS
        ===================================================== */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Package selector with filter */}
            <div>
              <Label className="mb-2 block text-xs font-semibold">انتخاب پکیج خدمت *</Label>
              {/* Filter bar */}
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Select value={pkgCategoryFilter} onValueChange={setPkgCategoryFilter}>
                  <SelectTrigger className="h-8 w-full sm:w-[130px]">
                    <SelectValue placeholder="دسته‌بندی" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه دسته‌ها</SelectItem>
                    <SelectItem value="photo">عکس</SelectItem>
                    <SelectItem value="video">فیلم</SelectItem>
                    <SelectItem value="mix">عکس و فیلم</SelectItem>
                    <SelectItem value="other">سایر</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={pkgQualityFilter} onValueChange={setPkgQualityFilter}>
                  <SelectTrigger className="h-8 w-full sm:w-[110px]">
                    <SelectValue placeholder="کیفیت" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه کیفیت‌ها</SelectItem>
                    <SelectItem value="fullhd">Full HD</SelectItem>
                    <SelectItem value="4k">4K</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Package cards grid */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPackages.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPackageId(p.id)
                      setPricingStrategy(p.pricingStrategy)
                    }}
                    className={cn(
                      "rounded-lg border p-3 text-right transition",
                      packageId === p.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "bg-card hover:bg-muted/40"
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{p.title}</span>
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: CATEGORY_COLORS[p.category as keyof typeof CATEGORY_COLORS] }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-bold text-emerald-600">{formatRials(p.currentPrice)} ت</span>
                      <span className="text-muted-foreground">
                        {p.quality === "4k" ? "4K" : "Full HD"} · {CATEGORY_LABELS[p.category as keyof typeof CATEGORY_LABELS] ?? p.category}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected package details — editable */}
            {selectedPkg && (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: CATEGORY_COLORS[selectedPkg.category as keyof typeof CATEGORY_COLORS] }}
                    />
                    <span className="text-sm font-semibold">{selectedPkg.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="secondary" className="text-[10px]">
                      {CATEGORY_LABELS[selectedPkg.category as keyof typeof CATEGORY_LABELS] ?? selectedPkg.category}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {selectedPkg.quality === "4k" ? "4K" : "Full HD"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {PRICING_STRATEGY_LABELS[selectedPkg.pricingStrategy as keyof typeof PRICING_STRATEGY_LABELS] ?? selectedPkg.pricingStrategy}
                    </Badge>
                  </div>
                </div>

                {/* Price — single price, bold */}
                <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
                  <span className="text-xs text-muted-foreground">قیمت پکیج</span>
                  <span className="text-base font-bold text-emerald-600">{formatRials(selectedPkg.currentPrice)} تومان</span>
                </div>

                {/* Editable description */}
                <div>
                  <Label className="mb-1.5 block text-xs font-medium">توضیحات پکیج (قابل ویرایش برای این پروژه)</Label>
                  <Textarea
                    rows={3}
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    placeholder="توضیحات پکیج…"
                    className="text-xs"
                  />
                </div>

                {/* Editable tasks — with price */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <Label className="text-xs font-medium">کارهای پیش‌فرض (با قیمت راهنما)</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => setEditedTasks([...editedTasks, { name: "", price: 0 }])}
                    >
                      <Plus className="ml-1 size-3" /> افزودن
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {editedTasks.map((task, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <Input
                          value={task.name}
                          onChange={(e) => {
                            const next = [...editedTasks]
                            next[i] = { ...next[i], name: e.target.value }
                            setEditedTasks(next)
                          }}
                          className="h-8 flex-1 text-xs"
                          placeholder="نام کار…"
                        />
                        <Input
                          type="number"
                          dir="ltr"
                          value={task.price || ""}
                          onChange={(e) => {
                            const next = [...editedTasks]
                            next[i] = { ...next[i], price: Number(e.target.value) || 0 }
                            setEditedTasks(next)
                          }}
                          className="h-8 w-28 text-left text-xs"
                          placeholder="قیمت"
                        />
                        <span className="shrink-0 text-[9px] text-muted-foreground">ت</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0 text-muted-foreground hover:text-rose-600"
                          onClick={() => setEditedTasks(editedTasks.filter((_, idx) => idx !== i))}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                    {editedTasks.length === 0 && (
                      <p className="text-[10px] text-muted-foreground">کاری ثبت نشده.</p>
                    )}
                  </div>
                </div>

                {/* Editable equipment — with price */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <Label className="text-xs font-medium">تجهیزات (با قیمت راهنما)</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => setEditedEquipment([...editedEquipment, { name: "", price: 0 }])}
                    >
                      <Plus className="ml-1 size-3" /> افزودن
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {editedEquipment.map((eq, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <Input
                          value={eq.name}
                          onChange={(e) => {
                            const next = [...editedEquipment]
                            next[i] = { ...next[i], name: e.target.value }
                            setEditedEquipment(next)
                          }}
                          className="h-8 flex-1 text-xs"
                          placeholder="نام تجهیز…"
                        />
                        <Input
                          type="number"
                          dir="ltr"
                          value={eq.price || ""}
                          onChange={(e) => {
                            const next = [...editedEquipment]
                            next[i] = { ...next[i], price: Number(e.target.value) || 0 }
                            setEditedEquipment(next)
                          }}
                          className="h-8 w-28 text-left text-xs"
                          placeholder="قیمت"
                        />
                        <span className="shrink-0 text-[9px] text-muted-foreground">ت</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0 text-muted-foreground hover:text-rose-600"
                          onClick={() => setEditedEquipment(editedEquipment.filter((_, idx) => idx !== i))}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                    {editedEquipment.length === 0 && (
                      <p className="text-[10px] text-muted-foreground">تجهیزی ثبت نشده.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ✅ Pricing strategy selector was REMOVED from the wizard.
                The project inherits the package's pricingStrategy automatically.
                Discount + price adjustment + freeze remain. */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-3">
                {/* Strategy info card (read-only badge — derived from the selected package) */}
                <div className="rounded-md border bg-muted/30 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">استراتژی قیمت‌گذاری:</span>
                    {selectedPkg ? (
                      <Badge variant="secondary" className="text-[10px] font-semibold">
                        {PRICING_STRATEGY_LABELS[selectedPkg.pricingStrategy as keyof typeof PRICING_STRATEGY_LABELS] ?? selectedPkg.pricingStrategy}
                      </Badge>
                    ) : (
                      <span className="text-[10px] font-medium text-amber-600">ابتدا یک پکیج انتخاب کنید</span>
                    )}
                  </div>
                  <div className="mt-1.5 text-[10px] text-muted-foreground">
                    استراتژی به‌صورت خودکار از پکیج انتخاب می‌شود و در این مرحله قابل تغییر نیست.
                  </div>
                </div>
                {/* Price freeze — next to strategy info */}
                <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5">
                  <Checkbox
                    checked={isPriceFrozen}
                    onCheckedChange={(v) => setIsPriceFrozen(Boolean(v))}
                  />
                  <Lock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px]">فریز قیمت (قفل قیمت در برابر تغییرات پکیج)</span>
                </label>
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="mb-1.5 block text-xs">اصلاح قیمت (تومان)</Label>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-rose-600"
                      onClick={() => setPriceAdjustmentToman(Math.max(-basePriceToman, priceAdjustmentToman - 50000))}
                      title="کسر ۵۰ هزار"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      dir="ltr"
                      value={priceAdjustmentToman ? Number(priceAdjustmentToman).toLocaleString("en-US") : ""}
                      onChange={(e) => {
                        const v = Number(e.target.value.replace(/[^0-9-]/g, "")) || 0
                        setPriceAdjustmentToman(v)
                      }}
                      placeholder="0"
                      className="h-9 flex-1 text-center font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-emerald-600"
                      onClick={() => setPriceAdjustmentToman(priceAdjustmentToman + 50000)}
                      title="افزایش ۵۰ هزار"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {priceAdjustmentToman > 0 ? "افزایش" : priceAdjustmentToman < 0 ? "کسر" : "بدون تغییر"} قیمت
                    {priceAdjustmentToman !== 0 && `: ${toPersianDigits(Math.abs(priceAdjustmentToman).toLocaleString("fa-IR"))} تومان`}
                  </p>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">تخفیف (تومان)</Label>
                  <Input
                    dir="ltr"
                    value={discountToman ? Number(discountToman).toLocaleString("en-US") : ""}
                    onChange={(e) => setDiscountToman(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
                    placeholder="0"
                    className="h-9 text-center font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Bold price preview */}
            <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <div className="text-[10px] text-muted-foreground">قیمت پکیج</div>
                  <div className="text-sm font-bold tabular-nums">{formatRials(selectedPkg ? selectedPkg.currentPrice : 0)} ت</div>
                </div>
                {priceAdjustmentToman !== 0 && (
                  <div>
                    <div className="text-[10px] text-muted-foreground">اصلاح قیمت</div>
                    <div className={cn("text-sm font-bold tabular-nums", priceAdjustmentToman > 0 ? "text-sky-600" : "text-rose-600")}>
                      {priceAdjustmentToman > 0 ? "+ " : "− "}{formatRials(Math.abs(priceAdjustmentToman * 10))} ت
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-[10px] text-muted-foreground">تخفیف</div>
                  <div className="text-sm font-bold tabular-nums text-amber-600">− {formatRials(discountToman * 10)} ت</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">قیمت نهایی</div>
                  <div className="text-base font-bold tabular-nums text-emerald-600">{formatRials(finalPriceToman * 10)} ت</div>
                </div>
              </div>
            </div>

            {/* ✅ اعتبار معرف (referral reward) */}
            <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-800 dark:bg-violet-950/20">
              <Label className="mb-1.5 block text-xs font-medium">اعتبار معرف (تومان)</Label>
              <div className="flex items-center gap-2">
                <Input
                  dir="ltr"
                  value={referralRewardToman ? Number(referralRewardToman).toLocaleString("en-US") : ""}
                  onChange={(e) => setReferralRewardToman(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
                  placeholder="0"
                  className="h-9 text-center font-mono text-sm"
                />
                <span className="shrink-0 text-[10px] text-muted-foreground">تومان</span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                این مبلغ به اعتبار مشتری معرف اضافه می‌شود. مقدار پیش‌فرض از پکیج گرفته شده است.
              </p>
            </div>

            {/* Freeze price — moved from step 3, disabled initially */}
            {canFreeze && (
              <label className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border bg-muted/30 p-3",
                !packageId && "opacity-50"
              )}>
                <Checkbox
                  checked={isPriceFrozen}
                  onCheckedChange={(v) => setIsPriceFrozen(Boolean(v))}
                  disabled={!packageId}
                />
                <span className="flex items-center gap-1.5 text-xs">
                  <Snowflake className="h-3.5 w-3.5 text-sky-500" />
                  فریز قیمت (قفل قیمت فعلی در برابر تغییرات پکیج)
                </span>
              </label>
            )}

            {/* SMS Automation assignments */}
            <div className="rounded-lg border bg-card p-3">
              <div className="mb-2 flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold">اتوماسیون پیامک برای این پروژه</span>
              </div>
              {(smsAutomations ?? []).length === 0 ? (
                <p className="rounded-md border border-dashed py-3 text-center text-[11px] text-muted-foreground">
                  هیچ اتوماسیون پیامکی تعریف نشده است. به «تنظیمات ← قالب‌های پیامک» بروید.
                </p>
              ) : (
                <div className="max-h-56 space-y-1.5 overflow-y-auto scroll-thin pl-1">
                  {(smsAutomations ?? []).map((a) => {
                    const st = smsStates[a.id] ?? { enabled: false, override: "" }
                    return (
                      <div
                        key={a.id}
                        className={cn(
                          "rounded-md border p-2 transition",
                          st.enabled ? "border-primary/30 bg-primary/5" : "bg-muted/20"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <Checkbox
                            checked={st.enabled}
                            onCheckedChange={(v) =>
                              setSmsStates((prev) => ({
                                ...prev,
                                [a.id]: { ...st, enabled: Boolean(v) },
                              }))
                            }
                            className="mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="truncate text-xs font-medium">{a.name}</span>
                              <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
                                {TRIGGER_EVENT_LABELS[a.triggerEvent as keyof typeof TRIGGER_EVENT_LABELS] ?? a.triggerEvent}
                              </Badge>
                              {!a.isActive && (
                                <span className="text-[9px] text-amber-600">(غیرفعال)</span>
                              )}
                            </div>
                            <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                              {a.templateName}: {a.templateText.slice(0, 60)}
                              {a.templateText.length > 60 ? "…" : ""}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Label className="text-[10px] text-muted-foreground">فاصله (روز):</Label>
                            <Input
                              type="number"
                              dir="ltr"
                              value={st.override}
                              onChange={(e) =>
                                setSmsStates((prev) => ({
                                  ...prev,
                                  [a.id]: { ...st, override: e.target.value },
                                }))
                              }
                              placeholder={toPersianDigits(String(a.offsetDays))}
                              className="h-7 w-16 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <p className="mt-2 text-[10px] text-muted-foreground">
                برای مدیریت اتوماسیون‌ها به «تنظیمات ← قالب‌های پیامک» بروید.
              </p>
            </div>

            {/* ✅ آتلیه — checkbox for studio-shoot projects (placed at the bottom of step 2) */}
            <div className="rounded-lg border bg-card p-3">
              <label className="flex cursor-pointer items-start gap-2.5 text-right" dir="rtl">
                <Checkbox
                  checked={isStudio}
                  onCheckedChange={(v) => setIsStudio(Boolean(v))}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">آتلیه</div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed">
                    این پروژه در آتلیه استودیو انجام می‌شود
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* =====================================================
            Step 3: Schedule + Multi-Location + Notes + Map + Team
        ===================================================== */}
        {step === 3 && (
          <div className="space-y-4">
            {/* ✅ زمان‌بندی اجرا — یک تاریخ + ساعت شروع + ساعت پایان */}
            <div className="rounded-lg border bg-card p-3">
              <h4 className="mb-3 text-sm font-semibold">زمان و تاریخ اجرا</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label className="mb-1.5 block text-xs">تاریخ اجرا</Label>
                  <JalaliDatePicker
                    value={executionDate}
                    onChange={setExecutionDate}
                    placeholder="انتخاب تاریخ"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">ساعت شروع</Label>
                  <TimeWheelPicker value={startTime || undefined} onChange={setStartTime} />
                  {startTime && (
                    <div className="text-center text-[10px] text-muted-foreground">{formatTime12h(startTime)}</div>
                  )}
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">ساعت پایان</Label>
                  <TimeWheelPicker value={endTime || undefined} onChange={setEndTime} />
                  {endTime && (
                    <div className="text-center text-[10px] text-muted-foreground">{formatTime12h(endTime)}</div>
                  )}
                </div>
              </div>
            </div>

            {/* ✅ مکان‌های اجرا — multi-select با جستجو + افزودن مکان جدید */}
            <WizardMultiLocationPicker
              selectedLocationIds={selectedLocationIds}
              onChange={setSelectedLocationIds}
            />

            {/* ✅ توضیحات مکان و زمان اجرا */}
            <div className="rounded-lg border bg-card p-3">
              <h4 className="mb-2 text-sm font-semibold">توضیحات مکان و زمان اجرا</h4>
              <Textarea
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                placeholder="مثلاً: مراسم عقد در هتل اسپیناس ساعت ۱۸، عکس‌برداری استودیویی قبل از مراسم…"
                rows={3}
                className="resize-none text-sm"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                این یادداشت روی همه زمان‌بندی‌های این پروژه ذخیره می‌شود.
              </p>
            </div>

            {/* ✅ نقشه گوگل — نمایش مکان انتخاب‌شده */}
            <WizardGoogleMapsEmbed
              selectedLocationIds={selectedLocationIds}
            />

            {/* ✅ تیم */}
            <div className="rounded-lg border bg-card p-3">
              <h4 className="mb-3 text-sm font-semibold">تیم اجرایی</h4>
              {users && users.length > 0 ? (
                <div className="grid gap-3">
                  <TeamPicker
                    label="تیم اجرایی (عکاس/تصویربردار)"
                    options={photographers}
                    selected={fieldTeamIds}
                    onChange={setFieldTeamIds}
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">
                  کاربری برای انتخاب تیم وجود ندارد. به «تنظیمات ← کارمندان» بروید.
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={close}>انصراف</Button>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)}>قبلی</Button>
          )}
          {step < 3 ? (
            <Button
              disabled={(step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
              onClick={() => setStep((s) => s + 1)}
            >
              بعدی
            </Button>
          ) : (
            <Button disabled={createMut.isPending} onClick={() => createMut.mutate()}>
              {createMut.isPending ? "در حال ثبت…" : "ثبت پروژه"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- Wizard sub-components ----

function ExistingCustomerPicker({
  search,
  onSearchChange,
  results,
  loading,
  selectedId,
  onSelect,
  onClear,
}: {
  search: string
  onSearchChange: (v: string) => void
  results: CustomerOption[]
  loading: boolean
  selectedId: string | null
  onSelect: (c: CustomerOption) => void
  onClear: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const selected = results.find((r) => r.id === selectedId) ?? null

  return (
    <div>
      <Label className="mb-1.5 block text-xs">انتخاب مشتری موجود *</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal"
          >
            {selected ? (
              <span className="flex items-center gap-2 truncate">
                <UserIcon className="size-3.5 text-muted-foreground" />
                <span className="truncate">{selected.name}</span>
                <span className="text-xs text-muted-foreground" dir="ltr">{selected.phone}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">جستجوی نام یا تلفن مشتری…</span>
            )}
            <ChevronDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[420px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="جستجو بر اساس نام یا تلفن…"
              value={search}
              onValueChange={onSearchChange}
            />
            <CommandList>
              {loading && (
                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                  <Loader2 className="mr-2 size-3.5 animate-spin" /> در حال بارگذاری…
                </div>
              )}
              {!loading && results.length === 0 && (
                <CommandEmpty>مشتری‌ای یافت نشد.</CommandEmpty>
              )}
              <CommandGroup>
                {selectedId && (
                  <CommandItem
                    onSelect={onClear}
                    className="text-muted-foreground"
                  >
                    <X className="size-3.5" />
                    پاک کردن انتخاب
                  </CommandItem>
                )}
                {results.map((c) => (
                  <CommandItem
                    key={c.id}
                    onSelect={() => {
                      onSelect(c)
                      setOpen(false)
                    }}
                    className="justify-between"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <UserIcon className="size-3.5 text-muted-foreground" />
                      <span className="truncate">{c.name}</span>
                      <Badge variant="secondary" className="text-[9px]">
                        {c.customerType === "company" ? "حقوقی" : "حقیقی"}
                      </Badge>
                    </span>
                    <span className="text-xs text-muted-foreground" dir="ltr">{c.phone}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p className="mt-1 text-[10px] text-muted-foreground">
        جستجو بر اساس نام یا شماره تلفن انجام می‌شود.
      </p>
    </div>
  )
}

function CityCombobox({
  value,
  onChange,
  cities,
}: {
  value: string
  onChange: (v: string) => void
  cities: CityOption[]
}) {
  return (
    <div className="relative">
      <Input
        dir="rtl"
        list="wizard-city-list"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="مثلاً تهران"
        className="pr-8"
      />
      <MapPin className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <datalist id="wizard-city-list">
        {cities.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>
    </div>
  )
}

function MiniExtraPhonesEditor({
  value,
  onChange,
}: {
  value: ExtraPhone[]
  onChange: (v: ExtraPhone[]) => void
}) {
  const rows = value
  return (
    <div className="space-y-1.5">
      {rows.length === 0 && (
        <p className="rounded-md border border-dashed py-2 text-center text-[10px] text-muted-foreground">
          شماره اضافی ثبت نشده
        </p>
      )}
      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-[110px_1fr_auto] items-end gap-1.5">
          <Select
            value={row.label || "دیگر"}
            onValueChange={(v) => {
              const next = [...rows]
              next[idx] = { ...row, label: v }
              onChange(next)
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PHONE_LABELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            dir="ltr"
            value={row.phone}
            onChange={(e) => {
              const next = [...rows]
              next[idx] = { ...row, phone: e.target.value }
              onChange(next)
            }}
            placeholder="0912…"
            className="h-8 text-left text-xs"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-rose-600"
            onClick={() => onChange(rows.filter((_, i) => i !== idx))}
            aria-label="حذف"
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...rows, { label: "همسر", phone: "" }])}
        className="h-7 text-xs"
      >
        <Plus className="mr-1 size-3" /> افزودن شماره
      </Button>
    </div>
  )
}

function MiniTagsPicker({
  allTags,
  selected,
  onChange,
}: {
  allTags: TagOption[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between font-normal"
        >
          <span className="flex items-center gap-1.5 truncate">
            <TagIcon className="size-3.5 text-muted-foreground" />
            {selected.length === 0 ? (
              <span className="text-muted-foreground">بدون تگ</span>
            ) : (
              <span className="truncate">
                {allTags
                  .filter((t) => selected.includes(t.id))
                  .map((t) => t.name)
                  .join("، ")}
              </span>
            )}
          </span>
          <ChevronDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>تگی موجود نیست.</CommandEmpty>
            <CommandGroup>
              {allTags.map((t) => {
                const checked = selected.includes(t.id)
                return (
                  <CommandItem
                    key={t.id}
                    onSelect={() => {
                      if (checked) onChange(selected.filter((id) => id !== t.id))
                      else onChange([...selected, t.id])
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
                      <span>{t.name}</span>
                      {checked && <CheckCheck className="h-3 w-3 text-emerald-600" />}
                    </span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function MiniReferrerCombobox({
  value,
  onChange,
  query,
  onQueryChange,
  results,
}: {
  value: string | null
  onChange: (id: string | null) => void
  query: string
  onQueryChange: (v: string) => void
  results: CustomerOption[]
}) {
  const [open, setOpen] = React.useState(false)
  const selected = results.find((r) => r.id === value) ?? null
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <UserIcon className="size-3.5 text-muted-foreground" />
              <span className="truncate">{selected.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">بدون معرف</span>
          )}
          <ChevronDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="جستجوی معرف…"
            value={query}
            onValueChange={onQueryChange}
          />
          <CommandList>
            <CommandEmpty>مشتری‌ای یافت نشد.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  onChange(null)
                  setOpen(false)
                }}
                className="text-muted-foreground"
              >
                <X className="size-3.5" />
                پاک کردن معرف
              </CommandItem>
              {results.map((c) => (
                <CommandItem
                  key={c.id}
                  onSelect={() => {
                    onChange(c.id)
                    setOpen(false)
                  }}
                  className="justify-between"
                >
                  <span className="flex items-center gap-2 truncate">
                    <UserIcon className="size-3.5 text-muted-foreground" />
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="text-xs text-muted-foreground" dir="ltr">{c.phone}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ✅ Project Location Picker — searchable combobox + address input
function ProjectLocationPicker({
  address,
  onAddressChange,
  locationId,
  onLocationChange,
}: {
  address: string
  onAddressChange: (v: string) => void
  locationId: string | null
  onLocationChange: (v: string | null) => void
}) {
  const api = useApi()
  const [search, setSearch] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const apiRef = React.useRef(api)
  apiRef.current = api

  const { data: locations } = useQuery({
    queryKey: ["project-locations", search],
    queryFn: () => apiRef.current.get<{ items: { id: string; name: string; address: string | null; city: string | null; phone: string | null }[] }>(
      `/api/project-locations${search ? `?search=${encodeURIComponent(search)}` : ""}`
    ),
    enabled: open,
  })

  const items = locations?.items ?? []
  const selected = items.find((l) => l.id === locationId) ?? null

  return (
    <div className="rounded-lg border bg-card p-3">
      <h4 className="mb-3 text-sm font-semibold">مکان و آدرس اجرا</h4>
      <div className="space-y-3">
        {/* Searchable location selector */}
        <div>
          <Label className="mb-1.5 block text-xs">انتخاب مکان از قبل ثبت‌شده (اختیاری)</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                className="w-full justify-between text-xs"
              >
                {selected ? selected.name : "جستجوی مکان..."}
                <Search className="h-3.5 w-3.5 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0" align="start">
              <div className="border-b p-2">
                <Input
                  placeholder="جستجوی نام مکان..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="max-h-48 overflow-y-auto scroll-thin">
                {items.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted-foreground">مکانی یافت نشد</div>
                ) : (
                  items.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      className="flex w-full flex-col items-start gap-0.5 border-b p-2 text-right text-xs hover:bg-accent"
                      onClick={() => {
                        onLocationChange(l.id)
                        if (l.address) onAddressChange(l.address)
                        setOpen(false)
                      }}
                    >
                      <span className="font-medium">{l.name}</span>
                      {l.address && <span className="text-muted-foreground">{l.address}</span>}
                      {l.city && <span className="text-[10px] text-muted-foreground">{l.city}</span>}
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Address input */}
        <div>
          <Label className="mb-1.5 block text-xs">آدرس پروژه</Label>
          <Textarea
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="آدرس کامل محل اجرا..."
            rows={2}
            className="resize-none text-sm"
          />
        </div>

        {selected && (
          <div className="flex items-center justify-between rounded-md bg-muted/30 px-2 py-1">
            <span className="text-[10px] text-muted-foreground">مکان انتخاب‌شده: {selected.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={() => { onLocationChange(null) }}
            >
              حذف انتخاب
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ✅ Wizard multi-location picker — searchable combobox, multi-select, "add new location" dialog.
function WizardMultiLocationPicker({
  selectedLocationIds,
  onChange,
}: {
  selectedLocationIds: string[]
  onChange: (ids: string[]) => void
}) {
  const api = useApi()
  const qc = useQueryClient()
  const role = useWorkspace((s) => s.role)
  const canManage = role === "admin" || role === "manager"
  const [search, setSearch] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [newLocOpen, setNewLocOpen] = React.useState(false)
  const [newLoc, setNewLoc] = React.useState({ name: "", address: "", city: "", phone: "", notes: "" })

  const { data: locationsData } = useQuery<{ items: ProjectLocationItem[] }>({
    queryKey: ["project-locations", search],
    queryFn: () => api.get<{ items: ProjectLocationItem[] }>(
      `/api/project-locations${search ? `?search=${encodeURIComponent(search)}` : ""}`
    ),
    enabled: open,
  })
  const items = locationsData?.items ?? []
  const selectedLocations = items.filter((l) => selectedLocationIds.includes(l.id))

  function toggle(id: string) {
    if (selectedLocationIds.includes(id)) {
      onChange(selectedLocationIds.filter((x) => x !== id))
    } else {
      onChange([...selectedLocationIds, id])
    }
  }

  const createLocMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/project-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": role },
        body: JSON.stringify(newLoc),
      })
      const d = await res.json()
      if (!res.ok) throw new Error((d as any)?.error || `Request failed (${res.status})`)
      return d as ProjectLocationItem
    },
    onSuccess: (created) => {
      toast.success("مکان جدید ایجاد شد")
      onChange([...selectedLocationIds, created.id])
      setNewLocOpen(false)
      setNewLoc({ name: "", address: "", city: "", phone: "", notes: "" })
      qc.invalidateQueries({ queryKey: ["project-locations"] })
    },
    onError: (e: Error) => toast.error(e.message || "ساخت مکان ناموفق بود"),
  })

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold">مکان‌های اجرای پروژه</h4>
        {canManage && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setNewLocOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" /> مکان جدید
          </Button>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className="w-full justify-between text-xs"
          >
            <span className="truncate">
              {selectedLocationIds.length > 0
                ? `${toPersianDigits(selectedLocationIds.length)} مکان انتخاب‌شده`
                : "انتخاب مکان‌ها..."}
            </span>
            <Search className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <div className="border-b p-2">
            <Input
              placeholder="جستجوی نام/آدرس/شهر مکان..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="max-h-56 overflow-y-auto scroll-thin">
            {items.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">مکانی یافت نشد</div>
            ) : (
              items.map((l) => {
                const checked = selectedLocationIds.includes(l.id)
                return (
                  <button
                    key={l.id}
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-2 border-b p-2 text-right text-xs hover:bg-accent transition",
                      checked && "bg-primary/5"
                    )}
                    onClick={() => toggle(l.id)}
                  >
                    <Checkbox checked={checked} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{l.name}</div>
                      {(l.address || l.city) && (
                        <div className="text-[10px] text-muted-foreground truncate">
                          {[l.city, l.address].filter(Boolean).join(" — ")}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selectedLocations.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedLocations.map((l) => (
            <span
              key={l.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px]"
            >
              <MapPin className="h-3 w-3 text-primary" />
              <span className="font-medium">{l.name}</span>
              <button
                type="button"
                onClick={() => onChange(selectedLocationIds.filter((x) => x !== l.id))}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
                aria-label="حذف"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* New location dialog */}
      <Dialog open={newLocOpen} onOpenChange={setNewLocOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>مکان جدید</DialogTitle>
            <DialogDescription>
              مکان اجرای جدید را ثبت کنید تا در پروژه‌های بعدی قابل استفاده باشد.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">نام مکان *</Label>
              <Input
                value={newLoc.name}
                onChange={(e) => setNewLoc((f) => ({ ...f, name: e.target.value }))}
                placeholder="مثلاً: هتل اسپیناس"
              />
            </div>
            <div>
              <Label className="text-xs">آدرس</Label>
              <Input
                value={newLoc.address}
                onChange={(e) => setNewLoc((f) => ({ ...f, address: e.target.value }))}
                placeholder="آدرس کامل"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">شهر</Label>
                <Input
                  value={newLoc.city}
                  onChange={(e) => setNewLoc((f) => ({ ...f, city: e.target.value }))}
                  placeholder="مثلاً: تهران"
                />
              </div>
              <div>
                <Label className="text-xs">تلفن</Label>
                <Input
                  value={newLoc.phone}
                  onChange={(e) => setNewLoc((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="شماره تماس مکان"
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">یادداشت</Label>
              <Input
                value={newLoc.notes}
                onChange={(e) => setNewLoc((f) => ({ ...f, notes: e.target.value }))}
                placeholder="مثلاً: پارکینگ رایگان"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewLocOpen(false)}>انصراف</Button>
            <Button
              disabled={!newLoc.name.trim() || createLocMut.isPending}
              onClick={() => createLocMut.mutate()}
            >
              {createLocMut.isPending ? "در حال ساخت..." : "ساخت مکان"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ✅ Google Maps embed — shows the selected location (or first one) on an iframe map.
function WizardGoogleMapsEmbed({
  selectedLocationIds,
}: {
  selectedLocationIds: string[]
}) {
  const api = useApi()
  // Fetch all locations (cached) so we can resolve names/addresses for the map URL.
  const { data: locationsData } = useQuery<{ items: ProjectLocationItem[] }>({
    queryKey: ["project-locations", ""],
    queryFn: () => api.get<{ items: ProjectLocationItem[] }>(`/api/project-locations`),
  })
  const allLocations = locationsData?.items ?? []
  const selectedLocations = allLocations.filter((l) => selectedLocationIds.includes(l.id))

  // Show the first selected location on the map.
  const loc = selectedLocations[0] ?? null
  const query = loc ? (loc.address || loc.name) : ""
  // ✅ Use the canonical Google Maps embed URL (works without an API key).
  const mapSrc = query ? `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed` : ""

  return (
    <div className="rounded-lg border bg-card p-3">
      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        <MapPin className="h-4 w-4 text-primary" />
        نقشه مکان اجرا
      </h4>
      {loc && (
        <div className="mb-2 text-[10px] text-muted-foreground">
          نمایش: {loc.name}
          {selectedLocations.length > 1 && ` (+${toPersianDigits(selectedLocations.length - 1)} مکان دیگر)`}
        </div>
      )}
      {mapSrc ? (
        <iframe
          title="Google Maps"
          src={mapSrc}
          width="100%"
          height={200}
          style={{ border: 0, borderRadius: 8 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <div className="flex h-[200px] w-full items-center justify-center rounded-lg border border-dashed bg-muted/20 text-xs text-muted-foreground">
          برای مشاهده نقشه، یک مکان انتخاب کنید
        </div>
      )}
    </div>
  )
}

function ScheduleField({
  label,
  date,
  onDateChange,
  time,
  onTimeChange,
}: {
  label: string
  date: string | null
  onDateChange: (iso: string | null) => void
  time: string
  onTimeChange: (v: string) => void
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      <div className="space-y-1.5">
        <JalaliDatePicker value={date} onChange={onDateChange} placeholder="تاریخ" />
        <TimeWheelPicker value={time || undefined} onChange={onTimeChange} />
        {time && (
          <div className="text-center text-[10px] text-muted-foreground">
            {formatTime12h(time)}
          </div>
        )}
      </div>
    </div>
  )
}

function TeamPicker({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: UserOption[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border bg-muted/20 p-2 scroll-thin">
        {options.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">کاربری موجود نیست.</p>
        ) : (
          options.map((u) => {
            const checked = selected.includes(u.id)
            return (
              <label
                key={u.id}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-muted/60"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => {
                    if (v) onChange([...selected, u.id])
                    else onChange(selected.filter((x) => x !== u.id))
                  }}
                />
                <span
                  className={cn(
                    "inline-block h-2 w-2 rounded-full",
                    u.isAvailable ? "bg-emerald-500" : "bg-muted-foreground/50"
                  )}
                  title={u.isAvailable ? "آماده" : "غیرفعال"}
                />
                <span className="truncate">
                  {u.firstName} {u.lastName}
                </span>
              </label>
            )
          })
        )}
      </div>
    </div>
  )
}

// ============================================================
// Level 2: Customer's projects (with payments, balance, notes, mark-complete)
// ============================================================
function CustomerProjects() {
  const api = useApi()
  const qc = useQueryClient()
  const { activeProjectCustomerId, openProject, backToProjectCustomerList, role, openProjectWizard } = useWorkspace()
  const [showCompleted, setShowCompleted] = React.useState(false)
  const [strategyFilter, setStrategyFilter] = React.useState<string>("all")
  const [pdfOpen, setPdfOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<{
    id: string
    title: string
    paymentsCount: number
    paymentsTotal: number
  } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["customer-projects", activeProjectCustomerId],
    queryFn: () =>
      api.get<{
        customer: {
          id: string
          name: string
          phone: string
          customerType: string
          tags: { id: string; name: string; color: string }[]
          referrer: { id: string; name: string } | null
          referred: { id: string; name: string }[]
          creditBalance: number | null
          totalRevenue: number | null
          lastInteraction: string | null
        }
        projects: CustomerProject[]
        notes: CustomerNote[]
        seeFinance: boolean
        seeBalance: boolean
        canManage: boolean
      }>(`/api/customers/${activeProjectCustomerId}/projects`),
    enabled: !!activeProjectCustomerId,
  })

  const completeMut = useMutation({
    mutationFn: (projectId: string) =>
      api.patch(`/api/projects/${projectId}/status`, { status: "delivered" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-projects", activeProjectCustomerId] })
      toast.success("پروژه به‌عنوان تکمیل‌شده علامت‌گذاری شد")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (projectId: string) => api.del(`/api/projects/${projectId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-projects", activeProjectCustomerId] })
      qc.invalidateQueries({ queryKey: ["projects-by-customer"] })
      qc.invalidateQueries({ queryKey: ["calendar-events"] })
      toast.success("پروژه حذف شد")
      setDeleteTarget(null)
    },
    onError: (e: Error) => toast.error(e.message || "حذف ناموفق بود"),
  })

  if (isLoading || !data) {
    return (
      <div>
        <Skeleton className="mb-4 h-10 w-48" />
        <Skeleton className="mb-4 h-24 w-full" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const { customer, projects, notes, seeFinance, seeBalance, canManage } = data
  const visibleProjects = (showCompleted ? projects : projects.filter((p) => !p.isDelivered))
    .filter((p) => strategyFilter === "all" ? true : p.pricingStrategy === strategyFilter)
  const totalPaid = projects.reduce((s, p) => s + (p.totalPaid ?? 0) + (p.printPhotoPaid ?? 0), 0)
  const totalBalance = projects.reduce((s, p) => s + (p.balance ?? 0) + (p.printPhotoBalance ?? 0), 0)

  // ✅ Only admin/manager/sales can create new projects.
  const canCreate = role === "admin" || role === "manager" || role === "sales"

  return (
    <div>
      <button
        onClick={backToProjectCustomerList}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4 rotate-180" /> بازگشت به فهرست مشتریان
      </button>

      {/* Customer header */}
      <div className="mb-5 flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-gradient-to-br from-sky-500 to-violet-500 text-sm font-semibold text-white">
              {customer.name.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="notion-title text-xl sm:text-2xl">{customer.name}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span dir="ltr">{customer.phone}</span>
              <Badge variant="secondary" className="text-[10px]">
                {customer.customerType === "company" ? "حقوقی" : "حقیقی"}
              </Badge>
              {customer.tags.map((t) => (
                <span
                  key={t.id}
                  className="rounded-full px-2 py-0.5 text-[10px]"
                  style={{ background: t.color + "22", color: t.color }}
                >
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-stretch gap-2">
          {/* ✅ پروژه جدید برای این مشتری — opens wizard at step 2 with this customer pre-selected */}
          {canCreate && (
            <Button
              onClick={() => openProjectWizard(customer.id)}
              className="self-stretch"
            >
              <Plus className="ml-1 h-4 w-4" /> پروژه جدید
            </Button>
          )}
          {seeBalance && (
            <StatCard label="مانده کل" value={`${formatRialsShort(totalBalance)} تومان`} accent="#f59e0b" />
          )}
          {seeBalance && (
            <Button
              variant="outline"
              onClick={() => setPdfOpen(true)}
              className="self-stretch"
            >
              <FileText className="ml-1 h-4 w-4" /> خروجی قرارداد
            </Button>
          )}
        </div>
      </div>

      {/* ✅ Notes ABOVE projects — full-width stack instead of the old side-by-side grid. */}
      <div className="flex flex-col gap-5">
        {/* Notes section — appears first, right under the customer header */}
        <div>
          <CustomerNotesPanel
            customerId={customer.id}
            notes={notes}
            canManage={canManage}
          />
        </div>

        {/* Projects section — appears below notes */}
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Film className="h-4 w-4" /> پروژه‌های این مشتری
              <Badge variant="secondary" className="text-[10px]">{toPersianDigits(projects.length)}</Badge>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={strategyFilter} onValueChange={setStrategyFilter}>
                <SelectTrigger className="h-8 w-[140px] text-[11px]">
                  <SelectValue placeholder="استراتژی" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه استراتژی‌ها</SelectItem>
                  <SelectItem value="fixed">ثابت</SelectItem>
                  <SelectItem value="variable">متغیر</SelectItem>
                  <SelectItem value="delayed">مهلت‌دار</SelectItem>
                </SelectContent>
              </Select>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-[11px]">
                <Checkbox
                  checked={showCompleted}
                  onCheckedChange={(v) => setShowCompleted(Boolean(v))}
                />
                <span className="text-muted-foreground">نمایش پروژه‌های تکمیل‌شده</span>
              </label>
            </div>
          </div>

          {visibleProjects.length === 0 ? (
            <EmptyState icon="🎬" title="پروژه‌ای نیست" description="پروژه تکمیل‌نشده‌ای برای نمایش وجود ندارد." />
          ) : (
            <div className="space-y-3">
              {visibleProjects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  seeFinance={seeFinance}
                  seeBalance={seeBalance}
                  canManage={canManage}
                  role={role}
                  onOpen={() => openProject(p.id)}
                  onComplete={() => completeMut.mutate(p.id)}
                  completing={completeMut.isPending}
                  onDelete={() => setDeleteTarget({
                    id: p.id,
                    title: p.title,
                    paymentsCount: p.payments?.length ?? 0,
                    paymentsTotal: (p.payments ?? []).reduce((s, pay) => s + (pay.amount || 0), 0),
                  })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {pdfOpen && customer && (
        <PdfExportDialog
          open={pdfOpen}
          onOpenChange={setPdfOpen}
          customerId={customer.id}
          customerName={customer.name}
          projects={projects}
        />
      )}

      {deleteTarget && (
        <AlertDialog open onOpenChange={(v) => !v && setDeleteTarget(null)}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>حذف پروژه؟</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget.paymentsCount > 0 ? (
                  <>
                    {"⚠️ این پروژه دارای "}
                    <strong>{toPersianDigits(deleteTarget.paymentsCount)}</strong>
                    {" پرداخت به مبلغ "}
                    <strong>{formatRials(deleteTarget.paymentsTotal)}</strong>
                    {" تومان است. آیا مطمئن هستید که می‌خواهید آن را حذف کنید؟ این پرداخت‌ها حذف خواهند شد."}
                  </>
                ) : (
                  "آیا از حذف این پروژه مطمئن هستید؟"
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>انصراف</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 text-white hover:bg-rose-700"
                disabled={deleteMut.isPending}
                onClick={() => deleteMut.mutate(deleteTarget.id)}
              >
                {deleteMut.isPending ? "در حال حذف…" : "حذف"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

// ============================================================
// PDF Export dialog
// ============================================================
function PdfExportDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  projects,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  customerId: string
  customerName: string
  projects: CustomerProject[]
}) {
  const role = useWorkspace((s) => s.role)
  // Default selection: projects NOT marked "delivered" are checked by default.
  // Delivered projects are unchecked by default (user can re-check if they want).
  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(projects.filter((p) => !p.isDelivered).map((p) => p.id))
  )
  const [generating, setGenerating] = React.useState(false)

  React.useEffect(() => {
    if (open) setSelected(new Set(projects.filter((p) => !p.isDelivered).map((p) => p.id)))
  }, [open, projects])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleGenerate() {
    if (selected.size === 0) {
      toast.error("حداقل یک پروژه را انتخاب کنید")
      return
    }
    setGenerating(true)
    try {
      const res = await fetch(`/api/customers/${customerId}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": role },
        body: JSON.stringify({ projectIds: Array.from(selected) }),
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const html = await res.text()
      const w = window.open("", "_blank")
      if (!w) {
        toast.error("باز کردن پنجره چاپ مسدود شد. لطفاً popup را مجاز کنید.")
        return
      }
      w.document.open()
      w.document.write(html)
      w.document.close()
      onOpenChange(false)
    } catch (e) {
      toast.error((e as Error).message || "تولید PDF ناموفق بود")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onOpenChange(false))}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>خروجی قرارداد</DialogTitle>
          <DialogDescription>
            پروژه‌های موردنظر را برای تهیه قرارداد قابل‌چاپ انتخاب کنید. ({customerName})
          </DialogDescription>
        </DialogHeader>

        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {toPersianDigits(selected.size)} از {toPersianDigits(projects.length)} پروژه انتخاب شده
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set(projects.map((p) => p.id)))}>
              انتخاب همه
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              پاک کردن
            </Button>
          </div>
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto scroll-thin pl-1">
          {projects.map((p) => {
            const checked = selected.has(p.id)
            return (
              <label
                key={p.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 text-xs transition",
                  checked ? "border-primary/40 bg-primary/5" : "bg-card hover:bg-muted/40"
                )}
              >
                <Checkbox checked={checked} onCheckedChange={() => toggle(p.id)} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.title}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span dir="ltr">{p.contractNumber}</span>
                    <span
                      className="rounded px-1.5 py-0.5"
                      style={{ background: STATUS_COLORS[p.status as ProjectStatus] + "22", color: STATUS_COLORS[p.status as ProjectStatus] }}
                    >
                      {STATUS_LABELS[p.status as ProjectStatus] ?? p.status}
                    </span>
                  </div>
                </div>
                {p.effectivePrice != null && (
                  <div className="shrink-0 text-left text-[11px]">
                    <div className="font-medium">{formatRialsShort(p.effectivePrice)} تومان</div>
                    {p.balance != null && p.balance > 0 && (
                      <div className="text-amber-600">مانده: {formatRialsShort(p.balance)}</div>
                    )}
                  </div>
                )}
              </label>
            )
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>انصراف</Button>
          <Button onClick={handleGenerate} disabled={generating || selected.size === 0}>
            {generating ? "در حال تولید…" : (
              <>
                <FileText className="ml-1 h-4 w-4" /> تولید PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Customer notes panel — with image/audio/video/file attachments
// Mirrors the dashboard notes attachment pattern: XHR upload with
// progress, save blocked during uploads, attachment badge, viewer
// with lightbox + audio/video players + file download.
// ============================================================
const CUSTOMER_NOTE_ATTACHMENT_ACCEPT =
  "image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.csv,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.heic,.heif,.avif,.mp3,.m4a,.wav,.ogg,.aac,.flac,.opus,.amr,.3gp,.mp4,.mov,.mkv,.webm,.avi,.m4v"

function formatBytesFa(bytes: number): string {
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

/** XHR-based uploader so we can report per-file progress. */
function uploadCustomerNoteAttachment(
  file: File,
  customerId: string,
  role: string,
  onProgress: (pct: number) => void
): Promise<CustomerNoteAttachment> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const fd = new FormData()
    fd.append("file", file)
    xhr.open("POST", `/api/customers/${customerId}/notes/upload`)
    xhr.setRequestHeader("x-demo-role", role)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as CustomerNoteAttachment
          resolve(data)
        } catch {
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
    xhr.send(fd)
  })
}

function CustomerNotesPanel({
  customerId,
  notes,
  canManage,
}: {
  customerId: string
  notes: CustomerNote[]
  canManage: boolean
}) {
  const api = useApi()
  const qc = useQueryClient()
  const { role } = useWorkspace()
  const [content, setContent] = React.useState("")
  // ✅ Notes list is COLLAPSED by default per FIXES-10 task #3.
  const [notesExpanded, setNotesExpanded] = React.useState(false)
  const [pendingAttachments, setPendingAttachments] = React.useState<CustomerNoteAttachment[]>([])
  // uploads in-flight: { uid, name, size, progress, error }
  const [uploads, setUploads] = React.useState<
    { uid: string; name: string; size: number; progress: number; error?: string }[]
  >([])
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // ✅ Delete is only for admin/manager (per FIXES-10 task #3).
  const canDeleteNotes = role === "admin" || role === "manager"

  const isUploading = uploads.length > 0
  const overallPct = uploads.length
    ? Math.round(uploads.reduce((s, u) => s + u.progress, 0) / uploads.length)
    : 0

  const addNoteMut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { content: content.trim() }
      if (pendingAttachments.length > 0) payload.attachments = pendingAttachments
      return api.post(`/api/customers/${customerId}/notes`, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-projects", customerId] })
      setContent("")
      setPendingAttachments([])
      if (fileInputRef.current) fileInputRef.current.value = ""
      toast.success("یادداشت ثبت شد")
      // ✅ Auto-expand so the user sees the freshly-added note.
      setNotesExpanded(true)
    },
    onError: (e: Error) => toast.error(e.message || "ثبت یادداشت ناموفق بود"),
  })

  // ✅ Delete a note via DELETE /api/customers/[id]/notes/[noteId] (FIXES-10 #3).
  const deleteNoteMut = useMutation({
    mutationFn: (noteId: string) =>
      api.del(`/api/customers/${customerId}/notes/${noteId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-projects", customerId] })
      toast.success("یادداشت حذف شد")
    },
    onError: (e: Error) => toast.error(e.message || "حذف یادداشت ناموفق بود"),
  })

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return
    const fileArr = Array.from(files)
    for (const file of fileArr) {
      const uid = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setUploads((prev) => [...prev, { uid, name: file.name, size: file.size, progress: 0 }])
      try {
        const att = await uploadCustomerNoteAttachment(file, customerId, role, (pct) => {
          setUploads((prev) => prev.map((u) => (u.uid === uid ? { ...u, progress: pct } : u)))
        })
        setPendingAttachments((prev) => [...prev, att])
        setUploads((prev) => prev.filter((u) => u.uid !== uid))
      } catch (e) {
        const msg = e instanceof Error ? e.message : "خطای ناشناخته"
        setUploads((prev) => prev.map((u) => (u.uid === uid ? { ...u, error: msg } : u)))
        toast.error(`بارگذاری «${file.name}» ناموفق بود: ${msg}`)
        // Remove the failed upload entry after a short delay so the user can see the error.
        setTimeout(() => {
          setUploads((prev) => prev.filter((u) => u.uid !== uid))
        }, 3500)
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function removePending(idx: number) {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))
  }

  const canSubmit =
    (content.trim().length > 0 || pendingAttachments.length > 0) && !isUploading && !addNoteMut.isPending

  return (
    <SectionCard>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <StickyNote className="h-4 w-4" /> یادداشت‌های مشتری
          <Badge variant="secondary" className="text-[10px]">{toPersianDigits(notes.length)}</Badge>
        </h2>
        {/* ✅ Toggle button — collapses/expands the notes list (collapsed by default). */}
        {notes.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-[11px]"
            onClick={() => setNotesExpanded((v) => !v)}
          >
            {notesExpanded ? (
              <>
                <ChevronUp className="ml-1 h-3.5 w-3.5" /> مخفی کردن یادداشت‌ها
              </>
            ) : (
              <>
                <ChevronDown className="ml-1 h-3.5 w-3.5" /> نمایش یادداشت‌ها
              </>
            )}
          </Button>
        )}
      </div>

      {canManage && (
        <div className="mb-3 border-b pb-3">
          <Textarea
            placeholder="یادداشت جدیدی درباره این مشتری بنویسید…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />

          <input
            ref={fileInputRef}
            type="file"
            accept={CUSTOMER_NOTE_ATTACHMENT_ACCEPT}
            multiple
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="hidden"
            id={`customer-note-file-${customerId}`}
          />

          {/* Pending attachments preview */}
          {pendingAttachments.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {pendingAttachments.map((a, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
                  {a.type === "image" ? (
                    <img
                      src={a.thumbUrl || a.url}
                      alt={a.name}
                      className="h-9 w-9 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded bg-muted">
                      {a.type === "audio" ? (
                        <Music className="h-4 w-4 text-muted-foreground" />
                      ) : a.type === "video" ? (
                        <Video className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <FileIcon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11px] font-medium" dir="ltr">{a.name}</div>
                    <div className="text-[9px] text-muted-foreground">{formatBytesFa(a.size)}</div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removePending(i)}
                    aria-label="حذف پیوست"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* In-flight uploads with progress */}
          {uploads.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {uploads.map((u) => (
                <div key={u.uid} className="rounded-md border bg-muted/30 p-2">
                  <div className="mb-1 flex items-center justify-between text-[10px]">
                    <span className="truncate" dir="ltr">{u.name}</span>
                    <span className={cn("shrink-0", u.error ? "text-rose-600" : "text-muted-foreground")}>
                      {u.error ? "خطا" : `${toPersianDigits(u.progress)}٪`}
                    </span>
                  </div>
                  <Progress value={u.progress} className="h-1.5" />
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-[11px]"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Paperclip className="ml-1 h-3.5 w-3.5" /> افزودن فایل
            </Button>
            <Button
              size="sm"
              disabled={!canSubmit}
              onClick={() => addNoteMut.mutate()}
            >
              {isUploading ? (
                <>در حال بارگذاری... ({toPersianDigits(overallPct)}٪)</>
              ) : addNoteMut.isPending ? (
                "در حال ثبت…"
              ) : (
                <><Send className="ml-1 h-3.5 w-3.5" /> ثبت یادداشت</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ✅ Notes list — only rendered when expanded (or when there are zero
          notes, in which case we show a friendly empty hint). */}
      {notesExpanded || notes.length === 0 ? (
        <div className="max-h-[480px] space-y-2 overflow-y-auto scroll-thin pl-1">
          {notes.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              هنوز یادداشتی ثبت نشده است.
            </div>
          ) : (
            notes.map((n) => (
              <CustomerNoteItem
                key={n.id}
                note={n}
                canDelete={canDeleteNotes}
                onDelete={() => deleteNoteMut.mutate(n.id)}
                deleting={deleteNoteMut.isPending}
              />
            ))
          )}
        </div>
      ) : null}
    </SectionCard>
  )
}

function CustomerNoteItem({
  note,
  canDelete = false,
  onDelete,
  deleting = false,
}: {
  note: CustomerNote
  canDelete?: boolean
  onDelete?: () => void
  deleting?: boolean
}) {
  const attCount = note.attachments?.length ?? 0
  return (
    <div className="rounded-lg border bg-muted/30 p-2.5">
      <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5 font-medium">
          {note.authorName ?? "ناشناس"}
          {attCount > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
              <Paperclip className="h-2.5 w-2.5" /> {toPersianDigits(attCount)}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <span>{timeAgo(note.createdAt)}</span>
          {/* ✅ Delete button — only admin/manager (FIXES-10 #3). */}
          {canDelete && onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
              onClick={() => {
                if (confirm("این یادداشت حذف شود؟")) onDelete()
              }}
              disabled={deleting}
              aria-label="حذف یادداشت"
              title="حذف یادداشت"
            >
              {deleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>
      {note.content && (
        <div className="whitespace-pre-wrap text-xs leading-relaxed">{note.content}</div>
      )}
      {attCount > 0 && (
        <div className={note.content ? "mt-2 space-y-2" : "space-y-2"}>
          <CustomerNoteAttachmentViewer attachments={note.attachments} />
        </div>
      )}
    </div>
  )
}

function CustomerNoteAttachmentViewer({ attachments }: { attachments: CustomerNoteAttachment[] }) {
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
              className="block overflow-hidden rounded-md border bg-muted/40"
              title={a.name}
            >
              <img
                src={a.thumbUrl || a.url}
                alt={a.name}
                className="max-h-48 max-w-full object-cover"
                loading="lazy"
              />
            </button>
          )
        }
        if (a.type === "audio") return <CustomerNoteAudioPlayer key={i} att={a} />
        if (a.type === "video") return <CustomerNoteVideoPlayer key={i} att={a} />
        return <CustomerNoteFileRow key={i} att={a} />
      })}
      {lightboxIndex >= 0 && (
        <CustomerNoteImageLightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(-1)}
          onIndex={setLightboxIndex}
        />
      )}
    </div>
  )
}

function CustomerNoteAudioPlayer({ att }: { att: CustomerNoteAttachment }) {
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

function CustomerNoteVideoPlayer({ att }: { att: CustomerNoteAttachment }) {
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

function CustomerNoteFileRow({ att }: { att: CustomerNoteAttachment }) {
  return (
    <a
      href={att.url}
      download={att.name}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2.5 transition hover:bg-muted/60"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <FileIcon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium">{att.name}</div>
        <div className="text-[10px] text-muted-foreground">{formatBytesFa(att.size)}</div>
      </div>
      <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
    </a>
  )
}

function CustomerNoteImageLightbox({
  images,
  index,
  onClose,
  onIndex,
}: {
  images: CustomerNoteAttachment[]
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

// ============================================================
// Project card (used in customer projects list)
// ============================================================
function ProjectCard({
  project: p,
  seeFinance,
  seeBalance,
  canManage,
  role,
  onOpen,
  onComplete,
  completing,
  onDelete,
}: {
  project: CustomerProject
  seeFinance: boolean
  seeBalance: boolean
  canManage: boolean
  role: Role
  onOpen: () => void
  onComplete: () => void
  completing: boolean
  onDelete: () => void
}) {
  const [expanded, setExpanded] = React.useState(false)
  const [payOpen, setPayOpen] = React.useState(false)
  const canMarkComplete =
    canManage && p.status !== "delivered" && canTransition(p.status as ProjectStatus, "delivered", role)
  const canManagePayments = role === "admin" || role === "manager"
  const canManageNotes = role === "admin" || role === "manager"
  // Allow deletion of delivered (تکمیل‌شده) projects — admin/manager only.
  const canDelete = (role === "admin" || role === "manager") && p.isDelivered

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-md",
        p.isDelivered && "border-emerald-500/40 bg-emerald-500/5"
      )}
    >
      <div className="flex items-stretch">
        {/* status color stripe */}
        <div
          className="w-1.5 shrink-0"
          style={{ background: p.isDelivered ? "#22c55e" : STATUS_COLORS[p.status as ProjectStatus] }}
        />
        <div className="flex-1 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-semibold">{p.title}</h3>
                {p.isDelivered && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> تکمیل شده
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span dir="ltr">{p.contractNumber}</span>
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ background: CATEGORY_COLORS[p.category as keyof typeof CATEGORY_COLORS] + "22", color: CATEGORY_COLORS[p.category as keyof typeof CATEGORY_COLORS] }}
                >
                  {CATEGORY_LABELS[p.category as keyof typeof CATEGORY_LABELS] ?? p.category}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" /> {formatDate(p.startDatetime)}
                </span>
                {p.deliveryDeadline && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> مهلت: {formatDate(p.deliveryDeadline)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge
                variant="secondary"
                className="text-[10px]"
                style={{ background: STATUS_COLORS[p.status as ProjectStatus] + "22", color: STATUS_COLORS[p.status as ProjectStatus] }}
              >
                {STATUS_LABELS[p.status as ProjectStatus] ?? p.status}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={onOpen}>مشاهده جزئیات</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setExpanded((v) => !v)}>
                    {expanded ? "بستن یادداشت‌ها" : "یادداشت‌ها و فایل‌ها"}
                  </DropdownMenuItem>
                  {canMarkComplete && (
                    <DropdownMenuItem onClick={onComplete} disabled={completing}>
                      <CheckCheck className="ml-2 h-3.5 w-3.5" /> علامت‌گذاری به‌عنوان تکمیل‌شده
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-rose-600 focus:text-rose-700"
                    >
                      <Trash2 className="ml-2 h-3.5 w-3.5" /> حذف پروژه
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Team avatars */}
          {p.team.length > 0 && (
            <div className="mt-2.5 flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">تیم:</span>
              <div className="flex -space-x-2 space-x-reverse">
                {p.team.slice(0, 5).map((t) => (
                  <Avatar key={t.id} className="h-5 w-5 border border-background">
                    <AvatarFallback className="text-[8px]">
                      {t.name.split(" ").map((x) => x[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {p.team.length > 5 && (
                <span className="text-[10px] text-muted-foreground">+{toPersianDigits(p.team.length - 5)}</span>
              )}
            </div>
          )}

          {/* Payments / balance — project + print photos */}
          {seeBalance && p.effectivePrice != null && (
            <div className="mt-3 space-y-2 border-t pt-3">
              {/* پروژه اصلی */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[10px] text-muted-foreground">قیمت مؤثر (پروژه)</div>
                  <div className="text-xs font-semibold">{formatRialsShort(p.effectivePrice)} ت</div>
                  {seeFinance && p.packageCurrentPrice != null && p.priceAdjustment !== 0 && (
                    <div className="mt-0.5 text-[9px] text-muted-foreground">
                      پایه: {formatRialsShort(p.packageCurrentPrice)} ت
                    </div>
                  )}
                  {seeFinance && p.priceAdjustment !== 0 && (
                    <div className={cn("text-[9px] font-medium", p.priceAdjustment > 0 ? "text-sky-600" : "text-rose-600")}>
                      اصلاح: {p.priceAdjustment > 0 ? "+" : "−"}{formatRialsShort(Math.abs(p.priceAdjustment))} ت
                    </div>
                  )}
                  {seeFinance && p.discountAmount > 0 && (
                    <div className="mt-0.5 text-[9px] font-medium text-amber-600">
                      تخفیف: − {formatRialsShort(p.discountAmount)} ت
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">پرداخت‌شده</div>
                  <div className="text-xs font-semibold text-emerald-600">
                    {formatRialsShort(p.totalPaid ?? 0)} ت
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">مانده</div>
                  <div className={cn("text-xs font-semibold", (p.balance ?? 0) > 0 ? "text-amber-600" : "text-emerald-600")}>
                    {formatRialsShort(p.balance ?? 0)} ت
                  </div>
                </div>
              </div>

              {/* عکس‌های چاپی — فقط اگر وجود داشته باشن */}
              {(p.printPhotoTotal ?? 0) > 0 && (
                <div className="grid grid-cols-3 gap-2 border-t border-dashed pt-2">
                  <div>
                    <div className="text-[10px] text-muted-foreground">قیمت عکس‌های چاپی</div>
                    <div className="text-xs font-semibold text-violet-600 dark:text-violet-400">
                      {formatRialsShort(p.printPhotoTotal ?? 0)} ت
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">پرداخت عکس‌ها</div>
                    <div className="text-xs font-semibold text-emerald-600">
                      {formatRialsShort(p.printPhotoPaid ?? 0)} ت
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">مانده عکس‌ها</div>
                    <div className={cn("text-xs font-semibold", (p.printPhotoBalance ?? 0) > 0 ? "text-amber-600" : "text-emerald-600")}>
                      {formatRialsShort(p.printPhotoBalance ?? 0)} ت
                    </div>
                  </div>
                </div>
              )}

              {/* جمع کل مانده */}
              {((p.balance ?? 0) + (p.printPhotoBalance ?? 0)) > 0 && (
                <div className="flex items-center justify-between rounded-md bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5">
                  <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">جمع کل مانده (پروژه + عکس‌ها)</span>
                  <span className="text-xs font-bold text-amber-600">
                    {formatRialsShort((p.balance ?? 0) + (p.printPhotoBalance ?? 0))} ت
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Payment breakdown (admin/manager) */}
          {seeFinance && p.payments.length > 0 && (
            <div className="mt-2 rounded-lg bg-muted/40 p-2">
              <div className="mb-1 text-[10px] font-medium text-muted-foreground">
                پرداخت‌های ثبت‌شده ({toPersianDigits(p.payments.length)})
              </div>
              <div className="max-h-24 space-y-1 overflow-y-auto scroll-thin">
                {p.payments.slice(0, 4).map((pay) => (
                  <div key={pay.id} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn("h-4 px-1.5 text-[9px]", !pay.isConfirmed && "opacity-50")}
                      >
                        {PAYMENT_TYPE_LABELS[pay.paymentType as keyof typeof PAYMENT_TYPE_LABELS] ?? pay.paymentType}
                      </Badge>
                      <span className="text-muted-foreground">{formatDate(pay.datePaid)}</span>
                      {!pay.isConfirmed && (
                        <span className="text-[9px] text-amber-600">(در انتظار تأیید)</span>
                      )}
                      {pay.recordedBy?.fullName && (
                        <span className="text-[9px] text-muted-foreground">
                          · ثبت توسط: {pay.recordedBy.fullName}
                        </span>
                      )}
                    </span>
                    <span className="font-medium">{formatRials(pay.amount)} تومان</span>
                  </div>
                ))}
                {p.payments.length > 4 && (
                  <div className="text-center text-[10px] text-muted-foreground">
                    +{toPersianDigits(p.payments.length - 4)} پرداخت دیگر…
                  </div>
                )}
              </div>
            </div>
          )}

          {seeBalance && (p.balance ?? 0) > 0 && (
            <div className="mt-2.5">
              <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>پیشرفت پرداخت</span>
                <span>
                  {toPersianDigits(Math.round(((p.totalPaid ?? 0) / (p.effectivePrice || 1)) * 100))}٪
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(100, ((p.totalPaid ?? 0) / (p.effectivePrice || 1)) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={onOpen} className="flex-1 sm:flex-none">
              مشاهده جزئیات کامل
            </Button>
            {seeBalance && canManagePayments && (
              <Button variant="outline" size="sm" onClick={() => setPayOpen(true)}>
                <Wallet className="ml-1 h-3.5 w-3.5" /> افزودن پرداخت
              </Button>
            )}
            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
              >
                <Trash2 className="ml-1 h-3.5 w-3.5" /> حذف پروژه
              </Button>
            )}
            <Button
              variant={expanded ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <><ChevronUp className="ml-1 h-3.5 w-3.5" /> بستن یادداشت‌ها</>
              ) : (
                <><StickyNote className="ml-1 h-3.5 w-3.5" /> یادداشت‌ها و فایل‌ها ({toPersianDigits(p.notesCount)})</>
              )}
            </Button>
          </div>

          {/* Expandable: notes & files */}
          {expanded && (
            <ProjectNotesPanel
              projectId={p.id}
              canManage={canManageNotes}
            />
          )}
        </div>
      </div>

      {payOpen && (
        <AddPaymentDialog
          open={payOpen}
          onOpenChange={setPayOpen}
          projectId={p.id}
          projectName={p.title}
          balance={p.balance ?? 0}
          printPhotoBalance={p.printPhotoBalance ?? 0}
        />
      )}
    </div>
  )
}

// ============================================================
// Add Payment dialog (from project panel)
// ============================================================
function AddPaymentDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  balance,
  printPhotoBalance,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  projectId: string
  projectName: string
  balance: number
  printPhotoBalance?: number
}) {
  const api = useApi()
  const qc = useQueryClient()
  const [paymentFor, setPaymentFor] = React.useState<"project" | "print_photo">("project")
  const [toman, setToman] = React.useState(0)
  const [paymentType, setPaymentType] = React.useState<PaymentType>("deposit")
  const [method, setMethod] = React.useState<PaymentMethod>("cash")
  const [datePaid, setDatePaid] = React.useState<string | null>(() => new Date().toISOString())
  const [note, setNote] = React.useState("")
  const [isConfirmed, setIsConfirmed] = React.useState(true)

  React.useEffect(() => {
    if (!open) {
      setPaymentFor("project")
      setToman(0)
      setPaymentType("deposit")
      setMethod("cash")
      setDatePaid(new Date().toISOString())
      setNote("")
      setIsConfirmed(true)
    }
  }, [open])

  const mut = useMutation({
    mutationFn: async () => {
      const amount = tomanToRials(toman)
      if (!amount || amount <= 0) throw new Error("مبلغ را وارد کنید")
      if (!note.trim()) throw new Error("یادداشت پرداخت الزامی است")
      return api.post(`/api/projects/${projectId}/payments`, {
        amount,
        paymentType,
        method,
        paymentFor,
        datePaid: datePaid ? new Date(datePaid).toISOString() : undefined,
        note: note.trim(),
        isConfirmed,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-projects"] })
      qc.invalidateQueries({ queryKey: ["project"] })
      qc.invalidateQueries({ queryKey: ["payments"] })
      toast.success("پرداخت ثبت شد")
      onOpenChange(false)
    },
    onError: (e: Error) => toast.error(e.message || "ثبت پرداخت ناموفق بود"),
  })

  const canSubmit = toman > 0 && note.trim().length > 0
  const currentBalance = paymentFor === "print_photo" ? (printPhotoBalance ?? 0) : balance

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? null : onOpenChange(false))}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>افزودن پرداخت</DialogTitle>
          <DialogDescription>
            پروژه: {projectName}
            {currentBalance > 0 && (
              <span className="mt-1 block text-amber-600">
                مانده فعلی: {formatRials(currentBalance)} تومان
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* ✅ انتخاب نوع پرداخت: پروژه اصلی یا عکس‌های چاپی */}
          <div>
            <Label className="mb-1.5 block text-xs">پرداخت برای:</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentFor("project")}
                className={cn(
                  "rounded-lg border p-2 text-xs font-medium transition",
                  paymentFor === "project"
                    ? "border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300"
                    : "border-muted hover:bg-muted/50"
                )}
              >
                پروژه اصلی
                {balance > 0 && <div className="text-[10px] text-muted-foreground">مانده: {formatRialsShort(balance)} ت</div>}
              </button>
              <button
                type="button"
                onClick={() => setPaymentFor("print_photo")}
                disabled={(printPhotoBalance ?? 0) === 0}
                className={cn(
                  "rounded-lg border p-2 text-xs font-medium transition",
                  paymentFor === "print_photo"
                    ? "border-violet-400 bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300"
                    : "border-muted hover:bg-muted/50",
                  (printPhotoBalance ?? 0) === 0 && "cursor-not-allowed opacity-50"
                )}
              >
                عکس‌های چاپی
                {(printPhotoBalance ?? 0) > 0 && <div className="text-[10px] text-muted-foreground">مانده: {formatRialsShort(printPhotoBalance ?? 0)} ت</div>}
              </button>
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">مبلغ (تومان)</Label>
            <TomanInput value={toman} onValueChange={setToman} placeholder="مبلغ به تومان" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs">نوع پرداخت</Label>
              <Select value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{PAYMENT_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">روش پرداخت</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">تاریخ پرداخت</Label>
            <JalaliDatePicker value={datePaid} onChange={setDatePaid} placeholder="انتخاب تاریخ" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">
              یادداشت <span className="text-rose-600">*</span>
              <span className="mr-1 text-[10px] text-muted-foreground">(الزامی)</span>
            </Label>
            <Textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثلاً: شماره چک، توضیح پرداخت یا مرجع…"
              className="resize-none text-xs"
            />
            {note.trim().length === 0 && (
              <p className="mt-1 text-[10px] text-amber-600">ثبت یادداشت برای هر پرداخت الزامی است.</p>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs">
            <Checkbox checked={isConfirmed} onCheckedChange={(v) => setIsConfirmed(Boolean(v))} />
            <span>پرداخت تأیید شده (تسویه قطعی)</span>
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>انصراف</Button>
          <Button
            disabled={mut.isPending || !canSubmit}
            onClick={() => {
              if (!note.trim()) {
                toast.error("یادداشت پرداخت الزامی است")
                return
              }
              mut.mutate()
            }}
          >
            {mut.isPending ? "در حال ثبت…" : "ثبت پرداخت"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Per-project notes/files panel (expandable)
// ============================================================
function ProjectNotesPanel({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const api = useApi()
  const qc = useQueryClient()
  const [noteType, setNoteType] = React.useState<NoteType>("text")
  const [content, setContent] = React.useState("")
  const [attachmentUrl, setAttachmentUrl] = React.useState("")
  const [pendingFile, setPendingFile] = React.useState<{ name: string; size: number; isImage: boolean } | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [lightboxSrc, setLightboxSrc] = React.useState<string | null>(null)

  const { data: notes, isLoading } = useQuery({
    queryKey: ["project-notes", projectId],
    queryFn: () => api.get<ProjectNoteItem[]>(`/api/projects/${projectId}/notes`),
  })

  const addMut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { noteType }
      if (noteType === "text") {
        payload.content = content.trim()
      } else {
        if (attachmentUrl.trim()) payload.attachmentUrl = attachmentUrl.trim()
        if (content.trim()) payload.content = content.trim()
      }
      return api.post(`/api/projects/${projectId}/notes`, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-notes", projectId] })
      qc.invalidateQueries({ queryKey: ["customer-projects"] })
      qc.invalidateQueries({ queryKey: ["project", projectId] })
      setContent("")
      setAttachmentUrl("")
      setPendingFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      toast.success("یادداشت اضافه شد")
    },
    onError: (e: Error) => toast.error(e.message || "افزودن یادداشت ناموفق بود"),
  })

  const delMut = useMutation({
    mutationFn: (noteId: string) => api.del(`/api/projects/${projectId}/notes/${noteId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-notes", projectId] })
      qc.invalidateQueries({ queryKey: ["customer-projects"] })
      toast.success("یادداشت حذف شد")
    },
    onError: () => toast.error("حذف ناموفق بود"),
  })

  const canSubmit =
    noteType === "text"
      ? content.trim().length > 0
      : attachmentUrl.trim().length > 0 || content.trim().length > 0

  function handleFileSelected(file: File) {
    const MAX_BYTES = 2 * 1024 * 1024 // 2MB
    if (file.size > MAX_BYTES) {
      toast.error(`حجم فایل بیش از حد مجاز است (${toPersianDigits(2)} مگابایت).`)
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }
    const isImage = file.type.startsWith("image/")
    // Auto-pick the right noteType based on file kind.
    setNoteType(isImage ? "image" : "file")
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result || "")
      setAttachmentUrl(dataUrl)
      setPendingFile({ name: file.name, size: file.size, isImage })
    }
    reader.onerror = () => {
      toast.error("خواندن فایل ناموفق بود")
    }
    reader.readAsDataURL(file)
  }

  function clearAttachment() {
    setAttachmentUrl("")
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="mt-3 rounded-lg border bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold">یادداشت‌ها و فایل‌های این پروژه</h4>
        <Badge variant="secondary" className="text-[10px]">{toPersianDigits(notes?.length ?? 0)}</Badge>
      </div>

      {/* Composer */}
      <div className="mb-3 rounded-lg border bg-card p-2.5">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {NOTE_TYPES.map((t) => {
            const Icon = t === "text" ? StickyNote : t === "image" ? ImageIcon : t === "file" ? Paperclip : Mic
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setNoteType(t)
                  if (t === "text") clearAttachment()
                }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition",
                  noteType === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3 w-3" />
                {t === "text" ? "متن" : t === "image" ? "تصویر" : t === "file" ? "فایل" : "صوتی"}
              </button>
            )
          })}
        </div>
        <Textarea
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={noteType === "text" ? "متن یادداشت…" : "توضیح اختیاری برای پیوست…"}
          className="resize-none text-xs"
        />

        {noteType !== "text" && (
          <div className="mt-2 space-y-2">
            {/* Real file upload button */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic,.pdf,.doc,.docx,.zip"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFileSelected(f)
                }}
                className="hidden"
                id={`note-file-${projectId}`}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="ml-1 h-3 w-3" />
                {noteType === "image" ? "انتخاب تصویر" : "انتخاب فایل"}
              </Button>
              <span className="text-[10px] text-muted-foreground">
                حداکثر {toPersianDigits(2)} مگابایت (تصویر، PDF، Word، ZIP)
              </span>
            </div>

            {/* Pending file preview */}
            {pendingFile && attachmentUrl ? (
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
                {pendingFile.isImage ? (
                  <img
                    src={attachmentUrl}
                    alt={pendingFile.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium" dir="ltr">{pendingFile.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {toPersianDigits(Math.round(pendingFile.size / 1024))} کیلوبایت
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={clearAttachment}
                  aria-label="حذف پیوست"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <details className="rounded-md border border-dashed bg-muted/20 p-2 text-[10px] text-muted-foreground">
                <summary className="cursor-pointer select-none">
                  یا نشانی (URL) پیوست را دستی وارد کنید
                </summary>
                <Input
                  dir="ltr"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="https://…"
                  className="mt-1.5 text-xs"
                />
              </details>
            )}
          </div>
        )}
        <div className="mt-2 flex justify-end">
          <Button size="sm" disabled={!canSubmit || addMut.isPending} onClick={() => addMut.mutate()}>
            <Plus className="ml-1 h-3.5 w-3.5" /> افزودن
          </Button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (notes?.length ?? 0) === 0 ? (
        <div className="rounded-md border border-dashed py-4 text-center text-[11px] text-muted-foreground">
          هنوز یادداشتی ثبت نشده است.
        </div>
      ) : (
        <div className="max-h-96 space-y-2 overflow-y-auto scroll-thin pl-1">
          {notes!.map((n) => (
            <NoteItemCard
              key={n.id}
              note={n}
              canManage={canManage}
              onDelete={() => delMut.mutate(n.id)}
              deleting={delMut.isPending}
              onImageClick={(src) => setLightboxSrc(src)}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation()
              setLightboxSrc(null)
            }}
            aria-label="بستن"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxSrc}
            alt="نمایش تصویر"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

function NoteItemCard({
  note,
  canManage,
  onDelete,
  deleting,
  onImageClick,
}: {
  note: ProjectNoteItem
  canManage: boolean
  onDelete: () => void
  deleting: boolean
  onImageClick: (src: string) => void
}) {
  const Icon = note.noteType === "image" ? ImageIcon : note.noteType === "file" ? Paperclip : note.noteType === "voice" ? Mic : StickyNote

  const isImageAttachment = note.attachmentUrl
    ? note.isImage ?? (/^data:image\//i.test(note.attachmentUrl) || /^https?:\/\/.+\.(png|jpe?g|gif|webp|heic)/i.test(note.attachmentUrl))
    : false

  // Try to extract a friendly filename: from data URL name fragment, or last path segment.
  const displayName = (() => {
    const url = note.attachmentUrl || ""
    if (!url) return null
    if (url.startsWith("data:")) {
      const m = url.match(/;name=([^;]+)/i)
      if (m) return decodeURIComponent(m[1])
      // For data URLs without name, show short label
      return note.content || (isImageAttachment ? "تصویر پیوست" : "فایل پیوست")
    }
    try {
      const u = new URL(url)
      const seg = u.pathname.split("/").filter(Boolean).pop()
      return seg || url
    } catch {
      return url.length > 60 ? url.slice(0, 60) + "…" : url
    }
  })()

  return (
    <div className="rounded-md border bg-card p-2.5">
      <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5 font-medium">
          <Icon className="h-3 w-3" />
          {note.author?.fullName ?? "ناشناس"}
          {note.author?.role && (
            <span className="text-[9px] text-muted-foreground/70">({ROLE_LABELS[migrateRole(note.author.role) as Role] ?? note.author.role})</span>
          )}
        </span>
        <span>{timeAgo(note.createdAt)}</span>
      </div>

      {isImageAttachment && note.attachmentUrl ? (
        <button
          type="button"
          onClick={() => onImageClick(note.attachmentUrl!)}
          className="block w-full overflow-hidden rounded-md"
          title="برای بزرگ‌نمایی کلیک کنید"
        >
          <img
            src={note.attachmentUrl}
            alt={note.content ?? "تصویر پیوست"}
            className="max-h-40 w-full cursor-zoom-in rounded-md object-cover"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = "none"
            }}
          />
        </button>
      ) : note.noteType !== "text" && note.attachmentUrl ? (
        <a
          href={note.attachmentUrl}
          download={displayName || undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-md border bg-muted/40 p-2 text-xs hover:bg-muted"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium" dir="ltr">{displayName ?? "فایل پیوست"}</div>
            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-emerald-600">
              <Download className="h-2.5 w-2.5" /> دانلود
            </div>
          </div>
        </a>
      ) : null}

      {note.content && !isImageAttachment && (
        <div className="mt-1 whitespace-pre-wrap text-xs leading-relaxed">{note.content}</div>
      )}
      {note.content && isImageAttachment && note.content !== displayName && (
        <div className="mt-1 text-[11px] text-muted-foreground">{note.content}</div>
      )}

      {canManage && (
        <div className="mt-1.5 flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[10px] text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
            onClick={onDelete}
            disabled={deleting}
          >
            <Trash2 className="ml-1 h-3 w-3" /> حذف
          </Button>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Level 3: Project detail (overview, tasks, notes, financials, team)
// ============================================================
// ============================================================
// Edit Project Dialog — admin/manager can edit schedule, discount, freeze
// ============================================================
function EditProjectDialog({ projectId, data }: { projectId: string; data: ProjectDetailData }) {
  const api = useApi()
  const qc = useQueryClient()
  const [open, setOpen] = React.useState(false)
  const p = data.project
  const role = useWorkspace((s) => s.role)
  const isAdmin = role === "admin"

  // ✅ Single date applies to both start and end. deliveryDeadline removed.
  const initialDate = p.startDatetime ?? p.endDatetime ?? null
  const [executionDate, setExecutionDate] = React.useState<string | null>(initialDate)
  const [startTime, setStartTime] = React.useState(p.startDatetime ? new Date(p.startDatetime).toTimeString().slice(0, 5) : "")
  const [endTime, setEndTime] = React.useState(p.endDatetime ? new Date(p.endDatetime).toTimeString().slice(0, 5) : "")
  const [discountToman, setDiscountToman] = React.useState(Math.round((p.discountAmount ?? 0) / 10))
  const [isPriceFrozen, setIsPriceFrozen] = React.useState(p.isPriceFrozen)
  // ✅ New editable fields
  const [servicePackageId, setServicePackageId] = React.useState<string>(p.servicePackage.id)
  const [pricingStrategy, setPricingStrategy] = React.useState<string>(p.pricingStrategy)
  const [priceAdjustment, setPriceAdjustment] = React.useState<number>(
    Math.round((p.priceAdjustment ?? 0) / 10)
  )
  const [referralRewardOverride, setReferralRewardOverride] = React.useState<string>(
    p.referralRewardOverride != null ? String(Math.round(p.referralRewardOverride / 10)) : ""
  )
  const [printedDescription, setPrintedDescription] = React.useState<string>(p.printedDescription ?? "")
  // ✅ Editable tasks/equipment (per-project overrides)
  const [editedTasks, setEditedTasks] = React.useState<Array<{ name: string; price: number }>>([])
  const [editedEquipment, setEditedEquipment] = React.useState<Array<{ name: string; price: number }>>([])

  // Load packages (admin only — needed to change package)
  const { data: packagesData } = useQuery<PkgOption[]>({
    queryKey: ["packages-for-edit", open],
    queryFn: () => api.get<PkgOption[]>("/api/packages?activeOnly=true"),
    enabled: open && isAdmin,
  })
  const packages = packagesData ?? []

  // Helper: convert package's defaultTasks (which may be strings or {name,price}) to {name, price}[]
  function normalizeItems(items: any[]): Array<{ name: string; price: number }> {
    if (!Array.isArray(items)) return []
    return items
      .map((t) => {
        if (typeof t === "string") return { name: t, price: 0 }
        if (t && typeof t === "object") {
          return { name: String(t.name ?? ""), price: Number(t.price ?? 0) || 0 }
        }
        return null
      })
      .filter((t): t is { name: string; price: number } => !!t && t.name.trim().length > 0)
  }

  // Helper: load tasks/equipment from the project's overrides first; fall back to package defaults.
  function loadItemsFromProjectOrPackage(projectOverride: any[] | undefined, packageItems: any[]): Array<{ name: string; price: number }> {
    const override = normalizeItems(projectOverride ?? [])
    if (override.length > 0) return override
    return normalizeItems(packageItems)
  }

  // Initialize tasks/equipment when the dialog opens OR when servicePackageId changes
  React.useEffect(() => {
    if (!open) return
    // Find the currently-selected package (the new one if it changed, else the project's package)
    const selectedPkg = packages.find((pk) => pk.id === servicePackageId) ?? null
    const isNewPackage = servicePackageId !== p.servicePackage.id
    if (isNewPackage && selectedPkg) {
      // Package changed → load the new package's defaults (the user can then edit them)
      setEditedTasks(normalizeItems(selectedPkg.defaultTasks))
      setEditedEquipment(normalizeItems(selectedPkg.defaultEquipment))
      // ✅ Also follow the new package's pricing strategy automatically
      if (selectedPkg.pricingStrategy) setPricingStrategy(selectedPkg.pricingStrategy)
    } else {
      // Initial open or same package → use the project's overrides (or fall back to its package defaults)
      setEditedTasks(loadItemsFromProjectOrPackage(p.customTasks, p.servicePackage.defaultTasks))
      setEditedEquipment(loadItemsFromProjectOrPackage(p.customEquipment, p.servicePackage.defaultEquipment))
    }
  }, [open, servicePackageId, packages]) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (open) {
      setExecutionDate(p.startDatetime ?? p.endDatetime ?? null)
      setStartTime(p.startDatetime ? new Date(p.startDatetime).toTimeString().slice(0, 5) : "")
      setEndTime(p.endDatetime ? new Date(p.endDatetime).toTimeString().slice(0, 5) : "")
      setDiscountToman(Math.round((p.discountAmount ?? 0) / 10))
      setIsPriceFrozen(p.isPriceFrozen)
      setServicePackageId(p.servicePackage.id)
      setPricingStrategy(p.pricingStrategy)
      setPriceAdjustment(Math.round((p.priceAdjustment ?? 0) / 10))
      setReferralRewardOverride(
        p.referralRewardOverride != null ? String(Math.round(p.referralRewardOverride / 10)) : ""
      )
      setPrintedDescription(p.printedDescription ?? "")
      setEditedTasks(loadItemsFromProjectOrPackage(p.customTasks, p.servicePackage.defaultTasks))
      setEditedEquipment(loadItemsFromProjectOrPackage(p.customEquipment, p.servicePackage.defaultEquipment))
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveMut = useMutation({
    mutationFn: async () => {
      // ✅ startDatetime = date + startTime; endDatetime = date + endTime
      const startIso = combineDateAndTime(executionDate, startTime)
      const endIso = combineDateAndTime(executionDate, endTime)
      const payload: Record<string, unknown> = {
        startDatetime: startIso || null,
        endDatetime: endIso || null,
        // ✅ deliveryDeadline removed — explicitly clear it.
        deliveryDeadline: null,
        discountAmount: Math.max(0, Number(discountToman || 0)),
        isPriceFrozen,
        priceAdjustment: Number(priceAdjustment || 0),
        printedDescription: printedDescription.trim() || null,
        // ✅ Always send customTasks/customEquipment so the override is persisted (even if empty)
        customTasks: editedTasks.filter((t) => t.name.trim().length > 0),
        customEquipment: editedEquipment.filter((e) => e.name.trim().length > 0),
      }
      // referralRewardOverride: empty → null (use package default), number → Rials
      if (referralRewardOverride.trim() === "") {
        payload.referralRewardOverride = null
      } else {
        const v = Number(referralRewardOverride.replace(/,/g, ""))
        payload.referralRewardOverride = Number.isFinite(v) && v > 0 ? v : null
      }
      // servicePackageId — admin only, only if changed
      if (isAdmin && servicePackageId && servicePackageId !== p.servicePackage.id) {
        payload.servicePackageId = servicePackageId
      }
      // pricingStrategy — admin only
      if (isAdmin && pricingStrategy && PRICING_STRATEGIES.includes(pricingStrategy as never)) {
        payload.pricingStrategy = pricingStrategy
      }
      return api.patch(`/api/projects/${projectId}`, payload)
    },
    onSuccess: () => {
      toast.success("پروژه به‌روزرسانی شد")
      qc.invalidateQueries({ queryKey: ["project", projectId] })
      qc.invalidateQueries({ queryKey: ["project-workflow", projectId] })
      qc.invalidateQueries({ queryKey: ["customer-projects"] })
      setOpen(false)
    },
    onError: (e: Error) => toast.error(e.message || "ذخیره ناموفق بود"),
  })

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Pencil className="h-3.5 w-3.5" />
        ویرایش پروژه
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>ویرایش پروژه</DialogTitle>
            <DialogDescription>
              پکیج، استراتژی قیمت، تخفیف، اصلاح قیمت، سود معرف، توضیحات چاپی و زمان‌بندی را ویرایش کنید.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Service package (admin only) */}
            {isAdmin && (
              <div>
                <Label className="mb-1.5 block text-xs">پکیج خدمتی</Label>
                <Select value={servicePackageId} onValueChange={setServicePackageId}>
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب پکیج" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.title} — {CATEGORY_LABELS[pkg.category as keyof typeof CATEGORY_LABELS] ?? pkg.category}
                        {pkg.currentPrice ? ` (${formatRialsShort(pkg.currentPrice)} ت)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  توجه: تغییر پکیج، قیمت پایه را به‌روزرسانی و قیمت نهایی را بازمحاسبه می‌کند.
                </div>
              </div>
            )}

            {/* Pricing strategy (admin only) */}
            {isAdmin && (
              <div>
                <Label className="mb-1.5 block text-xs">استراتژی قیمت‌گذاری</Label>
                <Select value={pricingStrategy} onValueChange={setPricingStrategy}>
                  <SelectTrigger>
                    <SelectValue placeholder="استراتژی" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICING_STRATEGIES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {PRICING_STRATEGY_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block text-xs">اصلاح قیمت (تومان)</Label>
                <TomanInput
                  value={priceAdjustment}
                  onValueChange={setPriceAdjustment}
                  placeholder="مثلاً ۵۰۰۰۰۰ (مثبت = افزایش)"
                />
                <div className="mt-1 text-[10px] text-muted-foreground">
                  مثبت = افزایش قیمت، منفی = کاهش قیمت
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">تخفیف (تومان)</Label>
                <TomanInput
                  value={discountToman}
                  onValueChange={setDiscountToman}
                  placeholder="مبلغ تخفیف به تومان"
                />
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block text-xs">سود معرف (تومان) — خالی = پیش‌فرض پکیج</Label>
              <Input
                dir="ltr"
                value={referralRewardOverride}
                onChange={(e) => setReferralRewardOverride(e.target.value.replace(/[^0-9-]/g, ""))}
                placeholder="خالی = استفاده از پیش‌فرض پکیج"
              />
            </div>

            <div>
              <Label className="mb-1.5 block text-xs">توضیحات چاپی (برای قرارداد)</Label>
              <Textarea
                value={printedDescription}
                onChange={(e) => setPrintedDescription(e.target.value)}
                placeholder="توضیحات اختصاصی برای این پروژه (در قرارداد چاپ می‌شود)"
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            {/* ✅ Editable tasks (per-project override of package defaults) */}
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-xs font-medium">کارهای پروژه (با قیمت راهنما)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => setEditedTasks([...editedTasks, { name: "", price: 0 }])}
                >
                  <Plus className="ml-1 size-3" /> افزودن
                </Button>
              </div>
              <div className="space-y-1.5">
                {editedTasks.length === 0 && (
                  <p className="text-[10px] text-muted-foreground">کاری ثبت نشده.</p>
                )}
                {editedTasks.map((task, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <Input
                      value={task.name}
                      onChange={(e) => {
                        const next = [...editedTasks]
                        next[i] = { ...next[i], name: e.target.value }
                        setEditedTasks(next)
                      }}
                      className="h-8 flex-1 text-xs"
                      placeholder="نام کار…"
                    />
                    <Input
                      type="number"
                      dir="ltr"
                      value={task.price || ""}
                      onChange={(e) => {
                        const next = [...editedTasks]
                        next[i] = { ...next[i], price: Number(e.target.value) || 0 }
                        setEditedTasks(next)
                      }}
                      className="h-8 w-28 text-left text-xs"
                      placeholder="قیمت"
                    />
                    <span className="shrink-0 text-[9px] text-muted-foreground">ت</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-rose-600"
                      onClick={() => setEditedTasks(editedTasks.filter((_, idx) => idx !== i))}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* ✅ Editable equipment (per-project override) */}
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-xs font-medium">تجهیزات پروژه (با قیمت راهنما)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => setEditedEquipment([...editedEquipment, { name: "", price: 0 }])}
                >
                  <Plus className="ml-1 size-3" /> افزودن
                </Button>
              </div>
              <div className="space-y-1.5">
                {editedEquipment.length === 0 && (
                  <p className="text-[10px] text-muted-foreground">تجهیزی ثبت نشده.</p>
                )}
                {editedEquipment.map((eq, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <Input
                      value={eq.name}
                      onChange={(e) => {
                        const next = [...editedEquipment]
                        next[i] = { ...next[i], name: e.target.value }
                        setEditedEquipment(next)
                      }}
                      className="h-8 flex-1 text-xs"
                      placeholder="نام تجهیز…"
                    />
                    <Input
                      type="number"
                      dir="ltr"
                      value={eq.price || ""}
                      onChange={(e) => {
                        const next = [...editedEquipment]
                        next[i] = { ...next[i], price: Number(e.target.value) || 0 }
                        setEditedEquipment(next)
                      }}
                      className="h-8 w-28 text-left text-xs"
                      placeholder="قیمت"
                    />
                    <span className="shrink-0 text-[9px] text-muted-foreground">ت</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-rose-600"
                      onClick={() => setEditedEquipment(editedEquipment.filter((_, idx) => idx !== i))}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* ✅ Single date + start time + end time (date applies to both start and end) */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="mb-1.5 block text-xs">تاریخ اجرا</Label>
                <JalaliDatePicker
                  value={executionDate}
                  onChange={setExecutionDate}
                  placeholder="انتخاب تاریخ"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">ساعت شروع</Label>
                <TimeWheelPicker value={startTime || undefined} onChange={setStartTime} />
                {startTime && (
                  <div className="text-center text-[10px] text-muted-foreground">{formatTime12h(startTime)}</div>
                )}
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">ساعت پایان</Label>
                <TimeWheelPicker value={endTime || undefined} onChange={setEndTime} />
                {endTime && (
                  <div className="text-center text-[10px] text-muted-foreground">{formatTime12h(endTime)}</div>
                )}
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-muted/30 p-3">
              <Checkbox
                checked={isPriceFrozen}
                onCheckedChange={(v) => setIsPriceFrozen(Boolean(v))}
              />
              <span className="flex items-center gap-1.5 text-xs">
                <Snowflake className="h-3.5 w-3.5 text-sky-500" />
                فریز قیمت (قفل قیمت فعلی در برابر تغییرات پکیج)
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>انصراف</Button>
            <Button disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
              {saveMut.isPending ? "در حال ذخیره…" : "ذخیره تغییرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ProjectDetail() {
  const api = useApi()
  const qc = useQueryClient()
  const { activeProjectId, backToProjectCustomer, activeProjectCustomerId } = useWorkspace()
  const [tab, setTab] = React.useState("overview")

  const { data: raw, isLoading } = useQuery({
    queryKey: ["project", activeProjectId],
    queryFn: () => api.get<any>(`/api/projects/${activeProjectId}`),
    enabled: !!activeProjectId,
  })

  // Normalize: the API returns the project fields flat (with contract/servicePackage/payments/notes nested).
  // Wrap it into the shape the detail components expect.
  const data: ProjectDetailData | null = React.useMemo(() => {
    if (!raw) return null
    const p = raw.project ?? raw
    return {
      project: {
        id: p.id,
        status: p.status,
        pricingStrategy: p.pricingStrategy,
        isPriceFrozen: p.isPriceFrozen,
        exemptFromPhotoPriceUpdate: p.exemptFromPhotoPriceUpdate ?? false,
        isReadyForDelivery: p.isReadyForDelivery,
        calculatedPrice: p.calculatedPrice != null ? Number(p.calculatedPrice) : null,
        lockedPrice: p.lockedPrice != null ? Number(p.lockedPrice) : null,
        discountAmount: p.discountAmount != null ? Number(p.discountAmount) : 0,
        // ✅ فیلدهای جدید
        priceAdjustment: p.priceAdjustment != null ? Number(p.priceAdjustment) : 0,
        referralRewardOverride:
          p.referralRewardOverride != null ? Number(p.referralRewardOverride) : null,
        projectAddress: p.projectAddress ?? null,
        projectLocationId: p.projectLocationId ?? null,
        startDatetime: p.startDatetime ?? null,
        endDatetime: p.endDatetime ?? null,
        deliveryDeadline: p.deliveryDeadline ?? null,
        printedDescription: p.printedDescription ?? null,
        // ✅ Per-project task/equipment overrides (from API; fall back to package defaults for display)
        customTasks: Array.isArray(p.customTasks) ? p.customTasks : [],
        customEquipment: Array.isArray(p.customEquipment) ? p.customEquipment : [],
        effectivePrice: p.effectivePrice ?? null,
        totalPaid: p.totalPaid ?? null,
        balance: p.balance ?? null,
        contract: p.contract ?? { contractNumber: "", customer: { id: "", name: "" } },
        servicePackage: {
          id: p.servicePackage?.id ?? "",
          title: p.servicePackage?.title ?? "",
          category: p.servicePackage?.category ?? "",
          currentPrice: p.servicePackage?.currentPrice ?? null,
          basePrice: p.servicePackage?.basePrice ?? null,
          pricingStrategy: p.servicePackage?.pricingStrategy ?? "",
          defaultDescription: p.servicePackage?.defaultDescription ?? null,
          defaultTasks: parseStrArr(p.servicePackage?.defaultTasks),
          defaultEquipment: parseStrArr(p.servicePackage?.defaultEquipment),
        },
        fieldTeam: p.fieldTeam ?? [],
        studioTeam: p.studioTeam ?? [],
        payments: (p.payments ?? []).map((pay: any) => ({
          id: pay.id,
          amount: Number(pay.amount),
          paymentType: pay.paymentType,
          method: pay.method,
          datePaid: pay.datePaid,
          note: pay.note,
          isConfirmed: pay.isConfirmed,
          recordedBy: pay.recordedBy ?? null,
        })),
        notes: (p.notes ?? []).map((n: any) => ({
          id: n.id,
          content: n.content,
          noteType: n.noteType,
          createdAt: n.createdAt,
          author: n.author,
        })),
        smsAssignments: (p.smsAssignments ?? []).map((a: any) => ({
          id: a.id,
          automationId: a.automationId,
          automationName: a.automationName,
          templateName: a.templateName,
          templateText: a.templateText,
          triggerEvent: a.triggerEvent,
          defaultOffsetDays: a.defaultOffsetDays ?? a.offsetDays ?? 0,
          offsetDaysOverride: a.offsetDaysOverride,
          effectiveOffsetDays: a.effectiveOffsetDays ?? a.offsetDaysOverride ?? a.defaultOffsetDays ?? 0,
          enabled: a.enabled,
        })),
      },
      seeFinance: raw.seeFinance ?? true,
      seeBalance: raw.seeBalance ?? true,
      canManage: raw.canManage ?? true,
      role: raw.role ?? "admin",
    }
  }, [raw])

  if (isLoading || !data) {
    return (
      <div>
        <Skeleton className="mb-4 h-8 w-40" />
        <Skeleton className="mb-4 h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const p = data.project

  return (
    <div dir="rtl" className="text-right">
      {/* ✅ Mobile floating back button — iOS has no hardware back */}
      <button
        onClick={backToProjectCustomer}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-1 rounded-full bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground shadow-lg sm:hidden"
        aria-label="بازگشت"
      >
        <ChevronLeft className="h-4 w-4 rotate-180" /> بازگشت
      </button>

      <button
        onClick={backToProjectCustomer}
        className="mb-4 hidden items-center gap-1 text-sm text-muted-foreground hover:text-foreground sm:flex"
      >
        <ChevronLeft className="h-4 w-4 rotate-180" /> بازگشت به پروژه‌های مشتری
      </button>

      {/* ✅ Sticky header — back button (sm+), project title + tabs always visible */}
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="notion-title truncate text-xl sm:text-2xl">{p.contract.customer.name}</h1>
              {p.status === "delivered" && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> تکمیل شده
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span dir="ltr">{p.contract.contractNumber}</span>
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                style={{ background: CATEGORY_COLORS[p.servicePackage.category as keyof typeof CATEGORY_COLORS] + "22", color: CATEGORY_COLORS[p.servicePackage.category as keyof typeof CATEGORY_COLORS] }}
              >
                {CATEGORY_LABELS[p.servicePackage.category as keyof typeof CATEGORY_LABELS] ?? p.servicePackage.category}
              </span>
              <span className="truncate">· {p.servicePackage.title}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge
              variant="secondary"
              style={{ background: STATUS_COLORS[p.status as ProjectStatus] + "22", color: STATUS_COLORS[p.status as ProjectStatus] }}
            >
              {STATUS_LABELS[p.status as ProjectStatus] ?? p.status}
            </Badge>

            {/* Edit project button — admin/manager only */}
            {data.canManage && (data.role === "admin" || data.role === "manager") && (
              <EditProjectDialog projectId={p.id} data={data} />
            )}
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4" dir="rtl">
          <TabsTrigger value="overview">نمای کلی</TabsTrigger>
          <TabsTrigger value="workflow">گردش کار</TabsTrigger>
          <TabsTrigger value="team">تیم، زمان و مکان</TabsTrigger>
          <TabsTrigger value="sms">پیامک</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab data={data} />
        </TabsContent>
        <TabsContent value="workflow">
          <WorkflowTab projectId={data.project.id} category={data.project.servicePackage.category} />
        </TabsContent>
        <TabsContent value="team">
          <TeamTab data={data} />
        </TabsContent>
        <TabsContent value="sms">
          <SmsTab data={data} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface ProjectDetailData {
  project: {
    id: string
    status: string
    pricingStrategy: string
    isPriceFrozen: boolean
    exemptFromPhotoPriceUpdate: boolean
    isReadyForDelivery: boolean
    calculatedPrice: number | null
    lockedPrice: number | null
    discountAmount: number
    // ✅ فیلدهای جدید: اصلاح قیمت، سود معرف override، آدرس و مکان اجرا
    priceAdjustment?: number
    referralRewardOverride?: number | null
    projectAddress?: string | null
    projectLocationId?: string | null
    startDatetime: string | null
    endDatetime: string | null
    deliveryDeadline: string | null
    printedDescription: string | null
    // ✅ Per-project task/equipment overrides (parsed from JSON in API response)
    customTasks?: Array<{ name: string; price: number }>
    customEquipment?: Array<{ name: string; price: number }>
    effectivePrice: number | null
    totalPaid: number | null
    balance: number | null
    printPhotoTotal?: number | null
    printPhotoPaid?: number | null
    printPhotoBalance?: number | null
    contract: { contractNumber: string; customer: { id: string; name: string } }
    servicePackage: {
      id: string
      title: string
      category: string
      currentPrice: number | null
      basePrice: number | null
      pricingStrategy: string
      defaultDescription: string | null
      defaultTasks: any[]
      defaultEquipment: any[]
    }
    fieldTeam: { id: string; firstName: string; lastName: string; role: string }[]
    studioTeam: { id: string; firstName: string; lastName: string; role: string }[]
    payments: {
      id: string
      amount: number
      paymentType: string
      method: string
      paymentFor?: string
      datePaid: string
      note: string | null
      isConfirmed: boolean
      recordedBy?: {
        id: string
        firstName: string
        lastName: string
        fullName: string
        role: string
      } | null
    }[]
    notes: { id: string; content: string | null; noteType: string; createdAt: string; author: { firstName: string; lastName: string } | null }[]
    smsAssignments: {
      id: string
      automationId: string
      automationName: string
      templateName: string
      templateText: string
      triggerEvent: string
      defaultOffsetDays: number
      offsetDaysOverride: number | null
      effectiveOffsetDays: number
      enabled: boolean
    }[]
  }
  seeFinance: boolean
  seeBalance: boolean
  canManage: boolean
  role: Role
}

/** Prominent freeze-price buttons — toggles isPriceFrozen on the project and
 *  exemptFromPhotoPriceUpdate for print photos. Used in both OverviewTab and
 *  WorkflowTab to give admins/managers a clear, visible control. */
function FreezeButtons({
  projectId,
  isPriceFrozen,
  isPhotoExempt,
  showPhotoFreeze = true,
}: {
  projectId: string
  isPriceFrozen: boolean
  isPhotoExempt: boolean
  showPhotoFreeze?: boolean
}) {
  const api = useApi()
  const qc = useQueryClient()

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["project", projectId] })
    qc.invalidateQueries({ queryKey: ["project-workflow", projectId] })
    qc.invalidateQueries({ queryKey: ["project-print-photos", projectId] })
    qc.invalidateQueries({ queryKey: ["customer-projects"] })
  }

  const projectFreezeMut = useMutation({
    mutationFn: (next: boolean) =>
      api.patch(`/api/projects/${projectId}`, { isPriceFrozen: next }),
    onSuccess: (_d, next) => {
      toast.success(next ? "قیمت پروژه فریز شد" : "فریز قیمت پروژه لغو شد")
      invalidateAll()
    },
    onError: () => toast.error("عملیات ناموفق بود"),
  })

  const photoExemptMut = useMutation({
    mutationFn: (next: boolean) =>
      api.patch(`/api/projects/${projectId}`, { exemptFromPhotoPriceUpdate: next }),
    onSuccess: (_d, next) => {
      toast.success(next ? "قیمت عکس‌های چاپی فریز شد" : "فریز قیمت عکس‌های چاپی لغو شد")
      invalidateAll()
    },
    onError: () => toast.error("عملیات ناموفق بود"),
  })

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        disabled={projectFreezeMut.isPending}
        onClick={() => projectFreezeMut.mutate(!isPriceFrozen)}
        className={cn(
          "flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          isPriceFrozen
            ? "border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
            : "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300"
        )}
      >
        {isPriceFrozen ? <Lock className="h-4 w-4 shrink-0" /> : <Unlock className="h-4 w-4 shrink-0" />}
        <span>{isPriceFrozen ? "🔒 فریز قیمت پروژه — فعال" : "🔒 فریز قیمت پروژه"}</span>
      </button>

      {showPhotoFreeze && (
        <button
          type="button"
          disabled={photoExemptMut.isPending}
          onClick={() => photoExemptMut.mutate(!isPhotoExempt)}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
            isPhotoExempt
              ? "border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300"
          )}
        >
          {isPhotoExempt ? <Lock className="h-4 w-4 shrink-0" /> : <Unlock className="h-4 w-4 shrink-0" />}
          <span>{isPhotoExempt ? "🔒 فریز قیمت عکس‌های چاپی — فعال" : "🔒 فریز قیمت عکس‌های چاپی"}</span>
        </button>
      )}
    </div>
  )
}

function OverviewTab({ data }: { data: ProjectDetailData }) {
  const p = data.project
  const api = useApi()
  const seeBalance = data.seeBalance
  const effectivePrice = p.effectivePrice ?? 0
  const totalPaid = p.totalPaid ?? 0
  const balance = p.balance ?? 0
  const discount = p.discountAmount ?? 0
  const calculatedPrice = p.calculatedPrice ?? 0
  const paymentProgress = effectivePrice > 0 ? Math.min(100, Math.round((totalPaid / effectivePrice) * 100)) : 0
  const isFullyPaid = balance <= 0 && totalPaid > 0
  const hasPhotoTrack = p.servicePackage.category === "photo" || p.servicePackage.category === "mix"

  // ✅ Fetch the project's additional schedules (multi-location/multi-time entries).
  const { data: schedulesData, isLoading: schedulesLoading } = useQuery<{ items: ProjectScheduleItem[] }>({
    queryKey: ["project-schedules-overview", p.id],
    queryFn: () => api.get<{ items: ProjectScheduleItem[] }>(`/api/projects/${p.id}/schedules`),
  })
  const schedules = schedulesData?.items ?? []

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* 0. مدیریت قیمت — فریز قیمت پروژه و عکس‌های چاپی */}
      {data.canManage && (
        <SectionCard
          title="مدیریت قیمت"
          description="قیمت پروژه یا عکس‌های چاپی را در برابر تغییرات قفل کنید."
        >
          <FreezeButtons
            projectId={p.id}
            isPriceFrozen={p.isPriceFrozen}
            isPhotoExempt={p.exemptFromPhotoPriceUpdate}
            showPhotoFreeze={hasPhotoTrack}
          />
        </SectionCard>
      )}

      {/* 1. توضیحات کامل پکیج */}
      <SectionCard title="توضیحات کامل پکیج">
        {p.servicePackage.defaultDescription ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{p.servicePackage.defaultDescription}</p>
        ) : (
          <p className="text-sm text-muted-foreground">توضیحاتی برای این پکیج ثبت نشده است.</p>
        )}
      </SectionCard>

      {/* 2. کارهای این پروژه — per-project override (customTasks) if present, else package defaults */}
      <SectionCard
        title="کارهای این پروژه"
        description={
          (p.customTasks?.length ?? 0) > 0
            ? "فهرست سفارشی‌شده برای این پروژه"
            : "فهرست پیش‌فرض پکیج (با دکمه «ویرایش پروژه» قابل سفارشی‌سازی)"
        }
      >
        {(() => {
          const tasks = (p.customTasks && p.customTasks.length > 0) ? p.customTasks : p.servicePackage.defaultTasks
          const items = (tasks || []).map((t: any) => typeof t === "string" ? { name: t, price: 0 } : t).filter((t: any) => t && t.name)
          if (items.length === 0) {
            return <p className="text-sm text-muted-foreground">کاری برای این پروژه ثبت نشده است.</p>
          }
          return (
            <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed">
              {items.map((item: any, i: number) => (
                <li key={i}>
                  {item.name}
                  {item.price > 0 && (
                    <span className="text-muted-foreground"> — {toPersianDigits(item.price.toLocaleString("en-US"))} تومان</span>
                  )}
                </li>
              ))}
            </ul>
          )
        })()}
      </SectionCard>

      {/* 3. تجهیزات این پروژه — per-project override (customEquipment) if present, else package defaults */}
      <SectionCard
        title="تجهیزات این پروژه"
        description={
          (p.customEquipment?.length ?? 0) > 0
            ? "تجهیزات سفارشی‌شده برای این پروژه"
            : "تجهیزات پیش‌فرض پکیج"
        }
      >
        {(() => {
          const equip = (p.customEquipment && p.customEquipment.length > 0) ? p.customEquipment : p.servicePackage.defaultEquipment
          const items = (equip || []).map((e: any) => typeof e === "string" ? { name: e, price: 0 } : e).filter((e: any) => e && e.name)
          if (items.length === 0) {
            return <p className="text-sm text-muted-foreground">تجهیزی برای این پروژه ثبت نشده است.</p>
          }
          return (
            <div className="flex flex-wrap gap-1.5">
              {items.map((item: any, i: number) => (
                <span key={i} className="rounded-full bg-muted px-2.5 py-1 text-xs">
                  {item.name}
                  {item.price > 0 && ` — ${toPersianDigits(item.price.toLocaleString("en-US"))} ت`}
                </span>
              ))}
            </div>
          )
        })()}
      </SectionCard>

      {/* 4. زمان‌بندی‌ها — main + additional schedules (timeline view) */}
      <SectionCard
        title="📅 زمان‌بندی اجرا"
        description="تاریخ شروع/پایان اصلی پروژه و زمان‌بندی‌های اضافی برای مکان‌های مختلف"
      >
        {schedulesLoading ? (
          <p className="text-xs text-muted-foreground">در حال بارگذاری...</p>
        ) : (
          <div className="space-y-3">
            {/* Main schedule (from project's start/end/deadline) */}
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
                <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                زمان‌بندی اصلی
              </div>
              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">شروع اجرا: </span>
                  <span className="font-medium">{p.startDatetime ? formatDateTime(p.startDatetime) : "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">پایان اجرا: </span>
                  <span className="font-medium">{p.endDatetime ? formatDateTime(p.endDatetime) : "—"}</span>
                </div>
                {p.deliveryDeadline && (
                  <div>
                    <span className="text-muted-foreground">مهلت تحویل: </span>
                    <span className="font-medium">{formatDate(p.deliveryDeadline)}</span>
                  </div>
                )}
                {p.projectAddress && (
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground">آدرس: </span>
                    <span className="font-medium">{p.projectAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Additional schedules (ProjectSchedule rows) */}
            {schedules.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-semibold text-muted-foreground">
                  زمان‌بندی‌های اضافی ({toPersianDigits(schedules.length)} مورد)
                </div>
                <div className="relative space-y-2 border-r-2 border-dashed border-muted pr-3">
                  {schedules.map((s, idx) => (
                    <div key={s.id} className="relative">
                      <span
                        className="absolute -right-[19px] top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-background bg-primary"
                        aria-hidden
                      />
                      <div className="rounded-md border bg-card p-2.5">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px]">#{toPersianDigits(idx + 1)}</Badge>
                          <span className="text-xs font-semibold">
                            {s.location?.name ?? "مکان دستی"}
                          </span>
                          {s.location?.city && (
                            <Badge variant="secondary" className="text-[9px]">{s.location.city}</Badge>
                          )}
                        </div>
                        <div className="space-y-0.5 text-[11px] text-muted-foreground">
                          {(s.location?.address || s.address) && (
                            <div className="flex items-start gap-1">
                              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                              <span>{s.location?.address ?? s.address}</span>
                            </div>
                          )}
                          {(s.startDatetime || s.endDatetime) && (
                            <div className="flex items-start gap-1">
                              <Clock className="mt-0.5 h-3 w-3 shrink-0" />
                              <span>
                                {s.startDatetime ? formatDateTime(s.startDatetime) : "—"}
                                {" تا "}
                                {s.endDatetime ? formatDateTime(s.endDatetime) : "—"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {schedules.length === 0 && !p.startDatetime && !p.endDatetime && !p.deliveryDeadline && !p.projectAddress && (
              <p className="text-xs text-muted-foreground">
                هیچ زمان‌بندی برای این پروژه ثبت نشده است. به تب «تیم، زمان و مکان» بروید.
              </p>
            )}
          </div>
        )}
      </SectionCard>

      {/* 4b. توضیحات مکان و زمان اجرا — combined notes from all schedule entries */}
      <SectionCard
        title="📝 توضیحات مکان و زمان اجرا"
        description="یادداشت‌های ثبت‌شده برای زمان‌بندی‌های اجرا (ترکیب از همه مکان‌ها)"
      >
        {(() => {
          // ✅ Combine all schedule notes into a single block. Dedupe identical notes so
          // we don't repeat the same text N times (the wizard saves the same note per schedule).
          const notes = schedules
            .map((s) => (s.note ?? "").trim())
            .filter((n) => n.length > 0)
          const unique = Array.from(new Set(notes))
          if (unique.length === 0) {
            return <p className="text-sm text-muted-foreground">توضیحاتی برای زمان‌بندی اجرا ثبت نشده است.</p>
          }
          return (
            <div className="space-y-2">
              {unique.map((n, i) => (
                <div key={i} className="rounded-md border bg-muted/30 p-2.5">
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                    <StickyNote className="h-3 w-3" />
                    یادداشت {toPersianDigits(i + 1)}
                  </div>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed">{n}</p>
                </div>
              ))}
            </div>
          )
        })()}
      </SectionCard>

      {/* 5. یادداشت‌های پروژه — p.notes with author, type, date, attachments */}
      <SectionCard
        title="💬 یادداشت‌ها و فایل‌ها"
        description={`یادداشت‌های ثبت‌شده برای این پروژه (${toPersianDigits(p.notes?.length ?? 0)})`}
      >
        {p.notes && p.notes.length > 0 ? (
          <div className="space-y-2">
            {p.notes.map((n) => (
              <div key={n.id} className="rounded-md border bg-card p-2.5">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[9px]">
                        {(n.author?.firstName?.[0] ?? "") + (n.author?.lastName?.[0] ?? "")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">
                      {n.author ? `${n.author.firstName} ${n.author.lastName}` : "نامشخص"}
                    </span>
                    <Badge variant="outline" className="text-[9px]">
                      {n.noteType === "text" ? "متن" : n.noteType === "voice" ? "صوتی" : n.noteType === "image" ? "تصویر" : n.noteType === "file" ? "فایل" : n.noteType}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {timeAgo(n.createdAt)}
                  </span>
                </div>
                {n.content && (
                  <p className="whitespace-pre-wrap text-xs leading-relaxed">{n.content}</p>
                )}
                {/* Attachments — shown when noteType is not text and attachmentUrl is a data URL or remote URL */}
                {n.noteType !== "text" && (n as any).attachmentUrl && (
                  <div className="mt-2">
                    {n.noteType === "image" && (n as any).previewUrl ? (
                      <img
                        src={(n as any).previewUrl}
                        alt={n.content || "attachment"}
                        className="max-h-48 rounded-md border"
                      />
                    ) : (
                      <a
                        href={(n as any).attachmentUrl}
                        download={(n as any).attachmentUrl?.split("/").pop() || "attachment"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border bg-muted px-2.5 py-1.5 text-xs hover:bg-muted/80"
                      >
                        <Paperclip className="h-3 w-3" />
                        دانلود پیوست
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">یادداشتی برای این پروژه ثبت نشده است.</p>
        )}
      </SectionCard>
    </div>
  )
}

// ============================================================
// Project Schedules — additional time/location slots beyond the
// project's main startDatetime/endDatetime/deliveryDeadline.
// ============================================================
interface ProjectScheduleItem {
  id: string
  projectId: string
  locationId: string | null
  location: { id: string; name: string; address: string | null; city: string | null; phone: string | null } | null
  address: string | null
  startDatetime: string | null
  endDatetime: string | null
  note: string | null
  order: number
  createdAt: string
  updatedAt: string
}

function ProjectSchedulesSection({
  projectId,
  canManage,
}: {
  projectId: string
  canManage: boolean
}) {
  const api = useApi()
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ProjectScheduleItem | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<ProjectScheduleItem | null>(null)

  const { data, isLoading } = useQuery<{ items: ProjectScheduleItem[] }>({
    queryKey: ["project-schedules", projectId],
    queryFn: () => api.get(`/api/projects/${projectId}/schedules`),
  })
  const schedules = data?.items ?? []

  const deleteMut = useMutation({
    mutationFn: (scheduleId: string) => api.del(`/api/projects/${projectId}/schedules/${scheduleId}`),
    onSuccess: () => {
      toast.success("زمان‌بندی حذف شد")
      qc.invalidateQueries({ queryKey: ["project-schedules", projectId] })
      setDeleteTarget(null)
    },
    onError: (e: Error) => toast.error(e.message || "حذف ناموفق بود"),
  })

  return (
    <SectionCard
      title="📅 زمان‌بندی‌های اضافی"
      description="بخش‌های اضافی پروژه با مکان/زمان جداگانه — برای پروژه‌هایی که در چند مرحله یا چند مکان اجرا می‌شوند."
      actions={
        canManage ? (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => { setEditing(null); setAddOpen(true) }}
          >
            <Plus className="h-3.5 w-3.5" /> افزودن زمان‌بندی
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <p className="text-xs text-muted-foreground">در حال بارگذاری...</p>
      ) : schedules.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          زمان‌بندی اضافی ثبت نشده. زمان‌بندی اصلی پروژه (شروع/پایان اجرا و مهلت تحویل) در بخش بالا قابل ویرایش است.
        </p>
      ) : (
        <div className="space-y-2">
          {schedules.map((s, idx) => (
            <div
              key={s.id}
              className="rounded-lg border bg-muted/20 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      #{toPersianDigits(idx + 1)}
                    </Badge>
                    <span className="text-sm font-semibold">
                      {s.location?.name ?? "مکان دستی"}
                    </span>
                  </div>
                  <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                    {s.location ? (
                      <div className="flex items-start gap-1">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>
                          {[s.location.address, s.location.city, s.location.phone]
                            .filter(Boolean)
                            .join(" · ") || s.location.name}
                        </span>
                      </div>
                    ) : s.address ? (
                      <div className="flex items-start gap-1">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>{s.address}</span>
                      </div>
                    ) : null}
                    {(s.startDatetime || s.endDatetime) && (
                      <div className="flex items-start gap-1">
                        <Clock className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>
                          {s.startDatetime ? formatDateTime(s.startDatetime) : "—"}
                          {" تا "}
                          {s.endDatetime ? formatDateTime(s.endDatetime) : "—"}
                        </span>
                      </div>
                    )}
                    {s.note && (
                      <div className="flex items-start gap-1">
                        <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                        <span className="whitespace-pre-wrap">{s.note}</span>
                      </div>
                    )}
                  </div>
                </div>
                {canManage && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => { setEditing(s); setAddOpen(true) }}
                    >
                      <Pencil className="ml-1 h-3 w-3" /> ویرایش
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px] text-rose-600 hover:text-rose-700"
                      onClick={() => setDeleteTarget(s)}
                    >
                      <Trash2 className="ml-1 h-3 w-3" /> حذف
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {addOpen && (
        <ProjectScheduleDialog
          open={addOpen}
          onOpenChange={(v) => { if (!v) { setAddOpen(false); setEditing(null) } }}
          projectId={projectId}
          schedule={editing}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف زمان‌بندی؟</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف این زمان‌بندی اضافی مطمئن هستید؟ این عمل قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              disabled={deleteMut.isPending}
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
            >
              {deleteMut.isPending ? "در حال حذف…" : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionCard>
  )
}

function ProjectScheduleDialog({
  open,
  onOpenChange,
  projectId,
  schedule,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  projectId: string
  schedule: ProjectScheduleItem | null
}) {
  const api = useApi()
  const qc = useQueryClient()
  const role = useWorkspace((s) => s.role)
  const isEdit = !!schedule

  const [locationId, setLocationId] = React.useState<string | null>(schedule?.locationId ?? null)
  const [address, setAddress] = React.useState<string>(schedule?.address ?? "")
  const [startDate, setStartDate] = React.useState<string | null>(schedule?.startDatetime ?? null)
  const [startTime, setStartTime] = React.useState(
    schedule?.startDatetime ? new Date(schedule.startDatetime).toTimeString().slice(0, 5) : ""
  )
  const [endDate, setEndDate] = React.useState<string | null>(schedule?.endDatetime ?? null)
  const [endTime, setEndTime] = React.useState(
    schedule?.endDatetime ? new Date(schedule.endDatetime).toTimeString().slice(0, 5) : ""
  )
  const [note, setNote] = React.useState<string>(schedule?.note ?? "")

  // Reset state when dialog opens with a different schedule
  React.useEffect(() => {
    if (!open) return
    setLocationId(schedule?.locationId ?? null)
    setAddress(schedule?.address ?? "")
    setStartDate(schedule?.startDatetime ?? null)
    setStartTime(schedule?.startDatetime ? new Date(schedule.startDatetime).toTimeString().slice(0, 5) : "")
    setEndDate(schedule?.endDatetime ?? null)
    setEndTime(schedule?.endDatetime ? new Date(schedule.endDatetime).toTimeString().slice(0, 5) : "")
    setNote(schedule?.note ?? "")
  }, [open, schedule])

  // Project locations — searchable combobox
  const [locSearch, setLocSearch] = React.useState("")
  const [locPopoverOpen, setLocPopoverOpen] = React.useState(false)
  const { data: locationsData } = useQuery<{ items: ProjectLocationItem[] }>({
    queryKey: ["project-locations", locSearch],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (locSearch) params.set("search", locSearch)
      const res = await fetch(`/api/project-locations?${params.toString()}`, {
        credentials: "include",
        headers: { "x-demo-role": role },
      })
      if (!res.ok) return { items: [] }
      const d = await res.json()
      return { items: Array.isArray(d) ? d : (d.items || []) }
    },
    staleTime: 30_000,
  })
  const locations = locationsData?.items ?? []
  const selectedLocation = locations.find((l) => l.id === locationId) ?? null

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        locationId: locationId || null,
        address: address.trim() || null,
        startDatetime: combineDateAndTime(startDate, startTime),
        endDatetime: combineDateAndTime(endDate, endTime),
        note: note.trim() || null,
      }
      if (isEdit && schedule) {
        return api.patch(`/api/projects/${projectId}/schedules/${schedule.id}`, payload)
      }
      return api.post(`/api/projects/${projectId}/schedules`, payload)
    },
    onSuccess: () => {
      toast.success(isEdit ? "زمان‌بندی به‌روزرسانی شد" : "زمان‌بندی جدید ثبت شد")
      qc.invalidateQueries({ queryKey: ["project-schedules", projectId] })
      onOpenChange(false)
    },
    onError: (e: Error) => toast.error(e.message || "ذخیره ناموفق بود"),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "ویرایش زمان‌بندی" : "افزودن زمان‌بندی جدید"}</DialogTitle>
          <DialogDescription>
            یک زمان‌بندی اضافی برای این پروژه ثبت کنید — مکان، زمان و یادداشت جداگانه.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Location picker */}
          <div>
            <Label className="mb-1.5 block text-xs">مکان از پیش ثبت‌شده (اختیاری)</Label>
            <div className="flex items-center gap-2">
              <Popover open={locPopoverOpen} onOpenChange={setLocPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="flex-1 justify-between"
                  >
                    {selectedLocation ? (
                      <span className="truncate">
                        {selectedLocation.name}
                        {selectedLocation.city ? ` — ${selectedLocation.city}` : ""}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">انتخاب مکان...</span>
                    )}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="جستجوی مکان..."
                      value={locSearch}
                      onValueChange={setLocSearch}
                    />
                    <CommandList>
                      <CommandEmpty>مکانی یافت نشد.</CommandEmpty>
                      <CommandGroup>
                        {locations.map((l) => (
                          <CommandItem
                            key={l.id}
                            value={`${l.name} ${l.city ?? ""} ${l.address ?? ""}`}
                            onSelect={() => {
                              setLocationId(l.id)
                              if (l.address) setAddress(l.address)
                              setLocPopoverOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "ml-1 h-3.5 w-3.5",
                                locationId === l.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{l.name}</div>
                              {(l.city || l.address) && (
                                <div className="text-[10px] text-muted-foreground truncate">
                                  {[l.city, l.address].filter(Boolean).join(" — ")}
                                </div>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {locationId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-rose-600"
                  onClick={() => setLocationId(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Address input */}
          <div>
            <Label className="mb-1.5 block text-xs">آدرس (اگه مکان انتخاب نشد)</Label>
            <Textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="آدرس کامل محل اجرا..."
              rows={2}
              className="resize-none text-sm"
            />
          </div>

          {/* Start + End datetime */}
          <div className="grid gap-3 sm:grid-cols-2">
            <ScheduleField
              label="شروع"
              date={startDate}
              onDateChange={setStartDate}
              time={startTime}
              onTimeChange={setStartTime}
            />
            <ScheduleField
              label="پایان"
              date={endDate}
              onDateChange={setEndDate}
              time={endTime}
              onTimeChange={setEndTime}
            />
          </div>

          {/* Note */}
          <div>
            <Label className="mb-1.5 block text-xs">یادداشت (اختیاری)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثلاً: مراسم عقد، مراسم عروسی، جلسه عکس‌برداری استودیو"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>انصراف</Button>
          <Button disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
            {saveMut.isPending ? "در حال ذخیره…" : isEdit ? "ذخیره تغییرات" : "افزودن"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TeamTab({ data }: { data: ProjectDetailData }) {
  const p = data.project
  const api = useApi()
  const qc = useQueryClient()
  const role = useWorkspace((s) => s.role)
  const canManage = role === "admin" || role === "manager"

  const { data: usersData } = useQuery<{ items: { id: string; firstName: string; lastName: string; role: string; isAvailable?: boolean }[] }>({
    queryKey: ["users-for-team"],
    queryFn: async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("nasim-session-token") : null
      const res = await fetch("/api/users", { credentials: "include", headers: { "x-demo-role": role, ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
      const d = await res.json()
      return { items: Array.isArray(d) ? d : (d.items || []) }
    },
  })
  const allUsers = usersData?.items ?? []

  const assignMut = useMutation({
    mutationFn: async (body: { teamType: "fieldTeam" | "studioTeam"; userIds: string[] }) => {
      // ✅ API expects fieldTeamIds / studioTeamIds (not fieldTeam / studioTeam)
      const key = body.teamType === "fieldTeam" ? "fieldTeamIds" : "studioTeamIds"
      const patchBody: Record<string, unknown> = { [key]: body.userIds }
      // ✅ Studio team UI was removed from TeamTab. Whenever the field team is
      // saved, also clear any stale studio-team assignments so the project
      // doesn't keep editors/film-editors that can no longer be managed here.
      if (body.teamType === "fieldTeam") {
        patchBody.studioTeamIds = []
      }
      return api.patch(`/api/projects/${p.id}`, patchBody)
    },
    onSuccess: () => {
      toast.success("تیم به‌روزرسانی شد")
      qc.invalidateQueries({ queryKey: ["project", p.id] })
    },
    onError: (e: Error) => toast.error(e.message || "به‌روزرسانی ناموفق بود"),
  })

  // ===== Schedule (single date + start/end time) + multi-location + notes =====
  // ✅ deliveryDeadline removed — single date applies to both start and end.
  const initialDate = p.startDatetime ?? p.endDatetime ?? null
  const [executionDate, setExecutionDate] = React.useState<string | null>(initialDate)
  const [startTime, setStartTime] = React.useState(
    p.startDatetime ? new Date(p.startDatetime).toTimeString().slice(0, 5) : ""
  )
  const [endTime, setEndTime] = React.useState(
    p.endDatetime ? new Date(p.endDatetime).toTimeString().slice(0, 5) : ""
  )
  const [projectAddress, setProjectAddress] = React.useState<string>(p.projectAddress ?? "")
  const [scheduleNotes, setScheduleNotes] = React.useState<string>("")
  const [selectedLocationIds, setSelectedLocationIds] = React.useState<string[]>(
    p.projectLocationId ? [p.projectLocationId] : []
  )
  const [scheduleDirty, setScheduleDirty] = React.useState(false)

  // Fetch existing ProjectSchedules to pre-fill the multi-location picker + notes.
  const { data: existingSchedulesData } = useQuery<{ items: ProjectScheduleItem[] }>({
    queryKey: ["project-schedules-teamtab", p.id],
    queryFn: () => api.get<{ items: ProjectScheduleItem[] }>(`/api/projects/${p.id}/schedules`),
  })

  // ✅ Initialize state from existing schedules once they're loaded.
  const teamInitRef = React.useRef<string>("")
  React.useEffect(() => {
    if (!existingSchedulesData) return
    const sig = `${p.id}:${existingSchedulesData.items?.length ?? 0}`
    if (teamInitRef.current === sig) return
    teamInitRef.current = sig
    const items = existingSchedulesData.items ?? []
    if (items.length > 0) {
      const locIds = items
        .map((s) => s.locationId)
        .filter((id): id is string => !!id)
      // Merge with the legacy single projectLocationId (if any)
      const merged = Array.from(new Set([...locIds, ...(p.projectLocationId ? [p.projectLocationId] : [])]))
      setSelectedLocationIds(merged)
      // Combine unique notes from all schedules
      const notes = Array.from(
        new Set(items.map((s) => (s.note ?? "").trim()).filter((n) => n.length > 0))
      )
      setScheduleNotes(notes.join("\n\n"))
    }
  }, [existingSchedulesData, p.id, p.projectLocationId])

  // Re-sync the date/time when project data changes (e.g. after PATCH or workspace refresh)
  React.useEffect(() => {
    setExecutionDate(p.startDatetime ?? p.endDatetime ?? null)
    setStartTime(p.startDatetime ? new Date(p.startDatetime).toTimeString().slice(0, 5) : "")
    setEndTime(p.endDatetime ? new Date(p.endDatetime).toTimeString().slice(0, 5) : "")
    setProjectAddress(p.projectAddress ?? "")
    setScheduleDirty(false)
  }, [p.id, p.startDatetime, p.endDatetime, p.projectAddress])

  const saveScheduleMut = useMutation({
    mutationFn: async () => {
      // ✅ startDatetime = date + startTime; endDatetime = date + endTime
      const startIso = combineDateAndTime(executionDate, startTime)
      const endIso = combineDateAndTime(executionDate, endTime)

      // 1. PATCH the project's main schedule + address (no deliveryDeadline).
      await api.patch(`/api/projects/${p.id}`, {
        startDatetime: startIso || null,
        endDatetime: endIso || null,
        projectAddress: projectAddress.trim() || null,
        // ✅ Set projectLocationId to the first selected location for legacy display.
        projectLocationId: selectedLocationIds[0] ?? null,
      })

      // 2. Replace ProjectSchedule entries: delete all existing, then create new ones
      //    (one per selected location, all sharing the same date/time/notes).
      const existing = await api.get<{ items: ProjectScheduleItem[] }>(`/api/projects/${p.id}/schedules`)
      await Promise.all(
        (existing.items ?? []).map((s) => api.del(`/api/projects/${p.id}/schedules/${s.id}`))
      )
      const trimmedNotes = scheduleNotes.trim()
      if (selectedLocationIds.length > 0) {
        await Promise.all(
          selectedLocationIds.map((locId) =>
            api.post(`/api/projects/${p.id}/schedules`, {
              locationId: locId,
              startDatetime: startIso,
              endDatetime: endIso,
              note: trimmedNotes || undefined,
            })
          )
        )
      }
    },
    onSuccess: () => {
      toast.success("زمان‌بندی و مکان اجرا ذخیره شد")
      setScheduleDirty(false)
      teamInitRef.current = "" // force re-init from server
      qc.invalidateQueries({ queryKey: ["project", p.id] })
      qc.invalidateQueries({ queryKey: ["project-schedules-teamtab", p.id] })
      qc.invalidateQueries({ queryKey: ["project-schedules", p.id] })
      qc.invalidateQueries({ queryKey: ["project-schedules-overview", p.id] })
    },
    onError: (e: Error) => toast.error(e.message || "ذخیره ناموفق بود"),
  })

  // ✅ Only the field (execution) team is editable from TeamTab now. The studio
  // team (editor/film_editor) is no longer managed here — the API still accepts
  // `studioTeamIds: []` to clear existing studio team if needed from elsewhere.
  const groups = [
    { label: "تیم اجرایی (عکاس/تصویربردار)", team: p.fieldTeam, icon: "📸", key: "fieldTeam" as const },
  ]

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* ===== Schedule + multi-location + notes + map (wizard-style simple picker) ===== */}
      <SectionCard
        title="📅 زمان و مکان اجرا"
        description="یک تاریخ + ساعت شروع/پایان + مکان‌های اجرا + توضیحات"
      >
        <div className="space-y-4">
          {/* Date + start/end time (single date applies to both) */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="mb-1.5 block text-xs">تاریخ اجرا</Label>
              <JalaliDatePicker
                value={executionDate}
                onChange={(v) => { setExecutionDate(v); setScheduleDirty(true) }}
                placeholder="انتخاب تاریخ"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">ساعت شروع</Label>
              <TimeWheelPicker
                value={startTime || undefined}
                onChange={(v) => { setStartTime(v); setScheduleDirty(true) }}
              />
              {startTime && (
                <div className="text-center text-[10px] text-muted-foreground">{formatTime12h(startTime)}</div>
              )}
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">ساعت پایان</Label>
              <TimeWheelPicker
                value={endTime || undefined}
                onChange={(v) => { setEndTime(v); setScheduleDirty(true) }}
              />
              {endTime && (
                <div className="text-center text-[10px] text-muted-foreground">{formatTime12h(endTime)}</div>
              )}
            </div>
          </div>

          {/* ✅ Multi-location picker — same component as the wizard */}
          <WizardMultiLocationPicker
            selectedLocationIds={selectedLocationIds}
            onChange={(ids) => { setSelectedLocationIds(ids); setScheduleDirty(true) }}
          />

          {/* Address */}
          <div>
            <Label className="mb-1.5 block text-xs">آدرس محل اجرا</Label>
            <Textarea
              value={projectAddress}
              onChange={(e) => { setProjectAddress(e.target.value); setScheduleDirty(true) }}
              placeholder="مثلاً: هتل اسپیناس، تالار پارسیان، طبقه ۳"
              rows={2}
              className="resize-none text-sm"
              disabled={!canManage}
            />
          </div>

          {/* Notes */}
          <div>
            <Label className="mb-1.5 block text-xs">توضیحات مکان و زمان اجرا</Label>
            <Textarea
              value={scheduleNotes}
              onChange={(e) => { setScheduleNotes(e.target.value); setScheduleDirty(true) }}
              placeholder="مثلاً: مراسم عقد در هتل اسپیناس ساعت ۱۸، عکس‌برداری استودیویی قبل از مراسم…"
              rows={3}
              className="resize-none text-sm"
              disabled={!canManage}
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              این یادداشت روی همه زمان‌بندی‌های این پروژه ذخیره می‌شود.
            </p>
          </div>

          {/* Google Maps embed */}
          <WizardGoogleMapsEmbed selectedLocationIds={selectedLocationIds} />

          {canManage && (
            <div className="flex justify-end">
              <Button
                onClick={() => saveScheduleMut.mutate()}
                disabled={saveScheduleMut.isPending || !scheduleDirty}
              >
                <Save className="ml-1.5 h-4 w-4" />
                {saveScheduleMut.isPending ? "در حال ذخیره…" : "ذخیره زمان‌بندی و مکان"}
              </Button>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ===== Teams ===== */}
      <div className="grid gap-4 sm:grid-cols-2">
        {groups.map((g) => (
          <SectionCard key={g.label} title={`${g.icon} ${g.label}`}>
            {g.team.length === 0 ? (
              <p className="text-xs text-muted-foreground">عضوی اختصاص نیافته است.</p>
            ) : (
              <div className="space-y-2">
                {g.team.map((u) => (
                  <div key={u.id} className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-[10px]">
                        {(u.firstName[0] ?? "") + (u.lastName[0] ?? "")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {u.firstName} {u.lastName}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {ROLE_LABELS[migrateRole(u.role) as Role] ?? u.role}
                      </div>
                    </div>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 mr-auto text-rose-500 hover:text-rose-600"
                        onClick={() =>
                          assignMut.mutate({
                            teamType: g.key,
                            userIds: g.team.filter((t) => t.id !== u.id).map((t) => t.id),
                          })
                        }
                        aria-label="حذف عضو"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {canManage && (
              <div className="mt-3 border-t pt-2">
                <Select
                  value=""
                  onValueChange={(userId) => {
                    if (!userId) return
                    assignMut.mutate({
                      teamType: g.key,
                      userIds: [...g.team.map((t) => t.id), userId],
                    })
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="+ افزودن عضو" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers
                      .filter((u) => !g.team.some((t) => t.id === u.id))
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} ({ROLE_LABELS[u.role as Role] ?? u.role})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </SectionCard>
        ))}
      </div>

      {/* ===== Per-project salaries ===== */}
      <ProjectSalarySection projectId={p.id} canManage={canManage} allUsers={allUsers} />
    </div>
  )
}

// ============================================================
// Project Salary Section — per-project salaries for the Team tab.
// Manager can add salary entries for any employee (team member or not),
// with amount (Toman), description, and customizable tags.
// Settled entries show a green checkmark.
// ============================================================
interface ProjectSalaryRow {
  id: string
  projectId: string
  userId: string
  user: { id: string; firstName: string; lastName: string; role: string; name: string }
  amount: number // Rials
  description: string | null
  tags: string[]
  isSettled: boolean
  settledAt: string | null
  settledBy: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}

function ProjectSalarySection({
  projectId,
  canManage,
  allUsers,
}: {
  projectId: string
  canManage: boolean
  allUsers: { id: string; firstName: string; lastName: string; role: string }[]
}) {
  const api = useApi()
  const qc = useQueryClient()

  // ===== Form state =====
  const [selUserId, setSelUserId] = React.useState<string>("")
  const [amountToman, setAmountToman] = React.useState<number>(0)
  const [description, setDescription] = React.useState<string>("")
  const [tags, setTags] = React.useState<string[]>([])
  const [tagInput, setTagInput] = React.useState<string>("")
  const [submitting, setSubmitting] = React.useState(false)

  // ===== Fetch existing ProjectSalary entries for this project =====
  const { data, isLoading } = useQuery<{ items: ProjectSalaryRow[] }>({
    queryKey: ["project-salaries", projectId],
    queryFn: () => api.get(`/api/projects/${projectId}/salaries`),
  })
  const rows = data?.items ?? []

  // Existing tag suggestions (deduped from existing rows) for the tag picker.
  const existingTags = React.useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) for (const t of r.tags) set.add(t)
    return Array.from(set).sort()
  }, [rows])

  const addTag = (raw: string) => {
    const t = raw.trim()
    if (!t) return
    if (tags.includes(t)) return
    setTags([...tags, t])
    setTagInput("")
  }

  const removeTag = (t: string) => {
    setTags(tags.filter((x) => x !== t))
  }

  const submit = async () => {
    if (!selUserId) {
      toast.error("یک کارمند انتخاب کنید")
      return
    }
    if (!amountToman || amountToman <= 0) {
      toast.error("مبلغ باید بزرگتر از ۰ باشد")
      return
    }
    setSubmitting(true)
    try {
      const amountRials = Math.round(amountToman * 10)
      await api.post(`/api/projects/${projectId}/salaries`, {
        userId: selUserId,
        amount: amountRials,
        description: description.trim() || undefined,
        tags,
      })
      toast.success("حقوق پروژه ثبت شد")
      qc.invalidateQueries({ queryKey: ["project-salaries", projectId] })
      // Reset form
      setSelUserId("")
      setAmountToman(0)
      setDescription("")
      setTags([])
      setTagInput("")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ثبت ناموفق بود")
    } finally {
      setSubmitting(false)
    }
  }

  const toggleSettledMut = useMutation({
    mutationFn: async (row: ProjectSalaryRow) => {
      return api.patch(`/api/projects/${projectId}/salaries/${row.id}`, {
        isSettled: !row.isSettled,
      })
    },
    onSuccess: () => {
      toast.success("وضعیت تسویه به‌روزرسانی شد")
      qc.invalidateQueries({ queryKey: ["project-salaries", projectId] })
    },
    onError: (e: Error) => toast.error(e.message || "به‌روزرسانی ناموفق بود"),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => api.del(`/api/projects/${projectId}/salaries/${id}`),
    onSuccess: () => {
      toast.success("ردیف حقوق حذف شد")
      qc.invalidateQueries({ queryKey: ["project-salaries", projectId] })
    },
    onError: (e: Error) => toast.error(e.message || "حذف ناموفق بود"),
  })

  return (
    <SectionCard
      title="💵 حقوق پروژه"
      description="مدیر می‌تواند برای هر کارمند (عضو تیم یا غیر آن) حقوق جداگانه تعریف کند. تسویه‌شده‌ها با تیک سبز نمایش داده می‌شوند."
    >
      <div className="space-y-4">
        {/* Existing entries */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">هنوز حقوقی برای این پروژه ثبت نشده است.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table dir="rtl">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">کارمند</TableHead>
                  <TableHead className="text-right">مبلغ</TableHead>
                  <TableHead className="text-right">توضیحات</TableHead>
                  <TableHead className="text-right">تگ‌ها</TableHead>
                  <TableHead className="text-right">تاریخ</TableHead>
                  <TableHead className="text-right">وضعیت</TableHead>
                  {canManage && <TableHead className="text-right">عملیات</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className={cn(r.isSettled && "opacity-50")}>
                    <TableCell className="text-right text-sm">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[9px]">
                            {(r.user.firstName[0] ?? "") + (r.user.lastName[0] ?? "")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{r.user.firstName} {r.user.lastName}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {ROLE_LABELS[migrateRole(r.user.role) as Role] ?? r.user.role}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                      {formatRials(r.amount)} <span className="text-muted-foreground">تومان</span>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground max-w-[220px] truncate">
                      {r.description || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap gap-1 justify-end">
                        {r.tags.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          r.tags.map((t, i) => (
                            <Badge key={i} variant="secondary" className="text-[9px]">{t}</Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(r.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.isSettled ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> تسویه شده
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-400">باز</Badge>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700"
                            disabled={toggleSettledMut.isPending}
                            onClick={() => toggleSettledMut.mutate(r)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {r.isSettled ? "برداشتن تسویه" : "تسویه"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700"
                            disabled={deleteMut.isPending}
                            onClick={() => deleteMut.mutate(r.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Add new entry */}
        {canManage && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="mb-3 text-sm font-medium">افزودن ردیف حقوق جدید</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">کارمند <span className="text-rose-500">*</span></Label>
                <Select value={selUserId} onValueChange={setSelUserId}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="انتخاب کارمند" /></SelectTrigger>
                  <SelectContent>
                    {allUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({ROLE_LABELS[u.role as Role] ?? u.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">مبلغ (تومان) <span className="text-rose-500">*</span></Label>
                <TomanInput
                  value={amountToman}
                  onValueChange={setAmountToman}
                  placeholder="مثلاً ۲٬۰۰۰٬۰۰۰"
                />
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <Label className="text-xs">توضیحات (اختیاری)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="مثلاً: حقوق روز عروسی"
                className="text-xs"
              />
            </div>
            <div className="mt-3 space-y-1.5">
              <Label className="text-xs">تگ‌ها (اختیاری)</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault()
                      addTag(tagInput)
                    }
                  }}
                  placeholder="یک تگ بنویسید و Enter بزنید…"
                  className="text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9"
                  onClick={() => addTag(tagInput)}
                  disabled={!tagInput.trim()}
                >
                  افزودن تگ
                </Button>
              </div>
              {/* Existing tag suggestions */}
              {existingTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-[10px] text-muted-foreground ml-1">تگ‌های موجود:</span>
                  {existingTags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => addTag(t)}
                      disabled={tags.includes(t)}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded border",
                        tags.includes(t)
                          ? "opacity-40 cursor-not-allowed border-muted"
                          : "hover:bg-accent border-input cursor-pointer"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
              {/* Selected tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px] gap-1 pr-1">
                      {t}
                      <button
                        type="button"
                        onClick={() => removeTag(t)}
                        className="text-muted-foreground hover:text-rose-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                onClick={submit}
                disabled={submitting || !selUserId || !amountToman}
                size="sm"
              >
                <Plus className="ml-1.5 h-3.5 w-3.5" />
                {submitting ? "در حال ذخیره…" : "ثبت حقوق"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

interface ProjectLocationItem {
  id: string
  name: string
  address: string | null
  city: string | null
  phone: string | null
  notes: string | null
  isActive: boolean
}

function SmsTab({ data }: { data: ProjectDetailData }) {
  const p = data.project
  const api = useApi()
  const qc = useQueryClient()
  const role = useWorkspace((s) => s.role)
  const canManage = role === "admin" || role === "manager"
  const [addOpen, setAddOpen] = React.useState(false)
  const [selectedAutomation, setSelectedAutomation] = React.useState("")

  const { data: automationsData } = useQuery<{ items: { id: string; name: string; triggerEvent: string; templateName: string; offsetDays: number }[] }>({
    queryKey: ["sms-automations-for-project"],
    queryFn: async () => {
      const res = await fetch("/api/sms-automations", { credentials: "include", headers: { "x-demo-role": role, ...((typeof window !== "undefined" ? localStorage.getItem("nasim-session-token") : null) ? { Authorization: `Bearer ${localStorage.getItem("nasim-session-token")}` } : {}) } })
      const d = await res.json()
      return { items: Array.isArray(d) ? d : (d.items || []) }
    },
  })
  const allAutomations = automationsData?.items ?? []
  const availableAutomations = allAutomations.filter(
    (a) => !p.smsAssignments.some((sa) => sa.automationId === a.id || sa.automationName === a.name)
  )

  const addAssignMut = useMutation({
    mutationFn: async (automationId: string) => {
      return api.post(`/api/projects/${p.id}/sms-assignments`, { automationId })
    },
    onSuccess: () => {
      toast.success("اتوماسیون پیامک اضافه شد")
      qc.invalidateQueries({ queryKey: ["project", p.id] })
      setAddOpen(false)
      setSelectedAutomation("")
    },
    onError: (e: Error) => toast.error(e.message || "افزودن ناموفق بود"),
  })

  const toggleAssignMut = useMutation({
    mutationFn: async ({ assignmentId, enabled }: { assignmentId: string; enabled: boolean }) => {
      return api.patch(`/api/projects/${p.id}/sms-assignments/${assignmentId}`, { enabled })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", p.id] })
    },
    onError: (e: Error) => toast.error(e.message || "به‌روزرسانی ناموفق بود"),
  })

  return (
    <div className="space-y-4 text-right" dir="rtl">
      <SectionCard
        title="اتوماسیون‌های پیامک"
        description="مدیریت پیامک‌های خودکار این پروژه"
        actions={
          canManage && availableAutomations.length > 0 ? (
            <Popover open={addOpen} onOpenChange={setAddOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> افزودن اتوماسیون
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-2">
                <div className="space-y-1">
                  <div className="px-1 py-1 text-xs font-semibold text-muted-foreground">اتوماسیون‌های موجود</div>
                  {availableAutomations.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => addAssignMut.mutate(a.id)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-right text-xs hover:bg-muted"
                    >
                      <span className="font-medium">{a.name}</span>
                      <Badge variant="outline" className="text-[9px]">
                        {TRIGGER_EVENT_LABELS[a.triggerEvent as keyof typeof TRIGGER_EVENT_LABELS] ?? a.triggerEvent}
                      </Badge>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ) : undefined
        }
      >
        {p.smsAssignments.length === 0 ? (
          <EmptyState
            icon="💬"
            title="اتوماسیون پیامکی اختصاص نیافته"
            description="برای این پروژه هیچ اتوماسیون پیامکی انتخاب نشده است."
          />
        ) : (
          <div className="space-y-2">
            {p.smsAssignments.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "rounded-lg border p-3",
                  a.enabled ? "bg-emerald-500/5" : "bg-muted/30 opacity-70"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{a.automationName}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {TRIGGER_EVENT_LABELS[a.triggerEvent as keyof typeof TRIGGER_EVENT_LABELS] ?? a.triggerEvent}
                      </Badge>
                      {!a.enabled && <span className="text-[10px] text-amber-600">غیرفعال</span>}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      قالب: {a.templateName}
                    </div>
                    {a.templateText && (
                      <div className="mt-1 line-clamp-2 whitespace-pre-wrap text-[11px] leading-relaxed">
                        {a.templateText}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <div className="text-right text-[11px]" dir="rtl">
                      <div className="text-muted-foreground">فاصله از رویداد</div>
                      <div className="font-medium" dir="ltr">
                        {toPersianDigits(String(a.effectiveOffsetDays))} روز
                      </div>
                    </div>
                    {canManage && (
                      <Switch
                        checked={a.enabled}
                        onCheckedChange={(v) => toggleAssignMut.mutate({ assignmentId: a.id, enabled: v })}
                        className="scale-75"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function Row({
  label,
  value,
  highlight,
}: {
  label: React.ReactNode
  value: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("text-sm font-medium", highlight && "text-amber-600")}>{value}</dd>
    </div>
  )
}

// ============================================================
// WorkflowTab — dual-track (photo/video) status management
// ============================================================
interface WorkflowStageInfo {
  stage: string
  assignee: { id: string; firstName: string; lastName: string; role: string } | null
  assigneeId: string | null
  startedAt: string | null
  completedAt: string | null
  isAuto: boolean
  allowedRoles: Role[]
}
interface WorkflowTrackInfo {
  track: WorkflowTrack
  currentStatus: string
  stages: WorkflowStageInfo[]
}
interface WorkflowData {
  tracks: WorkflowTrackInfo[]
  category: string
  project?: {
    exemptFromPhotoPriceUpdate?: boolean
    isPriceFrozen?: boolean
  }
}

function WorkflowTab({ projectId, category }: { projectId: string; category: string }) {
  const api = useApi()
  const qc = useQueryClient()
  const role = useWorkspace((s) => s.role)
  const canManage = role === "admin" || role === "manager"
  const hasPhotoTrack = category === "photo" || category === "mix"

  const { data, isLoading } = useQuery<WorkflowData>({
    queryKey: ["project-workflow", projectId],
    queryFn: () => api.get(`/api/projects/${projectId}/workflow`),
  })

  const { data: usersData } = useQuery<{ items: { id: string; firstName: string; lastName: string; role: string }[] }>({
    queryKey: ["users-for-workflow"],
    queryFn: async () => {
      const res = await fetch("/api/users", { credentials: "include", headers: { "x-demo-role": role, ...((typeof window !== "undefined" ? localStorage.getItem("nasim-session-token") : null) ? { Authorization: `Bearer ${localStorage.getItem("nasim-session-token")}` } : {}) } })
      const data = await res.json()
      // API returns a flat array, wrap it in { items: [...] }
      return { items: Array.isArray(data) ? data : (data.items || []) }
    },
  })

  const assignMut = useMutation({
    mutationFn: (body: { track: WorkflowTrack; stage: string; assigneeId: string | null }) =>
      api.put(`/api/projects/${projectId}/workflow`, body),
    onSuccess: () => {
      toast.success("مسئول مرحله به‌روزرسانی شد — نوتیفیکیشن برای کارمند ارسال شد")
      qc.invalidateQueries({ queryKey: ["project-workflow", projectId] })
    },
    onError: (e: Error) => toast.error(e.message || "به‌روزرسانی ناموفق بود"),
  })

  const transitionMut = useMutation({
    mutationFn: (body: { track: WorkflowTrack; stage: ProjectStatus }) =>
      api.patch(`/api/projects/${projectId}/status`, body),
    onSuccess: () => {
      toast.success("مرحله به‌روزرسانی شد")
      qc.invalidateQueries({ queryKey: ["project-workflow", projectId] })
      qc.invalidateQueries({ queryKey: ["project", projectId] })
    },
    onError: (e: Error) => toast.error(e.message || "انتقال مرحله ناموفق بود"),
  })

  // Print photos
  const { data: printPricesData } = useQuery<{ items: { id: string; size: string; paperType: string; laminateType: string; photoLocation: string; price: number; isActive: boolean; priority?: string }[] }>({
    queryKey: ["print-photo-prices"],
    queryFn: async () => {
      const res = await fetch("/api/print-photo-prices", { credentials: "include", headers: { "x-demo-role": role, ...((typeof window !== "undefined" ? localStorage.getItem("nasim-session-token") : null) ? { Authorization: `Bearer ${localStorage.getItem("nasim-session-token")}` } : {}) } })
      const data = await res.json()
      // API returns a flat array, wrap it in { items: [...] }
      return { items: Array.isArray(data) ? data : (data.items || []) }
    },
    enabled: hasPhotoTrack,
  })

  const { data: projectPrintPhotos } = useQuery<{ items: PrintPhotoSelection[] }>({
    queryKey: ["project-print-photos", projectId],
    queryFn: () => api.get(`/api/projects/${projectId}/print-photos`),
    enabled: hasPhotoTrack,
  })

  const addPrintPhotoMut = useMutation({
    mutationFn: (body: { printPhotoPriceId: string; quantity: number }) =>
      api.post(`/api/projects/${projectId}/print-photos`, body),
    onSuccess: () => {
      toast.success("عکس چاپی اضافه شد")
      qc.invalidateQueries({ queryKey: ["project-print-photos", projectId] })
    },
    onError: (e: Error) => toast.error(e.message || "افزودن ناموفق بود"),
  })

  const deletePrintPhotoMut = useMutation({
    mutationFn: (pppId: string) => api.del(`/api/projects/${projectId}/print-photos/${pppId}`),
    onSuccess: () => {
      toast.success("عکس چاپی حذف شد")
      qc.invalidateQueries({ queryKey: ["project-print-photos", projectId] })
    },
  })

  if (isLoading || !data) {
    return <div className="flex h-48 items-center justify-center text-muted-foreground">در حال بارگذاری...</div>
  }

  const tracks = data.tracks
  const isMix = category === "mix"
  const printPhotos = projectPrintPhotos?.items ?? []
  const printPhotoTotal = printPhotos.reduce((s, p) => s + p.total, 0)
  const isExempt = (data.project?.exemptFromPhotoPriceUpdate) ?? false
  void isExempt // (kept for potential future use; freeze buttons moved to OverviewTab)

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="rounded-xl border bg-card p-4">
        <h3 className="mb-1 text-sm font-semibold">گردش کار پروژه</h3>
        <p className="text-xs text-muted-foreground">
          {isMix
            ? "این پروژه ترکیبی است — عکس و فیلم مسیرهای مستقل دارند."
            : `این پروژه فقط ${category === "photo" ? "عکس" : "فیلم"} دارد.`}
          {" "}مراحل زمان‌بندی و اجرا به‌صورت خودکار بر اساس تاریخ پروژه مدیریت می‌شوند. سایر مراحل توسط مسئول هر مرحله انجام می‌شود.
        </p>
      </div>

      <div className={cn("grid gap-6", isMix ? "lg:grid-cols-2" : "grid-cols-1")}>
        {tracks.map((trackInfo) => (
          <TrackColumn
            key={trackInfo.track}
            trackInfo={trackInfo}
            users={usersData?.items ?? []}
            canManage={canManage}
            currentRole={role as Role}
            onAssign={(stage, assigneeId) => assignMut.mutate({ track: trackInfo.track, stage, assigneeId })}
            onTransition={(stage) => transitionMut.mutate({ track: trackInfo.track, stage })}
            isTransitioning={transitionMut.isPending}
          />
        ))}
      </div>

      {/* Price freeze controls live only in OverviewTab now. */}

      {/* Print photo total summary */}
      {hasPhotoTrack && printPhotos.length > 0 && (
        <div className="rounded-lg border-2 border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">جمع عکس‌های چاپی</span>
            <span className="text-base font-bold text-emerald-600">
              {formatRials(printPhotoTotal)} تومان
            </span>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            این مبلغ به قیمت پروژه افزوده می‌شود و از استراتژی قیمت متغیر تبعیت می‌کند.
          </p>
        </div>
      )}

      {/* Print photo selection — only for projects with a photo track */}
      {hasPhotoTrack && (
        <PrintPhotoSection
          printPhotos={printPhotos}
          printPrices={printPricesData?.items ?? []}
          total={printPhotoTotal}
          canManage={canManage}
          onAdd={(printPhotoPriceId, quantity) => addPrintPhotoMut.mutate({ printPhotoPriceId, quantity })}
          onDelete={(pppId) => deletePrintPhotoMut.mutate(pppId)}
          isAdding={addPrintPhotoMut.isPending}
        />
      )}
    </div>
  )
}

// Print photo selection section
interface PrintPhotoSelection {
  id: string
  printPhotoPriceId: string
  quantity: number
  exemptFromPriceUpdate: boolean
  unitPrice: number
  total: number
  price: {
    id: string
    size: string
    paperType: string
    laminateType: string
    photoLocation: string
    photoLocationLabel: string
    price: number
  }
}

function PrintPhotoSection({
  printPhotos,
  printPrices,
  total,
  canManage,
  onAdd,
  onDelete,
  isAdding,
}: {
  printPhotos: PrintPhotoSelection[]
  printPrices: { id: string; size: string; paperType: string; laminateType: string; photoLocation: string; price: number; isActive: boolean; priority?: string }[]
  total: number
  canManage: boolean
  onAdd: (printPhotoPriceId: string, quantity: number) => void
  onDelete: (pppId: string) => void
  isAdding: boolean
}) {
  // ✅ Local quantity state per available price (used as the "draft" quantity in
  // the number input before the user clicks "افزودن").
  const [quantities, setQuantities] = React.useState<Record<string, number>>({})
  // ✅ Search + filters
  const [search, setSearch] = React.useState("")
  const [paperFilter, setPaperFilter] = React.useState<string>("__all")
  const [laminateFilter, setLaminateFilter] = React.useState<string>("__all")
  const [locationFilter, setLocationFilter] = React.useState<string>("__all")
  const [priorityFilter, setPriorityFilter] = React.useState<string>("__all")

  const activePrices = printPrices.filter((p) => p.isActive)

  // Build distinct filter option lists from the data
  const paperOptions = Array.from(new Set(activePrices.map((p) => p.paperType).filter(Boolean)))
  const laminateOptions = Array.from(new Set(activePrices.map((p) => p.laminateType).filter(Boolean)))
  const locationOptions = Array.from(new Set(activePrices.map((p) => p.photoLocation).filter(Boolean)))
  const priorityOptions = Array.from(new Set(activePrices.map((p) => p.priority ?? "normal").filter(Boolean)))

  const PHOTO_LOCATION_LABELS: Record<string, string> = {
    studio: "استودیو",
    outdoor: "بیرون",
    customer: "مشتری",
  }
  const PRIORITY_LABELS: Record<string, string> = {
    normal: "معمولی",
    formal: "سرمجلسی",
  }

  // ✅ Merge printPhotos by `printPhotoPriceId` so each unique price shows up as
  // a single row in the "انتخاب‌شده" section (with summed qty + total).
  // `ids` keeps every ProjectPrintPhoto row id so we can decrement by deleting
  // the first one when the user clicks "−".
  const selectedByPrice = React.useMemo(() => {
    const m = new Map<string, {
      priceId: string
      ids: string[]
      qty: number
      unitPrice: number
      lineTotal: number
      size: string
      paperType: string
      laminateType: string
      photoLocation: string
    }>()
    for (const sel of printPhotos) {
      const key = sel.printPhotoPriceId
      if (!m.has(key)) {
        m.set(key, {
          priceId: sel.printPhotoPriceId,
          ids: [],
          qty: 0,
          unitPrice: sel.unitPrice,
          lineTotal: 0,
          size: sel.price.size,
          paperType: sel.price.paperType,
          laminateType: sel.price.laminateType,
          photoLocation: sel.price.photoLocation,
        })
      }
      const entry = m.get(key)!
      entry.ids.push(sel.id)
      entry.qty += sel.quantity
      entry.lineTotal += sel.total
    }
    return Array.from(m.values())
  }, [printPhotos])

  // Reverse lookup: priceId → selected entry (for highlighting rows in the available list).
  const selectedMap = React.useMemo(() => {
    const m = new Map<string, { ids: string[]; qty: number }>()
    for (const s of selectedByPrice) m.set(s.priceId, { ids: s.ids, qty: s.qty })
    return m
  }, [selectedByPrice])

  const filteredPrices = activePrices.filter((p) => {
    if (paperFilter !== "__all" && p.paperType !== paperFilter) return false
    if (laminateFilter !== "__all" && p.laminateType !== laminateFilter) return false
    if (locationFilter !== "__all" && p.photoLocation !== locationFilter) return false
    const pr = p.priority ?? "normal"
    if (priorityFilter !== "__all" && pr !== priorityFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const hay = `${p.size} ${p.paperType} ${p.laminateType} ${p.photoLocation} ${pr}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  function bumpQty(priceId: string, delta: number) {
    setQuantities((prev) => {
      const cur = prev[priceId] ?? 1
      return { ...prev, [priceId]: Math.max(1, cur + delta) }
    })
  }
  function setQty(priceId: string, n: number) {
    setQuantities((prev) => ({ ...prev, [priceId]: Math.max(1, Math.floor(n)) || 1 }))
  }
  function handleAddRow(priceId: string) {
    const qty = quantities[priceId] ?? 1
    onAdd(priceId, qty)
    // reset draft
    setQuantities((prev) => ({ ...prev, [priceId]: 1 }))
  }
  function handleIncSelected(priceId: string) {
    // Add one more of this price.
    onAdd(priceId, 1)
  }
  function handleDecSelected(priceId: string) {
    const entry = selectedMap.get(priceId)
    if (!entry || entry.ids.length === 0) return
    // Remove the first linked ProjectPrintPhoto row for this price.
    onDelete(entry.ids[0])
  }
  function handleDeleteSelected(priceId: string) {
    // Delete every ProjectPrintPhoto row linked to this price.
    const entry = selectedMap.get(priceId)
    if (!entry) return
    for (const id of entry.ids) onDelete(id)
  }

  return (
    <div className="rounded-xl border bg-card p-4" dir="rtl">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="size-4 text-sky-500" />
          <h3 className="text-sm font-semibold">عکس‌های چاپی</h3>
        </div>
      </div>

      <p className="mb-3 text-[11px] text-muted-foreground">
        قیمت عکس‌ها به صورت لحظه‌ای محاسبه می‌شود. با تغییر قیمت در تنظیمات، تمام پروژه‌های تسویه‌نشده به‌روزرسانی می‌شوند.
      </p>

      {/* ✅ Search + filters */}
      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          placeholder="جستجو (سایز، کاغذ، لمینانت…)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs"
        />
        <Select value={paperFilter} onValueChange={setPaperFilter}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="نوع کاغذ" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">همه کاغذها</SelectItem>
            {paperOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={laminateFilter} onValueChange={setLaminateFilter}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="لمینانت" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">همه لمینانت‌ها</SelectItem>
            {laminateOptions.map((p) => <SelectItem key={p} value={p}>{p === "none" ? "بدون لمینانت" : p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="محل عکس" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">همه مکان‌ها</SelectItem>
            {locationOptions.map((p) => <SelectItem key={p} value={p}>{PHOTO_LOCATION_LABELS[p] ?? p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="اولویت" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">همه اولویت‌ها</SelectItem>
            {priorityOptions.map((p) => <SelectItem key={p} value={p}>{PRIORITY_LABELS[p] ?? p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* ✅ انتخاب‌شده — selected photos at the TOP (one row per unique price). */}
      {selectedByPrice.length > 0 && (
        <div className="mb-3 rounded-lg border border-emerald-300/60 bg-emerald-500/5 p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <Check className="size-3.5" />
              انتخاب‌شده
              <Badge variant="secondary" className="text-[9px]">{toPersianDigits(selectedByPrice.length)}</Badge>
            </div>
          </div>
          <div className="space-y-1">
            {selectedByPrice.map((s) => (
              <div
                key={s.priceId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-200/50 bg-background/60 px-2.5 py-1.5 text-right text-[11px]"
                dir="rtl"
              >
                {/* Right side: size + paper + laminate */}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold">{s.size}</div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {s.paperType}
                    {s.laminateType !== "none" && ` · ${s.laminateType}`}
                    {s.photoLocation && ` · ${PHOTO_LOCATION_LABELS[s.photoLocation] ?? s.photoLocation}`}
                  </div>
                </div>
                {/* Unit price */}
                <div className="shrink-0 text-[10px] text-muted-foreground" dir="ltr">
                  {formatRials(s.unitPrice)} ت
                </div>
                {/* Inline ± quantity editor */}
                {canManage && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDecSelected(s.priceId)}
                      disabled={isAdding}
                      className="flex size-6 items-center justify-center rounded border text-xs hover:bg-accent disabled:opacity-50"
                      aria-label="کمتر"
                      title="کم کردن یک عدد"
                    >
                      −
                    </button>
                    <input
                      type="text"
                      dir="ltr"
                      value={String(s.qty)}
                      readOnly
                      className="h-6 w-9 rounded border bg-muted/30 text-center text-xs tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => handleIncSelected(s.priceId)}
                      disabled={isAdding}
                      className="flex size-6 items-center justify-center rounded border text-xs hover:bg-accent disabled:opacity-50"
                      aria-label="بیشتر"
                      title="افزودن یک عدد"
                    >
                      +
                    </button>
                  </div>
                )}
                {!canManage && (
                  <div className="shrink-0 text-xs tabular-nums">
                    × {toPersianDigits(s.qty)}
                  </div>
                )}
                {/* Line total */}
                <div className="shrink-0 text-xs font-bold tabular-nums text-sky-600" dir="ltr">
                  {formatRials(s.lineTotal)} ت
                </div>
                {/* Delete-all button */}
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSelected(s.priceId)}
                    disabled={isAdding}
                    className="flex size-6 shrink-0 items-center justify-center rounded border text-rose-600 hover:bg-rose-500/10 disabled:opacity-50"
                    aria-label="حذف"
                    title="حذف این ردیف"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            ))}
            {/* Total */}
            <div className="mt-1 flex items-center justify-between border-t border-emerald-200/50 pt-1.5 text-xs font-bold">
              <span>جمع کل</span>
              <span className="tabular-nums text-sky-600" dir="ltr">{formatRials(total)} تومان</span>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Available prices — LIST view (one compact row per price). */}
      <div className="mb-1.5 flex items-center justify-between">
        <div className="text-[11px] font-semibold text-muted-foreground">لیست قیمت‌ها</div>
        <div className="text-[10px] text-muted-foreground">{toPersianDigits(filteredPrices.length)} مورد</div>
      </div>
      {filteredPrices.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          موردی مطابق فیلترها یافت نشد.
        </div>
      ) : (
        <div className="divide-y overflow-hidden rounded-lg border">
          {filteredPrices.map((p) => {
            const projEntry = selectedMap.get(p.id)
            const isSelected = !!projEntry && projEntry.qty > 0
            const draftQty = quantities[p.id] ?? 1
            const priority = p.priority ?? "normal"
            return (
              <div
                key={p.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 text-right text-[11px] transition-colors",
                  isSelected ? "bg-emerald-500/5" : "bg-background hover:bg-muted/40"
                )}
                dir="rtl"
              >
                {/* Right side: size (bold) + meta (paper / laminate / location / priority) */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold">{p.size}</span>
                    {isSelected && (
                      <Badge variant="outline" className="h-4 px-1 text-[8px] text-emerald-600 border-emerald-300">
                        {toPersianDigits(projEntry!.qty)} انتخاب
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {p.paperType}
                    {p.laminateType !== "none" && ` · ${p.laminateType}`}
                    {` · ${PHOTO_LOCATION_LABELS[p.photoLocation] ?? p.photoLocation}`}
                    {` · ${PRIORITY_LABELS[priority] ?? priority}`}
                  </div>
                </div>
                {/* Left side: price + quantity input + افزودن button (grouped together) */}
                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-xs font-bold tabular-nums text-sky-600" dir="ltr">
                    {formatRials(p.price)} <span className="text-[9px] text-muted-foreground">ت</span>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => bumpQty(p.id, -1)}
                        className="flex size-6 items-center justify-center rounded border text-xs hover:bg-accent"
                        aria-label="کمتر"
                      >
                        −
                      </button>
                      <input
                        type="text"
                        dir="ltr"
                        value={String(draftQty)}
                        onChange={(e) => setQty(p.id, parseInt(e.target.value.replace(/[^0-9]/g, "")) || 1)}
                        className="h-6 w-10 rounded border text-center text-xs tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() => bumpQty(p.id, 1)}
                        className="flex size-6 items-center justify-center rounded border text-xs hover:bg-accent"
                        aria-label="بیشتر"
                      >
                        +
                      </button>
                      <Button
                        size="sm"
                        type="button"
                        onClick={() => handleAddRow(p.id)}
                        disabled={isAdding}
                        className="h-6 gap-1 px-2 text-[10px]"
                      >
                        <Plus className="size-3" />
                        افزودن
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TrackColumn({
  trackInfo,
  users,
  canManage,
  currentRole,
  onAssign,
  onTransition,
  isTransitioning,
}: {
  trackInfo: WorkflowTrackInfo
  users: { id: string; firstName: string; lastName: string; role: string }[]
  canManage: boolean
  currentRole: Role
  onAssign: (stage: string, assigneeId: string | null) => void
  onTransition: (stage: ProjectStatus) => void
  isTransitioning: boolean
}) {
  const trackLabel = trackInfo.track === "photo" ? "مسیر عکس" : "مسیر فیلم"
  const trackColor = trackInfo.track === "photo" ? "#0ea5e9" : "#ef4444"
  const currentStatus = normalizeStatus(trackInfo.currentStatus) as ProjectStatus
  const currentIdx = STATUS_FLOW.indexOf(currentStatus)
  const progressPercent = Math.round(((currentIdx + 1) / STATUS_FLOW.length) * 100)
  const completedCount = currentIdx + (currentStatus === "delivered" ? 0 : 0)
  const isDelivered = currentStatus === "delivered"

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Header with gradient accent */}
      <div
        className="relative px-4 pb-3 pt-4"
        style={{ background: `linear-gradient(135deg, ${trackColor}10, transparent)` }}
      >
        <div className="mb-3 flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg shadow-sm"
            style={{ background: trackColor + "22", color: trackColor }}
          >
            <Camera className="h-4 w-4" />
          </div>
          <h4 className="text-sm font-bold">{trackLabel}</h4>
          <Badge
            variant="secondary"
            className="mr-auto text-[10px] font-medium"
            style={{ background: STATUS_COLORS[currentStatus] + "22", color: STATUS_COLORS[currentStatus] }}
          >
            {STATUS_LABELS[currentStatus] ?? currentStatus}
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>پیشرفت کلی</span>
          <span className="font-semibold" style={{ color: trackColor }}>
            {toPersianDigits(progressPercent)}٪
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPercent}%`,
              background: `linear-gradient(90deg, ${trackColor}, ${trackColor}dd)`,
            }}
          />
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground">
          {toPersianDigits(completedCount)} از {toPersianDigits(STATUS_FLOW.length)} مرحله تکمیل شده
          {isDelivered && " · ✅ تحویل داده شد"}
        </div>
      </div>

      {/* Timeline stages — vertical connected timeline */}
      <div className="relative p-4">
        {STATUS_FLOW.map((stage, idx) => {
          const stageInfo = trackInfo.stages.find((s) => s.stage === stage)
          const isCurrent = stage === currentStatus
          const isPast = currentIdx > idx
          const isFuture = currentIdx < idx
          const isAuto = ["scheduled", "running"].includes(stage)
          const nextStage = NEXT_STAGE[stage]
          const canAdvance = isCurrent && nextStage && (canManage || stageInfo?.assigneeId === currentRole || isAuto)
          const isQC = stage === "qc"
          const isLast = idx === STATUS_FLOW.length - 1
          const stageColor = isPast ? "#22c55e" : STATUS_COLORS[stage]

          return (
            <div key={stage} className="relative flex gap-3 pb-4 last:pb-0">
              {/* Stage indicator dot */}
              <div className="relative z-10 shrink-0">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-all",
                    isCurrent && "scale-110 shadow-md",
                    isPast && "border-transparent text-white",
                    isCurrent && "border-transparent text-white",
                    isFuture && "border-border bg-card text-muted-foreground"
                  )}
                  style={{
                    background: (isPast || isCurrent) ? stageColor : undefined,
                    borderColor: isFuture ? undefined : stageColor,
                  }}
                >
                  {isPast ? (
                    <Check className="size-3.5" />
                  ) : isCurrent ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    toPersianDigits(idx + 1)
                  )}
                </div>
                {isCurrent && (
                  <div
                    className="absolute -inset-1 -z-10 animate-ping rounded-full opacity-20"
                    style={{ background: stageColor }}
                  />
                )}
              </div>

              {/* Stage content */}
              <div
                className={cn(
                  "min-w-0 flex-1 rounded-lg border p-2.5 transition-all",
                  isCurrent && "border-primary/30 bg-primary/5 shadow-sm",
                  isPast && "border-transparent bg-muted/20",
                  isFuture && "border-dashed border-border/50 opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn("text-xs font-semibold", isPast && "text-muted-foreground line-through")}
                        style={isCurrent ? { color: stageColor } : undefined}
                      >
                        {STATUS_LABELS[stage]}
                      </span>
                      {isAuto && (
                        <Badge variant="outline" className="h-4 px-1 text-[8px] text-muted-foreground">
                          خودکار
                        </Badge>
                      )}
                      {stageInfo?.completedAt && (
                        <Badge variant="outline" className="h-4 gap-0.5 px-1 text-[8px] text-emerald-600">
                          <Check className="size-2.5" /> انجام شد
                        </Badge>
                      )}
                      {isCurrent && (
                        <Badge
                          variant="outline"
                          className="h-4 px-1 text-[8px] font-medium"
                          style={{ background: stageColor + "15", color: stageColor, borderColor: stageColor + "30" }}
                        >
                          در حال انجام
                        </Badge>
                      )}
                    </div>
                    {stageInfo?.assignee && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <UserCog className="size-2.5" />
                        مسئول: {stageInfo.assignee.firstName} {stageInfo.assignee.lastName}
                      </div>
                    )}
                    {stageInfo?.startedAt && (
                      <div className="text-[9px] text-muted-foreground/70">
                        شروع: {formatDateTime(stageInfo.startedAt)}
                      </div>
                    )}
                    {stageInfo?.completedAt && (
                      <div className="text-[9px] text-emerald-600/70">
                        تکمیل: {formatDateTime(stageInfo.completedAt)}
                      </div>
                    )}
                  </div>
                  {/* Assignee selector (admin/manager only, manual stages only) */}
                  {!isAuto && canManage && (
                    <Select
                      value={stageInfo?.assigneeId ?? "__none__"}
                      onValueChange={(v) => onAssign(stage, v === "__none__" ? null : v)}
                    >
                      <SelectTrigger className="h-7 w-[130px] shrink-0 text-[10px]">
                        <SelectValue placeholder="انتخاب مسئول" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— بدون مسئول —</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.firstName} {u.lastName} ({ROLE_LABELS[migrateRole(u.role) as Role] ?? u.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Action buttons */}
                {canAdvance && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {nextStage && (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 gap-1 text-[10px]"
                        disabled={isTransitioning}
                        onClick={() => onTransition(nextStage)}
                      >
                        <ArrowLeft className="size-3" />
                        تکمیل و رفتن به {STATUS_LABELS[nextStage]}
                      </Button>
                    )}
                    {/* QC can send back to editing */}
                    {isQC && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-[10px] text-amber-600"
                        disabled={isTransitioning}
                        onClick={() => onTransition("editing")}
                      >
                        <ArrowRight className="size-3" />
                        بازگرداندن به ادیت
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

