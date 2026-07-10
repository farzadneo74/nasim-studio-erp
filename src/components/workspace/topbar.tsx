"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Moon, Sun, Bell, ChevronLeft, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useWorkspace, PageId } from "@/stores/workspace"
import { ROLE_LABELS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { useStudioName } from "@/lib/api/use-studio-name"
import { useAuth } from "@/lib/auth-context"
import { NotificationsPanel } from "@/components/workspace/notifications-panel"

const PAGE_TITLES: Record<PageId, string> = {
  dashboard: "داشبورد",
  calendar: "تقویم",
  customers: "مشتریان",
  projects: "پروژه‌ها",
  "my-tasks": "کارهای من",
  messages: "پیام‌رسانی",
  finances: "مالی",
  reports: "گزارش‌ها",
  "qr-factory": "کارخانه کد QR",
  scanner: "اسکنر",
  "settings-packages": "تنظیمات · پکیج‌ها",
  "settings-tags": "تنظیمات · تگ‌ها",
  "settings-users": "تنظیمات · کاربران و مرخصی",
  "settings-salary-rules": "تنظیمات · قوانین حقوق",
  "settings-sms-templates": "تنظیمات · قالب پیامک",
  "settings-system": "تنظیمات · سیستم",
  "settings-leaves": "تنظیمات · درخواست مرخصی",
  "settings-custom-fields": "تنظیمات · فیلدهای سفارشی",
}

export function Topbar() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const { activePage, role, toggleMobileSidebar } = useWorkspace()
  const { currentRole } = useAuth()
  const studioName = useStudioName()
  const effectiveRole = currentRole ?? role
  React.useEffect(() => setMounted(true), [])

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur sm:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 lg:hidden"
        onClick={toggleMobileSidebar}
        aria-label="باز کردن منو"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex min-w-0 items-center gap-1.5 text-sm">
        <span className="hidden truncate text-muted-foreground sm:inline">{studioName.fa}</span>
        <ChevronLeft className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground/50 sm:inline" />
        <span className="truncate font-medium">{PAGE_TITLES[activePage]}</span>
      </div>

      <div className="mr-auto flex items-center gap-1.5">
        <div className="ml-1 hidden items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {effectiveRole === "all" ? "همه استودیوها" : (ROLE_LABELS[effectiveRole as keyof typeof ROLE_LABELS] ?? effectiveRole)}
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 relative" aria-label="اعلان‌ها">
              <Bell className="h-4 w-4" />
              <span className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[360px] p-0 sm:w-[380px]" align="end">
            <NotificationsPanel />
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="تغییر تم"
        >
          {mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  )
}
