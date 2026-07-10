"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Calendar,
  Users,
  FolderKanban,
  CheckSquare,
  Wallet,
  BarChart3,
  QrCode,
  ScanLine,
  Package,
  Tag,
  UserCog,
  Calculator,
  MessageSquareText,
  Settings2,
  CalendarDays,
  ChevronRight,
  Search,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  LogOut,
  X,
  MessagesSquare,
  HardDrive,
  Image as ImageIcon,
} from "lucide-react"
import { useWorkspace, PageId } from "@/stores/workspace"
import { ROLE_PERMISSIONS, ROLE_LABELS, Role, ROLES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useStudioName } from "@/lib/api/use-studio-name"
import { useAuth } from "@/lib/auth-context"

interface NavItem {
  id: PageId
  label: string
  emoji: string
  icon: React.ElementType
}
interface NavSection {
  key: string
  label: string
  items: NavItem[]
}

const SECTIONS: NavSection[] = [
  {
    key: "workspace",
    label: "فضای کاری",
    items: [
      { id: "dashboard", label: "داشبورد", emoji: "🏠", icon: LayoutDashboard },
      { id: "calendar", label: "تقویم", emoji: "📅", icon: Calendar },
      { id: "reports", label: "گزارش‌ها", emoji: "📊", icon: BarChart3 },
    ],
  },
  {
    key: "crm",
    label: "مدیریت مشتریان",
    items: [
      { id: "customers", label: "مشتریان", emoji: "👤", icon: Users },
      { id: "qr-factory", label: "کارخانه کد QR", emoji: "🎟️", icon: QrCode },
      { id: "scanner", label: "اسکنر", emoji: "📷", icon: ScanLine },
    ],
  },
  {
    key: "production",
    label: "تولید",
    items: [
      { id: "projects", label: "پروژه‌ها", emoji: "🎬", icon: FolderKanban },
      { id: "my-tasks", label: "کارهای من", emoji: "✅", icon: CheckSquare },
      { id: "messages", label: "پیام‌رسانی", emoji: "💬", icon: MessagesSquare },
    ],
  },
  {
    key: "finance",
    label: "مالی",
    items: [{ id: "finances", label: "مالی", emoji: "💰", icon: Wallet }],
  },
  {
    key: "settings",
    label: "تنظیمات",
    items: [
      { id: "settings-packages", label: "پکیج‌ها", emoji: "📦", icon: Package },
      { id: "settings-tags", label: "تگ‌ها", emoji: "🏷️", icon: Tag },
      { id: "settings-print-photo-prices", label: "قیمت عکس چاپی", emoji: "🖼️", icon: ImageIcon },
      { id: "settings-salary-rules", label: "قوانین حقوق", emoji: "🧮", icon: Calculator },
      { id: "settings-sms-templates", label: "قالب پیامک", emoji: "💬", icon: MessageSquareText },
      { id: "settings-custom-fields", label: "فیلدهای سفارشی", emoji: "🎛️", icon: Settings2 },
      { id: "settings-users", label: "کاربران و مرخصی", emoji: "👥", icon: UserCog },
      { id: "settings-leaves", label: "درخواست مرخصی", emoji: "🌴", icon: CalendarDays },
      { id: "settings-system", label: "سیستم", emoji: "⚙️", icon: Settings2 },
      { id: "settings-storage", label: "فضای ذخیره‌سازی", emoji: "💾", icon: HardDrive },
    ],
  },
]

// Pastel section themes — desaturated, professional
const sectionThemes = [
  {
    header: "bg-sky-100/50 text-sky-700 dark:bg-sky-900/25 dark:text-sky-300",
    itemHover: "hover:bg-sky-50 dark:hover:bg-sky-950/15",
    itemActive: "bg-sky-200/40 dark:bg-sky-800/25 text-sky-800 dark:text-sky-200 font-medium",
    activeBorder: "border-r-2 border-sky-400 dark:border-sky-500",
  },
  {
    header: "bg-violet-100/50 text-violet-700 dark:bg-violet-900/25 dark:text-violet-300",
    itemHover: "hover:bg-violet-50 dark:hover:bg-violet-950/15",
    itemActive: "bg-violet-200/40 dark:bg-violet-800/25 text-violet-800 dark:text-violet-200 font-medium",
    activeBorder: "border-r-2 border-violet-400 dark:border-violet-500",
  },
  {
    header: "bg-emerald-100/50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300",
    itemHover: "hover:bg-emerald-50 dark:hover:bg-emerald-950/15",
    itemActive: "bg-emerald-200/40 dark:bg-emerald-800/25 text-emerald-800 dark:text-emerald-200 font-medium",
    activeBorder: "border-r-2 border-emerald-400 dark:border-emerald-500",
  },
  {
    header: "bg-amber-100/50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300",
    itemHover: "hover:bg-amber-50 dark:hover:bg-amber-950/15",
    itemActive: "bg-amber-200/40 dark:bg-amber-800/25 text-amber-800 dark:text-amber-200 font-medium",
    activeBorder: "border-r-2 border-amber-400 dark:border-amber-500",
  },
  {
    header: "bg-rose-100/50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-300",
    itemHover: "hover:bg-rose-50 dark:hover:bg-rose-950/15",
    itemActive: "bg-rose-200/40 dark:bg-rose-800/25 text-rose-800 dark:text-rose-200 font-medium",
    activeBorder: "border-r-2 border-rose-400 dark:border-rose-500",
  },
]

