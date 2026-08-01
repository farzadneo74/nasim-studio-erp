"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, X, AlertCircle, Info, Copy } from "lucide-react"
import { toast } from "sonner"

import { useApi } from "@/lib/api/client"
import { useWorkspace } from "@/stores/workspace"
import {
  PACKAGE_CATEGORIES,
  PACKAGE_QUALITIES,
  PRICING_STRATEGIES,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  QUALITY_LABELS,
  PRICING_STRATEGY_LABELS,
  hasPermission,
  type PackageCategory,
  type PackageQuality,
  type PricingStrategy,
} from "@/lib/constants"
import { formatRials, tomanToRials } from "@/lib/format"
import { cn } from "@/lib/utils"

import { PageHeader, EmptyState, SectionCard } from "./_shared"
import { TomanInput } from "./_toman-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
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
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
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

interface Pkg {
  id: string
  title: string
  quality: string
  category: string
  basePrice: number
  currentPrice: number
  pricingStrategy: string
  defaultDescription: string | null
  defaultTasks: Array<string | { name: string; price: number }>
  defaultEquipment: Array<string | { name: string; price: number }>
  defaultReferralReward?: number // Rials (DB) — shown as Toman in UI
  isActive: boolean
}

// Legacy "fixed" strategy (from before the engine upgrade) is treated as
// "variable" everywhere in the UI. The new canonical "fixed" strategy is
// preserved as a first-class option.
function normalizeStrategy(s: string): PricingStrategy {
  if (s === "fixed" || s === "variable" || s === "delayed") return s as PricingStrategy
  return "variable"
}

function normalizeQuality(q: string): PackageQuality {
  if (q === "4k") return "4k"
  if (q === "none") return "none"
  return "fullhd"
}

function normalizeCategory(c: string): PackageCategory {
  return (PACKAGE_CATEGORIES as readonly string[]).includes(c)
    ? (c as PackageCategory)
    : "other"
}

// Quality badge colors — sky for FullHD, amber for 4K, slate for none.
const QUALITY_BADGE: Record<PackageQuality, string> = {
  fullhd: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  "4k": "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  none: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400",
}

const STRATEGY_BADGE: Record<PricingStrategy, string> = {
  fixed: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  variable: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  delayed: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
}

const STRATEGY_DESCRIPTIONS: Record<PricingStrategy, string> = {
  fixed: "قیمت در زمان ایجاد پروژه قفل می‌شود و هرگز با تغییر قیمت پکیج تغییر نمی‌کند",
  variable: "تغییر قیمت فوراً روی تمام پروژه‌های این پکیج اعمال می‌شود (مگر فریز شده یا ۷۰٪+ پرداخت شده باشد)",
  delayed: "تغییر قیمت بعد از وضعیت «آماده تحویل» و گذشت ۳۰ روز اعمال می‌شود",
}

interface TaskItem { name: string; price: number }
interface EquipmentItem { name: string; price: number }

interface FormState {
  title: string
  quality: PackageQuality
  category: PackageCategory
  pricingStrategy: PricingStrategy
  priceToman: number
  defaultReferralRewardToman: number
  defaultDescription: string
  defaultTasks: TaskItem[]
  defaultEquipment: EquipmentItem[]
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  title: "",
  quality: "fullhd",
  category: "photo",
  pricingStrategy: "variable",
  priceToman: 0,
  defaultReferralRewardToman: 0,
  defaultDescription: "",
  defaultTasks: [],
  defaultEquipment: [],
  isActive: true,
}

