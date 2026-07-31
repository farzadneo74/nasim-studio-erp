"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Crown, Lock, User, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import Link from "next/link"

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      toast.error("نام کاربری و رمز عبور را وارد کنید")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "خطا در ورود")
      localStorage.setItem("nasim-session-token", data.token)
      toast.success("خوش آمدید!")
      router.push("/admin")
    } catch (e: any) {
      toast.error(e.message || "خطا در ورود")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-rose-950 to-amber-950 p-4">
      <Link href="/" className="fixed top-4 right-4 z-10">
        <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
          <ArrowLeft className="ml-1.5 h-4 w-4" /> بازگشت به سایت
        </Button>
      </Link>

      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 shadow-2xl shadow-rose-500/30">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">پنل مدیریت پلتفرم نسیم</h1>
          <p className="mt-1 text-xs text-white/50">ورود امن — فقط برای مدیر پلتفرم</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-2xl">
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-white/70">نام کاربری</Label>
              <div className="relative mt-1">
                <User className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="نام کاربری"
                  className="border-white/10 bg-white/5 pr-10 text-white placeholder:text-white/30"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-white/70">رمز عبور</Label>
              <div className="relative mt-1">
                <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="border-white/10 bg-white/5 pr-10 text-white placeholder:text-white/30"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
            </div>
            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-gradient-to-l from-rose-500 to-amber-500 text-white hover:from-rose-600 hover:to-amber-600"
            >
              {loading ? "در حال ورود..." : "ورود به پنل مدیریت"}
            </Button>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-500/10 p-2 text-[10px] text-amber-300">
            <Lock className="h-3 w-3 shrink-0" />
            <span>این صفحه فقط برای مدیر پلتفرم است.</span>
          </div>
        </div>

        <div className="mt-4 text-center text-[10px] text-white/30">
          نام کاربری: <code className="text-white/50">nasim-admin</code> — رمز: <code className="text-white/50">N@sim2025!ERP</code>
        </div>
      </div>
    </div>
  )
}
