"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts"
import {
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Pencil,
  Trash2,
  Download,
  Wallet,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  CreditCard,
  Receipt,
  Users,
  Check,
  ChevronsUpDown,
  RefreshCw,
  StickyNote,
  X,
  Send,
} from "lucide-react"
import { useApi } from "@/lib/api/client"
import { authHeaders } from "@/lib/auth-context"
import { useWorkspace } from "@/stores/workspace"
import {
  PAYMENT_TYPES,
  PAYMENT_METHODS,
  EXPENSE_CATEGORIES,
  CREDIT_TX_TYPES,
  ROLE_LABELS,
} from "@/lib/constants"
import {
  formatRials,
  formatRialsShort,
  formatDate,
  formatDateTime,
  formatTime,
  tomanToRials,
  toPersianDigits,
} from "@/lib/format"
import { JALALI_MONTHS, toJalali } from "@/lib/jalali"
import { TomanInput } from "./_toman-input"
import { JalaliDatePicker } from "./_jalali-date-picker/jalali-date-picker"
import { PageHeader, StatCard, EmptyState } from "./_shared"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ---------- Types ----------
interface DashboardData {
  kpis: {
    totalRevenue: number | null
    totalExpenses: number | null
    netProfit: number | null
    unpaidSalaries: number | null
    todaysIncome: number | null
    pendingSettlement: number | null
  }
}

interface PaymentRow {
  id: string
  projectId: string
  amount: number
  paymentType: string
  method: string
  datePaid: string
  note: string | null
  isConfirmed: boolean
  createdAt: string
  project: {
    id: string
    customer: { id: string; name: string; phone?: string }
    servicePackage: { id: string; title: string }
  }
}

interface ExpenseRow {
  id: string
  title: string
  amount: number
  category: string
  description: string | null
  date: string
  receiptImage: string | null
  createdAt: string
}

interface SalaryEntry {
  id: string
  source: "project_salary" | "salary_record"
  userId: string
  amount: number
  description: string | null
  note: string | null
  tags: string[]
  date: string
  isSettled: boolean
  settledAt: string | null
  manualType: string | null
  isPaid: boolean
  project: { id: string; title: string } | null
  sourceLabel: string
}

interface SalaryUserGroup {
  user: { id: string; firstName: string; lastName: string; role: string; name: string }
  entries: SalaryEntry[]
  totalUnsettled: number
  totalAll: number
  unsettledCount: number
  settledCount: number
}

interface SalariesResponse {
  users: SalaryUserGroup[]
  totalUnsettled: number
}

interface CreditRow {
  id: string
  customerId: string
  amount: number
  transactionType: string
  note: string | null
  createdAt: string
  isSettled?: boolean
  settledAt?: string | null
  customer: { id: string; name: string; phone: string; creditBalance: number }
  relatedContract: { id: string; contractNumber: string } | null
  // ✅ اطلاعات معرف و پروژه مرتبط
  referrerCustomerId?: string | null
  referrerCustomerName?: string | null
  referrerCustomerPhone?: string | null
  relatedProjectId?: string | null
  relatedProject?: { id: string; contractNumber: string | null; packageTitle: string | null } | null
  createdBy: { id: string; name: string } | null
}

interface ProjectOption {
  id: string
  customerName: string
  packageName: string
  label: string
}

// ---------- Color tokens (hex; safe in dark/light) ----------
const PAYMENT_TYPE_COLORS: Record<string, string> = {
  deposit: "#0ea5e9",
  installment: "#a855f7",
  settlement: "#22c55e",
}
const PAYMENT_METHOD_COLORS: Record<string, string> = {
  cash: "#10b981",
  card: "#0ea5e9",
  pos: "#a855f7",
  cheque: "#f59e0b",
}
const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  office: "#64748b",
  project_direct: "#0ea5e9",
  salary_fixed: "#a855f7",
  tax: "#f59e0b",
  other: "#10b981",
}
const CREDIT_TYPE_COLORS: Record<string, string> = {
  reward_referral: "#10b981",
  manual_adjustment: "#0ea5e9",
  used: "#f43f5e",
}

const CATEGORY_LABELS: Record<string, string> = {
  office: "اداری",
  project_direct: "مستقیم پروژه",
  salary_fixed: "حقوق ثابت",
  tax: "مالیات",
  other: "سایر",
}
const PAYMENT_TYPE_LABELS: Record<string, string> = {
  deposit: "بیعانه",
  installment: "قسط",
  settlement: "تسویه",
}
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "نقد",
  card: "کارت به کارت",
  pos: "POS",
  cheque: "چک",
}
const CREDIT_TYPE_LABELS: Record<string, string> = {
  reward_referral: "پاداش معرفی",
  manual_adjustment: "تنظیم دستی",
  used: "مصرف شده",
}

// ============================================================
// Main
// ============================================================
export function FinancesView() {
  const { role } = useWorkspace()

  if (role !== "admin" && role !== "manager") {
    return (
      <div className="p-6">
        <EmptyState
          icon="🔒"
          title="دسترسی محدود"
          description="اطلاعات مالی فقط برای مدیران سیستم و مدیران قابل مشاهده است."
        />
      </div>
    )
  }

  return <FinancesInner />
}

