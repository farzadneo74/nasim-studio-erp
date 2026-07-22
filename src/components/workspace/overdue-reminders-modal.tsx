"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, Check, Clock, RotateCcw, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { useApi } from "@/lib/api/client"
import { formatDateTime, toPersianDigits } from "@/lib/format"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import { JalaliDatePicker } from "@/components/views/_jalali-date-picker/jalali-date-picker"
import { TimeWheelPicker } from "@/components/views/_time-wheel-picker/time-wheel-picker"

interface ReminderItem {
  id: string
  title: string
  note: string | null
  dueAt: string
  done: boolean
  acknowledged: boolean
  customerId: string | null
  projectId: string | null
  userId: string | null
  createdAt: string
  updatedAt: string
}

/** Combine a date-only ISO string (at 12:00 local) with "HH:MM" into an ISO datetime. */
function combineDateTime(dateIso: string, hhmm: string): string {
  const d = new Date(dateIso)
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10))
  d.setHours(h || 0, m || 0, 0, 0)
  return d.toISOString()
}

/**
 * Full-screen blocking modal that surfaces ALL overdue reminders (dueAt < now,
 * done=false, acknowledged=false). The user CANNOT close the modal or interact
 * with the rest of the site until every overdue reminder is either acknowledged
 * ("فهمیدم") or rescheduled ("یادآوری مجدد").
 *
 * - Acknowledging sets `acknowledged=true` so the lazy auto-delete will purge
 *   the reminder from the DB after 24h.
 * - Rescheduling opens an inline picker for a new dueAt, then PATCHes the
 *   reminder (which clears the acknowledged flag and resets it as a future
 *   reminder).
 */
export function OverdueRemindersModal() {
  const api = useApi()
  const qc = useQueryClient()

  const [rescheduleId, setRescheduleId] = React.useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["reminders", "overdue"],
    queryFn: () => api.get<{ items: ReminderItem[] }>("/api/reminders?overdue=true"),
    refetchInterval: 30_000,
  })

  const overdueItems = data?.items ?? []
  const hasOverdue = overdueItems.length > 0

  const acknowledgeMutation = useMutation({
    mutationFn: async (id: string) =>
      api.patch(`/api/reminders/${id}`, { acknowledged: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders"] })
      qc.invalidateQueries({ queryKey: ["reminders", "overdue"] })
    },
    onError: () => toast.error("ثبت تأیید ناموفق بود"),
  })

  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, dueAt }: { id: string; dueAt: string }) =>
      api.patch(`/api/reminders/${id}`, { dueAt }),
    onSuccess: () => {
      toast.success("یادآور به زمان جدید منتقل شد")
      setRescheduleId(null)
      qc.invalidateQueries({ queryKey: ["reminders"] })
      qc.invalidateQueries({ queryKey: ["reminders", "overdue"] })
    },
    onError: () => toast.error("انتقال یادآور ناموفق بود"),
  })

  // Always force the dialog open when there are overdue reminders. We never
  // let onOpenChange close it. The Dialog's modal prop traps focus + blocks
  // pointer events on the rest of the page.
  const open = hasOverdue || isLoading

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-lg gap-0 overflow-hidden p-0 sm:max-w-lg"
        // Block all close vectors: no overlay click, no Esc.
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        // Hide the default X close button (we provide our own actions only).
        showCloseButton={false}
      >
        <div className="flex items-center gap-3 border-b border-rose-500/30 bg-gradient-to-l from-rose-500/10 via-amber-500/10 to-rose-500/10 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base font-bold text-rose-700 dark:text-rose-300">
              یادآوری‌های سررسیدشده
            </DialogTitle>
            <DialogDescription className="text-xs text-rose-600/80 dark:text-rose-400/80">
              {isLoading
                ? "در حال بررسی یادآوری‌ها…"
                : `${toPersianDigits(overdueItems.length)} یادآور سررسیدشده — لطفاً هر کدام را تأیید یا زمان‌بندی مجدد کنید.`}
            </DialogDescription>
          </div>
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="divide-y">
            {isLoading ? (
              <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                در حال بارگذاری…
              </div>
            ) : (
              overdueItems.map((r) => {
                const isRescheduling = rescheduleId === r.id
                return (
                  <div key={r.id} className="p-4">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <Clock className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="break-words text-sm font-semibold text-rose-700 dark:text-rose-300">
                          {r.title}
                        </div>
                        {r.note && (
                          <p className="mt-1 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                            {r.note}
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-1.5 py-0.5 text-rose-600 dark:text-rose-400">
                            <Clock className="h-2.5 w-2.5" />
                            سررسید: {formatDateTime(r.dueAt)}
                          </span>
                        </div>

                        {isRescheduling ? (
                          <RescheduleForm
                            onCancel={() => setRescheduleId(null)}
                            onSubmit={(dueAt) =>
                              rescheduleMutation.mutate({ id: r.id, dueAt })
                            }
                            submitting={rescheduleMutation.isPending}
                          />
                        ) : (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              className="h-8 gap-1.5 px-3 text-xs"
                              onClick={() => acknowledgeMutation.mutate(r.id)}
                              disabled={
                                acknowledgeMutation.isPending ||
                                rescheduleMutation.isPending
                              }
                            >
                              <Check className="h-3.5 w-3.5" />
                              فهمیدم
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5 px-3 text-xs"
                              onClick={() => setRescheduleId(r.id)}
                              disabled={
                                acknowledgeMutation.isPending ||
                                rescheduleMutation.isPending
                              }
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              یادآوری مجدد
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>

        <div className="border-t bg-muted/30 px-5 py-3 text-[11px] text-muted-foreground">
          تا زمانی که همه یادآوری‌های سررسیدشده را تأیید یا زمان‌بندی مجدد نکنید،
          امکان استفاده از سایر بخش‌های سامانه وجود ندارد.
        </div>

        {/* Allow refetching manually via a hidden button if the user wants */}
        <button
          type="button"
          className="sr-only"
          aria-label="بازخوانی یادآوری‌ها"
          onClick={() => refetch()}
        />
      </DialogContent>
    </Dialog>
  )
}

function RescheduleForm({
  onCancel,
  onSubmit,
  submitting,
}: {
  onCancel: () => void
  onSubmit: (dueAt: string) => void
  submitting: boolean
}) {
  // Use lazy initial state to set defaults once — avoids the useEffect
  // that previously caused "Maximum update depth exceeded" warnings.
  const [date, setDate] = React.useState<string | null>(() => new Date().toISOString())
  const [time, setTime] = React.useState<string>(() => {
    const now = new Date()
    now.setHours(now.getHours() + 1, 0, 0, 0)
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!date || !time) {
      toast.error("تاریخ و ساعت جدید را انتخاب کنید")
      return
    }
    onSubmit(combineDateTime(date, time))
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 rounded-md border bg-card p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[11px]">تاریخ جدید</Label>
          <JalaliDatePicker value={date} onChange={setDate} placeholder="انتخاب تاریخ" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">ساعت جدید</Label>
          <TimeWheelPicker value={time} onChange={setTime} />
        </div>
      </div>
      {date && time && (
        <p className="text-[11px] text-muted-foreground">
          سررسید جدید: {formatDateTime(combineDateTime(date, time))}
        </p>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-xs"
          onClick={onCancel}
          disabled={submitting}
        >
          انصراف
        </Button>
        <Button type="submit" size="sm" className="h-8 px-3 text-xs" disabled={submitting}>
          {submitting ? "در حال ذخیره..." : "ثبت زمان جدید"}
        </Button>
      </div>
    </form>
  )
}

