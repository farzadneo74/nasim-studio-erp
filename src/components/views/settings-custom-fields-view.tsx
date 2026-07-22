"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ArrowUp,
  ArrowDown,
  Loader2,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { useApi } from "@/lib/api/client"
import { useWorkspace } from "@/stores/workspace"
import { hasPermission } from "@/lib/constants"
import { toPersianDigits } from "@/lib/format"

import { PageHeader, EmptyState, SectionCard } from "./_shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ============================================================
// Types & constants
// ============================================================
export type CustomFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "radio"
  | "checkbox"
  | "multiselect"
  | "date"
  | "datetime"
  | "image"
  | "audio"
  | "file"
  | "video"
  | "color"
  | "tags"

export interface CustomField {
  id: string
  name: string
  label: string
  type: CustomFieldType
  options: string[]
  required: boolean
  isActive: boolean
  order: number
  createdAt: string
  updatedAt: string
}

const TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "متن کوتاه",
  textarea: "متن بلند",
  number: "عدد",
  select: "انتخاب از لیست",
  radio: "تک‌انتخابی",
  checkbox: "چک‌باکس",
  multiselect: "چندانتخابی",
  date: "تاریخ",
  datetime: "تاریخ و ساعت",
  image: "تصویر",
  audio: "صوت",
  video: "ویدیو",
  file: "فایل",
  color: "رنگ",
  tags: "برچسب‌ها",
}

// Tailwind classes (NOT indigo/blue-primary). Badge colors per type group.
function typeBadgeClass(type: CustomFieldType): string {
  switch (type) {
    case "text":
    case "textarea":
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
    case "number":
      return "bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300"
    case "select":
    case "radio":
    case "checkbox":
    case "multiselect":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
    case "date":
    case "datetime":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
    case "image":
    case "audio":
    case "video":
    case "file":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
    case "color":
    case "tags":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
  }
}

const OPTION_TYPES: CustomFieldType[] = ["select", "radio", "checkbox", "multiselect"]

function hasOptions(type: CustomFieldType): boolean {
  return OPTION_TYPES.includes(type)
}

// Grouped types for the type Select dropdown.
const TYPE_GROUPS: { label: string; types: CustomFieldType[] }[] = [
  { label: "متنی", types: ["text", "textarea", "number"] },
  { label: "انتخابی", types: ["select", "radio", "checkbox", "multiselect"] },
  { label: "تاریخ", types: ["date", "datetime"] },
  { label: "رسانه", types: ["image", "audio", "video", "file"] },
  { label: "سایر", types: ["color", "tags"] },
]

// ============================================================
// Slugify helper (English slug from a Persian label)
// ============================================================
function slugify(s: string): string {
  const map: Record<string, string> = {
    ا: "a", آ: "a", ب: "b", پ: "p", ت: "t", ث: "s", ج: "j", چ: "ch",
    ح: "h", خ: "kh", د: "d", ذ: "z", ر: "r", ز: "z", ژ: "zh", س: "s",
    ش: "sh", ص: "s", ض: "z", ط: "t", ظ: "z", ع: "a", غ: "gh", ف: "f",
    ق: "gh", ک: "k", گ: "g", ل: "l", م: "m", ن: "n", و: "v", ه: "h", ی: "y",
  }
  let out = ""
  for (const ch of s) {
    if (map[ch]) out += map[ch]
    else if (/[a-zA-Z0-9]/.test(ch)) out += ch
    else if (/\s/.test(ch)) out += "_"
  }
  out = out.replace(/_+/g, "_").replace(/^_+|_+$/g, "")
  if (!out) out = "field"
  if (!/^[a-zA-Z]/.test(out)) out = "f_" + out
  return out.toLowerCase()
}

