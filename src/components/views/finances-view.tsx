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
} from "lucide-react"
import { useApi } from "@/lib/api/client"
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
    customer: { id: string; name: string }
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

interface SalaryRow {
  id: string
  userId: string
  amount: number
  isPaid: boolean
  period: string
  note: string | null
  paidAt: string | null
  createdAt: string
  user: { id: string; firstName: string; lastName: string; role: string; name: string }
  project: { id: string; customer: string; servicePackage: string }
  ruleUsed: {
    id: string
    role: string
    commissionType: string
    commissionValue: number
    applyOn: string
  }
}

interface CreditRow {
  id: string
  customerId: string
  amount: number
  transactionType: string
  note: string | null
  createdAt: string
  customer: { id: string; name: string; phone: string; creditBalance: number }
  relatedContract: { id: string; contractNumber: string } | null
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
const APPLY_ON_LABELS: Record<string, string> = {
  field_work: "کار میدانی",
  studio_work: "کار استودیو",
  delivery: "تحویل",
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
    <div>
      <PageHeader
        title="مالی"
        icon="💰"
        description="پرداخت‌ها، هزینه‌ها، حقوق‌ها و دفتر اعتبار"
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {dashLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              label="درآمد کل"
              value={`${formatRialsShort(kpis?.totalRevenue ?? 0)} تومان`}
              sub="پرداخت‌های تأییدشده"
              icon={<Wallet className="h-4 w-4" />}
              accent="#10b981"
            />
            <StatCard
              label="هزینه کل"
              value={`${formatRialsShort(kpis?.totalExpenses ?? 0)} تومان`}
              sub="همه دسته‌بندی‌ها"
              icon={<TrendingDown className="h-4 w-4" />}
              accent="#ef4444"
            />
            <StatCard
              label="سود خالص"
              value={`${formatRialsShort(kpis?.netProfit ?? 0)} تومان`}
              sub="درآمد − هزینه‌ها"
              icon={<TrendingUp className="h-4 w-4" />}
              accent={(kpis?.netProfit ?? 0) >= 0 ? "#0ea5e9" : "#f43f5e"}
            />
            <StatCard
              label="حقوق پرداخت‌نشده"
              value={`${formatRialsShort(kpis?.unpaidSalaries ?? 0)} تومان`}
              sub="در انتظار پرداخت"
              icon={<AlertCircle className="h-4 w-4" />}
              accent="#f59e0b"
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
              <Wallet className="h-3.5 w-3.5" /> دفتر اعتبار
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
        <Button className="gap-1.5 ml-auto" onClick={() => { setEditTarget(null); setDialogOpen(true) }}>
          <Plus className="h-3.5 w-3.5" /> ثبت پرداخت
        </Button>
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
                <TableHead className="w-[110px]">تاریخ</TableHead>
                <TableHead>پروژه</TableHead>
                <TableHead className="text-right">مبلغ</TableHead>
                <TableHead>نوع</TableHead>
                <TableHead>روش</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>یادداشت</TableHead>
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
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(p.datePaid)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{p.project.customer.name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {p.project.servicePackage.title}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                      {formatRials(p.amount)} <span className="text-muted-foreground">تومان</span>
                    </TableCell>
                    <TableCell>
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
                    <TableCell>
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
                    <TableCell>
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
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {p.note || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
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

function SalariesTab() {
  const api = useApi()
  const qc = useQueryClient()

  const [userId, setUserId] = React.useState<string>("all")
  const [isPaid, setIsPaid] = React.useState<string>("all")
  const [period, setPeriod] = React.useState<string>("all")
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")

  const [noteTarget, setNoteTarget] = React.useState<SalaryRow | null>(null)
  const [noteOpen, setNoteOpen] = React.useState(false)
  const [expandedUser, setExpandedUser] = React.useState<string | null>(null)

  const params = new URLSearchParams()
  if (userId !== "all") params.set("userId", userId)
  if (isPaid !== "all") params.set("isPaid", isPaid)
  if (period !== "all") params.set("period", period)
  if (from) params.set("from", from)
  if (to) params.set("to", to)

  const { data, isLoading } = useQuery({
    queryKey: ["salaries", userId, isPaid, period, from, to],
    queryFn: () => api.get<SalaryRow[]>(`/api/salaries?${params.toString()}`),
  })

  const markPaidMut = useMutation({
    mutationFn: (id: string) => api.patch(`/api/salaries/${id}`, { isPaid: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salaries"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
    onError: () => toast.error("علامت‌گذاری به‌عنوان پرداخت‌شده ناموفق بود"),
  })

  const markUnpaidMut = useMutation({
    mutationFn: (id: string) => api.patch(`/api/salaries/${id}`, { isPaid: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salaries"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
    onError: () => toast.error("برگرداندن وضعیت ناموفق بود"),
  })

  // Mark ALL unpaid records for a user as paid (sequential PATCH calls).
  const markAllPaidMut = useMutation({
    mutationFn: async (recordIds: string[]) => {
      for (const id of recordIds) {
        await api.patch(`/api/salaries/${id}`, { isPaid: true })
      }
    },
    onSuccess: (_data, recordIds) => {
      toast.success(
        `${toPersianDigits(recordIds.length)} رکورد به‌عنوان پرداخت‌شده علامت‌گذاری شد`
      )
      qc.invalidateQueries({ queryKey: ["salaries"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
    onError: () => toast.error("علامت‌گذاری به‌عنوان پرداخت‌شده ناموفق بود"),
  })

  // Mark ALL paid records for a user back to unpaid (reverse the bulk pay action).
  const markAllUnpaidMut = useMutation({
    mutationFn: async (recordIds: string[]) => {
      for (const id of recordIds) {
        await api.patch(`/api/salaries/${id}`, { isPaid: false })
      }
    },
    onSuccess: (_data, recordIds) => {
      toast.success(
        `${toPersianDigits(recordIds.length)} رکورد به پرداخت‌نشده برگردانده شد`
      )
      qc.invalidateQueries({ queryKey: ["salaries"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
    onError: () => toast.error("برگرداندن وضعیت ناموفق بود"),
  })

  const refreshMut = useMutation({
    mutationFn: () => api.post<{ created: number; period: string }>("/api/salaries/refresh"),
    onSuccess: (res) => {
      toast.success(
        `تازه‌سازی ماهانه انجام شد — ${toPersianDigits(res.created)} رکورد جدید برای ${periodLabel(res.period)} ساخته شد`
      )
      qc.invalidateQueries({ queryKey: ["salaries"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
    },
    onError: () => toast.error("تازه‌سازی ماهانه ناموفق بود"),
  })

  const rows = data ?? []
  const users = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; role: string }>()
    for (const r of rows) {
      if (!map.has(r.user.id)) {
        map.set(r.user.id, { id: r.user.id, name: r.user.name, role: r.user.role })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [rows])

  // Period options — derive from existing rows + current Jalali month (so the
  // user can always filter to the current month even if no records exist yet).
  const periodOptions = React.useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) {
      if (r.period) set.add(r.period)
    }
    // Always include the current Jalali month
    const t = toJalali(new Date())
    set.add(`${t.jy}-${String(t.jm).padStart(2, "0")}`)
    return Array.from(set).sort().reverse()
  }, [rows])

  // Aggregate rows per user (sum amounts, capture paid/unpaid counts + latest paidAt).
  const userAgg = React.useMemo(() => {
    const map = new Map<
      string,
      {
        user: { id: string; name: string; role: string }
        records: SalaryRow[]
        total: number
        unpaidTotal: number
        unpaidCount: number
        paidCount: number
        latestPaidAt: string | null
      }
    >()
    for (const r of rows) {
      const existing = map.get(r.user.id) ?? {
        user: { id: r.user.id, name: r.user.name, role: r.user.role },
        records: [] as SalaryRow[],
        total: 0,
        unpaidTotal: 0,
        unpaidCount: 0,
        paidCount: 0,
        latestPaidAt: null as string | null,
      }
      existing.records.push(r)
      existing.total += r.amount
      if (r.isPaid) {
        existing.paidCount += 1
        if (r.paidAt && (!existing.latestPaidAt || r.paidAt > existing.latestPaidAt)) {
          existing.latestPaidAt = r.paidAt
        }
      } else {
        existing.unpaidCount += 1
        existing.unpaidTotal += r.amount
      }
      map.set(r.user.id, existing)
    }
    return Array.from(map.values()).sort((a, b) => a.user.name.localeCompare(b.user.name))
  }, [rows])

  const unpaidTotal = rows.filter((r) => !r.isPaid).reduce((s, r) => s + r.amount, 0)

  // chart data: unpaid by user
  const chartData = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) {
      if (r.isPaid) continue
      map.set(r.user.name, (map.get(r.user.name) ?? 0) + r.amount)
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)
  }, [rows])

  const chartColors = ["#0ea5e9", "#a855f7", "#10b981", "#f59e0b", "#ec4899", "#64748b", "#22c55e", "#f43f5e"]

  return (
    <div className="space-y-4">
      <Toolbar>
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="کاربر" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه کاربران</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name} · {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={isPaid} onValueChange={setIsPaid}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="وضعیت" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه</SelectItem>
            <SelectItem value="false">پرداخت‌نشده</SelectItem>
            <SelectItem value="true">پرداخت‌شده</SelectItem>
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="دوره" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه دوره‌ها</SelectItem>
            {periodOptions.map((p) => (
              <SelectItem key={p} value={p}>{periodLabel(p)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DateRangeFromTo from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <Button
          variant="outline"
          className="gap-1.5 ml-auto"
          disabled={refreshMut.isPending}
          onClick={() => refreshMut.mutate()}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshMut.isPending && "animate-spin")} />
          تازه‌سازی ماهانه
        </Button>
      </Toolbar>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            مجموع پرداخت‌نشده
          </div>
          <div className="mt-1.5 text-2xl font-semibold tracking-tight">
            {formatRials(unpaidTotal)} <span className="text-sm text-muted-foreground">تومان</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {toPersianDigits(rows.filter((r) => !r.isPaid).length)} رکورد در انتظار پرداخت
          </div>
        </div>

        {chartData.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
              پرداخت‌نشده بر اساس کاربر
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
                <TableHead>کاربر</TableHead>
                <TableHead className="text-right">مجموع مبلغ</TableHead>
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
              ) : userAgg.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState icon="👷" title="رکورد حقوقی وجود ندارد" description="با دکمه «تازه‌سازی ماهانه»، رکوردهای پورسانت پروژه‌های تحویل‌شده این ماه را بسازید." />
                  </TableCell>
                </TableRow>
              ) : (
                userAgg.map((u) => {
                  const isExpanded = expandedUser === u.user.id
                  const unpaidIds = u.records.filter((r) => !r.isPaid).map((r) => r.id)
                  const paidIds = u.records.filter((r) => r.isPaid).map((r) => r.id)
                  const allPaid = u.unpaidCount === 0
                  return (
                    <React.Fragment key={u.user.id}>
                      <TableRow className="cursor-pointer hover:bg-accent/40" onClick={() => setExpandedUser(isExpanded ? null : u.user.id)}>
                        <TableCell className="text-center">
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
                          <span className="font-semibold">{formatRials(u.unpaidTotal)}</span>
                          <span className="text-muted-foreground"> تومان</span>
                          {u.paidCount > 0 && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              کل: {formatRials(u.total)} تومان
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {toPersianDigits(u.records.length)} رکورد
                          <div className="text-[10px] mt-0.5">
                            {toPersianDigits(u.unpaidCount)} پرداخت‌نشده · {toPersianDigits(u.paidCount)} پرداخت‌شده
                          </div>
                        </TableCell>
                        <TableCell>
                          {allPaid ? (
                            <div>
                              <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-500/15 text-emerald-600">
                                <CheckCircle2 className="h-3 w-3" /> پرداخت‌شده
                              </Badge>
                              {u.latestPaidAt && (
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  پرداخت شده در {formatDate(u.latestPaidAt)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-500/40">
                              <Clock className="h-3 w-3" /> در انتظار پرداخت
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            {allPaid ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700"
                                disabled={markAllUnpaidMut.isPending}
                                onClick={() => markAllUnpaidMut.mutate(paidIds)}
                              >
                                برگرداندن
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                disabled={markAllPaidMut.isPending || unpaidIds.length === 0}
                                onClick={() => markAllPaidMut.mutate(unpaidIds)}
                              >
                                <Check className="h-3.5 w-3.5" /> پرداخت شد
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
                              <div className="space-y-1.5">
                                {u.records.map((r) => (
                                  <div
                                    key={r.id}
                                    className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-xs"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="font-medium text-foreground text-sm">
                                        {r.project.customer} · {r.project.servicePackage}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground mt-0.5">
                                        {ROLE_LABELS[r.ruleUsed.role as keyof typeof ROLE_LABELS] ?? r.ruleUsed.role}
                                        {" · "}
                                        {r.ruleUsed.commissionType === "percent"
                                          ? `${toPersianDigits(r.ruleUsed.commissionValue)}٪`
                                          : `${formatRialsShort(r.ruleUsed.commissionValue)} تومان`}
                                        {" · "}
                                        {APPLY_ON_LABELS[r.ruleUsed.applyOn] ?? r.ruleUsed.applyOn}
                                        {r.period ? ` · ${periodLabel(r.period)}` : ""}
                                        {r.isPaid && r.paidAt ? ` · پرداخت شده در ${formatDate(r.paidAt)}` : ""}
                                      </div>
                                      {r.note && (
                                        <div className="text-[10px] text-muted-foreground mt-0.5">
                                          یادداشت: {r.note}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="font-mono text-sm">
                                        {formatRials(r.amount)} <span className="text-muted-foreground">تومان</span>
                                      </span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        aria-label="یادداشت"
                                        onClick={() => { setNoteTarget(r); setNoteOpen(true) }}
                                      >
                                        <StickyNote className="h-3.5 w-3.5" />
                                      </Button>
                                      {r.isPaid ? (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700"
                                          disabled={markUnpaidMut.isPending}
                                          onClick={() => markUnpaidMut.mutate(r.id)}
                                        >
                                          برگرداندن
                                        </Button>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 px-2 text-xs"
                                          disabled={markPaidMut.isPending}
                                          onClick={() => markPaidMut.mutate(r.id)}
                                        >
                                          <Check className="h-3.5 w-3.5" /> پرداخت
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
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

      <SalaryNoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        target={noteTarget}
        onDone={() => setNoteTarget(null)}
      />
    </div>
  )
}

function SalaryNoteDialog({
  open,
  onOpenChange,
  target,
  onDone,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  target: SalaryRow | null
  onDone: () => void
}) {
  const api = useApi()
  const qc = useQueryClient()
  const [note, setNote] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open && target) {
      setNote(target.note ?? "")
    }
  }, [open, target])

  const submit = async () => {
    if (!target) return
    setSaving(true)
    try {
      await api.patch(`/api/salaries/${target.id}`, { note: note.trim() || null })
      toast.success("یادداشت ذخیره شد")
      qc.invalidateQueries({ queryKey: ["salaries"] })
      onOpenChange(false)
      onDone()
    } catch {
      toast.error("ذخیره یادداشت ناموفق بود")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) onDone()
      }}
    >
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>یادداشت حقوق</DialogTitle>
          <DialogDescription>
            {target
              ? `${target.user.name} — ${target.project.customer}`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>یادداشت (اختیاری)</Label>
          <Textarea
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="مثلاً پرداخت در دو قسط، کسر بی‌کاری و غیره"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>انصراف</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "در حال ذخیره…" : "ذخیره یادداشت"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
                <TableHead>قرارداد مرتبط</TableHead>
                <TableHead>یادداشت</TableHead>
                <TableHead>ایجاد شده توسط</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
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
                      <TableCell className="text-xs text-muted-foreground">
                        {r.relatedContract ? r.relatedContract.contractNumber : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[240px]">
                        {r.note || "—"}
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
