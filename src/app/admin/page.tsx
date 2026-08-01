"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { SuperAdminView } from "@/components/views/super-admin-view"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Crown, LogOut, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

function AdminGate() {
  const router = useRouter()
  const [checking, setChecking] = React.useState(true)
  const [authed, setAuthed] = React.useState(false)
  const [userName, setUserName] = React.useState("")

  React.useEffect(() => {
    const token = localStorage.getItem("nasim-session-token")
    if (!token) {
      router.push("/admin/login")
      return
    }
    // بررسی اعتبار توکن
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.authed && data.isSuperAdmin) {
          setAuthed(true)
          setUserName(data.user?.name || "مدیر")
        } else {
          localStorage.removeItem("nasim-session-token")
          router.push("/admin/login")
        }
      })
      .catch(() => {
        localStorage.removeItem("nasim-session-token")
        router.push("/admin/login")
      })
      .finally(() => setChecking(false))
  }, [router])

  const handleLogout = async () => {
    const token = localStorage.getItem("nasim-session-token")
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch {
        // ignore
      }
    }
    localStorage.removeItem("nasim-session-token")
    toast.success("خروج موفق")
    router.push("/admin/login")
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-rose-950 to-amber-950">
        <div className="relative">
          <div className="h-20 w-20 rounded-full border-4 border-rose-500/30" />
          <div className="absolute inset-0 h-20 w-20 animate-spin rounded-full border-4 border-transparent border-t-rose-500" />
          <Crown className="absolute inset-0 m-auto h-8 w-8 text-rose-500" />
        </div>
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-rose-950 to-amber-950 p-4">
        <div className="max-w-md text-center">
          <ShieldCheck className="mx-auto h-16 w-16 text-rose-500/50" />
          <h1 className="mt-4 text-xl font-bold text-white">در حال هدایت...</h1>
          <p className="mt-2 text-sm text-white/50">در حال انتقال به صفحه ورود</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50/30 via-background to-amber-50/30 dark:from-rose-950/10 dark:via-background dark:to-amber-950/10">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-rose-200/50 bg-background/80 backdrop-blur-lg dark:border-rose-800/50">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-3 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ArrowRight className="h-4 w-4" /> بازگشت به سایت
              </Button>
            </Link>
            <div className="hidden h-6 w-px bg-border sm:block" />
            <div className="hidden items-center gap-2 sm:flex">
              <Crown className="h-4 w-4 text-rose-500" />
              <span className="text-sm font-medium">مدیریت پلتفرم نسیم</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-left">
              <div className="text-xs font-medium">{userName}</div>
              <div className="text-[10px] text-muted-foreground">مدیر پلتفرم</div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-amber-500 text-xs font-bold text-white shadow">
              {userName.charAt(0)}
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="خروج">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-[1400px] px-3 py-6 sm:px-6 lg:px-8">
        <SuperAdminView />
      </main>
    </div>
  )
}

export default function AdminPage() {
  return <AdminGate />
}
