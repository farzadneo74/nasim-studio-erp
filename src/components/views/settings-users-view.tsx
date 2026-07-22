"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Calendar } from "lucide-react"
import { toast } from "sonner"

import { useApi } from "@/lib/api/client"
import { useWorkspace } from "@/stores/workspace"
import { ROLES, ROLE_LABELS, ROLE_BADGE_COLORS, hasPermission, STATUS_LABELS, STATUS_COLORS, CATEGORY_LABELS, CATEGORY_COLORS, type ProjectStatus, type PackageCategory } from "@/lib/constants"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

import { PageHeader, EmptyState, StatCard, SectionCard } from "./_shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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

type Role = (typeof ROLES)[number]

interface User {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  role: Role
  isAvailable: boolean
  bankName: string | null
  iban: string | null
  cardNumber: string | null
  address: string | null
}

const ROLE_BADGE = ROLE_BADGE_COLORS

function initials(u: { firstName: string; lastName: string }) {
  return `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase()
}

export function SettingsUsersView() {
  const role = useWorkspace((s) => s.role)
  const canManage = hasPermission(role, "employees_manage")
  const canView = hasPermission(role, "employees")
  const api = useApi()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => api.get("/api/users"),
    enabled: canView,
  })

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<User | null>(null)
  const [bookingUser, setBookingUser] = React.useState<User | null>(null)
  const [createForm, setCreateForm] = React.useState<{
    firstName: string
    lastName: string
    phone: string
    email: string
    role: Role
    isAvailable: boolean
  }>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    role: "photographer",
    isAvailable: true,
  })
  const [editForm, setEditForm] = React.useState<{
    role: Role
    email: string
    bankName: string
    iban: string
    cardNumber: string
    isAvailable: boolean
  }>({
    role: "photographer",
    email: "",
    bankName: "",
    iban: "",
    cardNumber: "",
    isAvailable: true,
  })

  const createMut = useMutation({
    mutationFn: async () => {
      const payload = {
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        phone: createForm.phone.trim(),
        email: createForm.email.trim() || null,
        role: createForm.role,
        isAvailable: createForm.isAvailable,
      }
      if (!payload.firstName) throw new Error("نام الزامی است")
      if (!payload.lastName) throw new Error("نام خانوادگی الزامی است")
      if (!payload.phone) throw new Error("تلفن الزامی است")
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": role },
        body: JSON.stringify(payload),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      }
      return d
    },
    onSuccess: () => {
      toast.success("کاربر با موفقیت ایجاد شد")
      setDialogOpen(false)
      setCreateForm({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        role: "photographer",
        isAvailable: true,
      })
      qc.invalidateQueries({ queryKey: ["users"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const editMut = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error("هیچ کاربری انتخاب نشده است")
      const payload = {
        role: editForm.role,
        email: editForm.email.trim() || null,
        bankName: editForm.bankName.trim() || null,
        iban: editForm.iban.trim() || null,
        cardNumber: editForm.cardNumber.trim() || null,
        isAvailable: editForm.isAvailable,
      }
      const res = await fetch(`/api/users/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": role },
        body: JSON.stringify(payload),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      }
      return d
    },
    onSuccess: () => {
      toast.success("کاربر به‌روزرسانی شد")
      setEditing(null)
      qc.invalidateQueries({ queryKey: ["users"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleAvailableMut = useMutation({
    mutationFn: async (u: User) => {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": role },
        body: JSON.stringify({ isAvailable: !u.isAvailable }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      }
      return d
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
    onError: (e: Error) => toast.error(e.message),
  })

  if (!canView) {
    return (
      <EmptyState
        icon="🔒"
        title="دسترسی محدود"
        description="فقط مدیران سیستم و مدیران می‌توانند لیست تیم را مشاهده کنند."
      />
    )
  }

  const counts = (data || []).reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      <PageHeader
        title="کاربران و مرخصی"
        icon="👥"
        description="اعضای تیم، نقش‌ها و در دسترس بودن"
        actions={
          canManage && (
            <Button
              onClick={() => {
                setEditing(null)
                setDialogOpen(true)
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              کاربر جدید
            </Button>
          )
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {ROLES.map((r) => (
          <StatCard
            key={r}
            label={ROLE_LABELS[r]}
            value={counts[r] || 0}
            accent={ROLE_ACCENT[r]}
          />
        ))}
      </div>

      <SectionCard title="اعضای تیم">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon="👥"
            title="هنوز کاربری وجود ندارد"
            description="برای شروع، اولین عضو تیم خود را اضافه کنید."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">کاربر</TableHead>
                  <TableHead>نقش</TableHead>
                  <TableHead>ایمیل</TableHead>
                  <TableHead className="text-center">در دسترس</TableHead>
                  {canManage && <TableHead className="text-right">عملیات</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-muted text-xs font-medium">
                            {initials(u)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {u.firstName} {u.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">{u.phone}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                          ROLE_BADGE[u.role as Role]
                        )}
                      >
                        {ROLE_LABELS[u.role as Role]}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.email || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {canManage ? (
                        <Switch
                          checked={u.isAvailable}
                          onCheckedChange={() => toggleAvailableMut.mutate(u)}
                          aria-label="تغییر وضعیت در دسترس بودن"
                        />
                      ) : (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-medium",
                            u.isAvailable ? "text-emerald-600" : "text-muted-foreground"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              u.isAvailable ? "bg-emerald-500" : "bg-muted-foreground"
                            )}
                          />
                          {u.isAvailable ? "در دسترس" : "خارج از دسترس"}
                        </span>
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setBookingUser(u)}
                            aria-label="تقویم رزرو"
                            title="تقویم رزرو"
                          >
                            <Calendar className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditing(u)
                              setEditForm({
                                role: u.role as Role,
                                email: u.email || "",
                                bankName: u.bankName || "",
                                iban: u.iban || "",
                                cardNumber: u.cardNumber || "",
                                isAvailable: u.isAvailable,
                              })
                            }}
                            aria-label="ویرایش کاربر"
                          >
                            <Pencil className="h-4 w-4" />
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

      {/* New user dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o)
          if (!o) {
            setCreateForm({
              firstName: "",
              lastName: "",
              phone: "",
              email: "",
              role: "photographer",
              isAvailable: true,
            })
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>کاربر جدید</DialogTitle>
            <DialogDescription>
              یک عضو تیم اضافه کنید. به آن‌ها نقش و وضعیت در دسترس بودن اختصاص داده می‌شود.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="u-first">نام</Label>
              <Input
                id="u-first"
                value={createForm.firstName}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, firstName: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="u-last">نام خانوادگی</Label>
              <Input
                id="u-last"
                value={createForm.lastName}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, lastName: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="u-phone">تلفن</Label>
              <Input
                id="u-phone"
                value={createForm.phone}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="09123456789"
              />
            </div>
            <div>
              <Label htmlFor="u-email">ایمیل (اختیاری)</Label>
              <Input
                id="u-email"
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="name@example.com"
              />
            </div>
            <div>
              <Label>نقش</Label>
              <Select
                value={createForm.role}
                onValueChange={(v) =>
                  setCreateForm((f) => ({ ...f, role: v as Role }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Switch
                id="u-avail"
                checked={createForm.isAvailable}
                onCheckedChange={(v) =>
                  setCreateForm((f) => ({ ...f, isAvailable: v }))
                }
              />
              <Label htmlFor="u-avail" className="cursor-pointer">
                در دسترس برای تخصیص
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              انصراف
            </Button>
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
              {createMut.isPending ? "در حال ایجاد…" : "ایجاد کاربر"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              ویرایش {editing?.firstName} {editing?.lastName}
            </DialogTitle>
            <DialogDescription>
              نقش، اطلاعات تماس، در دسترس بودن و اطلاعات بانکی را به‌روزرسانی کنید.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>نقش</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) => setEditForm((f) => ({ ...f, role: v as Role }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="eu-email">ایمیل</Label>
              <Input
                id="eu-email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="eu-bank">نام بانک</Label>
              <Input
                id="eu-bank"
                value={editForm.bankName}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, bankName: e.target.value }))
                }
                placeholder="مثلاً بانک ملی"
              />
            </div>
            <div>
              <Label htmlFor="eu-card">شماره کارت</Label>
              <Input
                id="eu-card"
                value={editForm.cardNumber}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, cardNumber: e.target.value }))
                }
                placeholder="6037 xxxx xxxx"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="eu-iban">شماره شبا</Label>
              <Input
                id="eu-iban"
                value={editForm.iban}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, iban: e.target.value }))
                }
                placeholder="IRxx xxxx xxxx xxxx xxxx xxxx"
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch
                id="eu-avail"
                checked={editForm.isAvailable}
                onCheckedChange={(v) =>
                  setEditForm((f) => ({ ...f, isAvailable: v }))
                }
              />
              <Label htmlFor="eu-avail" className="cursor-pointer">
                در دسترس برای تخصیص
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              انصراف
            </Button>
            <Button onClick={() => editMut.mutate()} disabled={editMut.isPending}>
              {editMut.isPending ? "در حال ذخیره…" : "ذخیره تغییرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking calendar dialog */}
      <BookingCalendarDialog
        user={bookingUser}
        open={!!bookingUser}
        onOpenChange={(v) => !v && setBookingUser(null)}
      />
    </div>
  )
}

const ROLE_ACCENT: Record<Role, string> = {
  admin: "#ef4444",
  manager: "#f59e0b",
  sales: "#10b981",
  photographer: "#0ea5e9",
  videographer: "#8b5cf6",
  pro_crew: "#d946ef",
  editor: "#14b8a6",
  film_editor: "#06b6d4",
}

// ============================================================
// Booking Calendar Dialog — shows all projects assigned to a user
// ============================================================
function BookingCalendarDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const api = useApi()
  const { openProject } = useWorkspace()

  const { data, isLoading } = useQuery({
    queryKey: ["user-projects", user?.id],
    queryFn: () => api.get<{ items: UserProject[] }>(`/api/users/${user?.id}/projects`),
    enabled: !!user && open,
  })

  const projects = data?.items ?? []

  // Group by date (Jalali date string)
  const grouped = React.useMemo(() => {
    const map = new Map<string, UserProject[]>()
    for (const p of projects) {
      if (!p.startDatetime) continue
      const d = new Date(p.startDatetime)
      const key = d.toISOString().split("T")[0]
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(p)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [projects])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>تقویم رزرو — {user ? `${user.firstName} ${user.lastName}` : ""}</DialogTitle>
          <DialogDescription>
            پروژه‌هایی که این کاربر در تیم آن‌ها قرار دارد. روی هر پروژه کلیک کنید تا جزئیات باز شود.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon="📅"
            title="هیچ رزروی وجود ندارد"
            description="این کاربر هنوز در تیم هیچ پروژه‌ای قرار نگرفته است."
          />
        ) : (
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border bg-muted/30 p-2 text-center">
                <div className="text-lg font-bold">{projects.length}</div>
                <div className="text-[10px] text-muted-foreground">کل پروژه‌ها</div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-2 text-center">
                <div className="text-lg font-bold">{grouped.length}</div>
                <div className="text-[10px] text-muted-foreground">روزهای رزرو</div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-2 text-center">
                <div className="text-lg font-bold text-amber-600">
                  {projects.filter((p) => p.status !== "delivered" && p.status !== "ready").length}
                </div>
                <div className="text-[10px] text-muted-foreground">در حال انجام</div>
              </div>
            </div>

            {/* Project list grouped by date */}
            {grouped.map(([dateKey, items]) => (
              <div key={dateKey}>
                <div className="mb-2 text-xs font-semibold text-muted-foreground">
                  {new Date(dateKey).toLocaleDateString("fa-IR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <div className="space-y-2">
                  {items.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        openProject(p.id)
                        onOpenChange(false)
                      }}
                      className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-right transition hover:bg-muted/40"
                    >
                      <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                        style={{ background: STATUS_COLORS[p.status as ProjectStatus] ?? "#64748b" }}
                      >
                        {new Date(p.startDatetime).toLocaleTimeString("fa-IR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {p.packageTitle}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="truncate">{p.customerName}</span>
                          <span dir="ltr">{p.contractNumber}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge
                          variant="secondary"
                          className="text-[9px]"
                          style={{
                            background: (CATEGORY_COLORS[p.category as PackageCategory] ?? "#64748b") + "22",
                            color: CATEGORY_COLORS[p.category as PackageCategory] ?? "#64748b",
                          }}
                        >
                          {CATEGORY_LABELS[p.category as PackageCategory] ?? p.category}
                        </Badge>
                        <span
                          className="text-[9px] font-medium"
                          style={{ color: STATUS_COLORS[p.status as ProjectStatus] ?? "#64748b" }}
                        >
                          {STATUS_LABELS[p.status as ProjectStatus] ?? p.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>بستن</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface UserProject {
  id: string
  status: string
  startDatetime: string | null
  endDatetime: string | null
  contractNumber: string
  customerName: string
  packageTitle: string
  category: string
}

