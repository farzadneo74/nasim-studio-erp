"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, X, AlertCircle, Info } from "lucide-react"
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
  ROLE_PERMISSIONS,
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
  defaultTasks: string[]
  defaultEquipment: string[]
  isActive: boolean
}

// Legacy "fixed" strategy is treated as "variable" everywhere in the UI.
function normalizeStrategy(s: string): PricingStrategy {
  return s === "delayed" ? "delayed" : "variable"
}

function normalizeQuality(q: string): PackageQuality {
  return q === "4k" ? "4k" : "fullhd"
}

function normalizeCategory(c: string): PackageCategory {
  return (PACKAGE_CATEGORIES as readonly string[]).includes(c)
    ? (c as PackageCategory)
    : "other"
}

// Quality badge colors — sky for FullHD, amber for 4K (no indigo/blue primary).
const QUALITY_BADGE: Record<PackageQuality, string> = {
  fullhd: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  "4k": "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
}

const STRATEGY_BADGE: Record<PricingStrategy, string> = {
  variable: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  delayed: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
}

const STRATEGY_DESCRIPTIONS: Record<PricingStrategy, string> = {
  variable: "تغییر قیمت فوراً روی تمام پروژه‌های این پکیج اعمال می‌شود",
  delayed: "تغییر قیمت بعد از وضعیت «آماده تحویل» و گذشت ۳۰ روز اعمال می‌شود",
}

interface FormState {
  title: string
  quality: PackageQuality
  category: PackageCategory
  pricingStrategy: PricingStrategy
  priceToman: number
  defaultDescription: string
  defaultTasks: string[]
  defaultEquipment: string[]
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  title: "",
  quality: "fullhd",
  category: "photo",
  pricingStrategy: "variable",
  priceToman: 0,
  defaultDescription: "",
  defaultTasks: [],
  defaultEquipment: [],
  isActive: true,
}

