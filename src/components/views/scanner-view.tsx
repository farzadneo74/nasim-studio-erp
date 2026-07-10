"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  ScanLine,
  Camera,
  Search,
  Loader2,
  Ban,
  ArrowRight,
  RotateCcw,
  Phone,
  User as UserIcon,
  Percent,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Package,
} from "lucide-react"

import { useWorkspace } from "@/stores/workspace"
import { ROLE_PERMISSIONS, type Role } from "@/lib/constants"
import { formatDate } from "@/lib/format"

import { PageHeader, EmptyState, SectionCard } from "./_shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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

// ============================================================
// Types
// ============================================================
interface ValidateResponse {
  valid: boolean
  reason: "ok" | "not_found" | "expired" | "used_up"
  code?: {
    id: string
    code: string
    discountPercent: number
    isExpired: boolean
    usedCount: number
    maxUses: number
    validFrom?: string | null
    validUntil?: string | null
    relatedProjectId?: string | null
  } | null
  owner?: {
    id: string
    name: string
    phone: string
    customerType: string
  } | null
  relatedProject?: {
    id: string
    status: string
    contractNumber: string
    customerName: string
    packageTitle: string
    category: string
  } | null
}

interface HistoryItem {
  code: string
  valid: boolean
  reason: string
  ownerName?: string
  at: number
}

function useMutate() {
  const role = useWorkspace((s) => s.role)
  return React.useCallback(
    async function mutate<T = unknown>(
      url: string,
      method: "POST" | "PATCH" | "DELETE",
      body?: unknown
    ): Promise<T> {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-demo-role": role,
        },
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const errMsg = (data as { error?: string })?.error || `Request failed (${res.status})`
        throw new Error(errMsg)
      }
      return data as T
    },
    [role]
  )
}

function ReasonPill({ res }: { res: ValidateResponse }) {
  if (res.valid) {
    return (
      <Badge className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
        <CheckCircle2 className="mr-1 size-3" /> معتبر
      </Badge>
    )
  }
  if (res.reason === "expired") {
    return (
      <Badge className="border-transparent bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
        <XCircle className="mr-1 size-3" /> منقضی
      </Badge>
    )
  }
  if (res.reason === "used_up") {
    return (
      <Badge className="border-transparent bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
        <AlertTriangle className="mr-1 size-3" /> تمام‌شده
      </Badge>
    )
  }
  return (
    <Badge className="border-transparent bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      <XCircle className="mr-1 size-3" /> یافت نشد
    </Badge>
  )
}