export function SettingsPackagesView() {
  const role = useWorkspace((s) => s.role)
  const canManage = hasPermission(role, "packages_manage")
  const api = useApi()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<Pkg[]>({
    queryKey: ["packages"],
    queryFn: () => api.get("/api/packages"),
  })

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Pkg | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = React.useState<Pkg | null>(null)

  // Filters
  const [filterQuality, setFilterQuality] = React.useState<string>("all")
  const [filterCategory, setFilterCategory] = React.useState<string>("all")
  const [filterStrategy, setFilterStrategy] = React.useState<string>("all")

  // Column visibility
  type ColKey = "title" | "category" | "strategy" | "price" | "active" | "actions"
  const [columns, setColumns] = React.useState<Record<ColKey, boolean>>({
    title: true,
    category: true,
    strategy: true,
    price: true,
    active: true,
    actions: true,
  })
  const [colPopoverOpen, setColPopoverOpen] = React.useState(false)

  // Apply filters
  const filteredData = React.useMemo(() => {
    if (!data) return []
    return data.filter((p) => {
      const q = normalizeQuality(p.quality)
      const c = normalizeCategory(p.category)
      const s = normalizeStrategy(p.pricingStrategy)
      if (filterQuality !== "all" && q !== filterQuality) return false
      if (filterCategory !== "all" && c !== filterCategory) return false
      if (filterStrategy !== "all" && s !== filterStrategy) return false
      return true
    })
  }, [data, filterQuality, filterCategory, filterStrategy])

  const hasFilters = filterQuality !== "all" || filterCategory !== "all" || filterStrategy !== "all"

  const saveMut = useMutation({
    mutationFn: async () => {
      const priceRials = tomanToRials(form.priceToman)
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        quality: form.quality,
        category: form.category,
        basePrice: priceRials,
        currentPrice: priceRials,
        defaultDescription: form.defaultDescription.trim() || undefined,
        defaultTasks: form.defaultTasks.filter((t) => t.name.trim().length > 0),
        defaultEquipment: form.defaultEquipment.filter((t) => t.name.trim().length > 0),
        // ✅ سود معرف پیش‌فرض — Toman ارسال می‌شود؛ API در داخل ×10 می‌کند تا Rials ذخیره شود.
        defaultReferralReward: Math.max(0, Number(form.defaultReferralRewardToman || 0)),
        isActive: form.isActive,
      }
      // ✅ pricingStrategy only sent on CREATE — the API silently ignores it on PATCH,
      // but we also omit it client-side so the request body stays clean.
      if (!editing) {
        payload.pricingStrategy = form.pricingStrategy
      }
      if (!payload.title) throw new Error("عنوان الزامی است")
      const currentPriceNum = Number(payload.currentPrice)
      if (!Number.isFinite(currentPriceNum) || currentPriceNum < 0) {
        throw new Error("قیمت پکیج باید عددی نامنفی باشد")
      }
      if (editing) {
        return mutateFn(`/api/packages/${editing.id}`, "PATCH", payload, role)
      }
      return mutateFn("/api/packages", "POST", payload, role)
    },
    onSuccess: () => {
      toast.success(editing ? "پکیج به‌روزرسانی شد" : "پکیج با موفقیت ایجاد شد")
      setDialogOpen(false)
      setEditing(null)
      setForm(EMPTY_FORM)
      qc.invalidateQueries({ queryKey: ["packages"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  // (placeholder for next edit hook)

  const toggleActiveMut = useMutation({
    mutationFn: (p: Pkg) =>
      mutateFn(`/api/packages/${p.id}`, "PATCH", { isActive: !p.isActive }, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["packages"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => mutateFn(`/api/packages/${id}`, "DELETE", undefined, role),
    onSuccess: () => {
      toast.success("پکیج با موفقیت حذف شد")
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ["packages"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })


  // ✅ Duplicate — opens the CREATE dialog pre-filled with the source package's data.
  // The pricingStrategy Select is enabled because `editing` is null (creating new, not editing).
  // After saving, editing the new package will show the strategy as disabled.
  function duplicatePackage(id: string) {
    const pkg = data?.find((p) => p.id === id)
    if (!pkg) {
      toast.error("پکیج یافت نشد")
      return
    }
    const priceToman = Math.round(Number(pkg.currentPrice) / 10)
    const refToman = Math.max(0, Math.round(Number(pkg.defaultReferralReward ?? 0) / 10))
    setEditing(null) // ✅ null = creating new → strategy Select is ENABLED
    setForm({
      title: pkg.title + " (کپی)",
      quality: normalizeQuality(pkg.quality),
      category: normalizeCategory(pkg.category),
      pricingStrategy: normalizeStrategy(pkg.pricingStrategy),
      priceToman,
      defaultReferralRewardToman: refToman,
      defaultDescription: pkg.defaultDescription || "",
      defaultTasks: (pkg.defaultTasks || []).map((t: any) => typeof t === "string" ? { name: t, price: 0 } : t),
      defaultEquipment: (pkg.defaultEquipment || []).map((t: any) => typeof t === "string" ? { name: t, price: 0 } : t),
      isActive: true,
    })
    setDialogOpen(true)
  }

  function editPkg(p: Pkg) {
    setEditing(p)
    // Prices stored in DB as Rials; TomanInput works in Toman (÷10).
    const toman = Math.round(Number(p.currentPrice) / 10)
    const refToman = Math.max(0, Math.round(Number(p.defaultReferralReward ?? 0) / 10))
    setForm({
      title: p.title,
      quality: normalizeQuality(p.quality),
      category: normalizeCategory(p.category),
      pricingStrategy: normalizeStrategy(p.pricingStrategy),
      priceToman: toman,
      defaultReferralRewardToman: refToman,
      defaultDescription: p.defaultDescription || "",
      defaultTasks: (p.defaultTasks || []).map((t: any) => typeof t === "string" ? { name: t, price: 0 } : t),
      defaultEquipment: (p.defaultEquipment || []).map((t: any) => typeof t === "string" ? { name: t, price: 0 } : t),
      isActive: p.isActive,
    })
    setDialogOpen(true)
  }

  if (!canManage) {
    return (
      <EmptyState
        icon="🔒"
        title="دسترسی محدود"
        description="فقط مدیران سیستم می‌توانند پکیج‌های خدمات را مدیریت کنند."
      />
    )
  }

  return (
    <div dir="rtl" className="space-y-6">
      <PageHeader
        title="پکیج‌ها"
        icon="📦"
        description="کاتالوگ خدمات و استراتژی‌های قیمت‌گذاری"
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setForm(EMPTY_FORM)
              setDialogOpen(true)
            }}
          >
            <Plus className="ml-1.5 h-4 w-4" />
            پکیج جدید
          </Button>
        }
      />

      <SectionCard
        title="کاتالوگ خدمات"
        description="استراتژی «ثابت» قیمت را در زمان ایجاد قفل می‌کند؛ «متغیر» قیمت جدید را فوراً اعمال می‌کند؛ «مهلت‌دار» بعد از ۳۰ روز از آماده تحویل."
      >
        {/* Filter toolbar — mobile responsive */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Select value={filterQuality} onValueChange={setFilterQuality}>
            <SelectTrigger className="h-9 w-full sm:w-[130px]"><SelectValue placeholder="کیفیت" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه کیفیت‌ها</SelectItem>
              <SelectItem value="fullhd">FullHD</SelectItem>
              <SelectItem value="4k">4K</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-9 w-full sm:w-[130px]"><SelectValue placeholder="دسته‌بندی" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه دسته‌ها</SelectItem>
              <SelectItem value="photo">عکس</SelectItem>
              <SelectItem value="video">فیلم</SelectItem>
              <SelectItem value="mix">مختلط</SelectItem>
              <SelectItem value="other">سایر</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStrategy} onValueChange={setFilterStrategy}>
            <SelectTrigger className="h-9 w-full sm:w-[140px]"><SelectValue placeholder="استراتژی" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه استراتژی‌ها</SelectItem>
              <SelectItem value="fixed">ثابت</SelectItem>
              <SelectItem value="variable">متغیر</SelectItem>
              <SelectItem value="delayed">مهلت‌دار</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="shrink-0 gap-1 text-xs" onClick={() => { setFilterQuality("all"); setFilterCategory("all"); setFilterStrategy("all") }}>
              <X className="size-3" /> پاک کردن
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon="📦"
            title="هنوز پکیجی وجود ندارد"
            description="برای شروع رزرو پروژه‌ها، اولین پکیج خدمات خود را ایجاد کنید."
          />
        ) : filteredData.length === 0 ? (
          <EmptyState icon="🔍" title="پکیجی با این فیلتر یافت نشد" description="فیلترها را تغییر دهید یا پاک کنید." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredData.map((p) => {
              const quality = normalizeQuality(p.quality)
              const category = normalizeCategory(p.category)
              const strategy = normalizeStrategy(p.pricingStrategy)
              return (
                <div
                  key={p.id}
                  className={cn(
                    "group flex flex-col rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md",
                    !p.isActive && "opacity-60"
                  )}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{p.title}</div>
                      {p.defaultDescription && (
                        <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                          {p.defaultDescription}
                        </div>
                      )}
                    </div>
                    <Checkbox
                      checked={p.isActive}
                      onCheckedChange={() => toggleActiveMut.mutate(p)}
                      aria-label="تغییر وضعیت فعال"
                      className="shrink-0"
                    />
                  </div>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    <Badge variant="outline" className={cn("border-transparent text-[9px]", QUALITY_BADGE[quality])}>
                      {QUALITY_LABELS[quality]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-transparent text-[9px]"
                      style={{ backgroundColor: CATEGORY_COLORS[category] + "22", color: CATEGORY_COLORS[category] }}
                    >
                      {CATEGORY_LABELS[category]}
                    </Badge>
                    <Badge variant="outline" className={cn("border-transparent text-[9px]", STRATEGY_BADGE[strategy])}>
                      {PRICING_STRATEGY_LABELS[strategy]}
                    </Badge>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 border-t pt-2">
                    <div className="min-w-0">
                      <div className="text-[10px] text-muted-foreground">قیمت</div>
                      <div className="text-base font-bold tabular-nums text-emerald-600">
                        {formatRials(p.currentPrice)} <span className="text-[10px] font-normal">تومان</span>
                      </div>
                      {Number(p.defaultReferralReward ?? 0) > 0 && (
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          سود معرف:{" "}
                          <span className="font-medium text-rose-600 dark:text-rose-400">
                            {formatRials(p.defaultReferralReward)} ت
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editPkg(p)} aria-label="ویرایش">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicatePackage(p.id)} aria-label="کپی" title="ساخت کپی">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:text-rose-600" onClick={() => setDeleteTarget(p)} aria-label="حذف">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      <PackageDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o)
          if (!o) {
            setEditing(null)
            setForm(EMPTY_FORM)
          }
        }}
        form={form}
        setForm={setForm}
        editing={!!editing}
        saving={saveMut.isPending}
        onSave={() => saveMut.mutate()}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف پکیج؟</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.title}</strong> برای همیشه حذف خواهد شد.
              پکیج‌هایی که دارای پروژه هستند قابل حذف نیستند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              className="bg-rose-600 hover:bg-rose-700"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function mutateFn(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body: unknown,
  role: string
) {
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json", "x-demo-role": role },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(
        (data as { error?: string })?.error || `Request failed (${res.status})`
      )
    }
    return data
  })
}

function PackageDialog({
  open,
  onOpenChange,
  form,
  setForm,
  editing,
  saving,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  editing: boolean
  saving: boolean
  onSave: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "ویرایش پکیج" : "پکیج جدید"}</DialogTitle>
          <DialogDescription>
            مدخل کاتالوگ خدمات، کیفیت خروجی، استراتژی قیمت‌گذاری و فهرست
            تسک‌ها/تجهیزاتی که به‌صورت خودکار در پروژه‌های جدید پر می‌شوند را
            پیکربندی کنید.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* 1. عنوان */}
          <div className="sm:col-span-2">
            <Label htmlFor="pkg-title">عنوان</Label>
            <Input
              id="pkg-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="مثلاً عروس پرمیوم (عکس+فیلم)"
            />
          </div>

          {/* 2. کیفیت */}
          <div>
            <Label>کیفیت</Label>
            <Select
              value={form.quality}
              onValueChange={(v) => setForm((f) => ({ ...f, quality: v as PackageQuality }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PACKAGE_QUALITIES.map((q) => (
                  <SelectItem key={q} value={q}>
                    {QUALITY_LABELS[q]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. دسته‌بندی */}
          <div>
            <Label>دسته‌بندی</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm((f) => ({ ...f, category: v as PackageCategory }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PACKAGE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 4. استراتژی قیمت */}
          <div className="sm:col-span-2">
            <Label>استراتژی قیمت</Label>
            <Select
              value={form.pricingStrategy}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, pricingStrategy: v as PricingStrategy }))
              }
              disabled={editing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRICING_STRATEGIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PRICING_STRATEGY_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{STRATEGY_DESCRIPTIONS[form.pricingStrategy]}</span>
            </div>
            {editing && (
              <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>استراتژی قیمت‌گذاری بعد از ایجاد قابل تغییر نیست.</span>
              </div>
            )}
          </div>

          {/* 5. قیمت پکیج */}
          <div className="sm:col-span-2">
            <Label htmlFor="pkg-price">قیمت پکیج (تومان)</Label>
            <TomanInput
              id="pkg-price"
              value={form.priceToman}
              onValueChange={(toman) => setForm((f) => ({ ...f, priceToman: toman }))}
              placeholder="مثلاً ۴۲٬۰۰۰٬۰۰۰"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              مبلغ به تومان وارد می‌شود و در پایگاه داده به ریال ذخیره می‌گردد.
            </p>
          </div>

          {/* 5b. سود معرف پیش‌فرض */}
          <div className="sm:col-span-2">
            <Label htmlFor="pkg-referral">سود معرف پیش‌فرض (تومان)</Label>
            <TomanInput
              id="pkg-referral"
              value={form.defaultReferralRewardToman}
              onValueChange={(toman) => setForm((f) => ({ ...f, defaultReferralRewardToman: toman }))}
              placeholder="مثلاً ۵۰۰٬۰۰۰"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              مبلغ ثابتی که به‌عنوان پاداش معرفی برای این پکیج در نظر گرفته می‌شود.
              در هر پروژه قابل override است. صفر = بدون پاداش.
            </p>
          </div>

          {/* 6. توضیحات پکیج */}
          <div className="sm:col-span-2">
            <Label htmlFor="pkg-desc">توضیحات پکیج</Label>
            <Textarea
              id="pkg-desc"
              rows={3}
              value={form.defaultDescription}
              onChange={(e) =>
                setForm((f) => ({ ...f, defaultDescription: e.target.value }))
              }
              placeholder="به‌صورت خودکار در توضیحات چاپی پروژه‌های جدید پر می‌شود."
            />
          </div>

          {/* 7. تسک‌های پکیج با قیمت */}
          <div className="sm:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <Label>تسک‌های پکیج <span className="text-[10px] text-muted-foreground">(قیمت‌ها راهنمایی است و به قیمت پکیج تأثیری ندارد)</span></Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((f) => ({ ...f, defaultTasks: [...f.defaultTasks, { name: "", price: 0 }] }))
                }
              >
                <Plus className="ml-1 h-3.5 w-3.5" />
                افزودن تسک
              </Button>
            </div>
            <div className="space-y-2">
              {form.defaultTasks.length === 0 && (
                <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                  هیچ تسکی وجود ندارد.
                </div>
              )}
              {form.defaultTasks.map((t, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={t.name}
                    onChange={(e) => {
                      const v = e.target.value
                      setForm((f) => {
                        const next = [...f.defaultTasks]
                        next[idx] = { ...next[idx], name: v }
                        return { ...f, defaultTasks: next }
                      })
                    }}
                    placeholder={`تسک ${idx + 1}`}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    dir="ltr"
                    value={t.price || ""}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 0
                      setForm((f) => {
                        const next = [...f.defaultTasks]
                        next[idx] = { ...next[idx], price: v }
                        return { ...f, defaultTasks: next }
                      })
                    }}
                    placeholder="قیمت (تومان)"
                    className="w-32 text-left text-xs"
                  />
                  <span className="shrink-0 text-[10px] text-muted-foreground">ت</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        defaultTasks: f.defaultTasks.filter((_, i) => i !== idx),
                      }))
                    }
                    aria-label="حذف تسک"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* 8. تجهیزات با قیمت */}
          <div className="sm:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <Label>تجهیزات <span className="text-[10px] text-muted-foreground">(قیمت‌ها راهنمایی است)</span></Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((f) => ({ ...f, defaultEquipment: [...f.defaultEquipment, { name: "", price: 0 }] }))
                }
              >
                <Plus className="ml-1 h-3.5 w-3.5" />
                افزودن تجهیز
              </Button>
            </div>
            <div className="space-y-2">
              {form.defaultEquipment.length === 0 && (
                <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                  هیچ تجهیزی وجود ندارد.
                </div>
              )}
              {form.defaultEquipment.map((t, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={t.name}
                    onChange={(e) => {
                      const v = e.target.value
                      setForm((f) => {
                        const next = [...f.defaultEquipment]
                        next[idx] = { ...next[idx], name: v }
                        return { ...f, defaultEquipment: next }
                      })
                    }}
                    placeholder={`مثلاً دوربین Canon R6`}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    dir="ltr"
                    value={t.price || ""}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 0
                      setForm((f) => {
                        const next = [...f.defaultEquipment]
                        next[idx] = { ...next[idx], price: v }
                        return { ...f, defaultEquipment: next }
                      })
                    }}
                    placeholder="قیمت (تومان)"
                    className="w-32 text-left text-xs"
                  />
                  <span className="shrink-0 text-[10px] text-muted-foreground">ت</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        defaultEquipment: f.defaultEquipment.filter((_, i) => i !== idx),
                      }))
                    }
                    aria-label="حذف تجهیز"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* 9. فعال */}
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
              <Checkbox
                id="pkg-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: Boolean(v) }))}
              />
              <Label htmlFor="pkg-active" className="cursor-pointer">
                فعال (برای پروژه‌های جدید)
              </Label>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            «ثابت»: قیمت پروژه در زمان ایجاد قفل می‌شود و هرگز تغییر نمی‌کند.
            «متغیر»: تغییر قیمت پکیج روی پروژه‌ها اعمال می‌شود (مگر فریز شده یا ۷۰٪+ پرداخت شده باشد).
            «مهلت‌دار»: فقط بعد از گذشت ۳۰ روز از وضعیت «آماده تحویل» قیمت به‌روزرسانی می‌شود.
            استراتژی بعد از ایجاد قابل تغییر نیست.
          </span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "در حال ذخیره…" : editing ? "ذخیره تغییرات" : "ایجاد پکیج"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

