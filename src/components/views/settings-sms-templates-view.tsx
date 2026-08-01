"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, Eye, Clock, Zap, Sparkles, MessageSquare, Bell } from "lucide-react"
import { toast } from "sonner"

import { useApi } from "@/lib/api/client"
import { useWorkspace } from "@/stores/workspace"
import { toPersianDigits } from "@/lib/format"
import { authHeaders } from "@/lib/auth-context"

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
  "{project_date}",
  "{studio_name}",
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
    <div dir="rtl" className="space-y-8 text-right">
      <TemplatesSection canEdit={canEdit} />
      <AutomationsSection canEdit={canEdit} />
    </div>
  )
}

// ============================================================
// Templates section — modern card-based layout (FIXES-10 #5)
// Each template is a card with: name, preview, trigger info,
// edit/delete buttons. The new/edit dialog has a LIVE PREVIEW
// showing how the message would look with sample data.
// ============================================================
function TemplatesSection({ canEdit }: { canEdit: boolean }) {
  const api = useApi()
  const qc = useQueryClient()
  const role = useWorkspace((s) => s.role)

  const { data, isLoading } = useQuery<SMSTemplate[]>({
    queryKey: ["sms-templates"],
    queryFn: () => api.get("/api/sms-templates"),
  })

  // ✅ Fetch automations so each card can show "which automations use it".
  const { data: autoData } = useQuery<{ items: SmsAutomation[] }>({
    queryKey: ["sms-automations"],
    queryFn: () => api.get("/api/sms-automations"),
  })
  const automations = autoData?.items ?? []

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<SMSTemplate | null>(null)
  const [form, setForm] = React.useState<{ name: string; templateText: string; isActive: boolean }>({
    name: "",
    templateText: "",
    isActive: true,
  })
  const [deleteTarget, setDeleteTarget] = React.useState<SMSTemplate | null>(null)

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
          headers: authHeaders({ "Content-Type": "application/json", "x-demo-role": role }),
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
      qc.invalidateQueries({ queryKey: ["sms-automations"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleActiveMut = useMutation({
    mutationFn: async (t: SMSTemplate) => {
      const res = await fetch(`/api/sms-templates/${t.id}`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json", "x-demo-role": role }),
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
        headers: authHeaders({ "x-demo-role": role }),
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

  // For each template, list automations that use it
  function automationsFor(templateId: string): SmsAutomation[] {
    return automations.filter((a) => a.templateId === templateId)
  }

  return (
    <div dir="rtl" className="text-right">
      {/* Header banner — gradient + new-template button */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-l from-sky-500 via-violet-500 to-fuchsia-500 p-6 text-white shadow-lg">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 0%, transparent 50%)"
        }} />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold">
                قالب‌های پیامک
                <Sparkles className="h-4 w-4 text-yellow-200" />
              </h2>
              <p className="mt-1 text-sm text-white/90">
                قالب‌های قابل استفاده مجدد با متغیرهای پویا برای اعلان‌های خودکار مشتری
              </p>
            </div>
          </div>
          {canEdit && (
            <Button
              onClick={() => {
                setEditing(null)
                setForm({ name: "", templateText: "", isActive: true })
                setDialogOpen(true)
              }}
              className="shrink-0 border-2 border-white/40 bg-white/20 text-white shadow-md backdrop-blur-sm transition hover:bg-white/30 hover:shadow-lg"
            >
              <Plus className="ml-1.5 h-4 w-4" />
              افزودن قالب جدید
            </Button>
          )}
        </div>
      </div>

      {/* Templates grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="💬"
          title="هنوز قالب پیامکی وجود ندارد"
          description="قالب‌های قابل استفاده مجدد با متغیرها برای اعلان‌های خودکار مشتری ایجاد کنید."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((t) => {
            const usedBy = automationsFor(t.id)
            return (
              <TemplateCard
                key={t.id}
                template={t}
                automations={usedBy}
                canEdit={canEdit}
                onEdit={() => {
                  setEditing(t)
                  setForm({
                    name: t.name,
                    templateText: t.templateText,
                    isActive: t.isActive,
                  })
                  setDialogOpen(true)
                }}
                onDelete={() => setDeleteTarget(t)}
                onToggleActive={() => toggleActiveMut.mutate(t)}
              />
            )
          })}
        </div>
      )}

      {/* Variables hint bar */}
      <div className="mt-6 rounded-xl border bg-muted/30 p-4" dir="rtl">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          متغیرهای قابل استفاده در قالب
        </div>
        <div className="flex flex-wrap gap-2">
          {PLACEHOLDERS.map((p) => (
            <div
              key={p}
              className="flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-xs"
            >
              <code className="font-mono text-violet-600 dark:text-violet-300">{p}</code>
              <span className="text-muted-foreground">— {PLACEHOLDER_DESCRIPTIONS[p]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* New / edit dialog with LIVE PREVIEW */}
      <TemplateDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o)
          if (!o) {
            setEditing(null)
            setForm({ name: "", templateText: "", isActive: true })
          }
        }}
        form={form}
        setForm={setForm}
        editing={editing}
        saving={saveMut.isPending}
        onSave={() => saveMut.mutate()}
      />

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
// TemplateCard — one card per template (modern, gradient, RTL)
// ============================================================
function TemplateCard({
  template,
  automations,
  canEdit,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  template: SMSTemplate
  automations: SmsAutomation[]
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}) {
  return (
    <div
      dir="rtl"
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card text-right shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
        !template.isActive && "opacity-70 grayscale-[40%]"
      )}
    >
      {/* Top gradient strip */}
      <div className={cn(
        "h-1.5 w-full bg-gradient-to-l",
        template.isActive
          ? "from-sky-500 via-violet-500 to-fuchsia-500"
          : "from-slate-300 via-slate-300 to-slate-300"
      )} />

      <div className="flex flex-1 flex-col p-4">
        {/* Header row: name + active badge */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-bold text-foreground">
                {template.name}
              </h3>
              {template.isActive ? (
                <Badge className="bg-emerald-500/15 text-[9px] text-emerald-600 hover:bg-emerald-500/20">
                  فعال
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] text-muted-foreground">
                  غیرفعال
                </Badge>
              )}
            </div>
          </div>
          {canEdit && (
            <Switch
              checked={template.isActive}
              onCheckedChange={onToggleActive}
              aria-label="تغییر وضعیت فعال"
            />
          )}
        </div>

        {/* Preview text — shows the raw template with variables highlighted */}
        <div className="mb-3 rounded-lg border bg-gradient-to-bl from-muted/40 to-muted/10 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <Eye className="h-3 w-3" /> متن قالب
          </div>
          <p className="line-clamp-3 whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground/90">
            {renderTemplateWithHighlights(template.templateText)}
          </p>
        </div>

        {/* Trigger info — which automations use this template */}
        <div className="mb-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <Bell className="h-3 w-3" /> استفاده در اتوماسیون
          </div>
          {automations.length === 0 ? (
            <div className="text-[11px] text-muted-foreground/70">
              هنوز در هیچ اتوماسیونی استفاده نشده
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {automations.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300"
                  title={`${TRIGGER_LABELS[a.triggerEvent as TriggerEvent] ?? a.triggerEvent} · آفست ${a.offsetDays}`}
                >
                  <Zap className="h-2.5 w-2.5" />
                  {a.name}
                  <span className="text-amber-600/70 dark:text-amber-400/70">
                    ({TRIGGER_LABELS[a.triggerEvent as TriggerEvent] ?? a.triggerEvent})
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer: edit/delete actions */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
          <div className="text-[10px] text-muted-foreground">
            {toPersianDigits(template.templateText.length)} نویسه
          </div>
          {canEdit && (
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px] transition hover:bg-sky-500/10 hover:text-sky-600"
                onClick={onEdit}
              >
                <Pencil className="h-3 w-3" /> ویرایش
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2 text-[11px] text-rose-600 transition hover:bg-rose-500/10 hover:text-rose-700"
                onClick={onDelete}
              >
                <Trash2 className="h-3 w-3" /> حذف
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// TemplateDialog — create/edit with LIVE PREVIEW
// ============================================================
function TemplateDialog({
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
  form: { name: string; templateText: string; isActive: boolean }
  setForm: React.Dispatch<React.SetStateAction<{ name: string; templateText: string; isActive: boolean }>>
  editing: SMSTemplate | null
  saving: boolean
  onSave: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            {editing ? "ویرایش قالب" : "قالب پیامک جدید"}
          </DialogTitle>
          <DialogDescription className="text-right">
            از متغیرها برای شخصی‌سازی پیام‌ها استفاده کنید. این متغیرها هنگام ارسال جایگزین می‌شوند.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="tpl-name">نام قالب</Label>
            <Input
              id="tpl-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثلاً یادآوری پروژه (۳ روز مانده)"
              className="mt-1"
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
              placeholder="مشتری گرامی {customer_name}، رویداد شما {remaining_days} روز دیگر ({event_date}) برگزار می‌شود. — {studio_name}"
              className="mt-1 resize-none"
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
                  className="rounded-md border border-violet-500/30 bg-violet-500/5 px-2 py-0.5 font-mono text-xs text-violet-700 transition hover:bg-violet-500/15 dark:text-violet-300"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* ✅ LIVE PREVIEW — shows the rendered message with sample data */}
          <div className="overflow-hidden rounded-xl border bg-gradient-to-bl from-sky-500/5 to-violet-500/5">
            <div className="flex items-center gap-2 border-b bg-white/50 px-4 py-2 text-[11px] font-semibold text-muted-foreground dark:bg-black/20">
              <Eye className="h-3.5 w-3.5" />
              پیش‌نمایش زنده
              <span className="text-muted-foreground/60">— با داده‌های نمونه</span>
            </div>
            <div className="px-4 py-3">
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                {form.templateText.trim()
                  ? renderPreview(form.templateText)
                  : <span className="text-muted-foreground/60">متن قالب اینجا نمایش داده می‌شود…</span>}
              </p>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button
            onClick={onSave}
            disabled={saving}
            className="bg-gradient-to-l from-sky-500 to-violet-500 text-white shadow-md transition hover:from-sky-600 hover:to-violet-600"
          >
            {saving ? "در حال ذخیره…" : editing ? "ذخیره تغییرات" : "ایجاد قالب"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Helpers — render template text with variable highlighting
// ============================================================
// Replaces each `{variable}` token with a styled span so the user can
// visually distinguish placeholders from plain text inside the card preview.
function renderTemplateWithHighlights(text: string): React.ReactNode {
  if (!text) return <span className="text-muted-foreground/60">— خالی —</span>
  const parts: React.ReactNode[] = []
  const re = /\{(\w+)\}/g
  let lastIndex = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, m.index)}</span>)
    }
    parts.push(
      <span
        key={key++}
        className="rounded bg-violet-500/15 px-1 font-mono text-[10px] text-violet-700 dark:text-violet-300"
      >
        {m[0]}
      </span>
    )
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>)
  }
  return parts
}

// Lightweight cn helper (avoids adding a cn import just for this file).
function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(" ")
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
  "{project_date}": "تاریخ پروژه",
  "{studio_name}": "نام استودیو",
  "{remaining_days}": "روزهای باقی‌مانده",
  "{deadline}": "مهلت تحویل",
  "{amount}": "مبلغ قابل پرداخت",
}

function renderPreview(text: string): string {
  return text
    .replace(/\{customer_name\}/g, "سحر و رضا")
    .replace(/\{event_date\}/g, "۲۴ خرداد ۱۴۰۵")
    .replace(/\{project_date\}/g, "۲۴ خرداد ۱۴۰۵")
    .replace(/\{studio_name\}/g, "استودیو لومن")
    .replace(/\{remaining_days\}/g, "۳")
    .replace(/\{deadline\}/g, "۲۳ مرداد ۱۴۰۵")
    .replace(/\{amount\}/g, "۹٬۲۰۰٬۰۰۰")
}

