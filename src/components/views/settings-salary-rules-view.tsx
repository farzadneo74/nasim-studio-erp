"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2, Info } from "lucide-react"
import { toast } from "sonner"

import { useApi } from "@/lib/api/client"
import { useWorkspace } from "@/stores/workspace"
import {
  COMMISSION_TYPES,
  APPLY_ON,
  ROLE_LABELS,
  ROLE_BADGE_COLORS,
  hasPermission,
} from "@/lib/constants"
import { formatRials } from "@/lib/format"
import { cn } from "@/lib/utils"

import { PageHeader, EmptyState, SectionCard } from "./_shared"
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

type CommissionType = (typeof COMMISSION_TYPES)[number]
type ApplyOn = (typeof APPLY_ON)[number]
type SalaryRole = "photographer" | "videographer" | "pro_crew" | "editor" | "film_editor" | "sales"

interface SalaryRule {
  id: string
  role: SalaryRole
  commissionType: CommissionType
  commissionValue: number
  applyOn: ApplyOn
  isActive: boolean
}

const ROLE_BADGE = ROLE_BADGE_COLORS

const APPLY_ON_LABELS: Record<ApplyOn, string> = {
  field_work: "کار میدانی",
  studio_work: "کار استودیو",
  delivery: "تحویل",
}

const APPLY_ON_BADGE: Record<ApplyOn, string> = {
  field_work: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  studio_work: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  delivery: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
}

const SALARY_ROLES: SalaryRole[] = ["photographer", "videographer", "pro_crew", "editor", "film_editor", "sales"]

interface FormState {
  role: SalaryRole
  commissionType: CommissionType
  commissionValue: string
  applyOn: ApplyOn
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  role: "photographer",
  commissionType: "percent",
  commissionValue: "",
  applyOn: "field_work",
  isActive: true,
}

