"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, Info } from "lucide-react"
import { toast } from "sonner"

import { useApi } from "@/lib/api/client"
import { useWorkspace } from "@/stores/workspace"
import { ROLE_PERMISSIONS, PHOTO_LOCATION_LABELS } from "@/lib/constants"
import { formatRials, tomanToRials } from "@/lib/format"
import { cn } from "@/lib/utils"

import { PageHeader, EmptyState, SectionCard } from "./_shared"
import { TomanInput } from "./_toman-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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

type PhotoLocation = "studio" | "outdoor" | "customer"

interface PrintPhotoPrice {
  id: string
  size: string
  paperType: string
  laminateType: string
  photoLocation: PhotoLocation
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

// Common laminate options (Persian). The Select also exposes "بدون لمینت" + "سفارشی…".
const LAMINATE_PRESETS: { value: string; label: string }[] = [
  { value: "none", label: "بدون لمینت" },
  { value: "مات", label: "مات" },
  { value: "براق", label: "براق" },
  { value: "مخمل", label: "مخمل" },
  { value: "سوپربراق", label: "سوپربراق" },
]
const LAMINATE_CUSTOM = "__custom__"

const LAMINATE_NONE_LABEL = "بدون لمینت"

interface FormState {
  size: string
  paperType: string
  laminateSelect: string // one of LAMINATE_PRESETS values or LAMINATE_CUSTOM
  laminateCustom: string // free text when LAMINATE_CUSTOM
  photoLocation: PhotoLocation
  price: number // Toman (input units)
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  size: "",
  paperType: "",
  laminateSelect: "none",
  laminateCustom: "",
  photoLocation: "studio",
  price: 0,
  isActive: true,
}

function resolveLaminate(form: FormState): string {
  if (form.laminateSelect === LAMINATE_CUSTOM) {
    const v = form.laminateCustom.trim()
    return v === "" ? "none" : v
  }
  return form.laminateSelect
}

function laminateDisplay(value: string): string {
  if (value === "none" || value === "") return LAMINATE_NONE_LABEL
  return value
}

function rialsToTomanNumber(rials: number): number {
  return Math.round(rials / 10)
}

export function SettingsPrintPhotoPricesView() {
  const role = useWorkspace((s) => s.role)
  const canManage = role === "admin" || role === "manager"
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
      const paperType = form.paperType.trim()
      if (!paperType) throw new Error("جنس کاغذ را وارد کنید")
      if (form.price <= 0) throw new Error("قیمت باید بزرگتر از صفر باشد")

      const payload = {
        size,
        paperType,
        laminateType: resolveLaminate(form),
        photoLocation: form.photoLocation,
        price: tomanToRials(form.price), // Toman → Rials
        isActive: form.isActive,
      }

      const res = await fetch(
        editing ? `/api/print-photo-prices/${editing.id}` : "/api/print-photo-prices",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", "x-demo-role": role },
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
      const res = await fetch(`/api/print-photo-prices/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": role },
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
      const res = await fetch(`/api/print-photo-prices/${id}`, {
        method: "DELETE",
        headers: { "x-demo-role": role },
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
    // Decide if the stored laminate matches a preset; otherwise mark as custom.
    const preset = LAMINATE_PRESETS.find((p) => p.value === r.laminateType)
    setForm({
      size: r.size,
      paperType: r.paperType,
      laminateSelect: preset ? preset.value : LAMINATE_CUSTOM,
      laminateCustom: preset ? "" : r.laminateType,
      photoLocation: r.photoLocation,
      price: rialsToTomanNumber(r.price),
      isActive: r.isActive,
    })
    setDialogOpen(true)
  }

  return (
    <div dir="rtl">
      <PageHeader
        title="قیمت عکس چاپی"
        icon="🖼️"
        description="تعریف قیمت هر عکس چاپی بر اساس اندازه، جنس کاغذ، لمینت و محل عکاسی"
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              افزودن قیمت جدید
            </Button>
          )
        }
      />

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-muted bg-muted/30 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-muted-foreground">
          قیمت‌ها بر اساس ترکیب <span className="font-medium">اندازه</span>،{" "}
          <span className="font-medium">جنس کاغذ</span>،{" "}
          <span className="font-medium">جنس لمینت</span> و{" "}
          <span className="font-medium">محل عکاسی</span> تعریف می‌شوند. این
          قیمت‌ها هنگام انتخاب عکس چاپی برای پروژه‌ها به‌کار می‌آیند. در صورت
          تغییر قیمت، پروژه‌های پرداخت‌نشده به‌صورت خودکار به‌روز می‌شوند.
        </p>
      </div>

      <SectionCard title="لیست قیمت‌ها">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon="🖼️"
            title="هنوز قیمتی تعریف نشده است"
            description="برای شروع، یک قیمت جدید بر اساس اندازه، جنس کاغذ، لمینت و محل عکاسی اضافه کنید."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اندازه</TableHead>
                  <TableHead>جنس کاغذ</TableHead>
                  <TableHead>جنس لمینت</TableHead>
                  <TableHead>محل عکاسی</TableHead>
                  <TableHead className="text-right">قیمت (تومان)</TableHead>
                  <TableHead className="text-center">فعال</TableHead>
                  {canManage && <TableHead className="text-right">عملیات</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.id} className={!r.isActive ? "opacity-60" : undefined}>
                    <TableCell className="font-medium" dir="ltr">
                      {r.size}
                    </TableCell>
                    <TableCell className="text-sm">{r.paperType}</TableCell>
                    <TableCell className="text-sm">
                      {r.laminateType === "none" ? (
                        <span className="text-muted-foreground">{LAMINATE_NONE_LABEL}</span>
                      ) : (
                        r.laminateType
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                          PHOTO_LOCATION_BADGE[r.photoLocation]
                        )}
                      >
                        {PHOTO_LOCATION_LABELS[r.photoLocation]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatRials(r.price)} تومان
                    </TableCell>
                    <TableCell className="text-center">
                      {canManage ? (
                        <Switch
                          checked={r.isActive}
                          onCheckedChange={() => toggleActiveMut.mutate(r)}
                          aria-label="تغییر وضعیت فعال"
                        />
                      ) : (
                        <Badge variant={r.isActive ? "default" : "secondary"}>
                          {r.isActive ? "فعال" : "غیرفعال"}
                        </Badge>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(r)}
                            aria-label="ویرایش قیمت"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(r)}
                            aria-label="حذف قیمت"
                          >
                            <Trash2 className="h-4 w-4" />
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
      </SectionCard>

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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "ویرایش قیمت" : "افزودن قیمت جدید"}</DialogTitle>
            <DialogDescription>
              قیمت یک عکس چاپی را بر اساس اندازه، جنس کاغذ، لمینت و محل عکاسی تعریف کنید.
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

            <div>
              <Label htmlFor="ppp-paper">جنس کاغذ چاپی</Label>
              <Input
                id="ppp-paper"
                value={form.paperType}
                onChange={(e) => setForm((f) => ({ ...f, paperType: e.target.value }))}
                placeholder='مثلاً "مات" یا "براق"'
              />
            </div>

            <div>
              <Label>محل انداخته شدن عکس</Label>
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
                  {LAMINATE_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                  <SelectItem value={LAMINATE_CUSTOM}>سفارشی…</SelectItem>
                </SelectContent>
              </Select>
              {form.laminateSelect === LAMINATE_CUSTOM && (
                <Input
                  className="mt-2"
                  value={form.laminateCustom}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, laminateCustom: e.target.value }))
                  }
                  placeholder="نوع لمینت دلخواه را وارد کنید"
                />
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                {laminateDisplay(resolveLaminate(form)) === LAMINATE_NONE_LABEL
                  ? "بدون لمینت انتخاب شده است."
                  : `لمینت انتخابی: ${laminateDisplay(resolveLaminate(form))}`}
              </p>
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
