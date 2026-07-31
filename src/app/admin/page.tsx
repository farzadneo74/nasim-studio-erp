"use client"

import { AuthProvider, useAuth } from "@/lib/auth-context"
import { LoginView } from "@/components/views/login-view"
import { SuperAdminView } from "@/components/views/super-admin-view"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsSuperAdmin } from "@/lib/hooks/use-is-super-admin"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, Crown } from "lucide-react"

function AdminGate() {
  const { loading, authed, user, logout, refresh } = useAuth()
  const { data: isSuperAdmin, isLoading: saLoading } = useIsSuperAdmin()

  if (loading || saLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    )
  }

  if (!authed || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-rose-950/20 dark:via-background dark:to-amber-950/20">
        <LoginView />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-rose-950/20 dark:via-background dark:to-amber-950/20 p-4">
        <div className="max-w-md rounded-xl border border-rose-200 bg-white p-6 shadow-lg dark:border-rose-900 dark:bg-card">
          <Crown className="mx-auto h-12 w-12 text-rose-500" />
          <h1 className="mt-4 text-center text-xl font-bold">دسترسی محدود</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            کاربر گرامی <strong>{user.name}</strong>،
            <br />
            این صفحه فقط برای مدیر پلتفرم قابل دسترسی است.
            <br />
            شما دسترسی super-admin ندارید.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Button asChild>
              <Link href="/">بازگشت به سایت</Link>
            </Button>
            <Button variant="outline" onClick={async () => { await logout(); await refresh() }}>
              خروج از حساب
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Super-admin view — بدون نیاز به انتخاب استودیو
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50/30 via-background to-amber-50/30 dark:from-rose-950/10 dark:via-background dark:to-amber-950/10">
      <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowRight className="ml-1.5 h-4 w-4" />
              بازگشت به سایت
            </Button>
          </Link>
          <div className="text-xs text-muted-foreground">
            دسترسی: {user.phone}
          </div>
        </div>
        <SuperAdminView />
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <AuthProvider>
      <AdminGate />
    </AuthProvider>
  )
}
