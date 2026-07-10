"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { useApi } from "@/lib/api/client"
import { useWorkspace } from "@/stores/workspace"
import { ROLE_PERMISSIONS } from "@/lib/constants"

import { PageHeader, EmptyState, SectionCard } from "./_shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

interface Tag {
  id: string
  name: string
  color: string
  _count: { customers: number }
}

const PRESET_COLORS = [
  "#ef4444", "#f59e0b", "#10b981", "#0ea5e9",
  "#a855f7", "#ec4899", "#64748b", "#22c55e",
]

export function SettingsTagsView() {
  const role = useWorkspace((s) => s.role)
  const canManage = ROLE_PERMISSIONS[role]?.tags
  const api = useApi()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: () => api.get("/api/tags"),
  })

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Tag | null>(null)
  const [form, setForm] = React.useState<{ name: string; color: string }>({
    name: "",
    color: PRESET_COLORS[0],
  })
  const [deleteTarget, setDeleteTarget] = React.useState<Tag | null>(null)

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = { name: form.name.trim(), color: form.color }
      if (!payload.name) throw new Error("نام الزامی است")
      const res = await fetch(
        editing ? `/api/tags/${editing.id}` : "/api/tags",
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
      toast.success(editing ? "تگ به‌روزرسانی شد" : "تگ با موفقیت ایجاد شد")
      setDialogOpen(false)
      setEditing(null)
      setForm({ name: "", color: PRESET_COLORS[0] })
      qc.invalidateQueries({ queryKey: ["tags"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tags/${id}`, {
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
      toast.success("تگ با موفقیت حذف شد")
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ["tags"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!canManage) {
    return (
      <EmptyState
        icon="🔒"
        title="دسترسی محدود"
        description="فقط مدیران سیستم می‌توانند تگ‌ها را مدیریت کنند."
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="تگ‌ها"
        icon="🏷️"
        description="برچسب‌های دسته‌بندی مشتریان"
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setForm({ name: "", color: PRESET_COLORS[0] })
              setDialogOpen(true)
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            تگ جدید
          </Button>
        }
      />

      <SectionCard title="تگ‌ها" description="برای دسته‌بندی و فیلتر کردن مشتریان در CRM استفاده می‌شوند.">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon="🏷️"
            title="هنوز تگی وجود ندارد"
            description="اولین تگ را برای شروع دسته‌بندی مشتریان ایجاد کنید."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((t) => (
              <div
                key={t.id}
                className="group flex items-center justify-between rounded-xl border bg-card p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-9 w-9 shrink-0 rounded-lg"
                    style={{ backgroundColor: t.color }}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t._count.customers === 1 ? `${t._count.customers} مشتری` : `${t._count.customers} مشتری`}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1 opacity-60 transition group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(t)
                      setForm({ name: t.name, color: t.color })
                      setDialogOpen(true)
                    }}
                    aria-label="ویرایش تگ"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteTarget(t)}
                    aria-label="حذف تگ"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o)
          if (!o) {
            setEditing(null)
            setForm({ name: "", color: PRESET_COLORS[0] })
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "ویرایش تگ" : "تگ جدید"}</DialogTitle>
            <DialogDescription>
              تگ‌ها به شما کمک می‌کنند مشتریان را دسته‌بندی کنید (مثلاً VIP، عروس، سازمانی).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="tag-name">نام</Label>
              <Input
                id="tag-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="مثلاً VIP"
                autoFocus
              />
            </div>

            <div>
              <Label>رنگ</Label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-10 w-12 cursor-pointer rounded-md border bg-transparent p-1"
                  aria-label="انتخاب رنگ"
                />
                <Input
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="max-w-[140px] font-mono"
                  placeholder="#94a3b8"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className="h-6 w-6 rounded-full border-2 transition hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: form.color.toLowerCase() === c.toLowerCase() ? "var(--foreground)" : "transparent",
                    }}
                    aria-label={`استفاده از ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              انصراف
            </Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending ? "در حال ذخیره…" : editing ? "ذخیره تغییرات" : "ایجاد تگ"}
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
            <AlertDialogTitle>حذف تگ؟</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> برای همیشه حذف خواهد شد.
              تگ‌های اختصاص‌یافته به مشتریان قابل حذف نیستند.
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