// ============================================================
// Viewfinder
// ============================================================
function Viewfinder({ onSimulate, simulating }: { onSimulate: () => void; simulating: boolean }) {
  return (
    <div className="relative mx-auto flex aspect-square w-full max-w-md items-center justify-center rounded-2xl border-2 border-dashed bg-muted/30">
      {/* corner brackets */}
      <div className="pointer-events-none absolute inset-4">
        <div className="absolute left-0 top-0 h-8 w-8 rounded-tl-lg border-l-4 border-t-4 border-primary/60" />
        <div className="absolute right-0 top-0 h-8 w-8 rounded-tr-lg border-r-4 border-t-4 border-primary/60" />
        <div className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-primary/60" />
        <div className="absolute bottom-0 right-0 h-8 w-8 rounded-br-lg border-b-4 border-r-4 border-primary/60" />
      </div>
      <div className="flex flex-col items-center gap-3 px-6 text-center">
        <div className="relative">
          <Camera className="size-12 text-muted-foreground/70" />
          <ScanLine className="absolute -bottom-1 left-1/2 size-5 -translate-x-1/2 text-primary/70" />
        </div>
        <div className="space-y-1">
          <div className="text-sm font-medium">دوربین را روی کد QR قرار دهید</div>
          <div className="text-xs text-muted-foreground">
            از ورود دستی زیر استفاده کنید، یا برای نمایش جریان، یک اسکن را شبیه‌سازی کنید.
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onSimulate} disabled={simulating}>
          {simulating ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" /> در حال اسکن…
            </>
          ) : (
            <>
              <ScanLine className="mr-1.5 size-3.5" /> شبیه‌سازی اسکن
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ============================================================
// Result card
// ============================================================
function ResultCard({
  res,
  onExpire,
  onNewProject,
  expiring,
}: {
  res: ValidateResponse
  onExpire: () => void
  onNewProject: () => void
  expiring: boolean
}) {
  const role = useWorkspace((s) => s.role) as Role
  const canExpire = role === "admin" || role === "manager"

  if (!res.valid) {
    return (
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <ReasonPill res={res} />
          <span className="text-sm text-muted-foreground">
            {res.reason === "expired"
              ? "این کد منقضی شده و دیگر قابل استفاده نیست."
              : res.reason === "used_up"
              ? "این کد به حداکثر تعداد استفاده رسیده است."
              : "هیچ کد معرفی‌ای با این مقدار مطابقت ندارد."}
          </span>
        </div>
        {res.owner && (
          <div className="mt-4 rounded-lg bg-muted/40 p-3 text-sm">
            <div className="text-xs text-muted-foreground">آخرین صاحب شناخته‌شده</div>
            <div className="mt-1 font-medium">{res.owner.name}</div>
            <div className="text-xs text-muted-foreground">{res.owner.phone}</div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <ReasonPill res={res} />
        <span className="font-mono text-sm font-semibold tracking-wider">{res.code?.code}</span>
        <Badge variant="outline" className="gap-1 border-emerald-300/60 text-emerald-700 dark:border-emerald-700/50 dark:text-emerald-300">
          <Percent className="size-3" /> {res.code?.discountPercent}٪ تخفیف
        </Badge>
        <span className="text-xs text-muted-foreground">
          {res.code?.usedCount} از {res.code?.maxUses} استفاده‌شده
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-muted/40 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserIcon className="size-3.5" /> صاحب
          </div>
          <div className="mt-1 font-medium">{res.owner?.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="size-3" /> {res.owner?.phone}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground capitalize">
            {res.owner?.customerType}
          </div>
        </div>
        <div className="rounded-lg bg-muted/40 p-3">
          <div className="text-xs text-muted-foreground">اعتبار</div>
          <div className="mt-1 text-sm">
            {res.code?.validUntil ? (
              <>
                معتبر تا <span className="font-medium">{formatDate(res.code.validUntil)}</span>
              </>
            ) : (
              <span className="font-medium">بدون تاریخ انقضا</span>
            )}
          </div>
          {res.relatedProject && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
              <Package className="mt-0.5 size-3" />
              <span>
                مرتبط با <span className="font-medium text-foreground">{res.relatedProject.contractNumber}</span>
                {" · "}
                {res.relatedProject.customerName} — {res.relatedProject.packageTitle}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={onExpire}
          disabled={expiring || !canExpire}
          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
          title={canExpire ? "منقضی کردن این کد" : "فقط ادمین/مدیر می‌تواند کد را منقضی کند"}
        >
          {expiring ? (
            <>
              <Loader2 className="mr-1.5 size-3.5 animate-spin" /> در حال انقضا…
            </>
          ) : (
            <>
              <Ban className="mr-1.5 size-3.5" /> منقضی کردن این کد
            </>
          )}
        </Button>
        <Button onClick={onNewProject}>
          <ArrowRight className="mr-1.5 size-3.5" /> ایجاد پروژه جدید برای این مشتری
        </Button>
      </div>
    </div>
  )
}

// ============================================================
// Main view
// ============================================================
export function ScannerView() {
  const role = useWorkspace((s) => s.role) as Role
  const setPage = useWorkspace((s) => s.setPage)
  const mutate = useMutate()

  const canAccess = ROLE_PERMISSIONS[role].scanner

  const [input, setInput] = React.useState("")
  const [result, setResult] = React.useState<ValidateResponse | null>(null)
  const [validating, setValidating] = React.useState(false)
  const [simulating, setSimulating] = React.useState(false)
  const [expiring, setExpiring] = React.useState(false)
  const [expireOpen, setExpireOpen] = React.useState(false)
  const [history, setHistory] = React.useState<HistoryItem[]>([])

  async function runValidate(code: string) {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      toast.error("یک کد برای اسکن وارد کنید")
      return
    }
    setValidating(true)
    setResult(null)
    try {
      const res = await fetch(
        `/api/referral-codes/validate?code=${encodeURIComponent(trimmed)}`,
        { headers: { "x-demo-role": role } }
      ).then((r) => r.json() as Promise<ValidateResponse>)
      setResult(res)
      setHistory((prev) =>
        [
          {
            code: trimmed,
            valid: res.valid,
            reason: res.reason,
            ownerName: res.owner?.name,
            at: Date.now(),
          },
          ...prev,
        ].slice(0, 5)
      )
      if (res.valid) {
        toast.success("کد معتبر", { description: `${res.owner?.name} · ${res.code?.discountPercent}٪ تخفیف` })
      } else if (res.reason === "not_found") {
        toast.error("کد یافت نشد")
      } else if (res.reason === "expired") {
        toast.warning("کد منقضی شده است")
      } else if (res.reason === "used_up") {
        toast.warning("سهمیه کد تمام شده است")
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "اعتبارسنجی ناموفق بود"
      toast.error(msg)
    } finally {
      setValidating(false)
    }
  }

  async function simulateScan() {
    setSimulating(true)
    try {
      const data = await fetch(`/api/referral-codes?status=available&limit=50`, {
        headers: { "x-demo-role": role },
      }).then((r) => r.json() as { items: { code: string }[] })
      const items = data.items || []
      if (!items.length) {
        toast.info("کد موجودی برای شبیه‌سازی وجود ندارد — ابتدا در کارخانه کد QR کد تولید کنید")
        return
      }
      const pick = items[Math.floor(Math.random() * items.length)]
      setInput(pick.code)
      await runValidate(pick.code)
    } catch {
      toast.error("دریافت کدها برای شبیه‌سازی ناموفق بود")
    } finally {
      setSimulating(false)
    }
  }

  async function confirmExpire() {
    if (!result?.code?.id) return
    setExpiring(true)
    try {
      await mutate(`/api/referral-codes/${result.code.id}`, "PATCH", { isExpired: true })
      toast.success("کد منقضی شد", { description: result.code.code })
      // refresh result
      const fresh = await fetch(
        `/api/referral-codes/validate?code=${encodeURIComponent(result.code.code)}`,
        { headers: { "x-demo-role": role } }
      ).then((r) => r.json() as Promise<ValidateResponse>)
      setResult(fresh)
      setExpireOpen(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "منقضی کردن کد ناموفق بود"
      toast.error(msg)
    } finally {
      setExpiring(false)
    }
  }

  function handleNewProject() {
    if (!result?.owner) return
    toast.success(`شروع پروژه جدید برای ${result.owner.name}`, {
      description: "برای راه‌اندازی جادوگر پروژه جدید، صفحه پروژه‌ها را باز کنید.",
    })
    setPage("projects")
  }

  if (!canAccess) {
    return (
      <div>
        <PageHeader title="اسکنر" icon="📷" description="اعتبارسنجی کد معرفی در پیشخوان" />
        <EmptyState
          icon="🔒"
          title="دسترسی محدود"
          description="نقش شما اجازه استفاده از اسکنر را ندارد."
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="اسکنر" icon="📷" description="اعتبارسنجی کد معرفی در پیشخوان" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Viewfinder + manual entry */}
        <SectionCard title="اسکنر کد" description="کد معرفی را اسکن یا دستی وارد کنید.">
          <div className="space-y-4">
            <Viewfinder onSimulate={simulateScan} simulating={simulating} />

            <form
              onSubmit={(e) => {
                e.preventDefault()
                runValidate(input)
              }}
              className="flex items-center gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                placeholder="STD-XXXXXXXX"
                className="font-mono tracking-wider"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
              <Button type="submit" disabled={validating || !input.trim()}>
                {validating ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <Search className="mr-1.5 size-4" />
                )}
                اسکن
              </Button>
            </form>

            <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              اسکن با دوربین در نسخه PWA موبایل در دسترس است. اینجا از ورود دستی یا{" "}
              <button
                type="button"
                onClick={simulateScan}
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                «شبیه‌سازی اسکن»
              </button>{" "}
              استفاده کنید.
            </p>
          </div>
        </SectionCard>

        {/* Right: Result + history */}
        <div className="space-y-6">
          <SectionCard
            title="نتیجه اسکن"
            description="کد معرفی اعتبارسنجی‌شده و صاحب آن"
            actions={
              result ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setResult(null)
                    setInput("")
                  }}
                >
                  <RotateCcw className="mr-1.5 size-3.5" /> پاک‌کردن
                </Button>
              ) : null
            }
          >
            {validating ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : result ? (
              <ResultCard
                res={result}
                onExpire={() => setExpireOpen(true)}
                onNewProject={handleNewProject}
                expiring={expiring}
              />
            ) : (
              <EmptyState
                icon="📷"
                title="هنوز اسکنی انجام نشده"
                description="یک کد را دستی وارد کنید یا از «شبیه‌سازی اسکن» برای اعتبارسنجی کد معرفی استفاده کنید."
              />
            )}
          </SectionCard>

          {history.length > 0 && (
            <SectionCard
              title="اسکن‌های اخیر"
              description="۵ اسکن اخیر این جلسه"
            >
              <ul className="space-y-2">
                {history.map((h, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {h.valid ? (
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      ) : (
                        <XCircle className="size-4 text-rose-500" />
                      )}
                      <span className="font-mono text-xs truncate">{h.code}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {h.ownerName && <span className="truncate">{h.ownerName}</span>}
                      <History className="size-3" />
                      <span>{new Date(h.at).toLocaleTimeString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      </div>

      <AlertDialog open={expireOpen} onOpenChange={setExpireOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>این کد معرفی منقضی شود؟</AlertDialogTitle>
            <AlertDialogDescription>
              {result?.code && (
                <>
                  کد <span className="font-mono font-semibold">{result.code.code}</span>
                  {result.owner && (
                    <>
                      {" "}برای <span className="font-medium">{result.owner.name}</span>
                    </>
                  )}{" "}
                  به‌عنوان منقضی علامت‌گذاری می‌شود و دیگر قابل استفاده نخواهد بود.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={expiring}>لغو</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmExpire}
              disabled={expiring}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {expiring ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" /> در حال انقضا…
                </>
              ) : (
                <>
                  <Ban className="mr-1.5 size-3.5" /> منقضی کردن کد
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