// ============================================================
// Main view
// ============================================================
export function SettingsCustomFieldsView() {
  const role = useWorkspace((s) => s.role)
  const canManage = hasPermission(role, "custom_fields")
  const canView = hasPermission(role, "custom_fields") || hasPermission(role, "tags")
  const api = useApi()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<CustomField[]>({
    queryKey: ["custom-fields"],
    queryFn: () => api.get("/api/custom-fields"),
  })

  const [search, setSearch] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<"all" | CustomFieldType>("all")
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all")

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<CustomField | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<CustomField | null>(null)

  const toggleActiveMut = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await fetch(`/api/custom-fields/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": role },
        body: JSON.stringify({ isActive }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      return d
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-fields"] })
      qc.invalidateQueries({ queryKey: ["custom-fields-active"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleRequiredMut = useMutation({
    mutationFn: async ({ id, required }: { id: string; required: boolean }) => {
      const res = await fetch(`/api/custom-fields/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": role },
        body: JSON.stringify({ required }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      return d
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-fields"] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const reorderMut = useMutation({
    mutationFn: async ({ id, order }: { id: string; order: number }) => {
      const res = await fetch(`/api/custom-fields/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": role },
        body: JSON.stringify({ order }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      return d
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-fields"] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/custom-fields/${id}`, {
        method: "DELETE",
        headers: { "x-demo-role": role },
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      return d
    },
    onSuccess: () => {
      toast.success("فیلد حذف شد")
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ["custom-fields"] })
      qc.invalidateQueries({ queryKey: ["custom-fields-active"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const filtered = React.useMemo(() => {
    if (!data) return []
    let list = data
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (f) =>
          f.label.toLowerCase().includes(q) ||
          f.name.toLowerCase().includes(q) ||
          TYPE_LABELS[f.type].includes(q)
      )
    }
    if (typeFilter !== "all") {
      list = list.filter((f) => f.type === typeFilter)
    }
    if (activeFilter === "active") list = list.filter((f) => f.isActive)
    if (activeFilter === "inactive") list = list.filter((f) => !f.isActive)
    return list
  }, [data, search, typeFilter, activeFilter])

  if (!canView) {
    return (
      <EmptyState
        icon="🔒"
        title="دسترسی محدود"
        description="فقط مدیران می‌توانند فیلدهای سفارشی را مشاهده کنند."
      />
    )
  }

  const move = (idx: number, direction: -1 | 1) => {
    if (!filtered) return
    const target = filtered[idx + direction]
    const cur = filtered[idx]
    if (!target || !cur) return
    reorderMut.mutate({ id: cur.id, order: target.order })
    reorderMut.mutate({ id: target.id, order: cur.order })
  }

  return (
    <div>
      <PageHeader
        title="فیلدهای سفارشی مشتریان"
        description="مدیریت فیلدهای اضافی برای فرم ثبت مشتری"
        icon="🎛️"
        actions={
          canManage ? (
            <Button
              onClick={() => {
                setEditing(null)
                setDialogOpen(true)
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              افزودن فیلد
            </Button>
          ) : null
        }
      />

      {/* Toolbar */}
      <div className="mb-4 rounded-xl border bg-card p-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو بر اساس نام یا عنوان…"
              className="pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as "all" | CustomFieldType)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="همه انواع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه انواع</SelectItem>
                {TYPE_GROUPS.map((g) => (
                  <SelectGroup key={g.label}>
                    <SelectLabel>{g.label}</SelectLabel>
                    {g.types.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={activeFilter}
              onValueChange={(v) =>
                setActiveFilter(v as "all" | "active" | "inactive")
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="active">فعال</SelectItem>
                <SelectItem value="inactive">غیرفعال</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <SectionCard
        title="فیلدهای تعریف‌شده"
        description={`${toPersianDigits(filtered.length)} فیلد — فیلدها در فرم ثبت/ویرایش مشتری نمایش داده می‌شوند.`}
      >
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🎛️"
            title="فیلدی یافت نشد"
            description={
              data && data.length > 0
                ? "فیلترها را تغییر دهید."
                : "اولین فیلد سفارشی را برای فرم مشتری ایجاد کنید."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-2 text-right font-medium w-10">#</th>
                  <th className="py-2 pr-2 text-right font-medium">عنوان</th>
                  <th className="py-2 pr-2 text-right font-medium">نام کلید</th>
                  <th className="py-2 pr-2 text-right font-medium">نوع</th>
                  <th className="py-2 pr-2 text-center font-medium">الزامی</th>
                  <th className="py-2 pr-2 text-center font-medium">فعال</th>
                  {canManage && <th className="py-2 pr-2 text-center font-medium">عملیات</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((f, idx) => (
                  <tr
                    key={f.id}
                    className="border-b last:border-0 hover:bg-muted/40"
                  >
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-1">
                        {canManage ? (
                          <>
                            <button
                              onClick={() => move(idx, -1)}
                              disabled={idx === 0 || reorderMut.isPending}
                              className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
                              title="بالا"
                            >
                              <ArrowUp className="size-3.5" />
                            </button>
                            <button
                              onClick={() => move(idx, 1)}
                              disabled={idx === filtered.length - 1 || reorderMut.isPending}
                              className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
                              title="پایین"
                            >
                              <ArrowDown className="size-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground px-1">
                            {toPersianDigits(idx + 1)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-2">
                      <div className="font-medium">{f.label}</div>
                      {hasOptions(f.type) && f.options.length > 0 && (
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          گزینه‌ها: {f.options.join("، ")}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-2">
                      <code
                        dir="ltr"
                        className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
                      >
                        {f.name}
                      </code>
                    </td>
                    <td className="py-3 pr-2">
                      <Badge
                        variant="secondary"
                        className={`font-normal ${typeBadgeClass(f.type)}`}
                      >
                        {TYPE_LABELS[f.type]}
                      </Badge>
                    </td>
                    <td className="py-3 pr-2 text-center">
                      <Switch
                        checked={f.required}
                        disabled={!canManage || toggleRequiredMut.isPending}
                        onCheckedChange={(v) =>
                          toggleRequiredMut.mutate({ id: f.id, required: v })
                        }
                        aria-label="الزامی"
                      />
                    </td>
                    <td className="py-3 pr-2 text-center">
                      <Switch
                        checked={f.isActive}
                        disabled={!canManage || toggleActiveMut.isPending}
                        onCheckedChange={(v) =>
                          toggleActiveMut.mutate({ id: f.id, isActive: v })
                        }
                        aria-label="فعال"
                      />
                    </td>
                    {canManage && (
                      <td className="py-3 pr-2">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => {
                              setEditing(f)
                              setDialogOpen(true)
                            }}
                            aria-label="ویرایش"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-rose-600 hover:text-rose-700"
                            onClick={() => setDeleteTarget(f)}
                            aria-label="حذف"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Field dialog */}
      <FieldDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["custom-fields"] })
          qc.invalidateQueries({ queryKey: ["custom-fields-active"] })
        }}
      />

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف فیلد سفارشی؟</AlertDialogTitle>
            <AlertDialogDescription>
              فیلد <strong>{deleteTarget?.label}</strong> برای همیشه حذف خواهد شد.
              تمام مقادیر ذخیره‌شده برای مشتریان نیز پاک می‌شوند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (deleteTarget) deleteMut.mutate(deleteTarget.id)
              }}
              disabled={deleteMut.isPending}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deleteMut.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================
// Field Dialog — create/edit a custom field
// ============================================================
function FieldDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: CustomField | null
  onSaved: () => void
}) {
  const role = useWorkspace((s) => s.role)
  const [label, setLabel] = React.useState("")
  const [name, setName] = React.useState("")
  const [nameTouched, setNameTouched] = React.useState(false)
  const [type, setType] = React.useState<CustomFieldType>("text")
  const [options, setOptions] = React.useState<string[]>([])
  const [required, setRequired] = React.useState(false)
  const [isActive, setIsActive] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Hydrate from `editing` when opening.
  React.useEffect(() => {
    if (!open) return
    if (editing) {
      setLabel(editing.label)
      setName(editing.name)
      setNameTouched(true)
      setType(editing.type)
      setOptions(editing.options && editing.options.length > 0 ? [...editing.options] : [""])
      setRequired(editing.required)
      setIsActive(editing.isActive)
    } else {
      setLabel("")
      setName("")
      setNameTouched(false)
      setType("text")
      setOptions([""])
      setRequired(false)
      setIsActive(true)
    }
    setError(null)
  }, [open, editing])

  // Auto-suggest name from label (until user manually edits name).
  React.useEffect(() => {
    if (!open) return
    if (!nameTouched) {
      setName(slugify(label))
    }
  }, [label, nameTouched, open])

  const submit = async () => {
    setError(null)
    if (!label.trim()) {
      setError("عنوان فارسی الزامی است")
      return
    }
    if (!name.trim() || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name.trim())) {
      setError("نام کلید باید با حرف انگلیسی شروع شود و فقط شامل حرف/عدد/آندرلاین باشد")
      return
    }
    const opts = hasOptions(type)
      ? options.map((o) => o.trim()).filter(Boolean)
      : []
    if (hasOptions(type) && opts.length === 0) {
      setError("برای این نوع حداقل یک گزینه لازم است")
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        label: label.trim(),
        name: name.trim(),
        type,
        required,
        isActive,
      }
      if (hasOptions(type)) {
        payload.options = opts
      }
      const res = await fetch(
        editing ? `/api/custom-fields/${editing.id}` : "/api/custom-fields",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", "x-demo-role": role },
          body: JSON.stringify(payload),
        }
      )
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      }
      toast.success(editing ? "فیلد به‌روزرسانی شد" : "فیلد با موفقیت ایجاد شد")
      onSaved()
      onOpenChange(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطایی رخ داد"
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{editing ? "ویرایش فیلد" : "فیلد سفارشی جدید"}</DialogTitle>
          <DialogDescription>
            فیلدهای سفارشی به فرم ثبت/ویرایش مشتری اضافه می‌شوند.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="rounded-lg border border-rose-300/60 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-700/50 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="cf-label">عنوان نمایشی (فارسی) *</Label>
            <Input
              id="cf-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="مثلاً شماره ملی"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf-name">نام کلید (انگلیسی) *</Label>
            <Input
              id="cf-name"
              dir="ltr"
              value={name}
              onChange={(e) => {
                setNameTouched(true)
                setName(e.target.value)
              }}
              placeholder="auto-suggested from label"
              className="text-left font-mono"
            />
            <p className="text-xs text-muted-foreground">
              فقط حروف انگلیسی، عدد و آندرلاین. به‌صورت خودکار از عنوان ساخته می‌شود.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>نوع فیلد *</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as CustomFieldType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_GROUPS.map((g) => (
                  <SelectGroup key={g.label}>
                    <SelectLabel>{g.label}</SelectLabel>
                    {g.types.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasOptions(type) && (
            <div className="space-y-2 rounded-xl border bg-card p-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">گزینه‌ها</Label>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setOptions((prev) => [...prev, ""])}
                >
                  <Plus className="mr-1 size-3.5" />
                  افزودن گزینه
                </Button>
              </div>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-6 text-center">
                      {toPersianDigits(i + 1)}
                    </span>
                    <Input
                      dir="rtl"
                      value={opt}
                      onChange={(e) => {
                        const v = e.target.value
                        setOptions((prev) =>
                          prev.map((p, idx) => (idx === i ? v : p))
                        )
                      }}
                      placeholder={`گزینه ${toPersianDigits(i + 1)}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="text-rose-600 hover:text-rose-700"
                      onClick={() =>
                        setOptions((prev) =>
                          prev.length > 1
                            ? prev.filter((_, idx) => idx !== i)
                            : prev
                        )
                      }
                      disabled={options.length <= 1}
                      aria-label="حذف گزینه"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-6 rounded-xl border bg-card p-3">
            <div className="flex items-center gap-3">
              <Switch
                id="cf-required"
                checked={required}
                onCheckedChange={setRequired}
              />
              <Label htmlFor="cf-required" className="cursor-pointer">
                الزامی
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="cf-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="cf-active" className="cursor-pointer">
                فعال
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            انصراف
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            {editing ? "ذخیره تغییرات" : "ایجاد فیلد"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

