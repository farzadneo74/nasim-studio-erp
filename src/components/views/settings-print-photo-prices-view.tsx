"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, Info, ImageIcon, Tag as TagIcon, Copy, Download, Upload } from "lucide-react"
import { toast } from "sonner"

import { useApi } from "@/lib/api/client"
import { useWorkspace } from "@/stores/workspace"
import {
  hasPermission,
  PHOTO_LOCATION_LABELS,
  PRIORITY_LABELS,
  PHOTO_PRIORITIES,
  type PhotoPriority,
} from "@/lib/constants"
import { formatRials, tomanToRials, toPersianDigits } from "@/lib/format"
import { cn } from "@/lib/utils"
import { authHeaders } from "@/lib/auth-context"

import { PageHeader, EmptyState, SectionCard } from "./_shared"
import { TomanInput } from "./_toman-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
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

type PhotoLocation = "studio" | "outdoor" | "customer"

interface PrintPhotoPrice {
  id: string
  size: string
  paperType: string
  laminateType: string
  photoLocation: PhotoLocation
  isFormal: boolean
  printOrder: string
  priority?: string
  price: number // Rials
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const PHOTO_LOCATION_OPTIONS: { value: PhotoLocation; label: string }[] = (
  Object.keys(PHOTO_LOCATION_LABELS) as PhotoLocation[]
).map((k) => ({ value: k, label: PHOTO_LOCATION_LABELS[k] }))

const PHOTO_LOCATION_BADGE: Record<PhotoLocation, string> = {
  studio: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  outdoor: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  customer: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
}

// ✅ Laminate و paperType presets — قابل تنظیم توسط استودیو
const DEFAULT_PAPER_PRESETS = ["مات", "براق"]
const DEFAULT_LAMINATE_PRESETS = [
  { value: "none", label: "بدون لمینت" },
  { value: "glossy", label: "براق" },
  { value: "matte", label: "مات" },
]

const PRIORITY_BADGE: Record<PhotoPriority, string> = {
  normal: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400",
  formal: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
}

interface FormState {
  size: string
  paperType: string
  paperTypeSelect: string // preset or "__custom__"
  paperTypeCustom: string
  laminateType: string
  laminateSelect: string // preset or "__custom__"
  laminateCustom: string
  photoLocation: PhotoLocation
  printOrder: string
  priority: PhotoPriority
  price: number // Toman
  isActive: boolean
}

const CUSTOM = "__custom__"

const EMPTY_FORM: FormState = {
  size: "",
  paperType: "",
  paperTypeSelect: "مات",
  paperTypeCustom: "",
  laminateType: "none",
  laminateSelect: "none",
  laminateCustom: "",
  photoLocation: "studio",
  printOrder: "none",
  priority: "normal",
  price: 0,
  isActive: true,
}

function resolvePaperType(form: FormState): string {
  if (form.paperTypeSelect === CUSTOM) {
    const v = form.paperTypeCustom.trim()
    return v === "" ? "مات" : v
  }
  return form.paperTypeSelect
}

function resolveLaminate(form: FormState): string {
  if (form.laminateSelect === CUSTOM) {
    const v = form.laminateCustom.trim()
    return v === "" ? "none" : v
  }
  return form.laminateSelect
}

function laminateDisplay(value: string): string {
  if (value === "none" || value === "") return "بدون لمینت"
  const preset = DEFAULT_LAMINATE_PRESETS.find((p) => p.value === value)
  return preset ? preset.label : value
}

function rialsToTomanNumber(rials: number): number {
  return Math.round(rials / 10)
}

export function SettingsPrintPhotoPricesView() {
  const role = useWorkspace((s) => s.role)
  const canManage = hasPermission(role, "print_photo_prices")
  const api = useApi()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<PrintPhotoPrice[]>({
    queryKey: ["print-photo-prices"],
    queryFn: () => api.get("/api/print-photo-prices"),
  })

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<PrintPhotoPrice | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = React.useState<PrintPhotoPrice | null>(null)

  const saveMut = useMutation({
    mutationFn: async () => {
      const size = form.size.trim()
      if (!size) throw new Error("اندازه را وارد کنید")
      const paperType = resolvePaperType(form)
      if (!paperType) throw new Error("جنس کاغذ را وارد کنید")
      if (form.price <= 0) throw new Error("قیمت باید بزرگتر از صفر باشد")

      const payload = {
        size,
        paperType,
        laminateType: resolveLaminate(form),
        photoLocation: form.photoLocation,
        // ✅ isFormal removed from dialog — derive from priority for backward-compat
        isFormal: form.priority === "formal",
        printOrder: form.printOrder,
        priority: form.priority,
        price: tomanToRials(form.price),
        isActive: form.isActive,
      }

      const headers = authHeaders({ "Content-Type": "application/json" })
      const res = await fetch(
        editing ? `/api/print-photo-prices/${editing.id}` : "/api/print-photo-prices",
        {
          method: editing ? "PATCH" : "POST",
          headers,
          body: JSON.stringify(payload),
          credentials: "include",
        }
      )
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      }
      return d
    },
    onSuccess: () => {
      toast.success(editing ? "قیمت به‌روزرسانی شد" : "قیمت با موفقیت ایجاد شد")
      setDialogOpen(false)
      setEditing(null)
      setForm(EMPTY_FORM)
      qc.invalidateQueries({ queryKey: ["print-photo-prices"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleActiveMut = useMutation({
    mutationFn: async (r: PrintPhotoPrice) => {
      const headers = authHeaders({ "Content-Type": "application/json" })
      const res = await fetch(`/api/print-photo-prices/${r.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ isActive: !r.isActive }),
        credentials: "include",
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      }
      return d
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["print-photo-prices"] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const headers = authHeaders({})
      const res = await fetch(`/api/print-photo-prices/${id}`, {
        method: "DELETE",
        headers,
        credentials: "include",
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      }
      return d
    },
    onSuccess: () => {
      toast.success("قیمت با موفقیت حذف شد")
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ["print-photo-prices"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(r: PrintPhotoPrice) {
    setEditing(r)
    const paperPreset = DEFAULT_PAPER_PRESETS.find((p) => p === r.paperType)
    const laminatePreset = DEFAULT_LAMINATE_PRESETS.find((p) => p.value === r.laminateType)
    setForm({
      size: r.size,
      paperType: r.paperType,
      paperTypeSelect: paperPreset ? paperPreset : CUSTOM,
      paperTypeCustom: paperPreset ? "" : r.paperType,
      laminateType: r.laminateType,
      laminateSelect: laminatePreset ? laminatePreset.value : CUSTOM,
      laminateCustom: laminatePreset ? "" : r.laminateType,
      photoLocation: r.photoLocation,
      printOrder: r.printOrder,
      priority: (r.priority as PhotoPriority) || "normal",
      price: rialsToTomanNumber(r.price),
      isActive: r.isActive,
    })
    setDialogOpen(true)
  }

  // ✅ Duplicate: open dialog pre-filled with the price's values (no id) so user can tweak & save
  function openDuplicate(r: PrintPhotoPrice) {
    setEditing(null)
    const paperPreset = DEFAULT_PAPER_PRESETS.find((p) => p === r.paperType)
    const laminatePreset = DEFAULT_LAMINATE_PRESETS.find((p) => p.value === r.laminateType)
    setForm({
      size: r.size + " (کپی)",
      paperType: r.paperType,
      paperTypeSelect: paperPreset ? paperPreset : CUSTOM,
      paperTypeCustom: paperPreset ? "" : r.paperType,
      laminateType: r.laminateType,
      laminateSelect: laminatePreset ? laminatePreset.value : CUSTOM,
      laminateCustom: laminatePreset ? "" : r.laminateType,
      photoLocation: r.photoLocation,
      printOrder: r.printOrder,
      priority: (r.priority as PhotoPriority) || "normal",
      price: rialsToTomanNumber(r.price),
      isActive: r.isActive,
    })
    setDialogOpen(true)
  }

  // ✅ CSV export — generate CSV string and trigger download
  function exportCsv() {
    if (!data || data.length === 0) {
      toast.error("قیمتی برای خروجی وجود ندارد")
      return
    }
    const headers = ["size", "paperType", "laminateType", "photoLocation", "priority", "price", "printOrder", "isActive"]
    // ✅ Price in Toman (Rials ÷ 10) for human readability
    const rows = data.map((r) => [
      r.size,
      r.paperType,
      r.laminateType,
      r.photoLocation,
      (r.priority as PhotoPriority) || "normal",
      String(rialsToTomanNumber(r.price)),
      r.printOrder,
      r.isActive ? "true" : "false",
    ])
    // ✅ Escape values that contain commas/quotes/newlines (CSV-safe)
    const escapeCsv = (val: string) => {
      if (/[",\n\r]/.test(val)) return `"${val.replace(/"/g, '""')}"`
      return val
    }
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n")
    // ✅ Add BOM so Excel reads UTF-8 correctly
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `print-photo-prices-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`${toPersianDigits(data.length)} قیمت به CSV خروجی داده شد`)
  }

  // ✅ CSV import — file picker → parse → upsert by (size/paperType/laminateType/photoLocation)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const [importing, setImporting] = React.useState(false)

  async function importCsv(file: File) {
    setImporting(true)
    try {
      const text = await file.text()
      // Strip BOM if present
      const clean = text.replace(/^\uFEFF/, "")
      const lines = clean.split(/\r?\n/).filter((l) => l.trim())
      if (lines.length < 2) {
        toast.error("فایل CSV خالی یا فاقد داده است")
        return
      }

      // Simple CSV parser — handles quoted fields with commas/escaped quotes
      function parseLine(line: string): string[] {
        const out: string[] = []
        let cur = ""
        let inQuotes = false
        for (let i = 0; i < line.length; i++) {
          const c = line[i]
          if (inQuotes) {
            if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ }
            else if (c === '"') { inQuotes = false }
            else { cur += c }
          } else {
            if (c === '"') { inQuotes = true }
            else if (c === ",") { out.push(cur); cur = "" }
            else { cur += c }
          }
        }
        out.push(cur)
        return out
      }

      const headers = parseLine(lines[0]).map((h) => h.trim())
      const idx = (name: string) => headers.findIndex((h) => h.toLowerCase() === name.toLowerCase())
      const iSize = idx("size"), iPaper = idx("paperType"), iLam = idx("laminateType"), iLoc = idx("photoLocation")
      const iPriority = idx("priority"), iPrice = idx("price"), iPrint = idx("printOrder"), iActive = idx("isActive")
      if (iSize < 0 || iPaper < 0 || iLam < 0 || iLoc < 0 || iPrice < 0) {
        toast.error("ستون‌های الزامی (size, paperType, laminateType, photoLocation, price) در فایل یافت نشد")
        return
      }

      const headers_role = role
      let created = 0, updated = 0, errors = 0
      for (let i = 1; i < lines.length; i++) {
        const cols = parseLine(lines[i])
        const size = (cols[iSize] || "").trim()
        const paperType = (cols[iPaper] || "").trim()
        const laminateType = (cols[iLam] || "").trim() || "none"
        const photoLocation = (cols[iLoc] || "").trim()
        const priority = (iPriority >= 0 ? (cols[iPriority] || "").trim() : "normal") as PhotoPriority
        const priceToman = Number(iPrice >= 0 ? cols[iPrice] : "0")
        const printOrder = iPrint >= 0 ? (cols[iPrint] || "none").trim() : "none"
        const isActiveStr = iActive >= 0 ? (cols[iActive] || "").trim().toLowerCase() : "true"
        const isActive = isActiveStr !== "false" && isActiveStr !== "0" && isActiveStr !== "no"

        if (!size || !paperType || !photoLocation) { errors++; continue }
        if (!Number.isFinite(priceToman) || priceToman < 0) { errors++; continue }

        const payload = {
          size, paperType, laminateType, photoLocation,
          isFormal: priority === "formal",
          printOrder: ["none", "first", "second"].includes(printOrder) ? printOrder : "none",
          priority: priority === "formal" ? "formal" : "normal",
          price: tomanToRials(priceToman),
          isActive,
        }

        // Find existing by (size/paperType/laminateType/photoLocation)
        const existing = (data || []).find(
          (r) => r.size === size && r.paperType === paperType && r.laminateType === laminateType && r.photoLocation === photoLocation
        )
        try {
          const res = await fetch(
            existing ? `/api/print-photo-prices/${existing.id}` : "/api/print-photo-prices",
            {
              method: existing ? "PATCH" : "POST",
              headers: authHeaders({ "Content-Type": "application/json", "x-demo-role": headers_role }),
              body: JSON.stringify(payload),
              credentials: "include",
            }
          )
          if (res.ok) { existing ? updated++ : created++ } else { errors++ }
        } catch {
          errors++
        }
      }

      qc.invalidateQueries({ queryKey: ["print-photo-prices"] })
      toast.success(
        `ایمپورت انجام شد — ${toPersianDigits(created)} جدید، ${toPersianDigits(updated)} به‌روزرسانی، ${toPersianDigits(errors)} خطا`
      )
    } catch (e) {
      toast.error((e as Error).message || "ایمپورت ناموفق بود")
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div dir="rtl" className="overflow-x-hidden">
      <PageHeader
        title="قیمت عکس چاپی"
        icon="🖼️"
        description="تعریف قیمت هر عکس چاپی بر اساس اندازه، جنس کاغذ، لمینت، اولویت و محل عکاسی"
        actions={
          canManage && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" />
                افزودن قیمت جدید
              </Button>
              <Button variant="outline" onClick={exportCsv} disabled={!data || data.length === 0}>
                <Download className="mr-1.5 h-4 w-4" />
                خروجی Excel
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                {importing ? "در حال ایمپورت…" : "وارد کردن Excel"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) importCsv(f)
                }}
              />
            </div>
          )
        }
      />

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200/50 bg-amber-50/50 p-4 text-sm dark:border-amber-800/50 dark:bg-amber-950/20">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p className="text-muted-foreground">
          قیمت‌ها بر اساس <span className="font-medium">اندازه</span>،{" "}
          <span className="font-medium">جنس کاغذ</span>،{" "}
          <span className="font-medium">جنس لمینت</span>،{" "}
          <span className="font-medium">اولویت</span> و{" "}
          <span className="font-medium">محل عکاسی</span> تعریف می‌شوند. در صورت
          تغییر قیمت، پروژه‌های پرداخت‌نشده به‌صورت خودکار به‌روز می‌شوند.
        </p>
      </div>

      {/* ✅ Card-based layout — responsive, no horizontal scroll */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="🖼️"
          title="هنوز قیمی تعریف نشده است"
          description="برای شروع، یک قیمت جدید بر اساس اندازه، جنس کاغذ، لمینت، اولویت و محل عکاسی اضافه کنید."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((r) => (
            <PriceCard
              key={r.id}
              price={r}
              canManage={canManage}
              onEdit={() => openEdit(r)}
              onDuplicate={() => openDuplicate(r)}
              onDelete={() => setDeleteTarget(r)}
              onToggle={() => toggleActiveMut.mutate(r)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o)
          if (!o) {
            setEditing(null)
            setForm(EMPTY_FORM)
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "ویرایش قیمت" : "افزودن قیمت جدید"}</DialogTitle>
            <DialogDescription>
              قیمت یک عکس چاپی را بر اساس اندازه، جنس کاغذ، لمینت، اولویت و محل عکاسی تعریف کنید.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="ppp-size">اندازه</Label>
              <Input
                id="ppp-size"
                value={form.size}
                onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
                placeholder='مثلاً "10×15" یا "A4"'
                dir="ltr"
                className="text-left"
              />
            </div>

            {/* جنس کاغذ — selectable + custom */}
            <div className="sm:col-span-2">
              <Label>جنس کاغذ چاپی</Label>
              <Select
                value={form.paperTypeSelect}
                onValueChange={(v) => setForm((f) => ({ ...f, paperTypeSelect: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_PAPER_PRESETS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                  <SelectItem value={CUSTOM}>+ گزینه دلخواه</SelectItem>
                </SelectContent>
              </Select>
              {form.paperTypeSelect === CUSTOM && (
                <Input
                  className="mt-2"
                  value={form.paperTypeCustom}
                  onChange={(e) => setForm((f) => ({ ...f, paperTypeCustom: e.target.value }))}
                  placeholder="نام کاغذ دلخواه را وارد کنید"
                />
              )}
            </div>

            {/* جنس لمینت — selectable + custom */}
            <div className="sm:col-span-2">
              <Label>جنس لمینت</Label>
              <Select
                value={form.laminateSelect}
                onValueChange={(v) => setForm((f) => ({ ...f, laminateSelect: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_LAMINATE_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                  <SelectItem value={CUSTOM}>+ گزینه دلخواه</SelectItem>
                </SelectContent>
              </Select>
              {form.laminateSelect === CUSTOM && (
                <Input
                  className="mt-2"
                  value={form.laminateCustom}
                  onChange={(e) => setForm((f) => ({ ...f, laminateCustom: e.target.value }))}
                  placeholder="نام لمینت دلخواه را وارد کنید"
                />
              )}
            </div>

            <div>
              <Label>محل عکاسی</Label>
              <Select
                value={form.photoLocation}
                onValueChange={(v) => setForm((f) => ({ ...f, photoLocation: v as PhotoLocation }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHOTO_LOCATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ✅ اولویت: معمولی | سرمجلسی */}
            <div>
              <Label>اولویت</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm((f) => ({ ...f, priority: v as PhotoPriority }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHOTO_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="ppp-price">قیمت (تومان)</Label>
              <TomanInput
                id="ppp-price"
                value={form.price}
                onValueChange={(v) => setForm((f) => ({ ...f, price: v }))}
                placeholder="مبلغ به تومان"
              />
            </div>

            <div>
              <Label>چاپ</Label>
              <Select
                value={form.printOrder}
                onValueChange={(v) => setForm((f) => ({ ...f, printOrder: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  <SelectItem value="first">اول</SelectItem>
                  <SelectItem value="second">دوم</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch
                id="ppp-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
              <Label htmlFor="ppp-active" className="cursor-pointer">
                فعال
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              انصراف
            </Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending
                ? "در حال ذخیره…"
                : editing
                ? "ذخیره تغییرات"
                : "ایجاد قیمت"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف قیمت عکس چاپی؟</AlertDialogTitle>
            <AlertDialogDescription>
              این عملیات قیمت{" "}
              <strong>
                {deleteTarget ? `${deleteTarget.size} / ${deleteTarget.paperType}` : ""}
              </strong>{" "}
              را برای همیشه حذف می‌کند. قیمتی که در پروژه‌های چاپ عکس استفاده شده باشد قابل حذف نیست.
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

// ============== Price Card (مثل customers) ==============
function PriceCard({
  price,
  canManage,
  onEdit,
  onDuplicate,
  onDelete,
  onToggle,
}: {
  price: PrintPhotoPrice
  canManage: boolean
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const priority = (price.priority as PhotoPriority) || "normal"
  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all hover:shadow-md",
      !price.isActive && "opacity-60"
    )}>
      <CardContent className="p-4">
        {/* Header: size + priority */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-lg" dir="ltr">{price.size}</div>
              <div className="text-[10px] text-muted-foreground">اندازه</div>
            </div>
          </div>
          <Badge className={PRIORITY_BADGE[priority]} variant="outline">
            {PRIORITY_LABELS[priority]}
          </Badge>
        </div>

        {/* Info rows */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <TagIcon className="h-3.5 w-3.5" /> جنس کاغذ
            </span>
            <span className="font-medium">{price.paperType}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <TagIcon className="h-3.5 w-3.5" /> لمینت
            </span>
            <span className="font-medium">{laminateDisplay(price.laminateType)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">محل عکاسی</span>
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                PHOTO_LOCATION_BADGE[price.photoLocation as PhotoLocation]
              )}
            >
              {PHOTO_LOCATION_LABELS[price.photoLocation as PhotoLocation] || price.photoLocation}
            </span>
          </div>
          {price.printOrder !== "none" && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">چاپ</span>
              <span className="text-xs">{price.printOrder === "first" ? "اول" : "دوم"}</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="mt-3 rounded-lg bg-muted/50 p-2 text-center">
          <div className="text-lg font-bold tabular-nums">
            {formatRials(price.price)} تومان
          </div>
          <div className="text-[10px] text-muted-foreground">قیمت هر عکس</div>
        </div>

        {/* Actions */}
        {canManage && (
          <div className="mt-3 flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={price.isActive}
                onCheckedChange={onToggle}
                aria-label="تغییر وضعیت فعال"
              />
              <span className="text-[10px] text-muted-foreground">
                {price.isActive ? "فعال" : "غیرفعال"}
              </span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={onDuplicate} aria-label="کپی" title="ساخت کپی">
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onEdit} aria-label="ویرایش">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onDelete} aria-label="حذف">
                <Trash2 className="h-4 w-4 text-rose-500" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
