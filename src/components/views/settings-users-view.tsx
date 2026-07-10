"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil } from "lucide-react"
import { toast } from "sonner"

import { useApi } from "@/lib/api/client"
import { useWorkspace } from "@/stores/workspace"
import { ROLES, ROLE_LABELS, ROLE_PERMISSIONS } from "@/lib/constants"
import { cn } from "@/lib/utils"

import { PageHeader, EmptyState, StatCard, SectionCard } from "./_shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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

const ROLE_BADGE: Record<Role, string> = {
  admin: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  manager: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  sales: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  photographer: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  editor: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  qc: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
  logistics: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
}

function initials(u: { firstName: string; lastName: string }) {
  return `${u.firstName.charAt(0)}${u.lastName.charAt(0)}`.toUpperCase()
}

export function SettingsUsersView() {
  const role = useWorkspace((s) => s.role)
  const canManage = ROLE_PERMISSIONS[role]?.users
  const canView = role === "admin" || role === "manager"
  const api = useApi()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => api.get("/api/users"),
    enabled: canView,
  })

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<User | null>(null)
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

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
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
    </div>
  )
}

const ROLE_ACCENT: Record<Role, string> = {
  admin: "#ef4444",
  manager: "#10b981",
  sales: "#0ea5e9",
  photographer: "#f59e0b",
  editor: "#a855f7",
  qc: "#ec4899",
  logistics: "#64748b",
}