export function SettingsPackagesView() {
  const role = useWorkspace((s) => s.role)
  const canManage = ROLE_PERMISSIONS[role]?.packages
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

  const saveMut = useMutation({
    mutationFn: async () => {
      const priceRials = tomanToRials(form.priceToman)
      const payload = {
        title: form.title.trim(),
        quality: form.quality,
        category: form.category,
        pricingStrategy: form.pricingStrategy,
        basePrice: priceRials,
        currentPrice: priceRials,
        defaultDescription: form.defaultDescription.trim() || undefined,
        defaultTasks: form.defaultTasks.filter((t) => t.trim().length > 0),
        defaultEquipment: form.defaultEquipment.filter((t) => t.trim().length > 0),
        isActive: form.isActive,
      }
      if (!payload.title) throw new Error("عنوان الزامی است")
      if (!Number.isFinite(payload.currentPrice) || payload.currentPrice < 0) {
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

  function editPkg(p: Pkg) {
    setEditing(p)
    // Prices stored in DB as Rials; TomanInput works in Toman (÷10).
    const toman = Math.round(Number(p.currentPrice) / 10)
    setForm({
      title: p.title,
      quality: normalizeQuality(p.quality),
      category: normalizeCategory(p.category),
      pricingStrategy: normalizeStrategy(p.pricingStrategy),
      priceToman: toman,
      defaultDescription: p.defaultDescription || "",
      defaultTasks: p.defaultTasks?.length ? p.defaultTasks : [],
      defaultEquipment: p.defaultEquipment?.length ? p.defaultEquipment : [],
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
        description="استراتژی «متغیر» قیمت را فوراً اعمال می‌کند؛ «مهلت‌دار» بعد از ۳۰ روز از آماده تحویل."
      >
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon="📦"
            title="هنوز پکیجی وجود ندارد"
            description="برای شروع رزرو پروژه‌ها، اولین پکیج خدمات خود را ایجاد کنید."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table dir="rtl">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[240px] text-right">عنوان</TableHead>
                  <TableHead className="text-right">دسته‌بندی</TableHead>
                  <TableHead className="text-right">استراتژی</TableHead>
                  <TableHead className="text-right">قیمت پکیج</TableHead>
                  <TableHead className="text-center">فعال</TableHead>
                  <TableHead className="text-center">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((p) => {
                  const quality = normalizeQuality(p.quality)
                  const category = normalizeCategory(p.category)
                  const strategy = normalizeStrategy(p.pricingStrategy)
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-right align-middle">
                        <div className="flex flex-wrap items-center justify-start gap-2">
                          <span className="font-medium">{p.title}</span>
                          <Badge
                            variant="outline"
                            className={cn("border-transparent", QUALITY_BADGE[quality])}
                          >
                            {QUALITY_LABELS[quality]}
                          </Badge>
                        </div>
                        {p.defaultDescription && (
                          <div className="line-clamp-1 max-w-md text-xs text-muted-foreground mt-1">
                            {p.defaultDescription}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <Badge
                          variant="outline"
                          className="border-transparent"
                          style={{
                            backgroundColor: CATEGORY_COLORS[category] + "22",
                            color: CATEGORY_COLORS[category],
                          }}
                        >
                          {CATEGORY_LABELS[category]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                            STRATEGY_BADGE[strategy]
                          )}
                        >
                          {PRICING_STRATEGY_LABELS[strategy]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right align-middle tabular-nums font-medium whitespace-nowrap">
                        {formatRials(p.currentPrice)} تومان
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={p.isActive}
                            onCheckedChange={() => toggleActiveMut.mutate(p)}
                            aria-label="تغییر وضعیت فعال"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editPkg(p)}
                            aria-label="ویرایش پکیج"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(p)}
                            aria-label="حذف پکیج"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
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

          {/* 7. تسک‌های پکیج */}
          <div className="sm:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <Label>تسک‌های پکیج</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((f) => ({ ...f, defaultTasks: [...f.defaultTasks, ""] }))
                }
              >
                <Plus className="ml-1 h-3.5 w-3.5" />
                افزودن تسک
              </Button>
            </div>
            <div className="space-y-2">
              {form.defaultTasks.length === 0 && (
                <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                  هیچ تسکی وجود ندارد. این تسک‌ها هنگام ایجاد پروژه از این پکیج، به‌صورت خودکار در کانبان پروژه پر می‌شوند.
                </div>
              )}
              {form.defaultTasks.map((t, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={t}
                    onChange={(e) => {
                      const v = e.target.value
                      setForm((f) => {
                        const next = [...f.defaultTasks]
                        next[idx] = v
                        return { ...f, defaultTasks: next }
                      })
                    }}
                    placeholder={`تسک ${idx + 1}`}
                  />
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

          {/* 8. تجهیزات */}
          <div className="sm:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <Label>تجهیزات</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((f) => ({ ...f, defaultEquipment: [...f.defaultEquipment, ""] }))
                }
              >
                <Plus className="ml-1 h-3.5 w-3.5" />
                افزودن تجهیز
              </Button>
            </div>
            <div className="space-y-2">
              {form.defaultEquipment.length === 0 && (
                <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                  هیچ تجهیزی وجود ندارد. این لیست به‌عنوان چک‌لیست تجهیزات پیشنهادی برای پروژه‌های جدید استفاده می‌شود.
                </div>
              )}
              {form.defaultEquipment.map((t, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={t}
                    onChange={(e) => {
                      const v = e.target.value
                      setForm((f) => {
                        const next = [...f.defaultEquipment]
                        next[idx] = v
                        return { ...f, defaultEquipment: next }
                      })
                    }}
                    placeholder={`مثلاً دوربین Canon R6، سه‌پایه، لنس ۵۰mm…`}
                  />
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
            استراتژی «متغیر» قیمت جدید را روی تمام پروژه‌های این پکیج اعمال
            می‌کند. استراتژی «مهلت‌دار» فقط بعد از گذشت ۳۰ روز از وضعیت
            «آماده تحویل» قیمت را به‌روزرسانی می‌کند.
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
