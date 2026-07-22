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
  X,
  ExternalLink,
  AlertCircle,
  Pencil,
  RotateCcw,
} from "lucide-react"
import { toast } from "sonner"

import { useApi } from "@/lib/api/client"
import { useWorkspace } from "@/stores/workspace"
import { formatDateTime, timeAgo, toPersianDigits } from "@/lib/format"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ReminderDialog } from "@/components/workspace/notifications-panel"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { JalaliDatePicker } from "./_jalali-date-picker/jalali-date-picker"

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
  customerName?: string | null
  projectTitle?: string | null
  userName?: string | null
  linkCheckmarks?: { customer?: string | null; project?: string | null; user?: string | null } | null
  createdAt: string
  updatedAt: string
}

// ----------------------------- Shared bits ----------------------------- //

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

// ----------------------------- RemindersWidget ----------------------------- //

/**
 * A self-contained dashboard widget showing the current user's reminders with
 * add / toggle / delete actions and an inline "add reminder" dialog.
 * Reminders are sorted by dueAt ascending (closest deadline first) — overdue
 * reminders naturally surface at the top.
 */
export function RemindersWidget({ limit = 6 }: { limit?: number }) {
  const api = useApi()
  const qc = useQueryClient()
  const { openProject, openCustomer, setPage } = useWorkspace()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<ReminderItem | null>(null)
  const [reRemindTarget, setReRemindTarget] = React.useState<ReminderItem | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<ReminderItem | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["reminders"],
    queryFn: () => api.get<{ items: ReminderItem[] }>("/api/reminders"),
    refetchInterval: 60_000,
  })
  // Server already sorts by dueAt asc — overdue (past dueAt, not done) at top.
  const reminders = (data?.items ?? []).slice(0, limit)
  const pending = (data?.items ?? []).filter((r) => !r.done).length
  const overdue = (data?.items ?? []).filter((r) => !r.done && new Date(r.dueAt).getTime() < Date.now()).length

  const toggleMutation = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) =>
      api.patch(`/api/reminders/${id}`, { done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
    onError: () => toast.error("به‌روزرسانی یادآور ناموفق بود"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.del(`/api/reminders/${id}`),
    onSuccess: () => {
      toast.success("یادآور حذف شد")
      qc.invalidateQueries({ queryKey: ["reminders"] })
    },
    onError: () => toast.error("حذف ناموفق بود"),
  })

  const toggleLinkTickMutation = useMutation({
    mutationFn: async ({ id, linkKey }: { id: string; linkKey: "customer" | "project" | "user" }) => {
      const r = reminders.find((x) => x.id === id)
      if (!r) return
      const cm = { ...(r.linkCheckmarks || {}) }
      const key = linkKey as keyof typeof cm
      cm[key] = cm[key] ? null : new Date().toISOString()
      return api.patch(`/api/reminders/${id}`, { linkCheckmarks: cm })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
    onError: () => toast.error("به‌روزرسانی پیوند ناموفق بود"),
  })

  const removeLinkMutation = useMutation({
    mutationFn: async ({ id, linkKey }: { id: string; linkKey: "customer" | "project" | "user" }) => {
      const r = reminders.find((x) => x.id === id)
      if (!r) return
      const cm = { ...(r.linkCheckmarks || {}) }
      const key = linkKey as keyof typeof cm
      delete cm[key]
      const patch: Record<string, unknown> = { linkCheckmarks: cm }
      if (linkKey === "customer") patch.customerId = null
      if (linkKey === "project") patch.projectId = null
      if (linkKey === "user") patch.userId = null
      return api.patch(`/api/reminders/${id}`, patch)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }),
    onError: () => toast.error("حذف پیوند ناموفق بود"),
  })

  const reRemindMutation = useMutation({
    mutationFn: async ({ id, dueAt }: { id: string; dueAt: string }) =>
      api.patch(`/api/reminders/${id}`, { dueAt, acknowledged: false }),
    onSuccess: () => {
      toast.success("یادآور مجدداً زمان‌بندی شد")
      qc.invalidateQueries({ queryKey: ["reminders"] })
      setReRemindTarget(null)
    },
    onError: () => toast.error("زمان‌بندی مجدد ناموفق بود"),
  })

  const handleLink = (r: ReminderItem) => {
    if (r.customerId) openCustomer(r.customerId)
    else if (r.projectId) openProject(r.projectId)
    else if (r.userId) setPage("settings-users")
  }

  const openEdit = (r: ReminderItem) => {
    setEditTarget(r)
    setDialogOpen(true)
  }

  const openNew = () => {
    setEditTarget(null)
    setDialogOpen(true)
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">یادآورهای من</div>
            <div className="text-[11px] text-muted-foreground">
              {toPersianDigits(pending)} فعال
              {overdue > 0 && (
                <span className="mr-1 text-rose-600 dark:text-rose-400">
                  · {toPersianDigits(overdue)} سررسید گذشته
                </span>
              )}
            </div>
          </div>
        </div>
        <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-[11px]" onClick={openNew}>
          <Plus className="h-3 w-3" />
          یادآور جدید
        </Button>
      </div>

      <div className="p-2">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : reminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <Clock className="mb-2 h-7 w-7 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">هنوز یادآوری ثبت نکرده‌اید</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 h-8 gap-1 text-xs"
              onClick={openNew}
            >
              <Plus className="h-3.5 w-3.5" />
              افزودن یادآور
            </Button>
          </div>
        ) : (
          <div className="max-h-80 divide-y overflow-y-auto pl-1">
            {reminders.map((r) => {
              const isOverdue = !r.done && new Date(r.dueAt).getTime() < Date.now()
              const hasLink = !!(r.customerId || r.projectId || r.userId)
              return (
                <div key={r.id} className="group flex min-w-0 items-start gap-2 p-2.5">
                  <Checkbox
                    checked={r.done}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: r.id, done: Boolean(v) })}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={cn(
                          "min-w-0 flex-1 break-words text-sm font-medium",
                          r.done && "text-muted-foreground line-through",
                          isOverdue && !r.done && "text-rose-600 dark:text-rose-400"
                        )}
                        onClick={() => openEdit(r)}
                        role="button"
                        tabIndex={0}
                      >
                        {isOverdue && !r.done && (
                          <span className="ml-1 inline-block h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full bg-rose-500 align-middle" aria-hidden />
                        )}
                        {r.title}
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          aria-label="ویرایش یادآور"
                          className="rounded p-1 text-muted-foreground/70 hover:bg-muted hover:text-foreground"
                          onClick={() => openEdit(r)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="حذف یادآور"
                          className="rounded p-1 text-muted-foreground/70 hover:bg-rose-500/10 hover:text-rose-600"
                          onClick={() => setDeleteTarget(r)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {r.note && (
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                        {r.note}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded px-1.5 py-0.5",
                          isOverdue && !r.done
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Clock className="h-2.5 w-2.5" />
                        {formatDateTime(r.dueAt)}
                      </span>
                      {isOverdue && !r.done && (
                        <button
                          type="button"
                          onClick={() => setReRemindTarget(r)}
                          className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-700 transition-colors hover:bg-amber-500/25 dark:text-amber-400"
                        >
                          <RotateCcw className="h-2.5 w-2.5" />
                          باز یادآوری
                        </button>
                      )}
                      {isOverdue && !r.done && (
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
                      <div className="mt-1.5">
                        <div className="mb-0.5 text-[10px] font-medium text-muted-foreground">پیوندها</div>
                        <div className="space-y-0.5">
                          {([
                            { key: "customer" as const, label: "مشتری", name: r.customerName, id: r.customerId, checkedAt: r.linkCheckmarks?.customer ?? null },
                            { key: "project" as const, label: "پروژه", name: r.projectTitle, id: r.projectId, checkedAt: r.linkCheckmarks?.project ?? null },
                            { key: "user" as const, label: "کاربر", name: r.userName, id: r.userId, checkedAt: r.linkCheckmarks?.user ?? null },
                          ] as const)
                            .filter((l) => l.id)
                            .sort((a, b) => {
                              // Ticked links go to the end
                              if (a.checkedAt && !b.checkedAt) return 1
                              if (!a.checkedAt && b.checkedAt) return -1
                              return 0
                            })
                            .map((l) => (
                              <div key={l.key} className="flex items-center gap-1.5 text-[10px]">
                                <Checkbox
                                  checked={!!l.checkedAt}
                                  onCheckedChange={() => toggleLinkTickMutation.mutate({ id: r.id, linkKey: l.key })}
                                  className="size-3"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (l.key === "customer") openCustomer(l.id!)
                                    else if (l.key === "project") openProject(l.id!)
                                    else setPage("settings-users")
                                  }}
                                  className={cn(
                                    "min-w-0 flex-1 truncate text-right hover:underline",
                                    l.checkedAt && "text-muted-foreground line-through"
                                  )}
                                >
                                  <span className="font-medium">{l.label}:</span> {l.name || "—"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeLinkMutation.mutate({ id: r.id, linkKey: l.key })}
                                  className="shrink-0 rounded p-0.5 text-muted-foreground/50 hover:bg-rose-500/10 hover:text-rose-600"
                                  aria-label="حذف پیوند"
                                >
                                  <X className="size-3" />
                                </button>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ReminderDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v)
          if (!v) setEditTarget(null)
        }}
        editTarget={editTarget}
      />

      {/* Re-remind dialog */}
      <ReRemindDialog
        target={reRemindTarget}
        onOpenChange={(v) => !v && setReRemindTarget(null)}
        onConfirm={(dueAt) => reRemindTarget && reRemindMutation.mutate({ id: reRemindTarget.id, dueAt })}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>حذف یادآور</DialogTitle>
            <DialogDescription>
              آیا از حذف یادآور «{deleteTarget?.title}» مطمئن هستید؟ این عمل قابل بازگشت نیست.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>لغو</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
                setDeleteTarget(null)
              }}
            >
              {deleteMutation.isPending ? "در حال حذف..." : "حذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ----------------------------- ReRemindDialog ----------------------------- //
function ReRemindDialog({
  target,
  onOpenChange,
  onConfirm,
}: {
  target: ReminderItem | null
  onOpenChange: (v: boolean) => void
  onConfirm: (dueAt: string) => void
}) {
  const [dateIso, setDateIso] = React.useState<string>("")
  const [time, setTime] = React.useState<string>("12:00")

  React.useEffect(() => {
    if (target) {
      const d = new Date(target.dueAt)
      // Default to tomorrow same time
      d.setDate(d.getDate() + 1)
      setDateIso(d.toISOString())
      setTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`)
    }
  }, [target])

  const submit = () => {
    if (!dateIso) return
    const d = new Date(dateIso)
    const [h, m] = time.split(":").map(Number)
    d.setHours(h || 12, m || 0, 0, 0)
    onConfirm(d.toISOString())
  }

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>باز یادآوری</DialogTitle>
          <DialogDescription>
            تاریخ و زمان جدیدی برای یادآور «{target?.title}» انتخاب کنید.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 block text-xs">تاریخ</Label>
            <JalaliDatePicker value={dateIso || null} onChange={(iso) => iso && setDateIso(iso)} placeholder="انتخاب تاریخ" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">ساعت</Label>
            <Input
              type="time"
              dir="ltr"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>انصراف</Button>
          <Button onClick={submit} disabled={!dateIso}>
            <RotateCcw className="ml-1 h-3.5 w-3.5" />
            باز یادآوری
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ----------------------------- EnhancedNotificationsWidget ----------------------------- //

/**
 * A self-contained dashboard widget showing the current user's notifications
 * with type-specific icons, unread highlighting, inline payment-approval
 * actions, mark-read, and click-to-navigate.
 */
export function EnhancedNotificationsWidget({ limit = 6 }: { limit?: number }) {
  const api = useApi()
  const qc = useQueryClient()
  const { setPage, openProject, openCustomer } = useWorkspace()

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<{ items: NotificationItem[] }>("/api/notifications"),
    refetchInterval: 30_000,
  })
  const notifications = (data?.items ?? []).slice(0, limit)
  const allUnread = (data?.items ?? []).filter((n) => !n.read).length

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => api.patch(`/api/notifications/${id}`, { read: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    onError: () => toast.error("به‌روزرسانی ناموفق بود"),
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => api.post("/api/notifications/read-all"),
    onSuccess: () => {
      toast.success("همه اعلان‌ها خوانده شدند")
      qc.invalidateQueries({ queryKey: ["notifications"] })
    },
    onError: () => toast.error("عملیات ناموفق بود"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.del(`/api/notifications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
    onError: (e: Error) => toast.error(e.message || "حذف ناموفق بود"),
  })

  const confirmPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) =>
      api.patch(`/api/payments/${paymentId}`, { isConfirmed: true }),
    onSuccess: async (_data, paymentId) => {
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

  const handleClick = (n: NotificationItem) => {
    if (n.requiresAction) {
      // Don't navigate; the user needs to act via the inline buttons.
      return
    }
    if (!n.read) markReadMutation.mutate(n.id)
    if (isNavigatable(n.link)) {
      if (n.link === "projects" && n.refId) openProject(n.refId)
      else if (n.link === "customers" && n.refId) openCustomer(n.refId)
      else setPage(n.link)
    }
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Bell className="h-4 w-4" />
            {allUnread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-semibold text-white">
                {toPersianDigits(allUnread)}
              </span>
            )}
          </div>
          <div>
            <div className="text-sm font-semibold">اعلان‌ها</div>
            <div className="text-[11px] text-muted-foreground">
              {toPersianDigits(allUnread)} خوانده‌نشده
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-[11px]"
          onClick={() => markAllReadMutation.mutate()}
          disabled={allUnread === 0 || markAllReadMutation.isPending}
        >
          <CheckCheck className="h-3 w-3" />
          خواندن همه
        </Button>
      </div>

      <div className="p-2">
        {isLoading ? (
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
          <div className="max-h-80 overflow-y-auto overflow-x-hidden pl-1">
            <div className="divide-y">
              {notifications.map((n) => {
                const accent = NOTIFICATION_ACCENT[n.type] ?? NOTIFICATION_ACCENT.info
                const isActionable = !!n.requiresAction
                const isPayment = n.type === "payment_approval"
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "group relative flex min-w-0 gap-2 overflow-hidden rounded-lg p-2.5 transition-colors",
                      !n.read && !isActionable && "bg-muted/40",
                      n.read && "opacity-70",
                      isActionable ? "cursor-default" : "cursor-pointer hover:bg-muted/60"
                    )}
                    onClick={() => handleClick(n)}
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
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 break-words text-xs font-semibold">{n.title}</div>
                        <div className="shrink-0 text-[10px] text-muted-foreground/70">
                          {timeAgo(n.createdAt)}
                        </div>
                      </div>
                      <p className="mt-0.5 line-clamp-2 whitespace-pre-line break-words text-[11px] text-muted-foreground">
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
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="default"
                            className="h-7 gap-1 px-2.5 text-[10px]"
                            onClick={() => n.refId && confirmPaymentMutation.mutate(n.refId)}
                            disabled={confirmPaymentMutation.isPending}
                          >
                            <Check className="h-3 w-3" />
                            تأیید
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 px-2.5 text-[10px]"
                            onClick={() => rejectPayment(n)}
                          >
                            <X className="h-3 w-3" />
                            رد
                          </Button>
                        </div>
                      )}

                      {/* Action buttons: confirm/reject for actionable, view+delete for all */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {/* View button (for navigatable notifications) */}
                        {isNavigatable(n.link) && !isActionable && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 px-2.5 text-[10px] text-muted-foreground"
                            onClick={() => handleClick(n)}
                          >
                            <ExternalLink className="h-3 w-3" />
                            مشاهده
                          </Button>
                        )}
                        {/* Mark as read for unread non-actionable */}
                        {!isActionable && !n.read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 px-2.5 text-[10px] text-muted-foreground"
                            onClick={() => markReadMutation.mutate(n.id)}
                            disabled={markReadMutation.isPending}
                          >
                            <Check className="h-3 w-3" />
                            دیده شد
                          </Button>
                        )}
                        {/* Delete button — always visible (not hover-only) */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 px-2.5 text-[10px] text-muted-foreground hover:text-rose-600"
                          onClick={() => deleteMutation.mutate(n.id)}
                          disabled={deleteMutation.isPending}
                          aria-label="حذف اعلان"
                        >
                          <Trash2 className="h-3 w-3" />
                          حذف
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const NAVIGATABLE_PAGES = [
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
] as const

type NavPage = (typeof NAVIGATABLE_PAGES)[number]

function isNavigatable(link: string | null | undefined): link is NavPage {
  return !!link && (NAVIGATABLE_PAGES as readonly string[]).includes(link)
}