export function SettingsSalaryRulesView() {
  const role = useWorkspace((s) => s.role)
  const canManage = hasPermission(role, "salary_rules")
  const canView = hasPermission(role, "salary_rules")
  const api = useApi()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<SalaryRule[]>({
    queryKey: ["salary-rules"],
    queryFn: () => api.get("/api/salary-rules"),
    enabled: canView,
  })

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<SalaryRule | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = React.useState<SalaryRule | null>(null)

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        role: form.role,
        commissionType: form.commissionType,
        commissionValue: Number(form.commissionValue),
        applyOn: form.applyOn,
        isActive: form.isActive,
      }
      if (!Number.isFinite(payload.commissionValue) || payload.commissionValue < 0) {
        throw new Error("مقدار پورسانت باید عددی نامنفی باشد")
      }
      if (payload.commissionType === "percent" && payload.commissionValue > 100) {
        throw new Error("درصد نمی‌تواند بیشتر از ۱۰۰ باشد")
      }
      const res = await fetch(
        editing ? `/api/salary-rules/${editing.id}` : "/api/salary-rules",
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
      toast.success(editing ? "قانون به‌روزرسانی شد" : "قانون با موفقیت ایجاد شد")
      setDialogOpen(false)
      setEditing(null)
      setForm(EMPTY_FORM)
      qc.invalidateQueries({ queryKey: ["salary-rules"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleActiveMut = useMutation({
    mutationFn: async (r: SalaryRule) => {
      const res = await fetch(`/api/salary-rules/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": role },
        body: JSON.stringify({ isActive: !r.isActive }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      }
      return d
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["salary-rules"] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/salary-rules/${id}`, {
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
      toast.success("قانون با موفقیت حذف شد")
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ["salary-rules"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!canView) {
    return (
      <EmptyState
        icon="🔒"
        title="دسترسی محدود"
        description="فقط مدیران سیستم و مدیران می‌توانند قوانین حقوق را مشاهده کنند."
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="قوانین حقوق"
        icon="🧮"
        description="پیکربندی پورسانت بر اساس نقش و تیم"
        actions={
          canManage && (
            <Button
              onClick={() => {
                setEditing(null)
                setForm(EMPTY_FORM)
                setDialogOpen(true)
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              قانون جدید
            </Button>
          )
        }
      />

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-muted bg-muted/30 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-muted-foreground">
          هنگام تحویل یک پروژه، رکوردهای حقوق به‌صورت خودکار برای هر
          عضو تیم بر اساس این قوانین و قیمت مؤثر پروژه ایجاد می‌شوند.
          قوانین با <span className="font-medium">درصد</span> سهمی از قیمت مؤثر
           را محاسبه می‌کنند؛ <span className="font-medium">مقطوع هر پروژه</span>{" "}
          مبلغی ثابت پرداخت می‌کند.
        </p>
      </div>

      <SectionCard title="قوانین پورسانت">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon="🧮"
            title="هنوز قانون حقی وجود ندارد"
            description="برای شروع تولید خودکار رکوردهای حقوق هنگام تحویل، یک قانون اضافه کنید."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نقش</TableHead>
                  <TableHead>نوع پورسانت</TableHead>
                  <TableHead className="text-right">مقدار</TableHead>
                  <TableHead>اعمال روی</TableHead>
                  <TableHead className="text-center">فعال</TableHead>
                  {canManage && <TableHead className="text-right">عملیات</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                          ROLE_BADGE[r.role]
                        )}
                      >
                        {ROLE_LABELS[r.role]}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.commissionType === "percent" ? "درصدی" : "مقطوع هر پروژه"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {r.commissionType === "percent"
                        ? `${r.commissionValue}%`
                        : `${formatRials(r.commissionValue)} تومان`}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                          APPLY_ON_BADGE[r.applyOn]
                        )}
                      >
                        {APPLY_ON_LABELS[r.applyOn]}
                      </span>
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
                            onClick={() => {
                              setEditing(r)
                              setForm({
                                role: r.role,
                                commissionType: r.commissionType,
                                commissionValue: String(r.commissionValue),
                                applyOn: r.applyOn,
                                isActive: r.isActive,
                              })
                              setDialogOpen(true)
                            }}
                            aria-label="ویرایش قانون"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(r)}
                            aria-label="حذف قانون"
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
            <DialogTitle>{editing ? "ویرایش قانون" : "قانون حقوق جدید"}</DialogTitle>
            <DialogDescription>
              نحوه پرداخت به یک عضو تیم هنگام تحویل کار را تعریف کنید.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>نقش</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v as SalaryRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALARY_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>اعمال روی</Label>
              <Select
                value={form.applyOn}
                onValueChange={(v) => setForm((f) => ({ ...f, applyOn: v as ApplyOn }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPLY_ON.map((a) => (
                    <SelectItem key={a} value={a}>
                      {APPLY_ON_LABELS[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>نوع پورسانت</Label>
              <Select
                value={form.commissionType}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, commissionType: v as CommissionType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMISSION_TYPES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c === "percent" ? "درصدی (٪)" : "مقطوع هر پروژه"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sr-value">
                مقدار {form.commissionType === "percent" ? "(٪)" : "(تومان)"}
              </Label>
              <Input
                id="sr-value"
                type="number"
                min={0}
                value={form.commissionValue}
                onChange={(e) =>
                  setForm((f) => ({ ...f, commissionValue: e.target.value }))
                }
                placeholder={form.commissionType === "percent" ? "مثلاً ۶" : "مثلاً ۲۵۰۰۰۰۰"}
              />
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch
                id="sr-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
              <Label htmlFor="sr-active" className="cursor-pointer">
                فعال
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              انصراف
            </Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending ? "در حال ذخیره…" : editing ? "ذخیره تغییرات" : "ایجاد قانون"}
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
            <AlertDialogTitle>حذف قانون حقوق؟</AlertDialogTitle>
            <AlertDialogDescription>
              این عملیات قانون مربوط به{" "}
              <strong>{deleteTarget ? ROLE_LABELS[deleteTarget.role] : ""}</strong> را برای همیشه حذف می‌کند.
              قوانینی که قبلاً رکورد حقوق تولید کرده‌اند قابل حذف نیستند.
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

