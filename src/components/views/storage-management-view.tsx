"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  HardDrive, Trash2, RotateCcw, Search, Download, AlertTriangle,
  FileImage, FileAudio, FileVideo, FileText, Database, Loader2,
  Settings2, Clock, CheckCircle2, X,
} from "lucide-react"
import { PageHeader } from "./_shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatRials } from "@/lib/format"
import { authHeaders } from "@/lib/auth-context"
import { toPersianDigits } from "@/lib/jalali"
import { cn } from "@/lib/utils"

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  image: <FileImage className="size-4" />,
  audio: <FileAudio className="size-4" />,
  video: <FileVideo className="size-4" />,
  document: <FileText className="size-4" />,
}
const CATEGORY_LABELS: Record<string, string> = {
  image: "تصویر",
  audio: "صوت",
  video: "ویدیو",
  document: "سند",
}
const CATEGORY_COLORS: Record<string, string> = {
  image: "#0ea5e9",
  audio: "#a855f7",
  video: "#ef4444",
  document: "#64748b",
}
const OWNER_TYPE_LABELS: Record<string, string> = {
  user_note: "یادداشت شخصی",
  customer_note: "یادداشت مشتری",
  project_note: "یادداشت پروژه",
  message: "پیام",
  custom_field: "فیلد سفارشی",
  expense_receipt: "رسید هزینه",
  qr_logo: "لوگو",
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "۰"
  if (bytes < 1024) return toPersianDigits(bytes) + " ب"
  if (bytes < 1024 * 1024) return toPersianDigits((bytes / 1024).toFixed(1)) + " ک‌ب"
  if (bytes < 1024 * 1024 * 1024) return toPersianDigits((bytes / 1024 / 1024).toFixed(1)) + " م‌ب"
  return toPersianDigits((bytes / 1024 / 1024 / 1024).toFixed(2)) + " گ‌ب"
}

function timeAgo(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  if (days === 0) return "امروز"
  if (days === 1) return "دیروز"
  if (days < 30) return `${toPersianDigits(days)} روز پیش`
  if (days < 365) return `${toPersianDigits(Math.floor(days / 30))} ماه پیش`
  return `${toPersianDigits(Math.floor(days / 365))} سال پیش`
}

interface Stats {
  usedBytes: number
  quotaBytes: number
  remainingBytes: number
  fileCount: number
  byCategory: Record<string, { count: number; sizeBytes: number }>
  byOwnerType: Record<string, { count: number; sizeBytes: number }>
  trashCount: number
  trashBytes: number
  diskFreeBytes: number
}

interface AttachmentItem {
  id: string
  ownerType: string
  ownerId: string
  uploadedByName: string | null
  originalFilename: string
  mimeType: string
  category: string
  sizeBytes: number
  downloadCount: number
  url: string
  thumbUrl: string | null
  lastAccessAt: string
  createdAt: string
  deletedAt: string | null
  isDeleted: boolean
}

export function StorageManagementView() {
  return (
    <div>
      <PageHeader
        title="مدیریت فضای ذخیره‌سازی"
        description="مدیریت فایل‌های پیوستی استودیو — آپلود، حذف، بازیابی و بکاپ"
        icon={<HardDrive className="size-6" />}
      />
      <Tabs defaultValue="overview" dir="rtl">
        <TabsList>
          <TabsTrigger value="overview">نمای کلی</TabsTrigger>
          <TabsTrigger value="files">فایل‌ها</TabsTrigger>
          <TabsTrigger value="trash">سطل زباله</TabsTrigger>
          <TabsTrigger value="retention">سیاست نگهداری</TabsTrigger>
          <TabsTrigger value="backup">بکاپ</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="files"><FilesTab trash={false} /></TabsContent>
        <TabsContent value="trash"><FilesTab trash={true} /></TabsContent>
        <TabsContent value="retention"><RetentionTab /></TabsContent>
        <TabsContent value="backup"><BackupTab /></TabsContent>
      </Tabs>
    </div>
  )
}

