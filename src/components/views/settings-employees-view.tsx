"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Users, Calculator, Award, ShieldCheck, KeyRound, History, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

import { useApi } from "@/lib/api/client"
import { useWorkspace } from "@/stores/workspace"
import {
  ROLES,
  ROLE_LABELS,
  ROLE_BADGE_COLORS,
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  DEFAULT_ROLE_PERMISSIONS,
  hasPermission,
  migrateRole,
  type Role,
  type PermissionKey,
} from "@/lib/constants"
import { formatRials, formatRialsShort, toPersianDigits, formatDate, formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

import { PageHeader, EmptyState, SectionCard, StatCard } from "./_shared"
import { TomanInput } from "./_toman-input"
import { JalaliDatePicker } from "./_jalali-date-picker/jalali-date-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
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

// ============================================================
// Types
// ============================================================
interface Employee {
  id: string
  phone: string
  firstName: string
  lastName: string
  email: string | null
  role: string
  secondaryRoles: string[]
  isAvailable: boolean
  autoCalcSalary: boolean
  cardNumber: string | null
  iban: string | null
  bankName: string | null
  instagramId: string | null
  birthDate: string | null
  weddingDate: string | null
  personalMeta: string
  // Raw per-user permission overrides JSON string (default "{}").
  permissions: string
  createdAt: string
}

interface SalaryRule {
  id: string
  role: string
  commissionType: string // percent | fixed_per_project
  commissionValue: number
  applyOn: string // field_work | studio_work | delivery
  isActive: boolean
}

interface ManualSalaryEntry {
  id: string
  userId: string
  amount: number
  note: string
  createdAt: string
}

// ============================================================
// Permission categories — used by the Permissions tab matrix
// ============================================================
const PERMISSION_CATEGORIES: { title: string; keys: PermissionKey[] }[] = [
  { title: "داشبورد و تقویم", keys: ["dashboard", "calendar", "reports", "my_tasks", "messages"] },
  { title: "مشتریان", keys: ["customers", "customers_create", "customers_edit"] },
  { title: "پروژه‌ها", keys: ["projects", "projects_create", "projects_edit", "projects_workflow", "projects_financials"] },
  { title: "مالی", keys: ["finances", "finances_full"] },
  { title: "ابزارها", keys: ["qr_factory", "scanner"] },
  { title: "تنظیمات", keys: ["packages", "packages_manage", "tags", "print_photo_prices", "sms_templates", "custom_fields", "storage", "system"] },
  { title: "کارمندان", keys: ["employees", "employees_manage", "salary_rules"] },
]

// Three-state permission toggle state.
//   - "default"  → use role default (no override)
//   - "granted"  → explicit true override
//   - "revoked"  → explicit false override
type PermState = "default" | "granted" | "revoked"

// Studio-level role override row (from /api/role-permissions)
interface RolePermissionRow {
  id: string
  role: string
  permission: string
  granted: boolean
}

// Response shape from /api/users/[id]/permissions
interface UserPermissionProfile {
  userId: string
  role: string
  roleDefaults: Record<string, boolean>
  userOverrides: Record<string, boolean>
  effective: Record<string, boolean>
}

// ============================================================
// Main view
// ============================================================
export function SettingsEmployeesView() {
  const role = useWorkspace((s) => s.role)
  const canManage = hasPermission(role, "employees_manage")
  const [tab, setTab] = React.useState("employees")

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader
        title="کارمندان"
        icon="👥"
        description="مدیریت کارمندان، نقش‌ها، پاداش‌ها/جریمه‌ها و سطوح دسترسی"
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList dir="rtl">
          <TabsTrigger value="employees" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> کارمندان
          </TabsTrigger>
          {/* ✅ "قوانین حقوق" tab removed per spec — the SalaryRule model is
              kept in schema but no longer used. Rule-based salary calculation
              is now superseded by per-project + manual entries. */}
          <TabsTrigger value="manual-salary" className="gap-1.5">
            <Award className="h-3.5 w-3.5" /> پاداش و جریمه دستی
          </TabsTrigger>
          <TabsTrigger value="salary-history" className="gap-1.5">
            <History className="h-3.5 w-3.5" /> تاریخچه حقوق
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> سطوح دسترسی
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-4">
          <EmployeesTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="manual-salary" className="mt-4">
          <ManualSalaryTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="salary-history" className="mt-4">
          <SalaryHistoryTab />
        </TabsContent>
        <TabsContent value="permissions" className="mt-4">
          <PermissionsTab canManage={canManage} currentRole={migrateRole(role) as Role} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================
// Tab 1: Employees list + edit dialog
// ============================================================
function EmployeesTab({ canManage }: { canManage: boolean }) {
  const api = useApi()
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Employee | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Employee | null>(null)
  // Per-user permission dialog state
  const [permUser, setPermUser] = React.useState<Employee | null>(null)
  const [permDialogOpen, setPermDialogOpen] = React.useState(false)

  const { data, isLoading } = useQuery<Employee[]>({
    queryKey: ["users-employees"],
    queryFn: async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("nasim-session-token") : null
      const res = await fetch("/api/users", {
        credentials: "include",
        headers: { "x-demo-role": "admin", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      const d = await res.json()
      return Array.isArray(d) ? d : (d.items || [])
    },
  })

  const toggleAvailMut = useMutation({
    mutationFn: async (u: Employee) => {
      return api.patch(`/api/users/${u.id}`, { isAvailable: !u.isAvailable })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users-employees"] }),
    onError: () => toast.error("به‌روزرسانی ناموفق بود"),
  })

  const toggleAutoCalcMut = useMutation({
    mutationFn: async (u: Employee) => {
      return api.patch(`/api/users/${u.id}`, { autoCalcSalary: !u.autoCalcSalary })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users-employees"] }),
    onError: () => toast.error("به‌روزرسانی ناموفق بود"),
  })

  function editUser(u: Employee) {
    setEditing(u)
    setDialogOpen(true)
  }

  function newUser() {
    setEditing(null)
    setDialogOpen(true)
  }

  function editPermissions(u: Employee) {
    setPermUser(u)
    setPermDialogOpen(true)
  }

  return (
    <SectionCard
      title="لیست کارمندان"
      description="مدیریت کارمندان استودیو — نقش‌ها، مشخصات و تنظیمات حقوق"
      actions={
        canManage && (
          <Button size="sm" onClick={newUser}>
            <Plus className="ml-1.5 h-3.5 w-3.5" /> کارمند جدید
          </Button>
        )
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState icon="👥" title="هنوز کارمندی وجود ندارد" description="اولین کارمند را اضافه کنید." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((u) => {
            const roles = [u.role, ...(u.secondaryRoles || [])]
            return (
              <div
                key={u.id}
                className={cn(
                  "flex flex-col rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md",
                  !u.isAvailable && "opacity-60"
                )}
              >
                {/* Name + roles */}
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">
                      {u.firstName} {u.lastName}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground" dir="ltr">
                      {u.phone}
                    </div>
                  </div>
                  <Checkbox
                    checked={u.isAvailable}
                    onCheckedChange={() => toggleAvailMut.mutate(u)}
                    aria-label="در دسترس"
                    className="shrink-0"
                  />
                </div>

                {/* Role badges */}
                <div className="mb-3 flex flex-wrap gap-1">
                  {roles.map((r, i) => (
                    <Badge key={i} variant="outline" className="border-transparent text-[9px] bg-primary/10 text-primary">
                      {ROLE_LABELS[r as Role] ?? r}
                    </Badge>
                  ))}
                </div>

                {/* Bank info */}
                {(u.bankName || u.iban) && (
                  <div className="mb-2 text-[10px] text-muted-foreground">
                    {u.bankName && <div>بانک: {u.bankName}</div>}
                    {u.iban && <div dir="ltr">شبا: {u.iban}</div>}
                  </div>
                )}

                {/* Auto-calc salary toggle */}
                <div className="mt-auto flex items-center justify-between gap-2 border-t pt-2">
                  <div className="flex items-center gap-1.5">
                    <Calculator className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">محاسبه خودکار حقوق</span>
                  </div>
                  <Switch
                    checked={u.autoCalcSalary}
                    onCheckedChange={() => toggleAutoCalcMut.mutate(u)}
                    disabled={!canManage}
                    className="scale-75"
                  />
                </div>

                {/* Actions */}
                {canManage && (
                  <div className="mt-2 flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editUser(u)} aria-label="ویرایش">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 px-2 text-[11px]"
                      onClick={() => editPermissions(u)}
                      aria-label="ویرایش دسترسی"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      ویرایش دسترسی
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <EmployeeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />

      {/* Per-user permission dialog */}
      <UserPermissionDialog
        open={permDialogOpen}
        onOpenChange={setPermDialogOpen}
        user={permUser}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف کارمند؟</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف «{deleteTarget?.firstName} {deleteTarget?.lastName}» مطمئن هستید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionCard>
  )
}

// ============================================================
// Employee edit/create dialog
// ============================================================
function EmployeeDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Employee | null
}) {
  const api = useApi()
  const qc = useQueryClient()
  const isEdit = !!editing

  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState<string>("photographer")
  const [secondaryRoles, setSecondaryRoles] = React.useState<string[]>([])
  const [bankName, setBankName] = React.useState("")
  const [iban, setIban] = React.useState("")
  const [cardNumber, setCardNumber] = React.useState("")
  const [instagramId, setInstagramId] = React.useState("")
  const [birthDate, setBirthDate] = React.useState<string | null>(null)
  const [weddingDate, setWeddingDate] = React.useState<string | null>(null)
  const [isAvailable, setIsAvailable] = React.useState(true)
  const [autoCalcSalary, setAutoCalcSalary] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    if (editing) {
      setFirstName(editing.firstName)
      setLastName(editing.lastName)
      setPhone(editing.phone)
      setEmail(editing.email || "")
      setRole(editing.role)
      setSecondaryRoles(editing.secondaryRoles || [])
      setBankName(editing.bankName || "")
      setIban(editing.iban || "")
      setCardNumber(editing.cardNumber || "")
      setInstagramId(editing.instagramId || "")
      setBirthDate(editing.birthDate)
      setWeddingDate(editing.weddingDate)
      setIsAvailable(editing.isAvailable)
      setAutoCalcSalary(editing.autoCalcSalary)
    } else {
      setFirstName("")
      setLastName("")
      setPhone("")
      setEmail("")
      setRole("photographer")
      setSecondaryRoles([])
      setBankName("")
      setIban("")
      setCardNumber("")
      setInstagramId("")
      setBirthDate(null)
      setWeddingDate(null)
      setIsAvailable(true)
      setAutoCalcSalary(true)
    }
  }, [open, editing])

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      toast.error("نام، نام خانوادگی و شماره تلفن الزامی است")
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        role,
        secondaryRoles,
        bankName: bankName.trim() || null,
        iban: iban.trim() || null,
        cardNumber: cardNumber.trim() || null,
        instagramId: instagramId.trim() || null,
        birthDate: birthDate || null,
        weddingDate: weddingDate || null,
        isAvailable,
        autoCalcSalary,
      }
      if (isEdit && editing) {
        await api.patch(`/api/users/${editing.id}`, payload)
        toast.success("کارمند به‌روزرسانی شد")
      } else {
        await api.post("/api/users", payload)
        toast.success("کارمند ایجاد شد")
      }
      qc.invalidateQueries({ queryKey: ["users-employees"] })
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "ویرایش کارمند" : "کارمند جدید"}</DialogTitle>
          <DialogDescription>
            مشخصات کامل کارمند، نقش‌ها و اطلاعات بانکی
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>نام *</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="نام" />
          </div>
          <div className="space-y-1.5">
            <Label>نام خانوادگی *</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="نام خانوادگی" />
          </div>
          <div className="space-y-1.5">
            <Label>شماره تلفن *</Label>
            <Input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09120000000" className="text-left" />
          </div>
          <div className="space-y-1.5">
            <Label>ایمیل</Label>
            <Input dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className="text-left" />
          </div>
          <div className="space-y-1.5">
            <Label>نقش اصلی</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>آیدی اینستاگرام</Label>
            <div className="relative">
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
              <Input dir="ltr" value={instagramId} onChange={(e) => setInstagramId(e.target.value.replace(/[^a-zA-Z0-9._]/g, ""))} placeholder="instagram_id" className="pr-6 text-left" />
            </div>
          </div>
        </div>

        {/* Secondary roles */}
        <div className="space-y-2">
          <Label>نقش‌های اضافی (می‌تواند چند نقش داشته باشد)</Label>
          <div className="flex flex-wrap gap-2">
            {ROLES.filter((r) => r !== role).map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs hover:bg-muted">
                <Checkbox
                  checked={secondaryRoles.includes(r)}
                  onCheckedChange={(v) => {
                    if (v) setSecondaryRoles([...secondaryRoles, r])
                    else setSecondaryRoles(secondaryRoles.filter((x) => x !== r))
                  }}
                />
                {ROLE_LABELS[r]}
              </label>
            ))}
          </div>
        </div>

        {/* Bank info */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>نام بانک</Label>
            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="مثلاً ملت" />
          </div>
          <div className="space-y-1.5">
            <Label>شماره شبا (IBAN)</Label>
            <Input dir="ltr" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="IR..." className="text-left" />
          </div>
          <div className="space-y-1.5">
            <Label>شماره کارت</Label>
            <Input dir="ltr" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="6037..." className="text-left" />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>تاریخ تولد</Label>
            <JalaliDatePicker value={birthDate} onChange={setBirthDate} placeholder="انتخاب تاریخ" />
          </div>
          <div className="space-y-1.5">
            <Label>تاریخ ازدواج</Label>
            <JalaliDatePicker value={weddingDate} onChange={setWeddingDate} placeholder="انتخاب تاریخ" />
          </div>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2">
            <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
            <span className="text-xs">در دسترس</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <Switch checked={autoCalcSalary} onCheckedChange={setAutoCalcSalary} />
            <span className="text-xs">محاسبه خودکار حقوق</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>انصراف</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "در حال ذخیره..." : isEdit ? "ذخیره تغییرات" : "ایجاد کارمند"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Tab 2 REMOVED: Salary rules tab is no longer used.
// The SalaryRule model is kept in the Prisma schema for backward compatibility
// with existing rows and the GET/POST /api/salary-rules endpoints, but the
// tab itself has been removed from this view per spec. The rule-based
// auto-calculation is superseded by per-project + manual entries.
// ============================================================

// ============================================================
// Tab 3: Manual salary + rewards/penalties (پاداش و جریمه دستی)
// ============================================================
function ManualSalaryTab({ canManage }: { canManage: boolean }) {
  const api = useApi()
  const qc = useQueryClient()
  const [selectedUserId, setSelectedUserId] = React.useState<string>("")
  // ✅ "type" field: "bonus" (positive) | "penalty" (negative deduction)
  const [entryType, setEntryType] = React.useState<"bonus" | "penalty">("bonus")
  const [amount, setAmount] = React.useState("")
  const [note, setNote] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  const { data: users } = useQuery<Employee[]>({
    queryKey: ["users-employees"],
    queryFn: async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("nasim-session-token") : null
      const res = await fetch("/api/users", {
        credentials: "include",
        headers: { "x-demo-role": "admin", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      const d = await res.json()
      return Array.isArray(d) ? d : (d.items || [])
    },
  })

  const { data: salaries, isLoading } = useQuery<{ items: ManualSalaryEntry[] }>({
    queryKey: ["salaries-manual"],
    queryFn: () => api.get("/api/salaries"),
  })

  const submit = async () => {
    const toman = Number(amount.replace(/,/g, ""))
    if (!selectedUserId || !toman || toman <= 0) {
      toast.error("کارمند و مبلغ معتبر وارد کنید")
      return
    }
    if (!note.trim()) {
      toast.error("یادداشت الزامی است")
      return
    }
    setSubmitting(true)
    try {
      // ✅ POST /api/salaries with `type` field — the API signs the amount
      //    (penalty → negative) and sends an in-app notification to the employee.
      await api.post("/api/salaries", {
        userId: selectedUserId,
        amount: Math.round(toman * 10), // Rials
        note: note.trim(),
        type: entryType,
      })
      toast.success(entryType === "bonus" ? "پاداش ثبت شد" : "جریمه ثبت شد")
      qc.invalidateQueries({ queryKey: ["salaries-manual"] })
      qc.invalidateQueries({ queryKey: ["salary-history"] })
      setAmount("")
      setNote("")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ثبت ناموفق بود")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <SectionCard title="ثبت پاداش / جریمه دستی" description="مبلغ به تومان وارد می‌شود — برای کارمند پیامک/اعلان ارسال می‌شود">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>کارمند <span className="text-rose-500">*</span></Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger><SelectValue placeholder="انتخاب کارمند" /></SelectTrigger>
                <SelectContent>
                  {(users || []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({ROLE_LABELS[u.role as Role] ?? u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>مبلغ (تومان) <span className="text-rose-500">*</span></Label>
              <TomanInput
                value={Number(amount.replace(/,/g, "") || "0")}
                onValueChange={(v) => setAmount(String(v))}
                placeholder="مثلاً ۵۰۰٬۰۰۰"
              />
              {amount && Number(amount.replace(/,/g, "")) > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  {entryType === "penalty" ? "−" : "+"}
                  {toPersianDigits(Number(amount.replace(/,/g, "")).toLocaleString("fa-IR"))} تومان
                </p>
              )}
            </div>
          </div>

          {/* ✅ Operation type — bonus or penalty */}
          <div className="mt-3 space-y-1.5">
            <Label>نوع عملیات <span className="text-rose-500">*</span></Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEntryType("bonus")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors",
                  entryType === "bonus"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-input bg-transparent hover:bg-accent/50"
                )}
              >
                <Award className="h-3.5 w-3.5" /> پاداش
              </button>
              <button
                type="button"
                onClick={() => setEntryType("penalty")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors",
                  entryType === "penalty"
                    ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : "border-input bg-transparent hover:bg-accent/50"
                )}
              >
                <AlertCircle className="h-3.5 w-3.5" /> جریمه
              </button>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <Label>یادداشت <span className="text-rose-500">*</span></Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={entryType === "bonus" ? "مثلاً: پاداش پروژه عروسی سحر و رضا" : "مثلاً: جریمه تأخیر در تحویل پروژه"} />
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={submit} disabled={submitting || !selectedUserId || !amount || !note.trim()}>
              {submitting ? "در حال ذخیره..." : entryType === "bonus" ? "ثبت پاداش" : "ثبت جریمه"}
            </Button>
          </div>
        </SectionCard>
      )}

      <SectionCard title="تاریخچه حقوق‌های ثبت‌شده" description="لیست تمام پاداش‌ها، جریمه‌ها و پورسانت‌ها">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !salaries?.items?.length ? (
          <EmptyState icon="💰" title="هنوز حقوقی ثبت نشده" />
        ) : (
          <div className="overflow-x-auto">
            <Table dir="rtl">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">کارمند</TableHead>
                  <TableHead className="text-right">نوع</TableHead>
                  <TableHead className="text-right">مبلغ</TableHead>
                  <TableHead className="text-right">یادداشت</TableHead>
                  <TableHead className="text-right">تاریخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaries.items.map((s: any) => {
                  const u = (users || []).find((x) => x.id === s.userId)
                  const isPenalty = (s.manualType === "penalty") || (Number(s.amount) < 0)
                  return (
                    <TableRow key={s.id} className={cn((s as any).isSettled && "opacity-50")}>
                      <TableCell className="text-right text-sm">
                        {u ? `${u.firstName} ${u.lastName}` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={cn("text-[10px]", isPenalty ? "border-rose-300 text-rose-600 dark:border-rose-700 dark:text-rose-400" : "border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400")}>
                          {isPenalty ? "جریمه" : "پاداش"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {isPenalty ? "−" : ""}
                        {formatRialsShort(Math.abs(Number(s.amount)))} ت
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {s.note || "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString("fa-IR")}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ============================================================
// Tab 3b: Salary History — unified timeline (ProjectSalary + manual entries)
// ============================================================
interface SalaryHistoryItem {
  id: string
  source: "project_salary" | "salary_record"
  projectName: string
  amount: number // Rials (negative for penalties)
  description: string | null
  note: string | null
  tags: string[]
  date: string
  isSettled: boolean
  settledAt: string | null
  manualType?: string
  isPaid?: boolean
}

function SalaryHistoryTab() {
  const api = useApi()
  const qc = useQueryClient()
  const [selectedUserId, setSelectedUserId] = React.useState<string>("")

  const { data: users } = useQuery<Employee[]>({
    queryKey: ["users-employees"],
    queryFn: async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("nasim-session-token") : null
      const res = await fetch("/api/users", {
        credentials: "include",
        headers: { "x-demo-role": "admin", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      const d = await res.json()
      return Array.isArray(d) ? d : (d.items || [])
    },
  })

  const { data, isLoading } = useQuery<{ items: SalaryHistoryItem[] }>({
    queryKey: ["salary-history", selectedUserId],
    enabled: !!selectedUserId,
    queryFn: () => api.get(`/api/users/${selectedUserId}/salary-history`),
  })

  const settleMut = useMutation({
    mutationFn: async (item: SalaryHistoryItem) => {
      if (item.source === "project_salary") {
        // ProjectSalary → PATCH /api/projects/[id]/salaries/[salaryId]
        // We don't have the projectId on the client, but the route requires it.
        // The server allows the URL form `/api/projects/any/salaries/[salaryId]`
        // since we only need the salaryId. Use "any" as a sentinel.
        return api.patch(`/api/projects/any/salaries/${item.id}`, { isSettled: !item.isSettled })
      } else {
        // SalaryRecord → PATCH /api/salaries/[id]
        return api.patch(`/api/salaries/${item.id}`, { isSettled: !item.isSettled })
      }
    },
    onSuccess: () => {
      toast.success("وضعیت تسویه به‌روزرسانی شد")
      qc.invalidateQueries({ queryKey: ["salary-history", selectedUserId] })
    },
    onError: (e: Error) => toast.error(e.message || "به‌روزرسانی ناموفق بود"),
  })

  const items = data?.items ?? []

  return (
    <SectionCard
      title="تاریخچه حقوق"
      description="نمایش همه‌ی پاداش‌ها، جریمه‌ها و حقوق‌های پروژه‌ای هر کارمند با وضعیت تسویه"
    >
      <div className="mb-3 max-w-sm">
        <Label>انتخاب کارمند</Label>
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger><SelectValue placeholder="انتخاب کارمند" /></SelectTrigger>
          <SelectContent>
            {(users || []).map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.firstName} {u.lastName} ({ROLE_LABELS[u.role as Role] ?? u.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedUserId ? (
        <EmptyState icon="👤" title="یک کارمند را انتخاب کنید" description="برای مشاهده‌ی تاریخچه حقوق‌ها یک کارمند انتخاب کنید." />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon="💰" title="موردی وجود ندارد" description="این کارمند هنوز پاداش/جریمه/حقوق پروژه‌ای ندارد." />
      ) : (
        <div className="overflow-x-auto">
          <Table dir="rtl">
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">پروژه</TableHead>
                <TableHead className="text-right">نوع</TableHead>
                <TableHead className="text-right">مبلغ</TableHead>
                <TableHead className="text-right">توضیحات</TableHead>
                <TableHead className="text-right">تگ‌ها</TableHead>
                <TableHead className="text-right">تاریخ</TableHead>
                <TableHead className="text-right">وضعیت</TableHead>
                <TableHead className="text-right">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => {
                const isPenalty = it.source === "salary_record" && (it.manualType === "penalty" || it.amount < 0)
                const isBonus = it.source === "salary_record" && (it.manualType === "bonus" || (it.manualType !== "penalty" && it.amount > 0))
                const label = it.source === "project_salary"
                  ? "حقوق پروژه"
                  : isPenalty
                    ? "جریمه"
                    : isBonus
                      ? "پاداش"
                      : "حقوق دستی"
                return (
                  <TableRow key={`${it.source}-${it.id}`} className={cn(it.isSettled && "opacity-50")}>
                    <TableCell className="text-right text-sm">{it.projectName}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={cn("text-[10px]", isPenalty ? "border-rose-300 text-rose-600 dark:border-rose-700 dark:text-rose-400" : "border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400")}>
                        {label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm whitespace-nowrap">
                      {isPenalty ? "−" : ""}
                      {formatRials(Math.abs(it.amount))} <span className="text-muted-foreground">تومان</span>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground max-w-[200px] truncate">
                      {it.description || it.note || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap gap-1 justify-end">
                        {it.tags.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          it.tags.map((t, i) => (
                            <Badge key={i} variant="secondary" className="text-[9px]">{t}</Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(it.date)}
                    </TableCell>
                    <TableCell className="text-right">
                      {it.isSettled ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> تسویه شده
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-400">باز</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        disabled={settleMut.isPending}
                        onClick={() => settleMut.mutate(it)}
                      >
                        {it.isSettled ? "برداشتن تسویه" : "علامت‌گذاری تسویه"}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </SectionCard>
  )
}

// ============================================================
// Tab 4: Permissions matrix — role-level + per-user overrides
// ============================================================
function PermissionsTab({
  canManage,
  currentRole,
}: {
  canManage: boolean
  currentRole: Role
}) {
  const api = useApi()
  const qc = useQueryClient()

  // Default selection: the first technical role (photographer).
  const [selectedRole, setSelectedRole] = React.useState<Role>("photographer")

  // Per-user permission dialog state
  const [permUser, setPermUser] = React.useState<Employee | null>(null)
  const [permDialogOpen, setPermDialogOpen] = React.useState(false)

  // Studio-level role overrides fetched from /api/role-permissions.
  // Stored as a map: `${role}::${perm}` → boolean (granted).
  const { data: rolePermRows, isLoading: rolePermsLoading } = useQuery<RolePermissionRow[]>({
    queryKey: ["role-permissions"],
    queryFn: async () => {
      try {
        const d = await api.get<RolePermissionRow[]>("/api/role-permissions")
        return Array.isArray(d) ? d : []
      } catch {
        return []
      }
    },
  })

  // Pending role-level override changes for the currently selected role.
  // Key = permission, Value = "default" | "granted" | "revoked".
  // We only track diffs here; persisted rows from rolePermRows are merged on render.
  const [pendingRole, setPendingRole] = React.useState<Record<string, PermState>>({})
  const [saving, setSaving] = React.useState(false)

  // Reset pending overrides whenever the selected role changes.
  React.useEffect(() => {
    setPendingRole({})
  }, [selectedRole])

  // Fetch users to display the per-user list (filtered by selected role).
  const { data: users } = useQuery<Employee[]>({
    queryKey: ["users-employees"],
    queryFn: async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("nasim-session-token") : null
      const res = await fetch("/api/users", {
        credentials: "include",
        headers: { "x-demo-role": "admin", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      const d = await res.json()
      return Array.isArray(d) ? d : (d.items || [])
    },
  })

  // Build a quick lookup map of persisted role overrides for the selected role.
  const persistedForRole = React.useMemo(() => {
    const map: Record<string, boolean> = {}
    for (const row of rolePermRows ?? []) {
      if (row.role === selectedRole) {
        map[row.permission] = row.granted
      }
    }
    return map
  }, [rolePermRows, selectedRole])

  // Resolve the current state for each permission in the role matrix.
  // Priority: pending → persisted → "default" (no override).
  function stateForPerm(perm: string): PermState {
    if (perm in pendingRole) return pendingRole[perm]
    if (perm in persistedForRole) {
      return persistedForRole[perm] ? "granted" : "revoked"
    }
    return "default"
  }

  // The role's default permission set (read-only baseline).
  const roleDefaultSet = DEFAULT_ROLE_PERMISSIONS[selectedRole] ?? new Set<PermissionKey>()

  // Compute the effective permission count for the summary.
  // effective = (default OR override true) AND NOT (override false)
  const { enabledCount, totalCount } = React.useMemo(() => {
    let enabled = 0
    const total = PERMISSION_KEYS.length
    for (const key of PERMISSION_KEYS) {
      const state = stateForPerm(key as string)
      let val: boolean
      if (state === "granted") val = true
      else if (state === "revoked") val = false
      else val = roleDefaultSet.has(key as PermissionKey)
      if (val) enabled += 1
    }
    return { enabledCount: enabled, totalCount: total }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRole, persistedForRole, roleDefaultSet])

  function setPermState(perm: string, state: PermState) {
    setPendingRole((prev) => ({ ...prev, [perm]: state }))
  }

  const hasPending = Object.keys(pendingRole).length > 0

  async function saveRole() {
    setSaving(true)
    try {
      // Send one PUT per pending change. All must succeed for the batch to count.
      const entries = Object.entries(pendingRole)
      await Promise.all(
        entries.map(([perm, state]) => {
          const granted = state === "granted"
          return api.put("/api/role-permissions", {
            role: selectedRole,
            permission: perm,
            granted,
          })
        })
      )
      toast.success("تغییرات دسترسی نقش ذخیره شد")
      setPendingRole({})
      qc.invalidateQueries({ queryKey: ["role-permissions"] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود")
    } finally {
      setSaving(false)
    }
  }

  const usersOfRole = (users ?? []).filter((u) => migrateRole(u.role) === selectedRole)

  function openUserPerm(u: Employee) {
    setPermUser(u)
    setPermDialogOpen(true)
  }

  // Only admins can edit role-level overrides; managers can still VIEW.
  const canEditRole = canManage && currentRole === "admin"

  return (
    <div className="space-y-4">
      <SectionCard
        title="ماتریس سطوح دسترسی نقش‌ها"
        description="تنظیم دسترسی‌های پیش‌فرض هر نقش — فقط مدیر کل می‌تواند این مقادیر را تغییر دهد."
        actions={
          <div className="flex items-center gap-2">
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="انتخاب نقش" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold",
                          ROLE_BADGE_COLORS[r]
                        )}
                      >
                        {ROLE_LABELS[r].charAt(0)}
                      </span>
                      {ROLE_LABELS[r]}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canEditRole && (
              <Button size="sm" onClick={saveRole} disabled={!hasPending || saving || rolePermsLoading}>
                <KeyRound className="ml-1.5 h-3.5 w-3.5" />
                {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
              </Button>
            )}
          </div>
        }
      >
        {/* Summary line */}
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs">
          <span className="text-muted-foreground">نقش انتخابی:</span>
          <Badge
            variant="outline"
            className={cn("border-transparent text-[10px]", ROLE_BADGE_COLORS[selectedRole])}
          >
            {ROLE_LABELS[selectedRole]}
          </Badge>
          <span className="text-muted-foreground">—</span>
          <span className="font-medium">
            {toPersianDigits(String(enabledCount))} از {toPersianDigits(String(totalCount))} دسترسی فعال
          </span>
          {hasPending && (
            <Badge variant="secondary" className="ml-auto text-[10px]">
              {toPersianDigits(String(Object.keys(pendingRole).length))} تغییر ذخیره نشده
            </Badge>
          )}
        </div>

        {rolePermsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {PERMISSION_CATEGORIES.map((cat) => (
              <PermissionCategoryBlock
                key={cat.title}
                title={cat.title}
                keys={cat.keys}
                roleDefaultSet={roleDefaultSet}
                stateForPerm={stateForPerm}
                onSetPerm={(perm, state) => setPermState(perm, state)}
                canEdit={canEditRole}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {/* Per-user override list for the selected role */}
      <SectionCard
        title={`کارمندان با نقش ${ROLE_LABELS[selectedRole]}`}
        description="برای هر کارمند می‌توانید استثنائات اختصاصی نسبت به پیش‌فرض نقش تعریف کنید."
      >
        {usersOfRole.length === 0 ? (
          <EmptyState
            icon="👤"
            title="کارمندی با این نقش یافت نشد"
            description="برای اضافه کردن کارمند به تب «کارمندان» بروید."
          />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {usersOfRole.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {u.firstName} {u.lastName}
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground" dir="ltr">
                    {u.phone}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 px-2 text-[11px]"
                  onClick={() => openUserPerm(u)}
                  disabled={!canManage}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  ویرایش دسترسی
                </Button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Reuse the same per-user permission dialog used in the Employees tab */}
      <UserPermissionDialog
        open={permDialogOpen}
        onOpenChange={setPermDialogOpen}
        user={permUser}
      />
    </div>
  )
}

// ------------------------------------------------------------
// A single category block in the role permission matrix
// ------------------------------------------------------------
function PermissionCategoryBlock({
  title,
  keys,
  roleDefaultSet,
  stateForPerm,
  onSetPerm,
  canEdit,
}: {
  title: string
  keys: PermissionKey[]
  roleDefaultSet: Set<PermissionKey>
  stateForPerm: (perm: string) => PermState
  onSetPerm: (perm: string, state: PermState) => void
  canEdit: boolean
}) {
  return (
    <div className="rounded-lg border bg-card/50 p-3">
      <div className="mb-2 text-xs font-semibold text-muted-foreground">{title}</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {keys.map((perm) => {
          const state = stateForPerm(perm)
          const defaultVal = roleDefaultSet.has(perm)
          // Effective value for display purposes.
          let effective: boolean
          if (state === "granted") effective = true
          else if (state === "revoked") effective = false
          else effective = defaultVal
          return (
            <PermissionMatrixRow
              key={perm}
              perm={perm}
              state={state}
              defaultVal={defaultVal}
              effective={effective}
              onSetState={(s) => onSetPerm(perm, s)}
              canEdit={canEdit}
            />
          )
        })}
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// A single permission row in the matrix (label + description + tri-state toggle)
// ------------------------------------------------------------
function PermissionMatrixRow({
  perm,
  state,
  defaultVal,
  effective,
  onSetState,
  canEdit,
}: {
  perm: PermissionKey
  state: PermState
  defaultVal: boolean
  effective: boolean
  onSetState: (s: PermState) => void
  canEdit: boolean
}) {
  const label = PERMISSION_LABELS[perm] ?? perm
  // Short description derived from the permission label.
  const desc = PERMISSION_DESCRIPTIONS[perm] ?? ""

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-background/60 px-2.5 py-2">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-medium">{label}</div>
        {desc && (
          <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{desc}</div>
        )}
        <div className="mt-0.5 text-[9px] text-muted-foreground">
          پیش‌فرض نقش: {defaultVal ? "فعال" : "غیرفعال"}
          {" • "}
          موثر: <span className={effective ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>{effective ? "فعال" : "غیرفعال"}</span>
        </div>
      </div>
      <PermTriStateToggle
        state={state}
        onChange={onSetState}
        disabled={!canEdit}
      />
    </div>
  )
}

// ------------------------------------------------------------
// Three-state toggle: ✅ Granted / ❌ Revoked / ⚪ Default
// ------------------------------------------------------------
function PermTriStateToggle({
  state,
  onChange,
  disabled,
}: {
  state: PermState
  onChange: (s: PermState) => void
  disabled?: boolean
}) {
  const triggerClass = cn(
    "flex h-7 w-7 items-center justify-center rounded-md border text-xs font-bold transition-colors",
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
    disabled && "cursor-not-allowed opacity-60",
    state === "granted" && "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    state === "revoked" && "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300",
    state === "default" && "border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
  )

  const icon = state === "granted" ? "✓" : state === "revoked" ? "✕" : "•"

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={triggerClass} disabled={disabled} aria-label="تغییر سطح دسترسی">
          {icon}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="center">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => onChange("default")}
            className={cn(
              "flex items-center gap-2 rounded px-2 py-1.5 text-right text-xs hover:bg-muted",
              state === "default" && "bg-muted font-medium"
            )}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded border border-slate-300 bg-slate-100 text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">•</span>
            پیش‌فرض نقش
          </button>
          <button
            type="button"
            onClick={() => onChange("granted")}
            className={cn(
              "flex items-center gap-2 rounded px-2 py-1.5 text-right text-xs hover:bg-muted",
              state === "granted" && "bg-muted font-medium"
            )}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded border border-emerald-300 bg-emerald-100 text-[10px] text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">✓</span>
            اعطا
          </button>
          <button
            type="button"
            onClick={() => onChange("revoked")}
            className={cn(
              "flex items-center gap-2 rounded px-2 py-1.5 text-right text-xs hover:bg-muted",
              state === "revoked" && "bg-muted font-medium"
            )}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded border border-rose-300 bg-rose-100 text-[10px] text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">✕</span>
            سلب
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Per-user permission dialog — opens from the employee card OR the
// per-user list in the Permissions tab.
// ============================================================
function UserPermissionDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  user: Employee | null
}) {
  const api = useApi()
  const qc = useQueryClient()

  // Effective permission profile fetched from /api/users/[id]/permissions.
  const { data, isLoading } = useQuery<UserPermissionProfile | null>({
    queryKey: ["user-permissions", user?.id],
    queryFn: async () => {
      if (!user) return null
      try {
        return await api.get<UserPermissionProfile>(`/api/users/${user.id}/permissions`)
      } catch {
        return null
      }
    },
    enabled: !!user && open,
  })

  // Pending per-user override state: perm → "default" | "granted" | "revoked".
  const [pending, setPending] = React.useState<Record<string, PermState>>({})
  const [saving, setSaving] = React.useState(false)

  // Reset pending whenever the dialog opens or the target user changes.
  React.useEffect(() => {
    if (open) setPending({})
  }, [open, user?.id])

  if (!user) return null

  // Capture into a `const` so TypeScript preserves the null-narrowing inside
  // the nested `saveUser` closure (function params behave like `let`).
  const targetUser: Employee = user
  const role = migrateRole(targetUser.role) as Role
  const roleDefaultSet = DEFAULT_ROLE_PERMISSIONS[role] ?? new Set<PermissionKey>()

  // Build the persisted override map from the server response.
  const persistedOverrides: Record<string, boolean> = data?.userOverrides ?? {}

  function stateForPerm(perm: string): PermState {
    if (perm in pending) return pending[perm]
    if (perm in persistedOverrides) {
      return persistedOverrides[perm] ? "granted" : "revoked"
    }
    return "default"
  }

  function setPermState(perm: string, state: PermState) {
    setPending((prev) => ({ ...prev, [perm]: state }))
  }

  const hasPending = Object.keys(pending).length > 0

  async function saveUser() {
    setSaving(true)
    try {
      // Convert pending states to the { permKey: boolean } shape the API expects.
      // Only "granted" and "revoked" are persisted; "default" entries are sent
      // as `false`-equivalent removals by NOT including them in the override map.
      // But since the API replaces the entire override set with what we send,
      // we need to merge persisted overrides with pending changes (so unchanged
      // persisted overrides aren't dropped).
      const merged: Record<string, boolean> = {}
      for (const key of Object.keys(persistedOverrides)) {
        merged[key] = persistedOverrides[key]
      }
      for (const [perm, state] of Object.entries(pending)) {
        if (state === "default") {
          // Clear the override (remove from map).
          delete merged[perm]
        } else if (state === "granted") {
          merged[perm] = true
        } else {
          merged[perm] = false
        }
      }
      await api.put(`/api/users/${targetUser.id}/permissions`, { overrides: merged })
      toast.success("دسترسی‌های کاربر ذخیره شد")
      setPending({})
      qc.invalidateQueries({ queryKey: ["user-permissions", targetUser.id] })
      qc.invalidateQueries({ queryKey: ["permissions", "me"] })
      qc.invalidateQueries({ queryKey: ["users-employees"] })
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره ناموفق بود")
    } finally {
      setSaving(false)
    }
  }

  const { enabledCount, totalCount } = (() => {
    let enabled = 0
    const total = PERMISSION_KEYS.length
    for (const key of PERMISSION_KEYS) {
      const state = stateForPerm(key as string)
      let val: boolean
      if (state === "granted") val = true
      else if (state === "revoked") val = false
      else val = roleDefaultSet.has(key as PermissionKey)
      if (val) enabled += 1
    }
    return { enabledCount: enabled, totalCount: total }
  })()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            ویرایش دسترسی: {targetUser.firstName} {targetUser.lastName}
          </DialogTitle>
          <DialogDescription>
            نقش پایه:{" "}
            <Badge
              variant="outline"
              className={cn("border-transparent text-[10px]", ROLE_BADGE_COLORS[role])}
            >
              {ROLE_LABELS[role]}
            </Badge>
            {" — "}
            استثنائات اختصاصی نسبت به پیش‌فرض نقش را اینجا تنظیم کنید.
          </DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs">
          <span className="text-muted-foreground">دسترسی‌های موثر:</span>
          <span className="font-medium">
            {toPersianDigits(String(enabledCount))} از {toPersianDigits(String(totalCount))}
          </span>
          {hasPending && (
            <Badge variant="secondary" className="ml-auto text-[10px]">
              {toPersianDigits(String(Object.keys(pending).length))} تغییر ذخیره نشده
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <ScrollArea className="max-h-[55vh] pr-2">
            <div className="space-y-4">
              {PERMISSION_CATEGORIES.map((cat) => (
                <div key={cat.title} className="rounded-lg border bg-card/40 p-3">
                  <div className="mb-2 text-xs font-semibold text-muted-foreground">{cat.title}</div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {cat.keys.map((perm) => {
                      const state = stateForPerm(perm)
                      const defaultVal = roleDefaultSet.has(perm)
                      let effective: boolean
                      if (state === "granted") effective = true
                      else if (state === "revoked") effective = false
                      else effective = defaultVal
                      return (
                        <PermissionMatrixRow
                          key={perm}
                          perm={perm}
                          state={state}
                          defaultVal={defaultVal}
                          effective={effective}
                          onSetState={(s) => setPermState(perm, s)}
                          canEdit
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            انصراف
          </Button>
          <Button onClick={saveUser} disabled={!hasPending || saving || isLoading}>
            {saving ? "در حال ذخیره..." : "ذخیره دسترسی‌ها"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Short Persian descriptions for each permission — used in the matrix
// ============================================================
const PERMISSION_DESCRIPTIONS: Record<PermissionKey, string> = {
  dashboard: "مشاهده صفحه داشبورد اصلی",
  calendar: "مشاهده تقویم استودیو",
  reports: "مشاهده گزارش‌ها و آمار",
  customers: "مشاهده لیست مشتریان",
  customers_create: "ایجاد مشتری جدید",
  customers_edit: "ویرایش اطلاعات مشتری",
  projects: "مشاهده پروژه‌ها",
  projects_create: "ایجاد پروژه جدید",
  projects_edit: "ویرایش پروژه",
  projects_workflow: "تغییر وضعیت گردش کار پروژه",
  projects_financials: "مشاهده اطلاعات مالی پروژه",
  my_tasks: "مشاهده کارهای اختصاص‌داده‌شده به من",
  messages: "استفاده از پیام‌رسان داخلی",
  finances: "مشاهده بخش مالی",
  finances_full: "مشاهده هزینه‌ها و گزارش‌های مالی کامل",
  qr_factory: "استفاده از کارخانه QR",
  scanner: "استفاده از اسکنر",
  packages: "مشاهده پکیج‌ها",
  packages_manage: "ایجاد و ویرایش پکیج‌ها",
  tags: "مدیریت تگ‌ها",
  print_photo_prices: "مدیریت قیمت عکس چاپی",
  employees: "مشاهده لیست کارمندان",
  employees_manage: "مدیریت کارمندان و ویرایش مشخصات",
  salary_rules: "مدیریت قوانین حقوق",
  sms_templates: "مدیریت قالب‌های پیامک",
  custom_fields: "مدیریت فیلدهای سفارشی",
  system: "تنظیمات سیستم",
  storage: "مدیریت فضای ذخیره‌سازی",
}

