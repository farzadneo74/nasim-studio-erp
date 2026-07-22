"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Check, X, CalendarDays } from "lucide-react"
import { toast } from "sonner"

import { useApi } from "@/lib/api/client"
import { useWorkspace } from "@/stores/workspace"
import { ROLES, ROLE_LABELS, ROLE_BADGE_COLORS, hasPermission, LEAVE_STATUSES, LEAVE_STATUS_LABELS } from "@/lib/constants"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

import { PageHeader, EmptyState, SectionCard } from "./_shared"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

type Role = (typeof ROLES)[number]
type LeaveStatus = (typeof LEAVE_STATUSES)[number]

interface LeaveUser {
  id: string
  firstName: string
  lastName: string
  phone: string
  role: Role
  isAvailable: boolean
}

interface LeaveApprover {
  id: string
  firstName: string
  lastName: string
}

interface LeaveRequest {
  id: string
  userId: string
  user: LeaveUser
  approverId: string | null
  approver: LeaveApprover | null
  startDate: string
  endDate: string
  reason: string | null
  status: LeaveStatus
  createdAt: string
  updatedAt: string
}

const ROLE_BADGE = ROLE_BADGE_COLORS

const STATUS_BADGE: Record<LeaveStatus, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
}

function initials(u: { firstName: string; lastName: string }) {
  return `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase()
}

export function SettingsLeavesView() {
  const role = useWorkspace((s) => s.role)
  const canView = hasPermission(role, "employees")
  const api = useApi()
  const qc = useQueryClient()

  const [statusFilter, setStatusFilter] = React.useState<"all" | LeaveStatus>("all")

  const { data, isLoading } = useQuery<LeaveRequest[]>({
    queryKey: ["leaves", statusFilter],
    queryFn: () => {
      const qs = statusFilter !== "all" ? `?status=${statusFilter}` : ""
      return api.get(`/api/leaves${qs}`)
    },
    enabled: canView,
  })

  const patchMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const res = await fetch(`/api/leaves/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": role },
        body: JSON.stringify({ status }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      }
      return { ...d, _status: status } as { _status: "approved" | "rejected" }
    },
    onSuccess: (d) => {
      if (d._status === "approved") {
        toast.success("مرخصی تأیید شد", {
          description: "کاربر برای مدت مرخصی خارج از دسترس علامت گذاشته شد.",
        })
      } else {
        toast.success("مرخصی رد شد")
      }
      qc.invalidateQueries({ queryKey: ["leaves"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!canView) {
    return (
      <EmptyState
        icon="🔒"
        title="دسترسی محدود"
        description="فقط مدیران سیستم و مدیران می‌توانند درخواست‌های مرخصی را بررسی کنند."
      />
    )
  }

  const upcoming = (data || [])
    .filter((l) => l.status === "approved" && new Date(l.endDate) >= new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5)

  return (
    <div>
      <PageHeader
        title="درخواست مرخصی"
        icon="🌴"
        description="تأیید یا رد مرخصی تیم"
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <CountCard
          label="در انتظار"
          value={(data || []).filter((l) => l.status === "pending").length}
          accent="#f59e0b"
        />
        <CountCard
          label="تأیید شده"
          value={(data || []).filter((l) => l.status === "approved").length}
          accent="#10b981"
        />
        <CountCard
          label="رد شده"
          value={(data || []).filter((l) => l.status === "rejected").length}
          accent="#ef4444"
        />
      </div>

      <Tabs
        value={statusFilter}
        onValueChange={(v) => setStatusFilter(v as "all" | LeaveStatus)}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="all">همه</TabsTrigger>
          <TabsTrigger value="pending">در انتظار</TabsTrigger>
          <TabsTrigger value="approved">تأیید شده</TabsTrigger>
          <TabsTrigger value="rejected">رد شده</TabsTrigger>
        </TabsList>
      </Tabs>

      <SectionCard title="درخواست‌ها">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon="🌴"
            title="هیچ درخواست مرخصی وجود ندارد"
            description="هنگامی که اعضای تیم درخواست مرخصی بدهند، برای تأیید اینجا نمایش داده می‌شود."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">کاربر</TableHead>
                  <TableHead>شروع</TableHead>
                  <TableHead>پایان</TableHead>
                  <TableHead className="min-w-[200px]">دلیل</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead className="text-right">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-muted text-xs font-medium">
                            {initials(l.user)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {l.user.firstName} {l.user.lastName}
                          </div>
                          <span
                            className={cn(
                              "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                              ROLE_BADGE[l.user.role as Role]
                            )}
                          >
                            {ROLE_LABELS[l.user.role as Role]}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(l.startDate)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(l.endDate)}
                    </TableCell>
                    <TableCell className="max-w-xs text-sm text-muted-foreground">
                      <span className="line-clamp-2">{l.reason || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                          STATUS_BADGE[l.status as LeaveStatus]
                        )}
                      >
                        {LEAVE_STATUS_LABELS[l.status as LeaveStatus]}
                      </span>
                      {l.approver && (
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          توسط {l.approver.firstName} {l.approver.lastName}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {l.status === "pending" ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950"
                            disabled={patchMut.isPending}
                            onClick={() =>
                              patchMut.mutate({ id: l.id, status: "approved" })
                            }
                          >
                            <Check className="mr-1 h-3.5 w-3.5" />
                            تأیید
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"
                            disabled={patchMut.isPending}
                            onClick={() =>
                              patchMut.mutate({ id: l.id, status: "rejected" })
                            }
                          >
                            <X className="mr-1 h-3.5 w-3.5" />
                            رد
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {upcoming.length > 0 && (
        <div className="mt-4">
          <SectionCard
            title="مرخصی‌های تأییدشده پیش رو"
            description="اعضای تیمی که به‌زودی خارج از دسترس خواهند بود"
          >
            <div className="space-y-2">
              {upcoming.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {l.user.firstName} {l.user.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(l.startDate)} → {formatDate(l.endDate)}
                      {l.reason ? ` · ${l.reason}` : ""}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                      ROLE_BADGE[l.user.role as Role]
                    )}
                  >
                    {ROLE_LABELS[l.user.role as Role]}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  )
}

function CountCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: accent }}
          aria-hidden
        />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}