// ---------- Overview Tab ----------
function OverviewTab() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["storage-stats"],
    queryFn: async () => {
      const res = await fetch("/api/attachments/stats", { credentials: "include", headers: authHeaders() })
      if (!res.ok) throw new Error("خطا")
      return res.json()
    },
  })

  if (isLoading || !stats) {
    return <div className="flex h-48 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  }

  const pct = stats.quotaBytes > 0 ? (stats.usedBytes / stats.quotaBytes) * 100 : 0
  const isWarning = pct > 80
  const isDanger = pct > 95

  return (
    <div className="space-y-6">
      {/* Usage card */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">فضای استفاده شده</h3>
          <Badge variant={isDanger ? "destructive" : isWarning ? "default" : "secondary"}>
            {toPersianDigits(pct.toFixed(1))}٪
          </Badge>
        </div>
        <Progress value={pct} className={cn("h-4", isDanger && "[&>div]:bg-rose-500", isWarning && "[&>div]:bg-amber-500")} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            {formatBytes(stats.usedBytes)} از {formatBytes(stats.quotaBytes)}
          </span>
          <span className="font-medium text-emerald-600">
            {formatBytes(stats.remainingBytes)} باقی‌مانده
          </span>
        </div>
        {isWarning && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-4 shrink-0" />
            <span>فضای ذخیره‌سازی رو به اتمام است. می‌توانید فایل‌های قدیمی را پاک کنید یا فضای بیشتری خریداری کنید.</span>
          </div>
        )}
      </div>

      {/* By category */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(["image", "audio", "video", "document"] as const).map((cat) => {
          const d = stats.byCategory[cat] || { count: 0, sizeBytes: 0 }
          return (
            <div key={cat} className="rounded-xl border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <div
                  className="flex size-9 items-center justify-center rounded-lg"
                  style={{ background: CATEGORY_COLORS[cat] + "22", color: CATEGORY_COLORS[cat] }}
                >
                  {CATEGORY_ICONS[cat]}
                </div>
                <span className="text-sm font-medium">{CATEGORY_LABELS[cat]}</span>
              </div>
              <div className="text-2xl font-bold">{formatBytes(d.sizeBytes)}</div>
              <div className="text-xs text-muted-foreground">{toPersianDigits(d.count)} فایل</div>
            </div>
          )
        })}
      </div>

      {/* By owner type */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">بر اساس نوع کاربرد</h3>
        <div className="space-y-3">
          {Object.entries(stats.byOwnerType).length === 0 ? (
            <p className="text-sm text-muted-foreground">هنوز فایلی آپلود نشده است.</p>
          ) : (
            Object.entries(stats.byOwnerType).map(([type, d]) => (
              <div key={type} className="flex items-center justify-between border-b pb-2 last:border-0">
                <span className="text-sm font-medium">{OWNER_TYPE_LABELS[type] || type}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">{toPersianDigits(d.count)} فایل</span>
                  <span className="font-semibold">{formatBytes(d.sizeBytes)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* System info */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">فضای آزاد دیسک</div>
          <div className="mt-1 text-xl font-bold">{formatBytes(stats.diskFreeBytes)}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">سطل زباله</div>
          <div className="mt-1 text-xl font-bold">{toPersianDigits(stats.trashCount)} فایل</div>
          <div className="text-xs text-muted-foreground">{formatBytes(stats.trashBytes)}</div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">تعداد کل فایل‌ها</div>
          <div className="mt-1 text-xl font-bold">{toPersianDigits(stats.fileCount)}</div>
        </div>
      </div>
    </div>
  )
}

// ---------- Files Tab (shared for active + trash) ----------
function FilesTab({ trash }: { trash: boolean }) {
  const qc = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [category, setCategory] = React.useState<string>("all")
  const [ownerType, setOwnerType] = React.useState<string>("all")
  const [sort, setSort] = React.useState<string>("newest")
  const [page, setPage] = React.useState(1)
  const [restoreTarget, setRestoreTarget] = React.useState<AttachmentItem | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<AttachmentItem | null>(null)
  const PAGE_SIZE = 20

  const { data, isLoading } = useQuery<{ items: AttachmentItem[]; total: number }>({
    queryKey: ["attachments", trash, search, category, ownerType, sort, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
        sort,
        trash: trash ? "true" : "false",
      })
      if (search) params.set("search", search)
      if (category !== "all") params.set("category", category)
      if (ownerType !== "all") params.set("ownerType", ownerType)
      const res = await fetch(`/api/attachments?${params}`, { credentials: "include", headers: authHeaders() })
      if (!res.ok) throw new Error("خطا")
      return res.json()
    },
  })

  const restoreMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/attachments/${id}/restore`, { method: "POST", credentials: "include", headers: authHeaders() }).then(r => r.json()),
    onSuccess: () => { toast.success("فایل بازیابی شد"); qc.invalidateQueries({ queryKey: ["attachments"] }); qc.invalidateQueries({ queryKey: ["storage-stats"] }); setRestoreTarget(null) },
    onError: () => toast.error("بازیابی ناموفق بود"),
  })

  const softDeleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/attachments/${id}`, { method: "DELETE", credentials: "include", headers: authHeaders() }).then(r => r.json()),
    onSuccess: () => { toast.success("فایل به سطل زباله منتقل شد"); qc.invalidateQueries({ queryKey: ["attachments"] }); qc.invalidateQueries({ queryKey: ["storage-stats"] }); setDeleteTarget(null) },
    onError: () => toast.error("حذف ناموفق بود"),
  })

  const hardDeleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/attachments/${id}/permanent`, { method: "DELETE", credentials: "include", headers: authHeaders() }).then(r => r.json()),
    onSuccess: () => { toast.success("فایل برای همیشه حذف شد"); qc.invalidateQueries({ queryKey: ["attachments"] }); qc.invalidateQueries({ queryKey: ["storage-stats"] }); setDeleteTarget(null) },
    onError: () => toast.error("حذف ناموفق بود"),
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="جستجوی نام فایل…" className="pr-9" />
        </div>
        <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1) }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="نوع" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه انواع</SelectItem>
            <SelectItem value="image">تصویر</SelectItem>
            <SelectItem value="audio">صوت</SelectItem>
            <SelectItem value="video">ویدیو</SelectItem>
            <SelectItem value="document">سند</SelectItem>
          </SelectContent>
        </Select>
        <Select value={ownerType} onValueChange={(v) => { setOwnerType(v); setPage(1) }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="کاربرد" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه کاربردها</SelectItem>
            {Object.entries(OWNER_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">جدیدترین</SelectItem>
            <SelectItem value="oldest">قدیمی‌ترین</SelectItem>
            <SelectItem value="largest">بزرگ‌ترین</SelectItem>
            <SelectItem value="smallest">کوچک‌ترین</SelectItem>
            <SelectItem value="least-accessed">کمترین استفاده</SelectItem>
            <SelectItem value="most-downloaded">پر دانلودترین</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden" dir="rtl">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>فایل</TableHead>
                <TableHead>کاربرد</TableHead>
                <TableHead className="text-right">حجم</TableHead>
                <TableHead>آپلود توسط</TableHead>
                <TableHead>آخرین بازدید</TableHead>
                <TableHead className="text-right">دانلود</TableHead>
                <TableHead className="text-right">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">در حال بارگذاری…</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">{trash ? "سطل زباله خالی است" : "فایلی یافت نشد"}</TableCell></TableRow>
              ) : (
                items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {a.thumbUrl ? (
                          <img src={a.thumbUrl} alt="" className="size-10 rounded object-cover" />
                        ) : (
                          <div className="flex size-10 items-center justify-center rounded bg-muted" style={{ color: CATEGORY_COLORS[a.category] }}>
                            {CATEGORY_ICONS[a.category]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{a.originalFilename}</div>
                          <div className="text-xs text-muted-foreground">{timeAgo(a.createdAt)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">{OWNER_TYPE_LABELS[a.ownerType] || a.ownerType}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatBytes(a.sizeBytes)}</TableCell>
                    <TableCell className="text-xs">{a.uploadedByName || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{timeAgo(a.lastAccessAt)}</TableCell>
                    <TableCell className="text-right text-xs">{toPersianDigits(a.downloadCount)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" className="size-7 p-0" asChild>
                          <a href={a.url} target="_blank" rel="noopener noreferrer"><Download className="size-3.5" /></a>
                        </Button>
                        {trash ? (
                          <>
                            <Button size="sm" variant="ghost" className="size-7 p-0 text-emerald-600" onClick={() => setRestoreTarget(a)} title="بازیابی">
                              <RotateCcw className="size-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="size-7 p-0 text-rose-600" onClick={() => setDeleteTarget(a)} title="حذف دائمی">
                              <Trash2 className="size-3.5" />
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="ghost" className="size-7 p-0 text-rose-600" onClick={() => setDeleteTarget(a)} title="حذف">
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {toPersianDigits((page - 1) * PAGE_SIZE + 1)}–{toPersianDigits(Math.min(page * PAGE_SIZE, total))} از {toPersianDigits(total)}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>قبلی</Button>
            <span className="flex items-center px-2 text-sm">{toPersianDigits(page)} / {toPersianDigits(totalPages)}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>بعدی</Button>
          </div>
        </div>
      )}

      {/* Restore dialog */}
      <AlertDialog open={!!restoreTarget} onOpenChange={(v) => !v && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>بازیابی فایل؟</AlertDialogTitle>
            <AlertDialogDescription>«{restoreTarget?.originalFilename}» از سطل زباله بازیابی می‌شود.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={() => restoreTarget && restoreMut.mutate(restoreTarget.id)}>بازیابی</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{trash ? "حذف دائمی؟" : "حذف فایل؟"}</AlertDialogTitle>
            <AlertDialogDescription>
              {trash
                ? `«${deleteTarget?.originalFilename}» برای همیشه حذف می‌شود و قابل بازیابی نیست.`
                : `«${deleteTarget?.originalFilename}» به سطل زباله منتقل می‌شود. می‌توانید بعداً آن را بازیابی کنید.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className={trash ? "bg-rose-600 hover:bg-rose-700" : ""}
              onClick={() => deleteTarget && (trash ? hardDeleteMut.mutate(deleteTarget.id) : softDeleteMut.mutate(deleteTarget.id))}
            >
              {trash ? "حذف دائمی" : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ---------- Retention Tab ----------
function RetentionTab() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<{
    policies: { ownerType: string; ownerTypeLabel: string; retentionDays: number | null; enabled: boolean }[]
    suggestions: { ownerType: string; ownerTypeLabel: string; count: number; totalBytes: number; oldestDays: number; sampleFileNames: string[] }[]
  }>({
    queryKey: ["retention"],
    queryFn: async () => {
      const res = await fetch("/api/attachments/retention", { credentials: "include", headers: authHeaders() })
      if (!res.ok) throw new Error("خطا")
      return res.json()
    },
  })

  const updateMut = useMutation({
    mutationFn: (body: { ownerType: string; retentionDays: number | null; enabled: boolean }) =>
      fetch("/api/attachments/retention", { method: "PUT", headers: authHeaders({ "Content-Type": "application/json" }), credentials: "include", body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { toast.success("سیاست نگهداری به‌روزرسانی شد"); qc.invalidateQueries({ queryKey: ["retention"] }) },
    onError: () => toast.error("به‌روزرسانی ناموفق بود"),
  })

  if (isLoading || !data) {
    return <div className="flex h-48 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Suggestions */}
      {data.suggestions.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-400">پیشنهاد پاکسازی</h3>
          </div>
          <div className="space-y-3">
            {data.suggestions.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border bg-card p-3">
                <div>
                  <div className="text-sm font-medium">{s.ownerTypeLabel}</div>
                  <div className="text-xs text-muted-foreground">
                    {toPersianDigits(s.count)} فایل — قدیمی‌ترین: {toPersianDigits(s.oldestDays)} روز پیش
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    نمونه: {s.sampleFileNames.join("، ")}
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-lg font-bold text-amber-600">{formatBytes(s.totalBytes)}</div>
                  <Button size="sm" variant="outline" className="mt-1 text-rose-600" onClick={() => {
                    updateMut.mutate({ ownerType: s.ownerType, retentionDays: 0, enabled: false })
                    toast.info("برای حذف، به تب فایل‌ها بروید و فیلتر کنید")
                  }}>
                    <Trash2 className="ml-1 size-3.5" /> پاکسازی
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Policies */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Settings2 className="size-5" />
          <h3 className="text-lg font-semibold">سیاست نگهداری</h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          برای هر نوع فایل مشخص کنید بعد از چند روز عدم استفاده، پیشنهاد حذف نمایش داده شود. سیستم هیچ‌گاه خودکار فایلی را حذف نمی‌کند — فقط پیشنهاد می‌دهد.
        </p>
        <div className="space-y-3">
          {Object.entries(OWNER_TYPE_LABELS).map(([type, label]) => {
            const policy = data.policies.find((p) => p.ownerType === type)
            const days = policy?.retentionDays ?? null
            const enabled = policy?.enabled ?? false
            return (
              <div key={type} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => updateMut.mutate({ ownerType: type, retentionDays: days, enabled: v })}
                  />
                  <Label className="cursor-pointer">{label}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={days === null ? "never" : String(days)}
                    onValueChange={(v) => {
                      const d = v === "never" ? null : parseInt(v, 10)
                      updateMut.mutate({ ownerType: type, retentionDays: d, enabled: true })
                    }}
                    disabled={!enabled}
                  >
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">هرگز پیشنهاد نده</SelectItem>
                      <SelectItem value="30">۳۰ روز</SelectItem>
                      <SelectItem value="90">۹۰ روز</SelectItem>
                      <SelectItem value="180">۱۸۰ روز</SelectItem>
                      <SelectItem value="365">۱ سال</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------- Backup Tab ----------
function BackupTab() {
  const qc = useQueryClient()
  const [backupOpen, setBackupOpen] = React.useState(false)
  const backupMut = useMutation({
    mutationFn: () => fetch("/api/attachments/backup", { method: "POST", credentials: "include", headers: authHeaders() }).then(r => r.json()),
    onSuccess: (data) => {
      toast.success(`بکاپ ساخته شد: ${toPersianDigits(data.fileCount)} فایل، ${formatBytes(data.filesBytes)}`)
      setBackupOpen(false)
      qc.invalidateQueries({ queryKey: ["storage-stats"] })
    },
    onError: () => toast.error("بکاپ ناموفق بود"),
  })

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Database className="size-5" />
          <h3 className="text-lg font-semibold">بکاپ‌گیری</h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          یک بکاپ کامل از دیتابیس استودیو و تمام فایل‌های پیوستی فعال ایجاد کنید. بکاپ شامل فایل‌های تصویر بندانگشتی (thumbnail) نمی‌شود زیرا قابل تولید مجدد هستند.
        </p>
        <div className="rounded-lg bg-muted/40 p-4 text-sm">
          <div className="mb-2 font-medium">بکاپ شامل:</div>
          <ul className="space-y-1 text-muted-foreground">
            <li>• فایل دیتابیس SQLite استودیو</li>
            <li>• تمام فایل‌های پیوستی فعال (تصویر، صوت، ویدیو، سند)</li>
            <li>• فایل manifest با لیست فایل‌ها و چک‌سام</li>
          </ul>
        </div>
        <Button className="mt-4" onClick={() => setBackupOpen(true)} disabled={backupMut.isPending}>
          {backupMut.isPending ? <Loader2 className="ml-2 size-4 animate-spin" /> : <Database className="ml-2 size-4" />}
          ایجاد بکاپ
        </Button>
      </div>

      <AlertDialog open={backupOpen} onOpenChange={setBackupOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ایجاد بکاپ؟</AlertDialogTitle>
            <AlertDialogDescription>
              این عملیات ممکن است چند دقیقه طول بکشد. بکاپ در مسیر <code className="text-xs">storage/backups/</code> ذخیره می‌شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={() => backupMut.mutate()}>ایجاد بکاپ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