function itemAllowed(id: PageId, role: Role): boolean {
  const p = ROLE_PERMISSIONS[role]
  if (!p) return true
  switch (id) {
    case "finances": return p.finance
    case "customers": return p.customers
    case "qr-factory": return p.qr
    case "scanner": return p.scanner
    case "settings-packages": return p.packages
    case "settings-tags": return p.tags
    case "settings-print-photo-prices": return role === "admin" || role === "manager"
    case "settings-salary-rules": return p.salaryRules
    case "settings-users": return p.users
    case "settings-system": return p.system
    case "settings-sms-templates": return role === "admin" || role === "manager"
    case "settings-leaves": return role === "admin" || role === "manager"
    case "settings-custom-fields": return role === "admin" || role === "manager" || role === "sales"
    case "reports": return p.finance
    default: return true
  }
}

export function Sidebar() {
  const {
    activePage,
    setPage,
    role,
    sidebarMode,
    toggleSidebar,
    mobileSidebarOpen,
    toggleMobileSidebar,
    collapsedSections,
    toggleSection,
  } = useWorkspace()
  const studioName = useStudioName()
  const { user, currentRole, logout, refresh } = useAuth()

  const effectiveRole = (currentRole ?? role) as Role
  const initials = (user?.name ?? "کاربر").slice(0, 2)
  const roleLabel = effectiveRole === ("all" as Role) ? "همه استودیوها" : ROLE_LABELS[effectiveRole] ?? "کاربر"
  const handleLogout = async () => { await logout(); await refresh() }

  const isHidden = sidebarMode === "hidden"

  return (
    <>
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={toggleMobileSidebar} />
      )}
      <aside
        className={cn(
          "flex h-full flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
          isHidden ? "lg:w-0 lg:border-r-0 lg:overflow-hidden" : "lg:w-64",
          "fixed inset-y-0 right-0 z-50 w-64 lg:static lg:z-auto lg:translate-x-0",
          mobileSidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
          isHidden && "lg:opacity-0"
        )}
      >
        {/* Workspace switcher */}
        <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-rose-500 to-purple-600 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold leading-tight">{studioName.fa}</div>
            <div className="truncate text-[11px] text-muted-foreground" dir="ltr">{studioName.en}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-7 w-7 shrink-0 text-muted-foreground hover:bg-sidebar-accent lg:flex"
            onClick={toggleSidebar}
            aria-label="حالت نمایش منو"
            title={isHidden ? "نمایش منو" : "مخفی کردن منو"}
          >
            {isHidden ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-sidebar-accent lg:hidden"
            onClick={toggleMobileSidebar}
            aria-label="بستن منو"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <button
            onClick={() => setPage("dashboard")}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent"
          >
            <Search className="h-4 w-4" />
            <span>جستجوی سریع…</span>
            <kbd className="mr-auto rounded border border-sidebar-border bg-background/50 px-1 text-[10px]">⌘K</kbd>
          </button>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto scroll-thin px-2 pb-4">
          {SECTIONS.map((section, si) => {
            const items = section.items.filter((it) => itemAllowed(it.id, effectiveRole))
            if (items.length === 0) return null
            const collapsed = collapsedSections[section.key]
            const theme = sectionThemes[si % sectionThemes.length]
            return (
              <div key={section.key} className="mb-1 border-b border-sidebar-border/30 pb-1 last:border-b-0">
                <button
                  onClick={() => toggleSection(section.key)}
                  className={cn(
                    "mt-2 flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-[13px] font-bold uppercase tracking-wide transition-colors",
                    theme.header
                  )}
                >
                  <ChevronRight className={cn("h-3 w-3 shrink-0 transition-transform", !collapsed && "rotate-90")} />
                  {section.label}
                </button>
                {!collapsed &&
                  items.map((item) => {
                    const active = activePage === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => setPage(item.id)}
                        className={cn(
                          "group flex w-full items-center gap-2.5 rounded-md border-r-2 border-transparent px-2 py-[7px] text-[13px] font-normal transition-colors",
                          active
                            ? cn(theme.itemActive, theme.activeBorder)
                            : cn("text-sidebar-foreground/80", theme.itemHover)
                        )}
                      >
                        <span className="text-base leading-none">{item.emoji}</span>
                        <span className="truncate">{item.label}</span>
                      </button>
                    )
                  })}
              </div>
            )
          })}
        </nav>

        {/* User + logout */}
        <div className="border-t border-sidebar-border p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-gradient-to-br from-sky-500 to-emerald-500 text-[10px] font-semibold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 text-right">
                  <div className="truncate text-[13px] font-medium">{user?.name ?? "کاربر"}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{roleLabel}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-52">
              <DropdownMenuLabel className="text-xs text-muted-foreground">حساب کاربری</DropdownMenuLabel>
              <div className="px-2 py-1.5 text-[11px] text-muted-foreground" dir="ltr">{user?.phone}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-rose-600 focus:text-rose-600">
                <LogOut className="ml-2 h-3.5 w-3.5" /> خروج از حساب
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  )
}

function roleEmoji(r: Role): string {
  return { admin: "👑", manager: "🧭", sales: "💼", photographer: "📸", editor: "🎨", qc: "🔍", logistics: "🚚" }[r]
}
