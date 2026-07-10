"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, Send, Eye, Clock, Zap } from "lucide-react"
import { toast } from "sonner"

import { useApi } from "@/lib/api/client"
import { useWorkspace } from "@/stores/workspace"
import { toPersianDigits } from "@/lib/format"

import { PageHeader, EmptyState, SectionCard } from "./_shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
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

interface SMSTemplate {
  id: string
  name: string
  templateText: string
  isActive: boolean
}

interface SmsAutomation {
  id: string
  name: string
  templateId: string
  templateName: string
  templateText: string
  triggerEvent: string
  offsetDays: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const TRIGGER_EVENTS = [
  "before_event",
  "after_event",
  "after_ready",
  "after_photo_select",
] as const
type TriggerEvent = (typeof TRIGGER_EVENTS)[number]

const TRIGGER_LABELS: Record<TriggerEvent, string> = {
  before_event: "قبل از مراسم",
  after_event: "بعد از مراسم",
  after_ready: "بعد از آماده‌شدن (تیک طلایی)",
  after_photo_select: "بعد از انتخاب عکس",
}

const TRIGGER_DESCRIPTIONS: Record<TriggerEvent, string> = {
  before_event: "از تاریخ شروع مراسم (startDatetime) به عقب یا جلو محاسبه می‌شود.",
  after_event: "از تاریخ پایان مراسم (endDatetime) به جلو محاسبه می‌شود.",
  after_ready: "از زمان زدن تیک طلایی (آماده‌شدن پروژه) به جلو محاسبه می‌شود.",
  after_photo_select: "از زمان انتخاب نهایی عکس‌ها توسط مشتری محاسبه می‌شود.",
}

const PLACEHOLDERS = [
  "{customer_name}",
  "{event_date}",
  "{remaining_days}",
  "{deadline}",
  "{amount}",
]

export function SettingsSmsTemplatesView() {
  const role = useWorkspace((s) => s.role)
  const canView = role === "admin" || role === "manager"
  const canEdit = role === "admin"

  if (!canView) {
    return (
      <EmptyState
        icon="🔒"
        title="دسترسی محدود"
        description="فقط مدیران سیستم و مدیران می‌توانند قالب‌های پیامک را مشاهده کنند."
      />
    )
  }

  return (
    <div className="space-y-6">
      <TemplatesSection canEdit={canEdit} />
      <AutomationsSection canEdit={canEdit} />
    </div>
  )
}

// ============================================================
// Templates section (existing CRUD, kept intact)
// ============================================================
function TemplatesSection({ canEdit }: { canEdit: boolean }) {
  const api = useApi()
  const qc = useQueryClient()
  const role = useWorkspace((s) => s.role)

  const { data, isLoading } = useQuery<SMSTemplate[]>({
    queryKey: ["sms-templates"],
    queryFn: () => api.get("/api/sms-templates"),
  })

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<SMSTemplate | null>(null)
  const [form, setForm] = React.useState<{ name: string; templateText: string; isActive: boolean }>({
    name: "",
    templateText: "",
    isActive: true,
  })
  const [deleteTarget, setDeleteTarget] = React.useState<SMSTemplate | null>(null)

  // Preview panel
  const [previewId, setPreviewId] = React.useState<string>("")

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        templateText: form.templateText.trim(),
        isActive: form.isActive,
      }
      if (!payload.name) throw new Error("نام الزامی است")
      if (!payload.templateText) throw new Error("متن قالب الزامی است")
      const res = await fetch(
        editing ? `/api/sms-templates/${editing.id}` : "/api/sms-templates",
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
      return d
    },
    onSuccess: () => {
      toast.success(editing ? "قالب به‌روزرسانی شد" : "قالب با موفقیت ایجاد شد")
      setDialogOpen(false)
      setEditing(null)
      setForm({ name: "", templateText: "", isActive: true })
      qc.invalidateQueries({ queryKey: ["sms-templates"] })
      // Automations depend on templates list — refresh too
      qc.invalidateQueries({ queryKey: ["sms-automations"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleActiveMut = useMutation({
    mutationFn: async (t: SMSTemplate) => {
      const res = await fetch(`/api/sms-templates/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": role },
        body: JSON.stringify({ isActive: !t.isActive }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      }
      return d
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sms-templates"] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sms-templates/${id}`, {
        method: "DELETE",
        headers: { "x-demo-role": role },
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      }
      return d
    },
    onSuccess: () => {
      toast.success("قالب با موفقیت حذف شد")
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ["sms-templates"] })
      qc.invalidateQueries({ queryKey: ["sms-automations"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const previewTemplate = data?.find((t) => t.id === previewId) || data?.[0]

  return (
    <div>
      <PageHeader
        title="قالب‌های پیامک"
        icon="💬"
        description="قالب‌های اعلان به مشتری"
        actions={
          canEdit && (
            <Button
              onClick={() => {
                setEditing(null)
                setForm({ name: "", templateText: "", isActive: true })
                setDialogOpen(true)
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              قالب جدید
            </Button>
          )
        }
      />

      <SectionCard title="قالب‌ها">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon="💬"
            title="هنوز قالب پیامکی وجود ندارد"
            description="قالب‌های قابل استفاده مجدد با متغیرها برای اعلان‌های خودکار مشتری ایجاد کنید."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">نام</TableHead>
                  <TableHead className="min-w-[320px]">متن قالب</TableHead>
                  <TableHead className="text-center">فعال</TableHead>
                  {canEdit && <TableHead className="text-right">عملیات</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium">{t.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="line-clamp-2 max-w-md text-xs text-muted-foreground">
                        {t.templateText}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {canEdit ? (
                        <Switch
                          checked={t.isActive}
                          onCheckedChange={() => toggleActiveMut.mutate(t)}
                          aria-label="تغییر وضعیت فعال"
                        />
                      ) : (
                        <span
                          className={
                            t.isActive
                              ? "text-xs font-medium text-emerald-600"
                              : "text-xs font-medium text-muted-foreground"
                          }
                        >
                          {t.isActive ? "فعال" : "غیرفعال"}
                        </span>
                      )}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditing(t)
                              setForm({
                                name: t.name,
                                templateText: t.templateText,
                                isActive: t.isActive,
                              })
                              setDialogOpen(true)
                            }}
                            aria-label="ویرایش قالب"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(t)}
                            aria-label="حذف قالب"
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

      {/* Preview panel */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="پیش‌نمایش"
          description="نمایش قالب با داده‌های نمونه"
          className="lg:col-span-2"
        >
          {!data || data.length === 0 ? (
            <EmptyState
              icon="👁️"
              title="چیزی برای پیش‌نمایش نیست"
              description="ابتدا یک قالب ایجاد کنید."
            />
          ) : (
            <div className="space-y-4">
              <div>
                <Label>قالب</Label>
                <Select
                  value={previewId || data[0]?.id}
                  onValueChange={(v) => setPreviewId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="یک قالب انتخاب کنید" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Eye className="h-3.5 w-3.5" />
                  پیش‌نمایش رندر شده
                </div>
                <p className="whitespace-pre-wrap text-sm">
                  {renderPreview(previewTemplate?.templateText || "")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toast.success("پیامک در صف ارسال (دمو)", {
                      description: previewTemplate?.name,
                    })
                  }
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  ارسال آزمایشی
                </Button>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="متغیرها" description="توکن‌های قابل استفاده">
          <div className="space-y-2">
            {PLACEHOLDERS.map((p) => (
              <div
                key={p}
                className="flex items-center justify-between rounded-md border bg-card px-3 py-2"
              >
                <code className="text-xs font-mono">{p}</code>
                <span className="text-xs text-muted-foreground">
                  {PLACEHOLDER_DESCRIPTIONS[p]}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o)
          if (!o) {
            setEditing(null)
            setForm({ name: "", templateText: "", isActive: true })
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "ویرایش قالب" : "قالب پیامک جدید"}</DialogTitle>
            <DialogDescription>
              از متغیرها برای شخصی‌سازی پیام‌ها استفاده کنید. این متغیرها هنگام ارسال جایگزین می‌شوند.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="tpl-name">نام</Label>
              <Input
                id="tpl-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="مثلاً یادآوری پروژه (۳ روز مانده)"
              />
            </div>

            <div>
              <Label htmlFor="tpl-text">متن قالب</Label>
              <Textarea
                id="tpl-text"
                rows={5}
                value={form.templateText}
                onChange={(e) =>
                  setForm((f) => ({ ...f, templateText: e.target.value }))
                }
                placeholder="مشتری گرامی {customer_name}، رویداد شما {remaining_days} روز دیگر ({event_date}) برگزار می‌شود. — استودیو لومن"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PLACEHOLDERS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        templateText: f.templateText + (f.templateText ? " " : "") + p,
                      }))
                    }
                    className="rounded-md border bg-muted px-2 py-0.5 font-mono text-xs transition hover:bg-muted/70"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="tpl-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
              <Label htmlFor="tpl-active" className="cursor-pointer">
                فعال
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              انصراف
            </Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending ? "در حال ذخیره…" : editing ? "ذخیره تغییرات" : "ایجاد قالب"}
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
            <AlertDialogTitle>حذف قالب؟</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> برای همیشه حذف خواهد شد.
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

// ============================================================
// Automations section (NEW)
// ============================================================
function AutomationsSection({ canEdit }: { canEdit: boolean }) {
  const api = useApi()
  const qc = useQueryClient()
  const role = useWorkspace((s) => s.role)

  const { data: tplData } = useQuery<SMSTemplate[]>({
    queryKey: ["sms-templates"],
    queryFn: () => api.get("/api/sms-templates"),
  })

  const { data, isLoading } = useQuery<{ items: SmsAutomation[] }>({
    queryKey: ["sms-automations"],
    queryFn: () => api.get("/api/sms-automations"),
  })

  const items = data?.items ?? []

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<SmsAutomation | null>(null)
  const [form, setForm] = React.useState<AutomationForm>(EMPTY_AUTO_FORM)
  const [deleteTarget, setDeleteTarget] = React.useState<SmsAutomation | null>(null)

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        templateId: form.templateId,
        triggerEvent: form.triggerEvent,
        offsetDays: Number(form.offsetDays),
        isActive: form.isActive,
      }
      if (!payload.name) throw new Error("نام اتوماسیون الزامی است")
      if (!payload.templateId) throw new Error("انتخاب قالب الزامی است")
      if (!Number.isFinite(payload.offsetDays)) {
        throw new Error("روز آفست باید عدد باشد (می‌تواند منفی باشد)")
      }
      const res = await fetch(
        editing ? `/api/sms-automations/${editing.id}` : "/api/sms-automations",
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
      return d
    },
    onSuccess: () => {
      toast.success(editing ? "اتوماسیون به‌روزرسانی شد" : "اتوماسیون ایجاد شد")
      setDialogOpen(false)
      setEditing(null)
      setForm(EMPTY_AUTO_FORM)
      qc.invalidateQueries({ queryKey: ["sms-automations"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleActiveMut = useMutation({
    mutationFn: async (a: SmsAutomation) => {
      const res = await fetch(`/api/sms-automations/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": role },
        body: JSON.stringify({ isActive: !a.isActive }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      }
      return d
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sms-automations"] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sms-automations/${id}`, {
        method: "DELETE",
        headers: { "x-demo-role": role },
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      }
      return d
    },
    onSuccess: () => {
      toast.success("اتوماسیون حذف شد")
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ["sms-automations"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div>
      <PageHeader
        title="اتوماسیون پیامک"
        icon="⚡"
        description="قوانین ارسال خودکار پیامک بر اساس رویدادهای پروژه"
        actions={
          canEdit && (
            <Button
              onClick={() => {
                setEditing(null)
                setForm(EMPTY_AUTO_FORM)
                setDialogOpen(true)
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              اتوماسیون جدید
            </Button>
          )
        }
      />

      <SectionCard
        title="قوانین اتوماسیون"
        description="هر قانون یک قالب پیامک را با فاصله‌ی زمانی مشخص نسبت به یک رویداد پروژه ارسال می‌کند."
      >
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="⚡"
            title="هنوز قانون اتوماسیونی وجود ندارد"
            description="مثلاً: ۲ روز قبل از مراسم، پیامک یادآوری ارسال شود. روی «اتوماسیون جدید» بزنید تا اولین قانون را بسازید."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">نام</TableHead>
                  <TableHead className="min-w-[160px]">قالب</TableHead>
                  <TableHead>رویداد</TableHead>
                  <TableHead className="text-center">آفست (روز)</TableHead>
                  <TableHead className="text-center">فعال</TableHead>
                  {canEdit && <TableHead className="text-right">عملیات</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        <span className="font-medium">{a.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1 max-w-xs">
                        {a.templateText || "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{a.templateName}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-transparent bg-sky-500/10 text-sky-700 dark:text-sky-300"
                      >
                        {TRIGGER_LABELS[a.triggerEvent as TriggerEvent] ?? a.triggerEvent}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {a.offsetDays < 0 ? (
                        <span className="text-rose-600 dark:text-rose-400">
                          {toPersianDigits(a.offsetDays)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          +{toPersianDigits(a.offsetDays)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {canEdit ? (
                        <Switch
                          checked={a.isActive}
                          onCheckedChange={() => toggleActiveMut.mutate(a)}
                          aria-label="تغییر وضعیت فعال"
                        />
                      ) : (
                        <span
                          className={
                            a.isActive
                              ? "text-xs font-medium text-emerald-600"
                              : "text-xs font-medium text-muted-foreground"
                          }
                        >
                          {a.isActive ? "فعال" : "غیرفعال"}
                        </span>
                      )}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditing(a)
                              setForm({
                                name: a.name,
                                templateId: a.templateId,
                                triggerEvent: a.triggerEvent as TriggerEvent,
                                offsetDays: String(a.offsetDays),
                                isActive: a.isActive,
                              })
                              setDialogOpen(true)
                            }}
                            aria-label="ویرایش اتوماسیون"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(a)}
                            aria-label="حذف اتوماسیون"
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

      {/* Hint card */}
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div className="font-medium text-foreground mb-0.5">چطور کار می‌کند؟</div>
          مثلاً: با انتخاب رویداد «قبل از مراسم» و آفست <code className="font-mono">۲-</code>،
          پیامک دو روز قبل از شروع مراسم ارسال می‌شود. آفست مثبت به‌معنای ارسال بعد از رویداد است.
        </div>
      </div>

      <AutomationDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o)
          if (!o) {
            setEditing(null)
            setForm(EMPTY_AUTO_FORM)
          }
        }}
        form={form}
        setForm={setForm}
        editing={editing}
        saving={saveMut.isPending}
        onSave={() => saveMut.mutate()}
        templates={tplData ?? []}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف اتوماسیون؟</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> برای همیشه حذف خواهد شد.
              تخصیص این اتوماسیون به پروژه‌ها نیز حذف می‌شود.
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

interface AutomationForm {
  name: string
  templateId: string
  triggerEvent: TriggerEvent
  offsetDays: string
  isActive: boolean
}

const EMPTY_AUTO_FORM: AutomationForm = {
  name: "",
  templateId: "",
  triggerEvent: "before_event",
  offsetDays: "-1",
  isActive: true,
}

function AutomationDialog({
  open,
  onOpenChange,
  form,
  setForm,
  editing,
  saving,
  onSave,
  templates,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  form: AutomationForm
  setForm: React.Dispatch<React.SetStateAction<AutomationForm>>
  editing: SmsAutomation | null
  saving: boolean
  onSave: () => void
  templates: SMSTemplate[]
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "ویرایش اتوماسیون" : "اتوماسیون جدید"}</DialogTitle>
          <DialogDescription>
            یک قالب پیامک را به یک رویداد پروژه و فاصله‌ی زمانی مشخص متصل کنید.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="auto-name">نام</Label>
            <Input
              id="auto-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثلاً یادآوری ۲ روز قبل از مراسم"
            />
          </div>

          <div>
            <Label>قالب پیامک</Label>
            {templates.length === 0 ? (
              <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                ابتدا یک قالب پیامک بسازید.
              </div>
            ) : (
              <Select
                value={form.templateId}
                onValueChange={(v) => setForm((f) => ({ ...f, templateId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب قالب" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>رویداد محرک</Label>
              <Select
                value={form.triggerEvent}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, triggerEvent: v as TriggerEvent }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_EVENTS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {TRIGGER_LABELS[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="auto-offset">آفست (روز)</Label>
              <Input
                id="auto-offset"
                type="number"
                dir="ltr"
                value={form.offsetDays}
                onChange={(e) => setForm((f) => ({ ...f, offsetDays: e.target.value }))}
                placeholder="مثلاً ۲- برای دو روز قبل"
              />
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            {TRIGGER_DESCRIPTIONS[form.triggerEvent]}
            {form.triggerEvent === "before_event" && (
              <div className="mt-1">
                برای «قبل از مراسم» معمولاً از عدد منفی (مثلاً <code className="font-mono">۲-</code>) استفاده می‌کنید تا پیامک قبل از شروع ارسال شود.
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="auto-active"
              checked={form.isActive}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
            />
            <Label htmlFor="auto-active" className="cursor-pointer">
              فعال
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "در حال ذخیره…" : editing ? "ذخیره تغییرات" : "ایجاد اتوماسیون"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const PLACEHOLDER_DESCRIPTIONS: Record<string, string> = {
  "{customer_name}": "نام مشتری",
  "{event_date}": "تاریخ رویداد",
  "{remaining_days}": "روزهای باقی‌مانده",
  "{deadline}": "مهلت تحویل",
  "{amount}": "مبلغ قابل پرداخت",
}

function renderPreview(text: string): string {
  return text
    .replace(/\{customer_name\}/g, "سحر و رضا")
    .replace(/\{event_date\}/g, "۲۴ خرداد ۱۴۰۵")
    .replace(/\{remaining_days\}/g, "۳")
    .replace(/\{deadline\}/g, "۲۳ مرداد ۱۴۰۵")
    .replace(/\{amount\}/g, "۹٬۲۰۰٬۰۰۰")
}
