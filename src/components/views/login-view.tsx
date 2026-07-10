"use client"
import * as React from "react"
import { useAuth, setStoredToken, authHeaders } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Sparkles, Phone, Lock, KeyRound, ChevronLeft, Building2, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { toPersianDigits } from "@/lib/format"

export function LoginView() {
  const { setAuthData } = useAuth()
  const [mode, setMode] = React.useState<"otp" | "password">("otp")
  const [phone, setPhone] = React.useState("")
  const [code, setCode] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [remember, setRemember] = React.useState(true)
  const [loading, setLoading] = React.useState(false)
  const [demoCode, setDemoCode] = React.useState<string | null>(null)
  const [cooldown, setCooldown] = React.useState(0)

  React.useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const sendOtp = async () => {
    if (!/^09\d{9}$/.test(phone)) { toast.error("شماره تلفن معتبر نیست"); return }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/otp/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "خطا"); return }
      setDemoCode(data.demoCode ?? null); setCooldown(120); toast.success("کد ارسال شد")
    } catch { toast.error("خطا") } finally { setLoading(false) }
  }

  const verifyOtp = async () => {
    if (code.length !== 6) { toast.error("کد ۶ رقمی"); return }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/otp/verify", { method: "POST", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ phone, code, remember }), credentials: "include" })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "خطا"); return }
      if (data.sessionToken) setStoredToken(data.sessionToken)
      toast.success("ورود موفق"); setAuthData({ user: data.user, studios: data.studios, currentStudioId: data.currentStudioId, currentRole: data.currentRole })
    } catch { toast.error("خطا") } finally { setLoading(false) }
  }

  const doLogin = async () => {
    if (!phone || !password) { toast.error("شماره و رمز"); return }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ phone, password, remember }), credentials: "include" })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "خطا"); return }
      if (data.sessionToken) setStoredToken(data.sessionToken)
      toast.success("ورود موفق"); setAuthData({ user: data.user, studios: data.studios, currentStudioId: data.currentStudioId, currentRole: data.currentRole })
    } catch { toast.error("خطا") } finally { setLoading(false) }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 p-4 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-purple-600 shadow-lg">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-bold">عکاسی نسیم</h1>
          <p className="mt-1 text-sm text-muted-foreground">سامانه مدیریت استودیو</p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-xl">
          {!demoCode && (
            <div className="mb-6 flex gap-1 rounded-lg bg-muted p-1">
              <button onClick={() => setMode("otp")} className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium", mode === "otp" ? "bg-background shadow-sm" : "text-muted-foreground")}>
                <KeyRound className="h-4 w-4" /> کد یکبار مصرف
              </button>
              <button onClick={() => setMode("password")} className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium", mode === "password" ? "bg-background shadow-sm" : "text-muted-foreground")}>
                <Lock className="h-4 w-4" /> رمز عبور
              </button>
            </div>
          )}
          {mode === "otp" && !demoCode && (
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-sm">شماره تلفن</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="tel" dir="ltr" placeholder="09123456789" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} className="pr-9 text-left" onKeyDown={(e) => e.key === "Enter" && sendOtp()} />
                </div>
              </div>
              <Button onClick={sendOtp} disabled={loading} className="w-full" size="lg">{loading ? "..." : "ارسال کد"}</Button>
              <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded" /> مرا به خاطر بسپار (۳۰ روز)</label>
            </div>
          )}
          {mode === "otp" && demoCode && (
            <div className="space-y-4">
              <button onClick={() => { setDemoCode(null); setCode("") }} className="flex items-center gap-1 text-xs text-muted-foreground"><ChevronLeft className="h-3 w-3 rotate-180" /> تغییر شماره</button>
              <div className="text-center"><p className="text-sm text-muted-foreground">کد به شماره</p><p className="font-semibold" dir="ltr">{phone}</p></div>
              {demoCode && <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50 p-2 text-center text-sm dark:bg-amber-950/30"><span className="text-amber-700 dark:text-amber-400">کد دمو: </span><span className="font-bold tracking-widest text-amber-700 dark:text-amber-400" dir="ltr">{toPersianDigits(demoCode)}</span></div>}
              <Input type="text" dir="ltr" placeholder="------" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="text-center text-2xl tracking-[0.5em]" onKeyDown={(e) => e.key === "Enter" && verifyOtp()} />
              <Button onClick={verifyOtp} disabled={loading} className="w-full" size="lg">{loading ? "..." : "تایید و ورود"}</Button>
              <button onClick={sendOtp} disabled={cooldown > 0 || loading} className="w-full text-center text-xs text-muted-foreground disabled:opacity-50">{cooldown > 0 ? `ارسال مجدد ${toPersianDigits(Math.floor(cooldown/60))}:${toPersianDigits(String(cooldown%60).padStart(2,"0"))}` : "ارسال مجدد"}</button>
            </div>
          )}
          {mode === "password" && (
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-sm">شماره تلفن</Label>
                <div className="relative"><Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="tel" dir="ltr" placeholder="09123456789" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} className="pr-9 text-left" /></div>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">رمز عبور</Label>
                <div className="relative"><Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="password" dir="ltr" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-9 text-left" onKeyDown={(e) => e.key === "Enter" && doLogin()} /></div>
              </div>
              <Button onClick={doLogin} disabled={loading} className="w-full" size="lg">{loading ? "..." : "ورود"}</Button>
              <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded" /> مرا به خاطر بسپار</label>
            </div>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">دمو: <span dir="ltr">09120000001</span> / <span dir="ltr">123456</span></p>
      </div>
    </div>
  )
}

export function StudioPickerView() {
  const { user, studios, logout, setAuthData } = useAuth()
  const [loading, setLoading] = React.useState<string | null>(null)

  const selectOption = async (option: string) => {
    setLoading(option)
    try {
      const res = await fetch("/api/auth/select-studio", { method: "POST", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ studioId: option }), credentials: "include" })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "خطا"); return }
      toast.success(data.studio?.name || "انتخاب شد")
      setAuthData({ user: user!, studios, currentStudioId: data.studio?.id || option, currentRole: data.role })
    } catch { toast.error("خطا") } finally { setLoading(null) }
  }

  if (studios.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold">سلام {user?.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">شما به هیچ استودیویی دسترسی ندارید.</p>
          <button onClick={logout} className="mt-6 text-sm text-muted-foreground"><LogOut className="ml-1 inline h-4 w-4" /> خروج</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 p-4 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold">سلام {user?.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">استودیوی موردنظر را انتخاب کنید</p>
        </div>
        <div className="space-y-3">
          {studios.map((s) => (
            <button key={s.id} onClick={() => selectOption(s.id)} disabled={loading !== null || !s.isActive} className={cn("flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-right shadow-sm transition hover:shadow-md disabled:opacity-50", loading === s.id && "animate-pulse")}>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-purple-600 text-white"><Building2 className="h-6 w-6" /></div>
              <div className="min-w-0 flex-1"><div className="truncate font-semibold">{s.name}</div>{s.nameEn && <div className="truncate text-xs text-muted-foreground" dir="ltr">{s.nameEn}</div>}</div>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">{s.role}</span>
              <ChevronLeft className="h-4 w-4 shrink-0 rotate-180 text-muted-foreground" />
            </button>
          ))}
        </div>
        <button onClick={logout} className="mt-6 flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground"><LogOut className="h-4 w-4" /> خروج</button>
      </div>
    </div>
  )
}
