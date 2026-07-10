"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Bell,
  Clock,
  Wallet,
  MessageSquare,
  Check,
  CheckCheck,
  Plus,
  Trash2,
  Send,
  X,
  ExternalLink,
  AlertCircle,
  Users as UsersIcon,
  Filter,
  Pencil,
  RefreshCw,
  Link2,
} from "lucide-react"
import { toast } from "sonner"

import { useApi } from "@/lib/api/client"
import { useWorkspace, type PageId } from "@/stores/workspace"
import { formatDateTime, timeAgo, toPersianDigits } from "@/lib/format"
import { cn } from "@/lib/utils"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { JalaliDatePicker } from "@/components/views/_jalali-date-picker/jalali-date-picker"
import { TimeWheelPicker, formatTime12h } from "@/components/views/_time-wheel-picker/time-wheel-picker"

// ----------------------------- Types ----------------------------- //

type NotificationType = "info" | "payment_approval" | "reminder" | "sms"

interface NotificationItem {
  id: string
  userId: string | null
  type: NotificationType
  title: string
  message: string
  read: boolean
  link: string | null
  refId: string | null
  requiresAction?: boolean
  actionLabel?: string | null
  createdAt: string
}

// Per-link tick state. Key is "customer" | "project" | "user"; value is ISO of when
// the user ticked the link (or null/absent = not ticked). Ticked links move to
// the bottom of the list and are auto-deleted after 3 days (lazy, on GET).
type LinkCheckmarks = Partial<Record<"customer" | "project" | "user", string | null>>

interface ReminderItem {
  id: string
  title: string
  note: string | null
  dueAt: string
  done: boolean
  acknowledged: boolean
  order: number
  linkType: string | null
  linkId: string | null
  customerId: string | null
  projectId: string | null
  userId: string | null
  linkCheckmarks: LinkCheckmarks
  customerName: string | null
  projectTitle: string | null
  userName: string | null
  createdAt: string
  updatedAt: string
}

// ----------------------------- Helpers ----------------------------- //

const NOTIFICATION_ICON: Record<NotificationType, React.ReactNode> = {
  info: <Bell className="h-3.5 w-3.5" />,
  payment_approval: <Wallet className="h-3.5 w-3.5" />,
  reminder: <Clock className="h-3.5 w-3.5" />,
  sms: <MessageSquare className="h-3.5 w-3.5" />,
}

const NOTIFICATION_ACCENT: Record<NotificationType, string> = {
  info: "#0ea5e9",
  payment_approval: "#f59e0b",
  reminder: "#a855f7",
  sms: "#10b981",
}

const NAVIGATABLE_PAGES: PageId[] = [
  "dashboard",
  "calendar",
  "customers",
  "projects",
  "my-tasks",
  "finances",
  "reports",
  "qr-factory",
  "scanner",
  "settings-packages",
  "settings-tags",
  "settings-users",
  "settings-salary-rules",
  "settings-sms-templates",
  "settings-system",
  "settings-leaves",
]

function isNavigatable(link: string | null | undefined): link is PageId {
  return !!link && NAVIGATABLE_PAGES.includes(link as PageId)
}

// ----------------------------- Comboboxes ----------------------------- //

interface CustomerOption { id: string; name: string; phone: string }
interface ProjectOption {
  id: string
  title: string
  customerName: string
}
interface UserOption { id: string; firstName: string; lastName: string; role: string }