function FinancesInner() {
  const api = useApi()
  const [tab, setTab] = React.useState("payments")

  const { data: dash, isLoading: dashLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardData>("/api/dashboard"),
  })

  const kpis = dash?.kpis

  return (
    <div dir="rtl" className="text-right">
      <PageHeader
        title="مالی"
        icon="💰"
        description="پرداخت‌ها، هزینه‌ها، حقوق‌ها و دفتر اعتبار"
      />

      {/* KPI cards — expanded 6-card grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {dashLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              label="درآمد امروز"
              value={`${formatRialsShort(kpis?.todaysIncome ?? 0)}`}
              sub="پرداخت‌های امروز"
              icon={<Wallet className="h-4 w-4" />}
              accent="#10b981"
            />
            <StatCard
              label="درآمد کل"
              value={`${formatRialsShort(kpis?.totalRevenue ?? 0)}`}
              sub="تأییدشده"
              icon={<TrendingUp className="h-4 w-4" />}
              accent="#22c55e"
            />
            <StatCard
              label="هزینه کل"
              value={`${formatRialsShort(kpis?.totalExpenses ?? 0)}`}
              sub="همه دسته‌ها"
              icon={<TrendingDown className="h-4 w-4" />}
              accent="#ef4444"
            />
            <StatCard
              label="سود خالص"
              value={`${formatRialsShort(kpis?.netProfit ?? 0)}`}
              sub="درآمد − هزینه"
              icon={<TrendingUp className="h-4 w-4" />}
              accent={(kpis?.netProfit ?? 0) >= 0 ? "#0ea5e9" : "#f43f5e"}
            />
            <StatCard
              label="مانده تسویه"
              value={`${formatRialsShort(kpis?.pendingSettlement ?? 0)}`}
              sub="پروژه‌های فعال"
              icon={<Clock className="h-4 w-4" />}
              accent="#f59e0b"
            />
            <StatCard
              label="حقوق پرداخت‌نشده"
              value={`${formatRialsShort(kpis?.unpaidSalaries ?? 0)}`}
              sub="در انتظار پرداخت"
              icon={<AlertCircle className="h-4 w-4" />}
              accent="#a855f7"
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <div className="overflow-x-auto pb-1">
          <TabsList dir="rtl">
            <TabsTrigger value="payments" className="gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> پرداخت‌ها
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-1.5">
              <Receipt className="h-3.5 w-3.5" /> هزینه‌ها
            </TabsTrigger>
            <TabsTrigger value="salaries" className="gap-1.5">
              <Users className="h-3.5 w-3.5" /> حقوق‌ها
            </TabsTrigger>
            <TabsTrigger value="credit" className="gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> تراکنش‌های اعتبار
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="payments" className="mt-4">
          <PaymentsTab />
        </TabsContent>
        <TabsContent value="expenses" className="mt-4">
          <ExpensesTab />
        </TabsContent>
        <TabsContent value="salaries" className="mt-4">
          <SalariesTab />
        </TabsContent>
        <TabsContent value="credit" className="mt-4">
          <CreditLedgerTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================
// Shared: project combobox
// ============================================================
function useProjects() {
  const api = useApi()
  return useQuery<ProjectOption[]>({
    queryKey: ["projects-options"],
    queryFn: async () => {
      try {
        const res = await api.get<{ items?: ProjectOptionRaw[] } | ProjectOptionRaw[]>(
          "/api/projects?limit=100"
        )
        const arr = Array.isArray(res) ? res : res.items ?? []
        return arr.map((p) => {
          const customerName =
            p.customerName ?? p.customer?.name ?? p.contract?.customer?.name ?? "—"
          const packageName = extractPackageName(p)
          return {
            id: p.id,
            customerName,
            packageName,
            label: `${customerName} · ${packageName}`,
          }
        })
      } catch {
        return []
      }
    },
    staleTime: 60_000,
  })
}

interface ProjectOptionRaw {
  id: string
  customerName?: string
  packageName?: string
  package?: { title?: string } | string
  customer?: { name?: string }
  contract?: { customer?: { name?: string } }
  servicePackage?: { title?: string }
}

function extractPackageName(p: ProjectOptionRaw): string {
  if (p.packageName) return p.packageName
  if (p.servicePackage?.title) return p.servicePackage.title
  if (p.package && typeof p.package === "object" && p.package.title) return p.package.title
  if (typeof p.package === "string") return p.package
  return "—"
}

function ProjectCombobox({
  value,
  onChange,
  placeholder = "انتخاب پروژه",
}: {
  value: string | null
  onChange: (id: string | null, label?: string) => void
  placeholder?: string
}) {
  const { data: projects, isLoading } = useProjects()
  const [open, setOpen] = React.useState(false)
  const current = projects?.find((p) => p.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {current ? current.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="جستجوی پروژه‌ها…" />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "در حال بارگذاری…" : "پروژه‌ای یافت نشد."}
            </CommandEmpty>
            <CommandGroup>
              {projects?.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.label}
                  onSelect={() => {
                    onChange(p.id === value ? null : p.id, p.label)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === p.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{p.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Payments Tab
// ============================================================

// --- Searchable customer combobox (server-side search) ---
interface CustomerOption {
  id: string
  name: string
  phone: string
}

function useCustomerSearch(query: string, enabled: boolean) {
  const api = useApi()
  return useQuery<CustomerOption[]>({
    queryKey: ["customers-search", query],
    enabled,
    queryFn: async () => {
      try {
        const q = query.trim()
        const url = q
          ? `/api/customers?search=${encodeURIComponent(q)}&limit=20`
          : `/api/customers?limit=20`
        const res = await api.get<{ items?: CustomerOption[] } | CustomerOption[]>(url)
        return Array.isArray(res) ? res : res.items ?? []
      } catch {
        return []
      }
    },
    staleTime: 30_000,
  })
}

function CustomerCombobox({
  value,
  onChange,
  placeholder = "انتخاب مشتری",
}: {
  value: string | null
  onChange: (id: string | null, customer?: CustomerOption) => void
  placeholder?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const { data: customers, isLoading } = useCustomerSearch(query, open)
  const current = customers?.find((c) => c.id === value)

  // Hydrate the displayed name when value is set externally (e.g. on edit).
  const [hydratedName, setHydratedName] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (value && !current) {
      // Try to fetch the customer name from the all-customers list
      setHydratedName(null)
    } else {
      setHydratedName(null)
    }
  }, [value, current])

  const displayLabel = current
    ? `${current.name} · ${current.phone}`
    : hydratedName ?? (value ? "مشتری انتخاب‌شده" : placeholder)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="جستجو با نام یا تلفن…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "در حال بارگذاری…" : "مشتری‌ای یافت نشد."}
            </CommandEmpty>
            <CommandGroup>
              {(customers ?? []).map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  onSelect={() => {
                    onChange(c.id === value ? null : c.id, c)
                    setOpen(false)
                    setQuery("")
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === c.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{c.name} · {c.phone}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// --- Projects of a specific customer (used after customer is selected) ---
function useCustomerProjects(customerId: string | null) {
  const api = useApi()
  return useQuery<ProjectOption[]>({
    queryKey: ["customer-projects-options", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      if (!customerId) return []
      try {
        const res = await api.get<{
          projects?: Array<{
            id: string
            title?: string
            contractNumber?: string
            status?: string
          }>
        }>(`/api/customers/${customerId}/projects`)
        const arr = res.projects ?? []
        return arr.map((p) => ({
          id: p.id,
          customerName: "",
          packageName: p.title ?? "—",
          label: `${p.title ?? "پروژه"}${p.contractNumber ? ` · ${p.contractNumber}` : ""}`,
        }))
      } catch {
        return []
      }
    },
    staleTime: 30_000,
  })
}

function CustomerProjectCombobox({
  customerId,
  value,
  onChange,
  placeholder = "انتخاب پروژه",
}: {
  customerId: string | null
  value: string | null
  onChange: (id: string | null, label?: string) => void
  placeholder?: string
}) {
  const { data: projects, isLoading } = useCustomerProjects(customerId)
  const [open, setOpen] = React.useState(false)
  const current = projects?.find((p) => p.id === value)
  const disabled = !customerId

  return (
    <Popover open={open && !disabled} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {current ? current.label : disabled ? "ابتدا مشتری را انتخاب کنید" : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput placeholder="جستجوی پروژه‌ها…" />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "در حال بارگذاری…" : "پروژه‌ای یافت نشد."}
            </CommandEmpty>
            <CommandGroup>
              {(projects ?? []).map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.label}
                  onSelect={() => {
                    onChange(p.id === value ? null : p.id, p.label)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === p.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{p.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function PaymentsTab() {
  const api = useApi()
  const qc = useQueryClient()

  const [search, setSearch] = React.useState("")
  const [paymentType, setPaymentType] = React.useState<string>("all")
  const [method, setMethod] = React.useState<string>("all")
  const [status, setStatus] = React.useState<string>("all") // all | confirmed | pending
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")
  const [page, setPage] = React.useState(1)
  const PAGE_SIZE = 10

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<PaymentRow | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<PaymentRow | null>(null)
  // ✅ Tracks the payment id whose SMS receipt is currently being sent.
  const [smsSendingId, setSmsSendingId] = React.useState<string | null>(null)

  const params = new URLSearchParams()
  if (search) params.set("search", search)
  if (paymentType !== "all") params.set("paymentType", paymentType)
  if (method !== "all") params.set("method", method)
  if (status !== "all") params.set("status", status)
  if (from) params.set("from", from)
  if (to) params.set("to", to)

  const { data, isLoading } = useQuery({
    queryKey: ["payments", "all", search, paymentType, method, status, from, to],
    queryFn: () => api.get<PaymentRow[]>(`/api/projects/all/payments?${params.toString()}`),
  })

  const confirmMut = useMutation({
    mutationFn: (id: string) => api.patch(`/api/payments/${id}`, { isConfirmed: true }),
    onSuccess: () => {
      toast.success("پرداخت تأیید شد")
      qc.invalidateQueries({ queryKey: ["payments"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
    onError: () => toast.error("تأیید پرداخت ناموفق بود"),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.del(`/api/payments/${id}`),
    onSuccess: () => {
      toast.success("پرداخت حذف شد")
      qc.invalidateQueries({ queryKey: ["payments"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
      setDeleteTarget(null)
    },
    onError: () => toast.error("حذف پرداخت ناموفق بود"),
  })

  // ✅ Send SMS receipt to the customer for a confirmed payment.
  //    Message: "مشتری گرامی {name}، پرداخت {amount} تومان شما در تاریخ {date} ساعت {time} دریافت شد."
  const sendSmsMut = useMutation({
    mutationFn: async (p: PaymentRow) => {
      setSmsSendingId(p.id)
      const amountToman = Math.round(p.amount / 10)
      const amountDisplay = new Intl.NumberFormat("en-US").format(amountToman)
      const d = new Date(p.datePaid)
      const jDate = formatDate(d)
      const tStr = formatTime(d)
      const message = `مشتری گرامی ${p.project.customer.name}، پرداخت ${amountDisplay} تومان شما در تاریخ ${jDate} ساعت ${tStr} دریافت شد.`
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ phone: p.project.customer.phone, message }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string })?.error || `Request failed (${res.status})`)
      return data as { ok: boolean; skipped?: boolean }
    },
    onSuccess: (data) => {
      if (data.skipped) {
        toast.info("سرویس پیامک فعال نیست — پیامک ارسال نشد.")
      } else {
        toast.success("پیامک رسید پرداخت برای مشتری ارسال شد")
      }
    },
    onError: (e: Error) => toast.error(e.message || "ارسال پیامک ناموفق بود"),
    onSettled: () => setSmsSendingId(null),
  })

  const rows = data ?? []
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  // Reset page when filters change
  React.useEffect(() => { setPage(1) }, [search, paymentType, method, status, from, to])

  return (
    <div className="space-y-4">
      <Toolbar>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="جستجوی مشتری، پکیج، یادداشت…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={paymentType} onValueChange={setPaymentType}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="نوع" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه نوع‌ها</SelectItem>
            {PAYMENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{PAYMENT_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="روش" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه روش‌ها</SelectItem>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="وضعیت" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه وضعیت‌ها</SelectItem>
            <SelectItem value="confirmed">تأییدشده</SelectItem>
            <SelectItem value="pending">در انتظار تأیید</SelectItem>
          </SelectContent>
        </Select>
        <DateRangeFromTo from={from} to={to} setFrom={setFrom} setTo={setTo} />
        {/* ✅ "ثبت پرداخت" button removed per spec — payments are now created
            only from the customer / project flows. The dialog is kept here so
            existing payment rows can still be edited. */}
        <RecordPaymentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editTarget={editTarget}
          onEditDone={() => setEditTarget(null)}
        />
      </Toolbar>

      <div className="rounded-xl border bg-card overflow-hidden" dir="rtl">
        <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-[160px] text-right">تاریخ و ساعت</TableHead>
                <TableHead className="text-right">پروژه</TableHead>
                <TableHead className="text-right">مبلغ</TableHead>
                <TableHead className="text-right">نوع</TableHead>
                <TableHead className="text-right">روش</TableHead>
                <TableHead className="text-right">وضعیت</TableHead>
                <TableHead className="text-right">یادداشت</TableHead>
                <TableHead className="text-right">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState icon="💳" title="پرداختی وجود ندارد" description="اولین پرداخت خود را ثبت کنید تا اینجا نمایش داده شود." />
                  </TableCell>
                </TableRow>
              ) : (
                pagedRows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap text-right" dir="rtl">
                      {/* ✅ Date + time — "۱۴۰۵/۰۵/۰۱ - ۱۵:۳۰" */}
                      {formatPaymentDateAndTime(p.datePaid)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium text-sm">{p.project.customer.name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {p.project.servicePackage.title}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                      {formatRials(p.amount)} <span className="text-muted-foreground">تومان</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-medium"
                        style={{
                          background: (PAYMENT_TYPE_COLORS[p.paymentType] ?? "#64748b") + "22",
                          color: PAYMENT_TYPE_COLORS[p.paymentType] ?? "#64748b",
                        }}
                      >
                        {PAYMENT_TYPE_LABELS[p.paymentType] ?? p.paymentType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-medium"
                        style={{
                          background: (PAYMENT_METHOD_COLORS[p.method] ?? "#64748b") + "22",
                          color: PAYMENT_METHOD_COLORS[p.method] ?? "#64748b",
                        }}
                      >
                        {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {p.isConfirmed ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> تأییدشده
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-500/40">
                          <Clock className="h-3 w-3" /> در انتظار
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate text-right">
                      {p.note || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {/* ✅ SMS button — only for confirmed payments */}
                        {p.isConfirmed && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-sky-600 hover:text-sky-700"
                            disabled={smsSendingId === p.id}
                            onClick={() => sendSmsMut.mutate(p)}
                            title="ارسال پیامک به مشتری"
                          >
                            {smsSendingId === p.id ? (
                              <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> در حال ارسال…</>
                            ) : (
                              <><Send className="h-3.5 w-3.5" /> ارسال پیامک</>
                            )}
                          </Button>
                        )}
                        {!p.isConfirmed && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700"
                            disabled={confirmMut.isPending}
                            onClick={() => confirmMut.mutate(p.id)}
                          >
                            <Check className="h-3.5 w-3.5" /> تأیید
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditTarget(p)
                            setDialogOpen(true)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700"
                          onClick={() => setDeleteTarget(p)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {rows.length > PAGE_SIZE && (
        <Pagination dir="rtl" className="justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={() => setPage(Math.max(1, currentPage - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <PaginationItem><PaginationEllipsis /></PaginationItem>
                  )}
                  <PaginationItem>
                    <PaginationLink isActive={p === currentPage} onClick={() => setPage(p)} className="cursor-pointer">
                      {toPersianDigits(p)}
                    </PaginationLink>
                  </PaginationItem>
                </React.Fragment>
              ))}
            <PaginationItem>
              <PaginationNext onClick={() => setPage(Math.min(totalPages, currentPage + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف پرداخت؟</AlertDialogTitle>
            <AlertDialogDescription>
              این عمل پرداخت {formatRials(deleteTarget?.amount ?? 0)} تومان برای {deleteTarget?.project.customer.name} را برای همیشه حذف می‌کند. اگر تأیید شده باشد، درآمد مشتری اصلاح خواهد شد.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              disabled={deleteMut.isPending}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function RecordPaymentDialog({
  open,
  onOpenChange,
  editTarget,
  onEditDone,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editTarget: PaymentRow | null
  onEditDone: () => void
}) {
  const api = useApi()
  const qc = useQueryClient()

  const [customerId, setCustomerId] = React.useState<string | null>(null)
  const [projectId, setProjectId] = React.useState<string | null>(null)
  // Amount is tracked in TOMAN in the form, converted to Rials before POST.
  const [amountToman, setAmountToman] = React.useState(0)
  const [paymentType, setPaymentType] = React.useState<string>("deposit")
  const [method, setMethod] = React.useState<string>("pos")
  const [datePaid, setDatePaid] = React.useState<string>(new Date().toISOString())
  const [note, setNote] = React.useState("")
  const [isConfirmed, setIsConfirmed] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  // Confirm-twice dialog: shown when user clicks submit with isConfirmed=true.
  const [confirmApproveOpen, setConfirmApproveOpen] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    if (editTarget) {
      // On edit, we don't need to set customerId because the project is locked;
      // the project display row is shown as read-only.
      setCustomerId(editTarget.project.customer.id)
      setProjectId(editTarget.projectId)
      // editTarget.amount is Rials — convert to Toman for the input
      setAmountToman(Math.round((editTarget.amount ?? 0) / 10))
      setPaymentType(editTarget.paymentType)
      setMethod(editTarget.method)
      setDatePaid(new Date(editTarget.datePaid).toISOString())
      setNote(editTarget.note ?? "")
      setIsConfirmed(editTarget.isConfirmed)
    } else {
      setCustomerId(null)
      setProjectId(null)
      setAmountToman(0)
      setPaymentType("deposit")
      setMethod("pos")
      setDatePaid(new Date().toISOString())
      setNote("")
      setIsConfirmed(false)
    }
  }, [open, editTarget])

  // When customer changes (in create mode), reset project selection.
  const onCustomerChange = (id: string | null) => {
    setCustomerId(id)
    setProjectId(null)
  }

  const isEdit = !!editTarget

  const submit = async () => {
    if (!amountToman || amountToman <= 0) {
      toast.error("مبلغ باید بزرگتر از ۰ باشد")
      return
    }
    if (!isEdit) {
      if (!customerId) {
        toast.error("لطفاً ابتدا یک مشتری انتخاب کنید")
        return
      }
      if (!projectId) {
        toast.error("لطفاً یک پروژه انتخاب کنید")
        return
      }
    }
    // Convert Toman → Rials for the API.
    const amountRials = tomanToRials(amountToman)
    setSubmitting(true)
    try {
      if (isEdit && editTarget) {
        await api.patch(`/api/payments/${editTarget.id}`, {
          amount: amountRials,
          paymentType,
          method,
          datePaid,
          note: note || undefined,
          isConfirmed,
        })
        toast.success("پرداخت به‌روزرسانی شد")
      } else {
        if (!projectId) throw new Error("پروژه الزامی است")
        await api.post(`/api/projects/${projectId}/payments`, {
          amount: amountRials,
          paymentType,
          method,
          datePaid,
          note: note || undefined,
          isConfirmed,
        })
        toast.success("پرداخت ثبت شد")
      }
      qc.invalidateQueries({ queryKey: ["payments"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
      onOpenChange(false)
      onEditDone()
    } catch {
      toast.error("ذخیره پرداخت ناموفق بود")
    } finally {
      setSubmitting(false)
    }
  }

  // If user clicks submit with isConfirmed=true, show confirmation dialog first.
  const onSubmitClick = () => {
    if (isConfirmed) {
      setConfirmApproveOpen(true)
      return
    }
    submit()
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          onOpenChange(o)
          if (!o) onEditDone()
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{isEdit ? "ویرایش پرداخت" : "ثبت پرداخت"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "جزئیات پرداخت را در زیر به‌روزرسانی کنید."
                : "افزودن پرداخت جدید برای یک پروژه. ابتدا مشتری را انتخاب کنید، سپس پروژه‌ی او. پرداخت‌های تأییدشده درآمد مشتری را به‌روزرسانی می‌کنند. مبلغ به تومان وارد می‌شود."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2" dir="rtl">
            {/* Customer first */}
            <div className="space-y-1.5">
              <Label>مشتری</Label>
              {isEdit ? (
                <div className="text-sm px-3 py-2 rounded-md border bg-muted/30 text-muted-foreground">
                  {editTarget?.project.customer.name}
                </div>
              ) : (
                <CustomerCombobox
                  value={customerId}
                  onChange={onCustomerChange}
                  placeholder="انتخاب مشتری"
                />
              )}
            </div>

            {/* Project — dependent on customer */}
            <div className="space-y-1.5">
              <Label>پروژه</Label>
              {isEdit ? (
                <div className="text-sm px-3 py-2 rounded-md border bg-muted/30 text-muted-foreground">
                  {editTarget?.project.servicePackage.title}
                </div>
              ) : (
                <CustomerProjectCombobox
                  customerId={customerId}
                  value={projectId}
                  onChange={(id) => setProjectId(id)}
                  placeholder="انتخاب پروژه"
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>مبلغ (تومان)</Label>
                <TomanInput
                  value={amountToman}
                  onValueChange={setAmountToman}
                  placeholder="مثلاً ۵۰٬۰۰۰٬۰۰۰"
                />
              </div>
              <div className="space-y-1.5">
                <Label>تاریخ پرداخت</Label>
                <JalaliDatePicker
                  value={datePaid || null}
                  onChange={(iso) => setDatePaid(iso ?? new Date().toISOString())}
                  placeholder="انتخاب تاریخ پرداخت"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>نوع</Label>
                <Select value={paymentType} onValueChange={setPaymentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{PAYMENT_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>روش</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>یادداشت (اختیاری)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="شماره چک، مرجع و غیره"
                rows={2}
              />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={isConfirmed}
                onCheckedChange={(v) => setIsConfirmed(v === true)}
              />
              <span>علامت‌گذاری به‌عنوان تأییدشده</span>
              <span className="text-xs text-muted-foreground">
                (درآمد مشتری را به‌روزرسانی می‌کند)
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>انصراف</Button>
            <Button onClick={onSubmitClick} disabled={submitting}>
              {submitting ? "در حال ذخیره…" : isEdit ? "ذخیره تغییرات" : "ثبت پرداخت"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm-twice for approved payment */}
      <AlertDialog open={confirmApproveOpen} onOpenChange={setConfirmApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأیید ثبت پرداخت</AlertDialogTitle>
            <AlertDialogDescription>
              آیا مطمئن هستید که این پرداخت را به عنوان تأیید شده ثبت می‌کنید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmApproveOpen(false)
                submit()
              }}
            >
              تأیید
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ============================================================
// Expenses Tab
// ============================================================
function ExpensesTab() {
  const api = useApi()
  const qc = useQueryClient()

  const [search, setSearch] = React.useState("")
  const [category, setCategory] = React.useState<string>("all")
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<ExpenseRow | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<ExpenseRow | null>(null)

  const params = new URLSearchParams()
  if (search) params.set("search", search)
  if (category !== "all") params.set("category", category)
  if (from) params.set("from", from)
  if (to) params.set("to", to)

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", search, category, from, to],
    queryFn: () => api.get<ExpenseRow[]>(`/api/expenses?${params.toString()}`),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.del(`/api/expenses/${id}`),
    onSuccess: () => {
      toast.success("هزینه حذف شد")
      qc.invalidateQueries({ queryKey: ["expenses"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
      setDeleteTarget(null)
    },
    onError: () => toast.error("حذف هزینه ناموفق بود"),
  })

  const rows = data ?? []
  const total = rows.reduce((s, r) => s + r.amount, 0)

  return (
    <div className="space-y-4">
      <Toolbar>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="جستجوی عنوان هزینه…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="دسته‌بندی" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه دسته‌بندی‌ها</SelectItem>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DateRangeFromTo from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <Button className="gap-1.5 ml-auto" onClick={() => { setEditTarget(null); setDialogOpen(true) }}>
          <Plus className="h-3.5 w-3.5" /> افزودن هزینه
        </Button>
        <ExpenseDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editTarget={editTarget}
          onEditDone={() => setEditTarget(null)}
        />
      </Toolbar>

      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">
          {toPersianDigits(rows.length)} هزینه · مجموع{" "}
          <span className="font-semibold text-foreground">{formatRials(total)} تومان</span>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden" dir="rtl">
        <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-[110px]">تاریخ</TableHead>
                <TableHead>عنوان</TableHead>
                <TableHead>دسته‌بندی</TableHead>
                <TableHead className="text-right">مبلغ</TableHead>
                <TableHead>توضیحات</TableHead>
                <TableHead className="text-right">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState icon="🧾" title="هزینه‌ای وجود ندارد" description="اولین هزینه خود را اضافه کنید تا خرج‌ها پیگیری شوند." />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((e) => {
                  const color = EXPENSE_CATEGORY_COLORS[e.category] ?? "#64748b"
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(e.date)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{e.title}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-medium"
                          style={{ background: color + "22", color }}
                        >
                          {CATEGORY_LABELS[e.category] ?? e.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                        {formatRials(e.amount)} <span className="text-muted-foreground">تومان</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">
                        {e.description || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              setEditTarget(e)
                              setDialogOpen(true)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700"
                            onClick={() => setDeleteTarget(e)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف هزینه؟</AlertDialogTitle>
            <AlertDialogDescription>
              این عمل &quot;{deleteTarget?.title}&quot; را برای همیشه حذف می‌کند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              disabled={deleteMut.isPending}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ExpenseDialog({
  open,
  onOpenChange,
  editTarget,
  onEditDone,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editTarget: ExpenseRow | null
  onEditDone: () => void
}) {
  const api = useApi()
  const qc = useQueryClient()

  const [title, setTitle] = React.useState("")
  // Amount tracked in Toman; converted to Rials before POST.
  const [amountToman, setAmountToman] = React.useState(0)
  const [category, setCategory] = React.useState<string>("office")
  const [description, setDescription] = React.useState("")
  const [date, setDate] = React.useState<string>(new Date().toISOString())
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    if (editTarget) {
      setTitle(editTarget.title)
      setAmountToman(Math.round((editTarget.amount ?? 0) / 10))
      setCategory(editTarget.category)
      setDescription(editTarget.description ?? "")
      setDate(new Date(editTarget.date).toISOString())
    } else {
      setTitle("")
      setAmountToman(0)
      setCategory("office")
      setDescription("")
      setDate(new Date().toISOString())
    }
  }, [open, editTarget])

  const isEdit = !!editTarget

  const submit = async () => {
    if (!title.trim()) return toast.error("عنوان الزامی است")
    if (!amountToman || amountToman <= 0) return toast.error("مبلغ باید بزرگتر از ۰ باشد")
    const amountRials = tomanToRials(amountToman)
    setSubmitting(true)
    try {
      if (isEdit && editTarget) {
        await api.patch(`/api/expenses/${editTarget.id}`, {
          title,
          amount: amountRials,
          category,
          description: description || null,
          date,
        })
        toast.success("هزینه به‌روزرسانی شد")
      } else {
        await api.post(`/api/expenses`, {
          title,
          amount: amountRials,
          category,
          description: description || null,
          date,
        })
        toast.success("هزینه اضافه شد")
      }
      qc.invalidateQueries({ queryKey: ["expenses"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
      onOpenChange(false)
      onEditDone()
    } catch {
      toast.error("ذخیره هزینه ناموفق بود")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) onEditDone()
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "ویرایش هزینه" : "افزودن هزینه"}</DialogTitle>
          <DialogDescription>
            هزینه‌های استودیو را پیگیری کنید. برای گزارش‌دهی تمیز دسته‌بندی کنید. مبلغ به تومان وارد می‌شود.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2" dir="rtl">
          <div className="space-y-1.5">
            <Label>عنوان</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلاً اجاره استودیو (ماهانه)"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>مبلغ (تومان)</Label>
              <TomanInput
                value={amountToman}
                onValueChange={setAmountToman}
                placeholder="مثلاً ۸٬۰۰۰٬۰۰۰"
              />
            </div>
            <div className="space-y-1.5">
              <Label>تاریخ</Label>
              <JalaliDatePicker
                value={date || null}
                onChange={(iso) => setDate(iso ?? new Date().toISOString())}
                placeholder="انتخاب تاریخ هزینه"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>دسته‌بندی</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>توضیحات (اختیاری)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="جزئیات اضافی، شماره فاکتور، دلیل هزینه…"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>انصراف</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "در حال ذخیره…" : isEdit ? "ذخیره تغییرات" : "افزودن هزینه"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Salaries Tab
// ============================================================
const TRIGGER_LABELS: Record<string, string> = {
  before_event: "قبل از مراسم",
  after_event: "بعد از مراسم",
  after_ready: "بعد از آماده‌شدن",
  after_photo_select: "بعد از انتخاب عکس",
}

// ============================================================
// Salaries Tab — unified ProjectSalary + SalaryRecord ledger
// (FIXES-10 #4: removed old SalaryRule/commission logic; now shows
//  ALL employees, with expand/collapse arrows revealing individual
//  salary entries. Unsettled items have a "تسویه" button.)
// ============================================================
function SalariesTab() {
  const api = useApi()
  const qc = useQueryClient()

  const [userId, setUserId] = React.useState<string>("all")
  const [onlyUnsettled, setOnlyUnsettled] = React.useState<boolean>(false)
  const [expandedUser, setExpandedUser] = React.useState<string | null>(null)

  const params = new URLSearchParams()
  if (userId !== "all") params.set("userId", userId)
  if (onlyUnsettled) params.set("onlyUnsettled", "1")

  const { data, isLoading } = useQuery({
    queryKey: ["salaries", userId, onlyUnsettled],
    queryFn: () => api.get<SalariesResponse>(`/api/salaries?${params.toString()}`),
  })

  // ✅ Settle / unsettle a single entry. Routes to the right endpoint based on source.
  const settleMut = useMutation({
    mutationFn: async (entry: SalaryEntry) => {
      if (entry.source === "project_salary") {
        // Cross-project sentinel: `/api/projects/any/salaries/[id]` accepts id="any".
        return api.patch(`/api/projects/any/salaries/${entry.id}`, { isSettled: true })
      }
      return api.patch(`/api/salaries/${entry.id}`, { isSettled: true })
    },
    onSuccess: () => {
      toast.success("به‌عنوان تسویه‌شده علامت‌گذاری شد")
      qc.invalidateQueries({ queryKey: ["salaries"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
    onError: () => toast.error("علامت‌گذاری تسویه ناموفق بود"),
  })

  const unsettleMut = useMutation({
    mutationFn: async (entry: SalaryEntry) => {
      if (entry.source === "project_salary") {
        return api.patch(`/api/projects/any/salaries/${entry.id}`, { isSettled: false })
      }
      return api.patch(`/api/salaries/${entry.id}`, { isSettled: false })
    },
    onSuccess: () => {
      toast.success("وضعیت تسویه برداشته شد")
      qc.invalidateQueries({ queryKey: ["salaries"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
    onError: () => toast.error("برگرداندن وضعیت ناموفق بود"),
  })

  // ✅ Settle ALL unsettled entries for a user in one click.
  const settleAllMut = useMutation({
    mutationFn: async (entries: SalaryEntry[]) => {
      for (const e of entries) {
        if (e.source === "project_salary") {
          await api.patch(`/api/projects/any/salaries/${e.id}`, { isSettled: true })
        } else {
          await api.patch(`/api/salaries/${e.id}`, { isSettled: true })
        }
      }
    },
    onSuccess: (_d, entries) => {
      toast.success(
        `${toPersianDigits(entries.length)} رکورد به‌عنوان تسویه‌شده علامت‌گذاری شد`
      )
      qc.invalidateQueries({ queryKey: ["salaries"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
    onError: () => toast.error("تسویه گروهی ناموفق بود"),
  })

  const groups = data?.users ?? []
  const totalUnsettled = data?.totalUnsettled ?? 0

  // chart data: unsettled by user
  const chartData = React.useMemo(() => {
    return groups
      .map((g) => ({ name: g.user.name, amount: g.totalUnsettled }))
      .filter((x) => x.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)
  }, [groups])

  const chartColors = ["#0ea5e9", "#a855f7", "#10b981", "#f59e0b", "#ec4899", "#64748b", "#22c55e", "#f43f5e"]

  return (
    <div className="space-y-4">
      <Toolbar>
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="کاربر" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه کارمندان</SelectItem>
            {groups.map((u) => (
              <SelectItem key={u.user.id} value={u.user.id}>
                {u.user.name} · {ROLE_LABELS[u.user.role as keyof typeof ROLE_LABELS] ?? u.user.role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant={onlyUnsettled ? "default" : "outline"}
          className="h-9 text-xs"
          onClick={() => setOnlyUnsettled((v) => !v)}
        >
          <Clock className="ml-1 h-3.5 w-3.5" />
          {onlyUnsettled ? "نمایش همه" : "فقط تسویه‌نشده"}
        </Button>
      </Toolbar>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            مجموع تسویه‌نشده
          </div>
          <div className="mt-1.5 text-2xl font-semibold tracking-tight">
            {formatRials(totalUnsettled)} <span className="text-sm text-muted-foreground">تومان</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {toPersianDigits(groups.reduce((s, g) => s + g.unsettledCount, 0))} رکورد در انتظار تسویه
          </div>
        </div>

        {chartData.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
              تسویه‌نشده بر اساس کارمند
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickFormatter={(v) => formatRialsShort(v)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  width={80}
                  axisLine={false}
                  tickLine={false}
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
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={chartColors[i % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden" dir="rtl">
        <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-[40px]" />
                <TableHead>کارمند</TableHead>
                <TableHead className="text-right">مجموع تسویه‌نشده</TableHead>
                <TableHead>تعداد رکورد</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-right">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState icon="👷" title="کارمندی وجود ندارد" description="هنوز کارمندی برای این استودیو ثبت نشده است." />
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((u) => {
                  const isExpanded = expandedUser === u.user.id
                  const unsettledEntries = u.entries.filter((e) => !e.isSettled)
                  const allSettled = u.unsettledCount === 0
                  return (
                    <React.Fragment key={u.user.id}>
                      <TableRow
                        className={cn(
                          "cursor-pointer hover:bg-accent/40",
                          u.entries.length === 0 && "opacity-60"
                        )}
                        onClick={() => u.entries.length > 0 && setExpandedUser(isExpanded ? null : u.user.id)}
                      >
                        <TableCell className="text-center">
                          {u.entries.length > 0 && (
                            <button
                              type="button"
                              aria-label={isExpanded ? "بستن جزئیات" : "باز کردن جزئیات"}
                              className="text-muted-foreground hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedUser(isExpanded ? null : u.user.id)
                              }}
                            >
                              {isExpanded ? "▼" : "◀"}
                            </button>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="text-[10px]">
                                {u.user.name.split(" ").map((x) => x[0]).join("").slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium">{u.user.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {ROLE_LABELS[u.user.role as keyof typeof ROLE_LABELS] ?? u.user.role}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                          <span className="font-semibold">{formatRials(u.totalUnsettled)}</span>
                          <span className="text-muted-foreground"> تومان</span>
                          {u.settledCount > 0 && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              کل: {formatRials(u.totalAll)} تومان
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {toPersianDigits(u.entries.length)} رکورد
                          <div className="text-[10px] mt-0.5">
                            {toPersianDigits(u.unsettledCount)} باز · {toPersianDigits(u.settledCount)} تسویه
                          </div>
                        </TableCell>
                        <TableCell>
                          {u.entries.length === 0 ? (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              بدون رکورد
                            </Badge>
                          ) : allSettled ? (
                            <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-500/15 text-emerald-600">
                              <CheckCircle2 className="h-3 w-3" /> همگی تسویه
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-500/40">
                              <Clock className="h-3 w-3" /> در انتظار تسویه
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            {!allSettled && unsettledEntries.length > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                disabled={settleAllMut.isPending}
                                onClick={() => settleAllMut.mutate(unsettledEntries)}
                              >
                                <Check className="h-3.5 w-3.5" /> تسویه همه
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-muted/20">
                          <TableCell colSpan={6} className="p-0">
                            <div className="px-4 py-3">
                              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
                                جزئیات رکوردها — {u.user.name}
                              </div>
                              {u.entries.length === 0 ? (
                                <div className="py-6 text-center text-xs text-muted-foreground">
                                  هیچ رکورد حقوقی ثبت نشده است.
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  {u.entries.map((r) => (
                                    <SalaryEntryRow
                                      key={`${r.source}-${r.id}`}
                                      entry={r}
                                      onSettle={() => settleMut.mutate(r)}
                                      onUnsettle={() => unsettleMut.mutate(r)}
                                      settling={settleMut.isPending || unsettleMut.isPending}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SalaryEntryRow — one unified entry (project_salary | salary_record)
// ============================================================
const MANUAL_TYPE_LABELS: Record<string, string> = {
  bonus: "پاداش",
  penalty: "جریمه",
  manual_salary: "حقوق دستی",
}
const MANUAL_TYPE_COLORS: Record<string, string> = {
  bonus: "#10b981",
  penalty: "#ef4444",
  manual_salary: "#a855f7",
}

function SalaryEntryRow({
  entry,
  onSettle,
  onUnsettle,
  settling,
}: {
  entry: SalaryEntry
  onSettle: () => void
  onUnsettle: () => void
  settling: boolean
}) {
  const isProjectSalary = entry.source === "project_salary"
  const sourceColor = isProjectSalary ? "#0ea5e9" : MANUAL_TYPE_COLORS[entry.manualType ?? "manual_salary"] ?? "#a855f7"
  const sourceText = isProjectSalary
    ? "حقوق پروژه"
    : MANUAL_TYPE_LABELS[entry.manualType ?? "manual_salary"] ?? "دستی"

  const description = entry.description ?? entry.note ?? null
  const isNegative = entry.amount < 0

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-xs transition-opacity",
        entry.isSettled && "opacity-50"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
            style={{ background: sourceColor + "22", color: sourceColor }}
          >
            {sourceText}
          </span>
          {entry.project && (
            <span className="text-[11px] font-medium text-foreground">
              {entry.project.title}
            </span>
          )}
          {entry.isSettled && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600">
              <CheckCircle2 className="h-2.5 w-2.5" /> تسویه شده
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
          <span>{formatDateTime(entry.date)}</span>
          {entry.settledAt && (
            <span>· تسویه در {formatDate(entry.settledAt)}</span>
          )}
          {entry.tags.length > 0 && (
            <span className="flex items-center gap-1">
              ·{" "}
              {entry.tags.map((t, i) => (
                <span
                  key={i}
                  className="rounded bg-muted px-1 py-0.5 text-[9px]"
                >
                  {t}
                </span>
              ))}
            </span>
          )}
        </div>
        {description && (
          <div className="mt-1 text-[11px] text-foreground/80">{description}</div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn("font-mono text-sm", isNegative && "text-rose-600")}>
          {isNegative ? "−" : ""}
          {formatRials(Math.abs(entry.amount))}{" "}
          <span className="text-muted-foreground">تومان</span>
        </span>
        {entry.isSettled ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700"
            disabled={settling}
            onClick={onUnsettle}
          >
            برداشتن
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/40"
            disabled={settling}
            onClick={onSettle}
          >
            <Check className="h-3.5 w-3.5" /> تسویه
          </Button>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Credit Ledger Tab
// ============================================================
function CreditLedgerTab() {
  const api = useApi()
  const qc = useQueryClient()

  const [customerId, setCustomerId] = React.useState<string>("all")
  const [transactionType, setTransactionType] = React.useState<string>("all")
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")
  const [page, setPage] = React.useState(1)
  const PAGE_SIZE = 10

  const [adjustOpen, setAdjustOpen] = React.useState(false)

  const params = new URLSearchParams()
  if (customerId !== "all") params.set("customerId", customerId)
  if (transactionType !== "all") params.set("transactionType", transactionType)
  if (from) params.set("from", from)
  if (to) params.set("to", to)

  const { data, isLoading } = useQuery({
    queryKey: ["credit-transactions", customerId, transactionType, from, to],
    queryFn: () => api.get<CreditRow[]>(`/api/credit-transactions?${params.toString()}`),
  })

  const { data: customersData } = useQuery({
    queryKey: ["customers-options"],
    queryFn: async () => {
      try {
        const res = await api.get<{ items?: { id: string; name: string; phone: string }[] } | { id: string; name: string; phone: string }[]>(
          "/api/customers?limit=100"
        )
        const arr = Array.isArray(res) ? res : res.items ?? []
        return arr
      } catch {
        return []
      }
    },
    staleTime: 60_000,
  })

  const rows = data ?? []
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  React.useEffect(() => { setPage(1) }, [customerId, transactionType, from, to])
  // Manual adjustments can have negative amounts (subtractions) — treat
  // negative manual_adjustment amounts as "consumed" for the summary.
  const totalIssued = rows
    .filter((r) => r.amount > 0 && (r.transactionType === "reward_referral" || r.transactionType === "manual_adjustment"))
    .reduce((s, r) => s + r.amount, 0)
  const totalUsed = rows
    .filter((r) => r.transactionType === "used" || (r.transactionType === "manual_adjustment" && r.amount < 0))
    .reduce((s, r) => s + Math.abs(r.amount), 0)

  const exportCsv = () => {
    const headers = ["تاریخ", "مشتری", "تلفن", "نوع", "مبلغ (تومان)", "یادداشت", "ایجاد شده توسط"]
    const lines = [headers.join(",")]
    for (const r of rows) {
      const isNeg = r.transactionType === "used" || r.amount < 0
      const cells = [
        formatDate(r.createdAt),
        r.customer.name,
        r.customer.phone,
        CREDIT_TYPE_LABELS[r.transactionType] ?? r.transactionType,
        String(isNeg ? -Math.abs(r.amount) : Math.abs(r.amount)),
        (r.note ?? "").replace(/"/g, '""'),
        r.createdBy?.name ?? "",
      ]
      lines.push(cells.map((c) => `"${c}"`).join(","))
    }
    const csv = lines.join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `credit-ledger-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("CSV خروجی گرفته شد")
  }

  return (
    <div className="space-y-4">
      <Toolbar>
        <Select value={customerId} onValueChange={setCustomerId}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="مشتری" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه مشتریان</SelectItem>
            {(customersData ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={transactionType} onValueChange={setTransactionType}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="نوع" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه نوع‌ها</SelectItem>
            {CREDIT_TX_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{CREDIT_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DateRangeFromTo from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0} className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> خروجی CSV
        </Button>
        <Button className="gap-1.5 ml-auto" onClick={() => setAdjustOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> افزایش / کسر اعتبار
        </Button>
        <CreditAdjustDialog
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["credit-transactions"] })
            qc.invalidateQueries({ queryKey: ["dashboard"] })
          }}
        />
      </Toolbar>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            مجموع اعتبار صادر شده
          </div>
          <div className="mt-1.5 text-2xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">
            +{formatRials(totalIssued)} <span className="text-sm text-muted-foreground">تومان</span>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            مجموع اعتبار مصرف شده
          </div>
          <div className="mt-1.5 text-2xl font-semibold tracking-tight text-rose-600 dark:text-rose-400">
            −{formatRials(totalUsed)} <span className="text-sm text-muted-foreground">تومان</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden" dir="rtl">
        <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-[140px]">تاریخ</TableHead>
                <TableHead>مشتری</TableHead>
                <TableHead>نوع</TableHead>
                <TableHead className="text-right">مبلغ</TableHead>
                <TableHead>معرف</TableHead>
                <TableHead>پروژه مرتبط</TableHead>
                <TableHead>یادداشت</TableHead>
                <TableHead>وضعیت تسویه</TableHead>
                <TableHead>ایجاد شده توسط</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <EmptyState icon="🎁" title="تراکنش اعتباری وجود ندارد" description="پاداش‌های معرفی و تنظیمات اینجا نمایش داده می‌شوند." />
                  </TableCell>
                </TableRow>
              ) : (
                pagedRows.map((r) => {
                  const color = CREDIT_TYPE_COLORS[r.transactionType] ?? "#64748b"
                  const isNegative = r.transactionType === "used" || r.amount < 0
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(r.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{r.customer.name}</div>
                        <div className="text-xs text-muted-foreground">{r.customer.phone}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-medium"
                          style={{ background: color + "22", color }}
                        >
                          {CREDIT_TYPE_LABELS[r.transactionType] ?? r.transactionType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                        <span className={isNegative ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                          {isNegative ? "−" : "+"}
                          {formatRials(Math.abs(r.amount))}
                        </span>
                        {" "}
                        <span className="text-muted-foreground">تومان</span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.referrerCustomerName ? (
                          <div>
                            <div className="font-medium text-foreground">{r.referrerCustomerName}</div>
                            {r.referrerCustomerPhone && (
                              <div className="text-muted-foreground" dir="ltr">{r.referrerCustomerPhone}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.relatedProject ? (
                          <div>
                            {r.relatedProject.contractNumber && (
                              <div className="font-medium text-foreground" dir="ltr">
                                {r.relatedProject.contractNumber}
                              </div>
                            )}
                            {r.relatedProject.packageTitle && (
                              <div className="text-muted-foreground">{r.relatedProject.packageTitle}</div>
                            )}
                          </div>
                        ) : r.relatedContract ? (
                          <span dir="ltr">{r.relatedContract.contractNumber}</span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[240px]">
                        {r.note || "—"}
                      </TableCell>
                      <TableCell>
                        {r.isSettled ? (
                          <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/5 text-[10px] text-emerald-700 dark:text-emerald-400">
                            <Check className="h-3 w-3" />
                            تسویه شده
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-400">
                            <Clock className="ml-0.5 h-3 w-3" />
                            باز
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.createdBy?.name ?? "—"}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {rows.length > PAGE_SIZE && (
        <Pagination dir="rtl" className="justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={() => setPage(Math.max(1, currentPage - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <PaginationItem><PaginationEllipsis /></PaginationItem>
                  )}
                  <PaginationItem>
                    <PaginationLink isActive={p === currentPage} onClick={() => setPage(p)} className="cursor-pointer">
                      {toPersianDigits(p)}
                    </PaginationLink>
                  </PaginationItem>
                </React.Fragment>
              ))}
            <PaginationItem>
              <PaginationNext onClick={() => setPage(Math.min(totalPages, currentPage + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <CreditAdjustDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        onDone={() => { qc.invalidateQueries({ queryKey: ["credit-transactions"] }) }}
      />
    </div>
  )
}

// --- Manual credit adjustment (add/subtract) dialog ---
function CreditAdjustDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onDone: () => void
}) {
  const api = useApi()
  const [customerId, setCustomerId] = React.useState<string | null>(null)
  const [direction, setDirection] = React.useState<"add" | "subtract">("add")
  const [amountToman, setAmountToman] = React.useState(0)
  const [note, setNote] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setCustomerId(null)
      setDirection("add")
      setAmountToman(0)
      setNote("")
    }
  }, [open])

  const submit = async () => {
    if (!customerId) {
      toast.error("لطفاً یک مشتری انتخاب کنید")
      return
    }
    if (!amountToman || amountToman <= 0) {
      toast.error("مبلغ باید بزرگتر از ۰ باشد")
      return
    }
    // amount is in Toman; API expects Rials. Negative for subtract.
    const amountRials = tomanToRials(amountToman) * (direction === "add" ? 1 : -1)
    setSubmitting(true)
    try {
      await api.post(`/api/customers/${customerId}/credit-transactions`, {
        amount: amountRials,
        transactionType: "manual_adjustment",
        note: note.trim() || undefined,
      })
      toast.success(direction === "add" ? "اعتبار افزایش یافت" : "اعتبار کسر شد")
      onDone()
      onOpenChange(false)
    } catch {
      toast.error("ذخیره تراکنش اعتباری ناموفق بود")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>افزایش / کسر اعتبار</DialogTitle>
          <DialogDescription>
            اعتبار یک مشتری را به‌صورت دستی افزایش یا کاهش دهید. مبلغ به تومان وارد می‌شود.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2" dir="rtl">
          <div className="space-y-1.5">
            <Label>مشتری</Label>
            <CustomerCombobox
              value={customerId}
              onChange={(id) => setCustomerId(id)}
              placeholder="انتخاب مشتری"
            />
          </div>

          <div className="space-y-1.5">
            <Label>نوع عملیات</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection("add")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors",
                  direction === "add"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-input bg-transparent hover:bg-accent/50"
                )}
              >
                <TrendingUp className="h-3.5 w-3.5" /> افزایش اعتبار
              </button>
              <button
                type="button"
                onClick={() => setDirection("subtract")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors",
                  direction === "subtract"
                    ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : "border-input bg-transparent hover:bg-accent/50"
                )}
              >
                <TrendingDown className="h-3.5 w-3.5" /> کسر اعتبار
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>مبلغ (تومان)</Label>
            <TomanInput
              value={amountToman}
              onValueChange={setAmountToman}
              placeholder="مثلاً ۵۰۰٬۰۰۰"
            />
          </div>

          <div className="space-y-1.5">
            <Label>یادداشت (اختیاری)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="دلیل تنظیم دستی اعتبار…"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>انصراف</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "در حال ذخیره…" : direction === "add" ? "افزایش اعتبار" : "کسر اعتبار"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Shared small components
// ============================================================
function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>
}

function DateRangeFromTo({
  from,
  to,
  setFrom,
  setTo,
}: {
  from: string
  to: string
  setFrom: (v: string) => void
  setTo: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-[150px]">
        <JalaliDatePicker
          value={from || null}
          onChange={(iso) => setFrom(iso ?? "")}
          placeholder="از تاریخ"
          className="text-xs"
        />
      </div>
      <span className="text-xs text-muted-foreground">→</span>
      <div className="w-[150px]">
        <JalaliDatePicker
          value={to || null}
          onChange={(iso) => setTo(iso ?? "")}
          placeholder="تا تاریخ"
          className="text-xs"
        />
      </div>
      {(from || to) && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          onClick={() => { setFrom(""); setTo("") }}
          title="پاک کردن تاریخ"
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  )
}

// ============================================================
// Helpers
// ============================================================

/** Convert a "YYYY-MM" Jalali period string to a human-readable label. */
function periodLabel(period: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period)
  if (!m) return period
  const y = Number(m[1])
  const mo = Number(m[2])
  if (mo < 1 || mo > 12) return period
  return `${JALALI_MONTHS[mo - 1]} ${toPersianDigits(y)}`
}

/**
 * Format a Date as `YYYY/MM/DD - HH:MM` in Jalali (Persian digits).
 * Used in the payments list to show both the date and the time the
 * payment was recorded.
 */
function formatPaymentDateAndTime(d: Date | string | null | undefined): string {
  if (!d) return "—"
  const date = new Date(d)
  const { jy, jm, jd } = toJalali(date)
  const yyyy = toPersianDigits(String(jy))
  const mm = toPersianDigits(String(jm).padStart(2, "0"))
  const dd = toPersianDigits(String(jd).padStart(2, "0"))
  const h = toPersianDigits(String(date.getHours()).padStart(2, "0"))
  const min = toPersianDigits(String(date.getMinutes()).padStart(2, "0"))
  return `${yyyy}/${mm}/${dd} - ${h}:${min}`
}