function CustomerCombobox({
  value,
  onChange,
  placeholder = "انتخاب مشتری (اختیاری)",
}: {
  value: string | null
  onChange: (id: string | null) => void
  placeholder?: string
}) {
  const role = useWorkspace((s) => s.role)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<CustomerOption[]>([])
  const [loading, setLoading] = React.useState(false)
  const [known, setKnown] = React.useState<CustomerOption | null>(null)

  React.useEffect(() => {
    if (!value) { setKnown(null); return }
    if (known?.id === value) return
    let cancelled = false
    fetch(`/api/customers?limit=50&search=`, { headers: { "x-demo-role": role } })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        const all = (d.items || []) as CustomerOption[]
        setKnown(all.find((c) => c.id === value) || null)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [value, known, role])

  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ limit: "20" })
    if (query) params.set("search", query)
    const t = setTimeout(() => {
      fetch(`/api/customers?${params.toString()}`, { headers: { "x-demo-role": role } })
        .then((r) => r.json())
        .then((d) => { if (!cancelled) setResults((d.items || []) as CustomerOption[]) })
        .catch(() => {})
        .finally(() => !cancelled && setLoading(false))
    }, 220)
    return () => { cancelled = true; clearTimeout(t) }
  }, [open, query, role])

  const selected = results.find((r) => r.id === value) || known

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <UsersIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{selected.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <Filter className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="جستجو نام یا تلفن…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>{loading ? "در حال بارگذاری…" : "مشتری یافت نشد"}</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => { onChange(null); setKnown(null); setOpen(false) }}
                >
                  <X className="ml-1 size-3.5 text-muted-foreground" />
                  <span className="flex-1 text-sm text-muted-foreground">حذف انتخاب</span>
                </CommandItem>
              )}
              {results.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  onSelect={() => { onChange(c.id); setKnown(c); setOpen(false) }}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm">{c.name}</span>
                    <span className="text-xs text-muted-foreground" dir="ltr">{c.phone}</span>
                  </div>
                  {value === c.id && <Check className="size-3.5 shrink-0 text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function ProjectCombobox({
  value,
  onChange,
  customerId,
  placeholder = "انتخاب پروژه (اختیاری)",
}: {
  value: string | null
  onChange: (id: string | null) => void
  customerId?: string | null
  placeholder?: string
}) {
  const role = useWorkspace((s) => s.role)
  const [open, setOpen] = React.useState(false)
  const [results, setResults] = React.useState<ProjectOption[]>([])
  const [loading, setLoading] = React.useState(false)
  const [known, setKnown] = React.useState<ProjectOption | null>(null)

  // Hydrate the selected project's name from /api/projects (lightweight list)
  React.useEffect(() => {
    if (!value) { setKnown(null); return }
    if (known?.id === value) return
    let cancelled = false
    fetch(`/api/projects?limit=100`, { headers: { "x-demo-role": role } })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        const all = (d.items || []) as Array<{ id: string; customer: { name: string }; package: { title: string } }>
        const found = all.find((p) => p.id === value)
        if (found) {
          setKnown({
            id: found.id,
            title: found.package.title,
            customerName: found.customer.name,
          })
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [value, known, role])

  // If a customer is selected, fetch only that customer's projects.
  // Otherwise, fetch the general project list.
  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    const url = customerId
      ? `/api/customers/${customerId}/projects`
      : `/api/projects?limit=50`
    fetch(url, { headers: { "x-demo-role": role } })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        if (customerId) {
          // /api/customers/[id]/projects returns { projects: [...] }
          const list = (d.projects || []) as Array<{ id: string; title: string; category: string }>
          setResults(list.map((p) => ({
            id: p.id,
            title: p.title,
            customerName: "",
          })))
        } else {
          const list = (d.items || []) as Array<{ id: string; customer: { name: string }; package: { title: string } }>
          setResults(list.map((p) => ({
            id: p.id,
            title: p.package.title,
            customerName: p.customer.name,
          })))
        }
      })
      .catch(() => { if (!cancelled) setResults([]) })
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [open, customerId, role])

  const selected = results.find((r) => r.id === value) || known

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate">
                {selected.customerName ? `${selected.customerName} — ${selected.title}` : selected.title}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <Filter className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="جستجو…" />
          <CommandList>
            <CommandEmpty>{loading ? "در حال بارگذاری…" : "پروژه‌ای یافت نشد"}</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => { onChange(null); setKnown(null); setOpen(false) }}
                >
                  <X className="ml-1 size-3.5 text-muted-foreground" />
                  <span className="flex-1 text-sm text-muted-foreground">حذف انتخاب</span>
                </CommandItem>
              )}
              {results.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.id}
                  onSelect={() => {
                    onChange(p.id)
                    setKnown(p)
                    setOpen(false)
                  }}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm">{p.title}</span>
                    {p.customerName && (
                      <span className="truncate text-xs text-muted-foreground">{p.customerName}</span>
                    )}
                  </div>
                  {value === p.id && <Check className="size-3.5 shrink-0 text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function UserCombobox({
  value,
  onChange,
  placeholder = "انتخاب کاربر (اختیاری)",
}: {
  value: string | null
  onChange: (id: string | null) => void
  placeholder?: string
}) {
  const role = useWorkspace((s) => s.role)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [all, setAll] = React.useState<UserOption[]>([])
  const [loading, setLoading] = React.useState(false)
  const [known, setKnown] = React.useState<UserOption | null>(null)
  const [forbidden, setForbidden] = React.useState(false)

  React.useEffect(() => {
    if (!value) { setKnown(null); return }
    if (known?.id === value) return
    // We need the users list to resolve the name; fetch once.
    let cancelled = false
    fetch(`/api/users`, { headers: { "x-demo-role": role } })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        if (Array.isArray(d)) {
          const list = d as UserOption[]
          setAll(list)
          setKnown(list.find((u) => u.id === value) || null)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [value, known, role])

  React.useEffect(() => {
    if (!open) return
    if (all.length > 0) return // already loaded
    let cancelled = false
    setLoading(true)
    fetch(`/api/users`, { headers: { "x-demo-role": role } })
      .then((r) => {
        if (r.status === 403) { setForbidden(true); return [] }
        return r.json()
      })
      .then((d) => {
        if (cancelled) return
        if (Array.isArray(d)) setAll(d as UserOption[])
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [open, all.length, role])

  const filtered = query.trim()
    ? all.filter((u) =>
        `${u.firstName} ${u.lastName}`.includes(query.trim()) ||
        u.role.includes(query.trim())
      )
    : all
  const selected = filtered.find((u) => u.id === value) || known

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="truncate">{selected.firstName} {selected.lastName}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <Filter className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="جستجو نام…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              {forbidden
                ? "لیست کاربران برای نقش شما در دسترس نیست"
                : loading
                ? "در حال بارگذاری…"
                : "کاربری یافت نشد"}
            </CommandEmpty>
            <CommandGroup>
              {value && !forbidden && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => { onChange(null); setKnown(null); setOpen(false) }}
                >
                  <X className="ml-1 size-3.5 text-muted-foreground" />
                  <span className="flex-1 text-sm text-muted-foreground">حذف انتخاب</span>
                </CommandItem>
              )}
              {filtered.map((u) => (
                <CommandItem
                  key={u.id}
                  value={u.id}
                  onSelect={() => { onChange(u.id); setKnown(u); setOpen(false) }}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm">{u.firstName} {u.lastName}</span>
                    <span className="text-xs text-muted-foreground">{u.role}</span>
                  </div>
                  {value === u.id && <Check className="size-3.5 shrink-0 text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ----------------------------- ReminderDialog ----------------------------- //

interface ReminderDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** Optional callback after a reminder is created (e.g. to invalidate queries). */
  onCreated?: () => void
  /** Optional: when provided, the dialog opens in "edit mode" — fields are
   * pre-filled with this reminder's current values and submit calls PATCH
   * /api/reminders/[id] instead of POST. */
  editTarget?: ReminderItem | null
}

export function ReminderDialog({ open, onOpenChange, onCreated, editTarget }: ReminderDialogProps) {
  const api = useApi()
  const qc = useQueryClient()
  const isEdit = !!editTarget

  const [title, setTitle] = React.useState("")
  const [note, setNote] = React.useState("")
  // Due date = Jalali date (ISO) + HH:MM time. Combined into ISO on submit.
  const [dueDate, setDueDate] = React.useState<string | null>(null)
  const [dueTime, setDueTime] = React.useState<string>("")
  const [customerId, setCustomerId] = React.useState<string | null>(null)
  const [projectId, setProjectId] = React.useState<string | null>(null)
  const [userId, setUserId] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  // Pre-fill / reset form on open or editTarget change.
  React.useEffect(() => {
    if (!open) {
      setTitle("")
      setNote("")
      setDueDate(null)
      setDueTime("")
      setCustomerId(null)
      setProjectId(null)
      setUserId(null)
      setSubmitting(false)
      return
    }
    if (editTarget) {
      setTitle(editTarget.title || "")
      setNote(editTarget.note || "")
      // Split dueAt ISO → date (12:00 local) + "HH:MM"
      const d = new Date(editTarget.dueAt)
      if (!Number.isNaN(d.getTime())) {
        const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0)
        setDueDate(dateOnly.toISOString())
        const hh = String(d.getHours()).padStart(2, "0")
        const mm = String(d.getMinutes()).padStart(2, "0")
        setDueTime(`${hh}:${mm}`)
      } else {
        setDueDate(null)
        setDueTime("")
      }
      setCustomerId(editTarget.customerId || null)
      setProjectId(editTarget.projectId || null)
      setUserId(editTarget.userId || null)
      setSubmitting(false)
    }
  }, [open, editTarget])

  // If the customer changes, the previously-selected project may no longer belong
  // to that customer — clear it so we don't submit a stale link.
  React.useEffect(() => {
    if (!open) return
    setProjectId(null)
  }, [customerId, open])

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Combine dueDate (ISO date at 12:00 local) + dueTime ("HH:MM") into one ISO datetime.
      let dueAt = ""
      if (dueDate && dueTime) {
        const d = new Date(dueDate)
        const [h, m] = dueTime.split(":").map((n) => parseInt(n, 10))
        d.setHours(h || 0, m || 0, 0, 0)
        dueAt = d.toISOString()
      } else if (dueDate) {
        dueAt = dueDate
      }
      const body: Record<string, unknown> = {
        title: title.trim(),
        dueAt,
        note: note.trim() || null,
        // Multi-link: send customerId/projectId/userId explicitly. The API
        // serializes them into linkType="multi" + linkId=JSON.
        customerId: customerId || null,
        projectId: projectId || null,
        userId: userId || null,
      }
      if (isEdit && editTarget) {
        return api.patch(`/api/reminders/${editTarget.id}`, body)
      }
      return api.post("/api/reminders", body)
    },
    onSuccess: () => {
      toast.success(isEdit ? "تغییرات ذخیره شد" : "یادآور ایجاد شد")
      qc.invalidateQueries({ queryKey: ["reminders"] })
      onCreated?.()
      onOpenChange(false)
    },
    onError: () => {
      toast.error(isEdit ? "ذخیره تغییرات ناموفق بود" : "ایجاد یادآور ناموفق بود")
    },
    onSettled: () => setSubmitting(false),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error("عنوان یادآور الزامی است")
      return
    }
    if (!dueDate || !dueTime) {
      toast.error("تاریخ و ساعت سررسید الزامی است")
      return
    }
    setSubmitting(true)
    submitMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "ویرایش یادآور" : "یادآور جدید"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "جزئیات یادآور را به‌روزرسانی کنید."
              : "برای خودتان یک یادآور زمان‌بندی کنید."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="r-title">عنوان</Label>
            <Input
              id="r-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلاً: تماس با مشتری برای تأیید زمان"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-note">توضیحات (اختیاری)</Label>
            <Textarea
              id="r-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="توضیحات تکمیلی..."
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>تاریخ سررسید</Label>
              <JalaliDatePicker value={dueDate} onChange={setDueDate} placeholder="انتخاب تاریخ" />
            </div>
            <div className="space-y-1.5">
              <Label>ساعت سررسید</Label>
              <TimeWheelPicker value={dueTime} onChange={setDueTime} />
            </div>
          </div>
          {dueDate && dueTime && (
            <p className="text-[11px] text-muted-foreground">
              سررسید: {formatDateTime(combineDateTime(dueDate, dueTime))}
            </p>
          )}

          <div className="space-y-2">
            <Label>پیوند (اختیاری)</Label>
            <CustomerCombobox value={customerId} onChange={setCustomerId} />
            <ProjectCombobox
              value={projectId}
              onChange={setProjectId}
              customerId={customerId}
            />
            <UserCombobox value={userId} onChange={setUserId} />
            <p className="text-[11px] text-muted-foreground">
              می‌توانید مشتری، پروژه و کاربر را به‌صورت ترکیبی انتخاب کنید یا هیچکدام را انتخاب نکنید.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              انصراف
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "در حال ذخیره..."
                : isEdit
                ? "ذخیره تغییرات"
                : "ذخیره یادآور"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Combine a date-only ISO string (at 12:00 local) with "HH:MM" into an ISO datetime. */
function combineDateTime(dateIso: string, hhmm: string): string {
  const d = new Date(dateIso)
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10))
  d.setHours(h || 0, m || 0, 0, 0)
  return d.toISOString()
}

// ----------------------------- ReRemindDialog ----------------------------- //

interface ReRemindDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  reminder: ReminderItem | null
}

function ReRemindDialog({ open, onOpenChange, reminder }: ReRemindDialogProps) {
  const api = useApi()
  const qc = useQueryClient()
  const [dueDate, setDueDate] = React.useState<string | null>(null)
  const [dueTime, setDueTime] = React.useState<string>("")
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setDueDate(null)
      setDueTime("")
      setSubmitting(false)
    }
  }, [open])

  const mut = useMutation({
    mutationFn: async () => {
      if (!reminder || !dueDate || !dueTime) return
      const dueAt = combineDateTime(dueDate, dueTime)
      return api.patch(`/api/reminders/${reminder.id}`, { dueAt })
    },
    onSuccess: () => {
      toast.success("یادآور مجدداً زمان‌بندی شد")
      qc.invalidateQueries({ queryKey: ["reminders"] })
      onOpenChange(false)
    },
    onError: () => toast.error("به‌روزرسانی ناموفق بود"),
    onSettled: () => setSubmitting(false),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!dueDate || !dueTime) {
      toast.error("تاریخ و ساعت سررسید الزامی است")
      return
    }
    setSubmitting(true)
    mut.mutate()
  }

  if (!reminder) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>باز یادآوری</DialogTitle>
          <DialogDescription>
            زمان جدیدی برای این یادآور انتخاب کنید. این کار وضعیت سررسید گذشته را پاک می‌کند.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="rounded-md border bg-muted/30 p-2 text-xs">
            <div className="font-medium break-words">{reminder.title}</div>
            {reminder.note && (
              <div className="mt-0.5 whitespace-pre-wrap break-words text-muted-foreground">
                {reminder.note}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>تاریخ جدید</Label>
              <JalaliDatePicker value={dueDate} onChange={setDueDate} placeholder="انتخاب تاریخ" />
            </div>
            <div className="space-y-1.5">
              <Label>ساعت جدید</Label>
              <TimeWheelPicker value={dueTime} onChange={setDueTime} />
            </div>
          </div>
          {dueDate && dueTime && (
            <p className="text-[11px] text-muted-foreground">
              سررسید جدید: {formatDateTime(combineDateTime(dueDate, dueTime))}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              انصراف
            </Button>
            <Button type="submit" disabled={submitting}>
              <RefreshCw className="h-4 w-4" />
              {submitting ? "در حال ذخیره..." : "ذخیره زمان جدید"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ----------------------------- SwipeToDeleteRow ----------------------------- //

/**
 * iPhone-style swipe-to-delete wrapper. The caller renders the row content
 * (including a trash icon that calls `onReveal`). When revealed, the content
 * slides to the right by 64px, exposing a red "حذف" panel on the left edge.
 *
 * Clicking the red panel calls `onConfirm` (performs the actual delete).
 * Clicking anywhere else on the content (when revealed) calls `onCancel`.
 *
 * The caller passes a render-prop so it can wire its trash button to
 * `triggerReveal` and hide it when `revealed` is true.
 */
function SwipeToDeleteRow({
  children,
  onReveal,
  onConfirm,
  onCancel,
  revealed,
  className,
  panelWidthClass = "w-16",
  translateClass = "translate-x-16",
  confirmLabel = "حذف",
}: {
  children: (props: { revealed: boolean; triggerReveal: () => void }) => React.ReactNode
  onReveal: () => void
  onConfirm: () => void
  onCancel: () => void
  revealed: boolean
  className?: string
  panelWidthClass?: string
  translateClass?: string
  confirmLabel?: string
}) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Red panel — pinned to the LEFT edge (since the trash icon is on the
          left in RTL). Content slides right to reveal it. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onConfirm()
        }}
        className={cn(
          "absolute inset-y-0 left-0 z-0 flex items-center justify-center bg-rose-600 text-xs font-medium text-white transition-colors hover:bg-rose-700",
          panelWidthClass
        )}
        tabIndex={revealed ? 0 : -1}
        aria-hidden={!revealed}
      >
        {confirmLabel}
      </button>
      <div
        className={cn(
          "relative z-10 bg-card transition-transform duration-200",
          revealed ? translateClass : "translate-x-0"
        )}
        onClick={() => {
          if (revealed) onCancel()
        }}
      >
        {children({ revealed, triggerReveal: onReveal })}
      </div>
    </div>
  )
}

// ----------------------------- ReminderLinks ----------------------------- //

type LinkKey = "customer" | "project" | "user"

function ReminderLinks({
  reminder,
  onToggleTick,
  onRemoveLink,
  onNavigateLink,
}: {
  reminder: ReminderItem
  onToggleTick: (key: LinkKey) => void
  onRemoveLink: (key: LinkKey) => void
  onNavigateLink: (key: LinkKey) => void
}) {
  type LinkEntry = { key: LinkKey; label: string; name: string; checkedAt: string | null }
  const entries: LinkEntry[] = []
  if (reminder.customerId) {
    entries.push({
      key: "customer",
      label: "مشتری",
      name: reminder.customerName || "—",
      checkedAt: reminder.linkCheckmarks?.customer ?? null,
    })
  }
  if (reminder.projectId) {
    entries.push({
      key: "project",
      label: "پروژه",
      name: reminder.projectTitle || "—",
      checkedAt: reminder.linkCheckmarks?.project ?? null,
    })
  }
  if (reminder.userId) {
    entries.push({
      key: "user",
      label: "کاربر",
      name: reminder.userName || "—",
      checkedAt: reminder.linkCheckmarks?.user ?? null,
    })
  }
  if (entries.length === 0) return null

  // Sort: unchecked first; ticked entries sink to the bottom (older tick first).
  entries.sort((a, b) => {
    if (!a.checkedAt && b.checkedAt) return -1
    if (a.checkedAt && !b.checkedAt) return 1
    if (a.checkedAt && b.checkedAt) {
      return new Date(a.checkedAt).getTime() - new Date(b.checkedAt).getTime()
    }
    return 0
  })

  return (
    <div className="mt-1.5 min-w-0 rounded border border-dashed bg-muted/20 p-1.5">
      <div className="mb-1 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Link2 className="h-2.5 w-2.5" />
        <span>پیوندها</span>
      </div>
      <ul className="space-y-1">
        {entries.map((e) => {
          const ticked = !!e.checkedAt
          return (
            <li key={e.key} className="flex min-w-0 items-start gap-1.5 text-[11px]">
              <Checkbox
                checked={ticked}
                onCheckedChange={() => onToggleTick(e.key)}
                className="mt-0.5 size-3.5"
                aria-label="تیک زدن پیوند"
              />
              <button
                type="button"
                onClick={() => onNavigateLink(e.key)}
                className={cn(
                  "flex min-w-0 flex-1 items-start gap-1 text-right hover:underline",
                  ticked && "text-muted-foreground line-through"
                )}
                title={`${e.label}: ${e.name}`}
              >
                <span className="shrink-0 text-muted-foreground">{e.label}:</span>
                <span className="min-w-0 break-words">{e.name}</span>
              </button>
              <button
                type="button"
                onClick={() => onRemoveLink(e.key)}
                aria-label="حذف پیوند"
                className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground/60 hover:bg-rose-500/10 hover:text-rose-600"
              >
                <X className="size-3" />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ----------------------------- SendNotificationDialog ----------------------------- //

interface SendNotificationDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
}

function SendNotificationDialog({ open, onOpenChange }: SendNotificationDialogProps) {
  const api = useApi()
  const qc = useQueryClient()

  const [recipientId, setRecipientId] = React.useState("")
  const [title, setTitle] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setRecipientId("")
      setTitle("")
      setMessage("")
      setSubmitting(false)
    }
  }, [open])

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["users-for-message", open],
    enabled: open,
    queryFn: async () => {
      try {
        return await api.get<Array<{ id: string; firstName: string; lastName: string; role: string }>>("/api/users")
      } catch {
        return []
      }
    },
  })

  const usersList = users ?? []

  const sendMutation = useMutation({
    mutationFn: async () => {
      return api.post("/api/notifications", {
        userId: recipientId,
        title: title.trim(),
        message: message.trim(),
        type: "info",
      })
    },
    onSuccess: () => {
      toast.success("پیام ارسال شد")
      qc.invalidateQueries({ queryKey: ["notifications"] })
      onOpenChange(false)
    },
    onError: () => {
      toast.error("ارسال پیام ناموفق بود")
    },
    onSettled: () => setSubmitting(false),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipientId) {
      toast.error("گیرنده را انتخاب کنید")
      return
    }
    if (!title.trim()) {
      toast.error("عنوان پیام الزامی است")
      return
    }
    if (!message.trim()) {
      toast.error("متن پیام الزامی است")
      return
    }
    setSubmitting(true)
    sendMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ارسال پیام به عضو تیم</DialogTitle>
          <DialogDescription>یک اعلان اطلاع‌رسانی برای همکار خود ارسال کنید.</DialogDescription>
        </DialogHeader>
        {usersLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : usersList.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            <AlertCircle className="mx-auto mb-2 h-5 w-5" />
            برای نقش فعلی شما لیست کاربران در دسترس نیست. این قابلیت برای نقش‌های مدیر و مدیر سیستم فعال است.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>گیرنده</Label>
              <Select value={recipientId} onValueChange={setRecipientId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="انتخاب کاربر..." />
                </SelectTrigger>
                <SelectContent>
                  {usersList.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} — {u.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="n-title">عنوان</Label>
              <Input
                id="n-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="موضوع پیام"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="n-msg">متن پیام</Label>
              <Textarea
                id="n-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="متن پیام..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
                انصراف
              </Button>
              <Button type="submit" disabled={submitting}>
                <Send className="h-4 w-4" />
                {submitting ? "در حال ارسال..." : "ارسال پیام"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ----------------------------- NotificationsPanel ----------------------------- //

interface NotificationsPanelProps {
  /** Called when a notification with a navigatable link is clicked. */
  onNavigate?: () => void
  /** Optional className for the panel root. */
  className?: string
}

export function NotificationsPanel({ onNavigate, className }: NotificationsPanelProps) {
  const api = useApi()
  const qc = useQueryClient()
  const { setPage, openProject, openCustomer } = useWorkspace()

  const [reminderDialogOpen, setReminderDialogOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<ReminderItem | null>(null)
  const [reRemindTarget, setReRemindTarget] = React.useState<ReminderItem | null>(null)
  const [reRemindOpen, setReRemindOpen] = React.useState(false)
  const [sendDialogOpen, setSendDialogOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"notifications" | "reminders">("notifications")
  // Tracks the id of the row whose red "حذف" panel is currently revealed.
  const [revealedNotifId, setRevealedNotifId] = React.useState<string | null>(null)
  const [revealedReminderId, setRevealedReminderId] = React.useState<string | null>(null)

  // ---------- Notifications ----------
  const { data: notifData, isLoading: notifsLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<{ items: NotificationItem[] }>("/api/notifications"),
    refetchInterval: 30_000,
  })
  const notifications = notifData?.items ?? []
  const unreadCount = notifications.filter((n) => !n.read).length

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => api.patch(`/api/notifications/${id}`, { read: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    onError: () => toast.error("به‌روزرسانی اعلان ناموفق بود"),
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => api.post("/api/notifications/read-all"),
    onSuccess: () => {
      toast.success("همه اعلان‌ها خوانده شدند")
      qc.invalidateQueries({ queryKey: ["notifications"] })
    },
    onError: () => toast.error("عملیات ناموفق بود"),
  })

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => api.del(`/api/notifications/${id}`),
    onSuccess: () => {
      setRevealedNotifId(null)
      qc.invalidateQueries({ queryKey: ["notifications"] })
    },
    onError: (e: Error) => toast.error(e.message || "حذف اعلان ناموفق بود"),
  })

  const confirmPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) =>
      api.patch(`/api/payments/${paymentId}`, { isConfirmed: true }),
    onSuccess: async (_data, paymentId) => {
      // Mark the notification as no-longer-requiring-action and read.
      const notif = notifications.find((n) => n.refId === paymentId)
      if (notif) {
        try {
          await api.patch(`/api/notifications/${notif.id}`, {
            read: true,
            requiresAction: false,
          })
        } catch { /* best-effort */ }
      }
      toast.success("پرداخت تأیید شد")
      qc.invalidateQueries({ queryKey: ["notifications"] })
    },
    onError: () => toast.error("تأیید پرداخت ناموفق بود"),
  })

  const rejectPayment = async (notif: NotificationItem) => {
    try {
      await api.patch(`/api/notifications/${notif.id}`, {
        read: true,
        requiresAction: false,
      })
      toast.success("پرداخت رد شد")
      qc.invalidateQueries({ queryKey: ["notifications"] })
    } catch {
      toast.error("عملیات ناموفق بود")
    }
  }

  const handleNotificationClick = (n: NotificationItem) => {
    if (n.requiresAction) {
      // Don't navigate; the user needs to act via the inline buttons.
      return
    }
    if (!n.read) markReadMutation.mutate(n.id)
    if (isNavigatable(n.link)) {
      if (n.link === "projects" && n.refId) {
        openProject(n.refId)
      } else if (n.link === "customers" && n.refId) {
        openCustomer(n.refId)
      } else {
        setPage(n.link)
      }
      onNavigate?.()
    }
  }

  // ---------- Reminders ----------
  const { data: remData, isLoading: remsLoading } = useQuery({
    queryKey: ["reminders"],
    queryFn: () => api.get<{ items: ReminderItem[] }>("/api/reminders"),
    refetchInterval: 60_000,
  })
  const reminders = remData?.items ?? []
  const pendingReminders = reminders.filter((r) => !r.done).length

  const toggleReminderMutation = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) =>
      api.patch(`/api/reminders/${id}`, { done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
    onError: () => toast.error("به‌روزرسانی یادآور ناموفق بود"),
  })

  const deleteReminderMutation = useMutation({
    mutationFn: async (id: string) => api.del(`/api/reminders/${id}`),
    onSuccess: () => {
      toast.success("یادآور حذف شد")
      setRevealedReminderId(null)
      qc.invalidateQueries({ queryKey: ["reminders"] })
    },
    onError: () => toast.error("حذف یادآور ناموفق بود"),
  })

  // Tick a link: set checkedAt=now (or null to un-tick).
  const tickLinkMutation = useMutation({
    mutationFn: async ({ id, key, current }: { id: string; key: LinkKey; current: string | null | undefined }) => {
      // Build the new linkCheckmarks map (with this key toggled) and send as full replace.
      // We don't have the full existing map server-side per row, so we send a
      // partial update that the API merges.
      const next = current ? null : new Date().toISOString()
      return api.patch(`/api/reminders/${id}`, {
        linkCheckmarks: { [key]: next },
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
    onError: () => toast.error("به‌روزرسانی پیوند ناموفق بود"),
  })

  // Manual X delete: ask server to remove the link from linkType/linkId + linkCheckmarks.
  const removeLinkMutation = useMutation({
    mutationFn: async ({ id, key }: { id: string; key: LinkKey }) =>
      api.patch(`/api/reminders/${id}`, { removeLink: key }),
    onSuccess: () => {
      toast.success("پیوند حذف شد")
      qc.invalidateQueries({ queryKey: ["reminders"] })
    },
    onError: () => toast.error("حذف پیوند ناموفق بود"),
  })

  const handleReminderLinkNavigate = (r: ReminderItem, key: LinkKey) => {
    if (key === "customer" && r.customerId) openCustomer(r.customerId)
    else if (key === "project" && r.projectId) openProject(r.projectId)
    else if (key === "user") setPage("settings-users")
    onNavigate?.()
  }

  const openEdit = (r: ReminderItem) => {
    setEditTarget(r)
    setReminderDialogOpen(true)
  }

  const openReRemind = (r: ReminderItem) => {
    setReRemindTarget(r)
    setReRemindOpen(true)
  }

  const handleNewReminder = () => {
    setEditTarget(null)
    setReminderDialogOpen(true)
  }

  return (
    <div className={cn("w-[360px] sm:w-[420px]", className)}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "notifications" | "reminders")}>
        <div className="flex items-center justify-between gap-2 px-1 pb-2">
          <TabsList className="h-8">
            <TabsTrigger value="notifications" className="gap-1.5 px-3 text-xs">
              <Bell className="h-3.5 w-3.5" />
              اعلان‌ها
              {unreadCount > 0 && (
                <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                  {toPersianDigits(unreadCount)}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reminders" className="gap-1.5 px-3 text-xs">
              <Clock className="h-3.5 w-3.5" />
              یادآورهای من
              {pendingReminders > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {toPersianDigits(pendingReminders)}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ---------- Notifications tab ---------- */}
        <TabsContent value="notifications" className="mt-0">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] text-muted-foreground">
              {toPersianDigits(notifications.length)} اعلان
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 px-2 text-[11px]"
                onClick={() => setSendDialogOpen(true)}
              >
                <Send className="h-3 w-3" />
                ارسال پیام
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 px-2 text-[11px]"
                onClick={() => markAllReadMutation.mutate()}
                disabled={unreadCount === 0 || markAllReadMutation.isPending}
              >
                <CheckCheck className="h-3 w-3" />
                خواندن همه
              </Button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto rounded-md border bg-card/40">
            {notifsLoading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <Bell className="mb-2 h-7 w-7 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">اعلانی برای نمایش وجود ندارد</p>
              </div>
            ) : (
              <div>
                {notifications.map((n) => {
                  const accent = NOTIFICATION_ACCENT[n.type] ?? NOTIFICATION_ACCENT.info
                  const isActionable = !!n.requiresAction
                  const isPayment = n.type === "payment_approval"
                  const row = ({ revealed, triggerReveal }: { revealed: boolean; triggerReveal: () => void }) => (
                    <div
                      className={cn(
                        "group relative flex min-w-0 gap-2 overflow-hidden p-2.5 transition-colors",
                        !n.read && !isActionable && "bg-muted/40",
                        n.read && "opacity-70",
                        isActionable ? "cursor-default" : "cursor-pointer hover:bg-muted/60"
                      )}
                      onClick={() => handleNotificationClick(n)}
                    >
                      {!n.read && (
                        <span
                          className="absolute left-1.5 top-3 h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: accent }}
                          aria-hidden
                        />
                      )}
                      <div
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                        style={{ background: accent + "22", color: accent }}
                      >
                        {NOTIFICATION_ICON[n.type] ?? NOTIFICATION_ICON.info}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 break-words text-xs font-semibold">{n.title}</div>
                          <div className="shrink-0 text-[10px] text-muted-foreground/70">
                            {timeAgo(n.createdAt)}
                          </div>
                        </div>
                        <p className="mt-0.5 min-w-0 whitespace-pre-line break-words text-[11px] text-muted-foreground">
                          {n.message}
                        </p>

                        {isActionable && (
                          <div className="mt-1.5">
                            <Badge
                              variant="outline"
                              className="gap-1 border-amber-500/40 bg-amber-500/10 px-1.5 text-[10px] text-amber-700 dark:text-amber-300"
                            >
                              <AlertCircle className="h-2.5 w-2.5" />
                              نیازمند اقدام
                              {n.actionLabel ? ` · ${n.actionLabel}` : ""}
                            </Badge>
                          </div>
                        )}

                        {isPayment && isActionable && (
                          <div
                            className="mt-1.5 flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="sm"
                              variant="default"
                              className="h-6 gap-1 px-2 text-[10px]"
                              onClick={() => n.refId && confirmPaymentMutation.mutate(n.refId)}
                              disabled={confirmPaymentMutation.isPending}
                            >
                              <Check className="h-3 w-3" />
                              تأیید
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 gap-1 px-2 text-[10px]"
                              onClick={() => rejectPayment(n)}
                            >
                              <X className="h-3 w-3" />
                              رد
                            </Button>
                          </div>
                        )}

                        {/* Seen button for view-only (non-actionable) notifications */}
                        {!isActionable && !n.read && (
                          <div
                            className="mt-1.5 flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 gap-1 px-2 text-[10px] text-muted-foreground"
                              onClick={() => markReadMutation.mutate(n.id)}
                              disabled={markReadMutation.isPending}
                            >
                              <Check className="h-3 w-3" />
                              دیده شد
                            </Button>
                          </div>
                        )}

                        {isNavigatable(n.link) && !isActionable && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                            <ExternalLink className="h-3 w-3" />
                            <span>مشاهده</span>
                          </div>
                        )}
                      </div>

                      {/* Trash button — hidden while revealed (the red panel takes over).
                          Hidden for action-required notifications (cannot delete until action done). */}
                      {!isActionable && !revealed && (
                        <button
                          type="button"
                          aria-label="حذف اعلان"
                          className="absolute left-1 top-1 rounded p-1 text-muted-foreground/60 opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            triggerReveal()
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )

                  if (isActionable) {
                    // Action-required notifications cannot be swipe-deleted; render plainly.
                    return (
                      <div key={n.id} className="border-b border-border last:border-b-0">
                        {row({ revealed: false, triggerReveal: () => {} })}
                      </div>
                    )
                  }

                  return (
                    <div key={n.id} className="border-b border-border last:border-b-0">
                      <SwipeToDeleteRow
                        revealed={revealedNotifId === n.id}
                        onReveal={() => setRevealedNotifId(n.id)}
                        onCancel={() => setRevealedNotifId(null)}
                        onConfirm={() => deleteNotificationMutation.mutate(n.id)}
                      >
                        {row}
                      </SwipeToDeleteRow>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ---------- Reminders tab ---------- */}
        <TabsContent value="reminders" className="mt-0">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] text-muted-foreground">
              {toPersianDigits(reminders.length)} یادآور
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-[11px]"
              onClick={handleNewReminder}
            >
              <Plus className="h-3 w-3" />
              افزودن یادآور
            </Button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto rounded-md border bg-card/40">
            {remsLoading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : reminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <Clock className="mb-2 h-7 w-7 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">یادآوری ثبت نشده است</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 h-7 gap-1 text-[11px]"
                  onClick={handleNewReminder}
                >
                  <Plus className="h-3 w-3" />
                  اولین یادآور را بسازید
                </Button>
              </div>
            ) : (
              <div>
                {reminders.map((r) => {
                  const overdue = !r.done && new Date(r.dueAt).getTime() < Date.now()
                  const hasLink = !!(r.customerId || r.projectId || r.userId)
                  return (
                    <div key={r.id} className="border-b border-border last:border-b-0">
                      <SwipeToDeleteRow
                        revealed={revealedReminderId === r.id}
                        onReveal={() => setRevealedReminderId(r.id)}
                        onCancel={() => setRevealedReminderId(null)}
                        onConfirm={() => deleteReminderMutation.mutate(r.id)}
                      >
                        {({ revealed, triggerReveal }) => (
                          <div className="group flex min-w-0 items-start gap-2 p-2.5">
                            <Checkbox
                              checked={r.done}
                              onCheckedChange={(v) =>
                                toggleReminderMutation.mutate({ id: r.id, done: Boolean(v) })
                              }
                              className="mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div
                                  className={cn(
                                    "min-w-0 break-words text-xs font-medium",
                                    r.done && "text-muted-foreground line-through",
                                    overdue && !r.done && "text-rose-600 dark:text-rose-400"
                                  )}
                                >
                                  {overdue && !r.done && (
                                    <span
                                      className="ml-1 inline-block h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full bg-rose-500 align-middle"
                                      aria-hidden
                                    />
                                  )}
                                  {r.title}
                                </div>
                                <div className="flex shrink-0 items-center gap-0.5">
                                  {overdue && !revealed && (
                                    <button
                                      type="button"
                                      aria-label="باز یادآوری"
                                      title="باز یادآوری"
                                      className="rounded p-1 text-muted-foreground/70 opacity-0 hover:bg-amber-500/10 hover:text-amber-600 group-hover:opacity-100"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openReRemind(r)
                                      }}
                                    >
                                      <RefreshCw className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  {!revealed && (
                                    <button
                                      type="button"
                                      aria-label="ویرایش یادآور"
                                      title="ویرایش"
                                      className="rounded p-1 text-muted-foreground/70 opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openEdit(r)
                                      }}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  {!revealed && (
                                    <button
                                      type="button"
                                      aria-label="حذف یادآور"
                                      title="حذف"
                                      className="rounded p-1 text-muted-foreground/70 opacity-0 hover:bg-rose-500/10 hover:text-rose-600 group-hover:opacity-100"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        triggerReveal()
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              {r.note && (
                                <p className="mt-0.5 min-w-0 whitespace-pre-wrap break-words text-[11px] text-muted-foreground">
                                  {r.note}
                                </p>
                              )}
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded px-1.5 py-0.5",
                                    overdue && !r.done
                                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                      : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  <Clock className="h-2.5 w-2.5" />
                                  {formatDateTime(r.dueAt)}
                                </span>
                                {overdue && !r.done && (
                                  <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-1.5 py-0.5 text-rose-600 dark:text-rose-400">
                                    <AlertCircle className="h-2.5 w-2.5" />
                                    سررسید گذشته
                                  </span>
                                )}
                                {r.done && (
                                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-400">
                                    <Check className="h-2.5 w-2.5" />
                                    انجام شد
                                  </span>
                                )}
                              </div>
                              {hasLink && (
                                <ReminderLinks
                                  reminder={r}
                                  onToggleTick={(key) =>
                                    tickLinkMutation.mutate({
                                      id: r.id,
                                      key,
                                      current: r.linkCheckmarks?.[key],
                                    })
                                  }
                                  onRemoveLink={(key) =>
                                    removeLinkMutation.mutate({ id: r.id, key })
                                  }
                                  onNavigateLink={(key) => handleReminderLinkNavigate(r, key)}
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </SwipeToDeleteRow>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        editTarget={editTarget}
      />
      <ReRemindDialog
        open={reRemindOpen}
        onOpenChange={setReRemindOpen}
        reminder={reRemindTarget}
      />
      <SendNotificationDialog open={sendDialogOpen} onOpenChange={setSendDialogOpen} />
    </div>
  )
}

// Re-export for convenience.
export { ReminderDialog as ReminderDialogComponent }
