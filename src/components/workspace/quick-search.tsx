"use client"

import * as React from "react"
import {
  Search,
  Users,
  Clapperboard,
  LayoutDashboard,
  Calendar,
  BarChart3,
  Wallet,
  CheckSquare,
  MessageSquare,
  Settings,
  Tag,
  Package,
  Image as ImageIcon,
  Calculator,
  UserCog,
  Database,
  QrCode,
  ScanLine,
  CornerDownLeft,
  ArrowLeft,
} from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Command as CommandPrimitive, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useApi } from "@/lib/api/client"
import { useWorkspace } from "@/stores/workspace"
import type { PageId } from "@/stores/workspace"

interface SearchCustomer {
  id: string
  name: string
  phone?: string
  customerType?: string
}
interface SearchProject {
  id: string
  contractNumber: string
  customer: { id: string; name: string }
  package: { title: string }
  status: string
}

interface QuickSearchProps {
  open: boolean
  onOpenChange: (v: boolean) => void
}

const PAGE_NAV: { id: PageId; label: string; icon: React.ElementType; group: string }[] = [
  { id: "dashboard", label: "داشبورد", icon: LayoutDashboard, group: "فضای کاری" },
  { id: "calendar", label: "تقویم", icon: Calendar, group: "فضای کاری" },
  { id: "reports", label: "گزارش‌ها", icon: BarChart3, group: "فضای کاری" },
  { id: "customers", label: "مشتریان", icon: Users, group: "مدیریت مشتریان" },
  { id: "qr-factory", label: "کارخانه کد QR", icon: QrCode, group: "مدیریت مشتریان" },
  { id: "scanner", label: "اسکنر", icon: ScanLine, group: "مدیریت مشتریان" },
  { id: "projects", label: "پروژه‌ها", icon: Clapperboard, group: "تولید" },
  { id: "my-tasks", label: "کارهای من", icon: CheckSquare, group: "تولید" },
  { id: "messages", label: "پیام‌رسانی", icon: MessageSquare, group: "تولید" },
  { id: "finances", label: "مالی", icon: Wallet, group: "مالی" },
  { id: "settings-packages", label: "پکیج‌ها", icon: Package, group: "تنظیمات" },
  { id: "settings-tags", label: "تگ‌ها", icon: Tag, group: "تنظیمات" },
  { id: "settings-print-photo-prices", label: "قیمت عکس چاپی", icon: ImageIcon, group: "تنظیمات" },
  { id: "settings-salary-rules", label: "قوانین حقوق", icon: Calculator, group: "تنظیمات" },
  { id: "settings-sms-templates", label: "قالب پیامک", icon: MessageSquare, group: "تنظیمات" },
  { id: "settings-custom-fields", label: "فیلدهای سفارشی", icon: Settings, group: "تنظیمات" },
  { id: "settings-users", label: "کاربران و مرخصی", icon: UserCog, group: "تنظیمات" },
  { id: "settings-system", label: "سیستم", icon: Settings, group: "تنظیمات" },
  { id: "settings-storage", label: "فضای ذخیره‌سازی", icon: Database, group: "تنظیمات" },
]

export function QuickSearch({ open, onOpenChange }: QuickSearchProps) {
  const api = useApi()
  const setPage = useWorkspace((s) => s.setPage)
  const openProject = useWorkspace((s) => s.openProject)
  const openCustomer = useWorkspace((s) => s.openCustomer)
  const [query, setQuery] = React.useState("")
  const [customers, setCustomers] = React.useState<SearchCustomer[]>([])
  const [projects, setProjects] = React.useState<SearchProject[]>([])
  const [loading, setLoading] = React.useState(false)

  // Keep latest api ref without re-triggering the effect (api object is
  // recreated every render by useApi, so we must NOT put it in deps).
  const apiRef = React.useRef(api)
  React.useEffect(() => { apiRef.current = api }, [api])

  // Debounced search across customers + projects
  React.useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setCustomers([])
      setProjects([])
      return
    }
    let cancelled = false
    setLoading(true)
    const q = query.trim()
    const timer = setTimeout(async () => {
      try {
        const [custRes, projRes] = await Promise.all([
          apiRef.current.get<{ items: SearchCustomer[] } | SearchCustomer[]>(`/api/customers?search=${encodeURIComponent(q)}&limit=5`),
          apiRef.current.get<{ items: SearchProject[] } | SearchProject[]>(`/api/projects?search=${encodeURIComponent(q)}&limit=5`),
        ])
        if (cancelled) return
        const custItems = Array.isArray(custRes) ? custRes : (custRes?.items ?? [])
        const projItems = Array.isArray(projRes) ? projRes : (projRes?.items ?? [])
        setCustomers(custItems.slice(0, 5))
        setProjects(projItems.slice(0, 5))
      } catch {
        if (!cancelled) {
          setCustomers([])
          setProjects([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  // Reset query when dialog closes
  React.useEffect(() => {
    if (!open) {
      setQuery("")
      setCustomers([])
      setProjects([])
    }
  }, [open])

  const goPage = (p: PageId) => {
    setPage(p)
    onOpenChange(false)
    setQuery("")
  }
  const goCustomer = (id: string) => {
    openCustomer(id)
    onOpenChange(false)
    setQuery("")
  }
  const goProject = (id: string) => {
    openProject(id)
    onOpenChange(false)
    setQuery("")
  }

  const filteredPages = React.useMemo(() => {
    if (!query.trim()) return PAGE_NAV
    const q = query.trim().toLowerCase()
    return PAGE_NAV.filter((p) => p.label.toLowerCase().includes(q))
  }, [query])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="overflow-hidden rounded-2xl border-border/60 p-0 shadow-2xl sm:max-w-[560px]"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">جستجوی سریع</DialogTitle>
        <DialogDescription className="sr-only">جستجوی مشتریان، پروژه‌ها و صفحات سیستم</DialogDescription>
        <CommandPrimitive shouldFilter={false} loop className="flex flex-col">
          <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="جستجوی مشتری، پروژه، یا صفحه…"
              className="h-8 flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <kbd className="shrink-0 rounded border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Esc
            </kbd>
          </div>
          <CommandList className="max-h-[420px] overflow-y-auto overflow-x-hidden p-2">
            <CommandEmpty className="py-10 text-center text-sm text-muted-foreground">
              {query.trim().length < 2 ? "حداقل ۲ حرف وارد کنید" : loading ? "در حال جستجو…" : "نتیجه‌ای یافت نشد"}
            </CommandEmpty>

            {/* Customers results */}
            {customers.length > 0 && (
              <CommandGroup heading="مشتریان" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground">
                {customers.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`cust-${c.id}`}
                    onSelect={() => goCustomer(c.id)}
                    className="group flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm aria-selected:bg-accent"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500/15 to-purple-500/15 text-rose-600 dark:text-rose-400">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{c.name}</div>
                      {c.phone && (
                        <div className="truncate text-xs text-muted-foreground" dir="ltr">
                          {c.phone}
                        </div>
                      )}
                    </div>
                    {c.customerType && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {c.customerType}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Projects results */}
            {projects.length > 0 && (
              <CommandGroup heading="پروژه‌ها" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground">
                {projects.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`proj-${p.id}`}
                    onSelect={() => goProject(p.id)}
                    className="group flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm aria-selected:bg-accent"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/15 to-orange-500/15 text-amber-600 dark:text-amber-400">
                      <Clapperboard className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {p.customer.name} — {p.package.title}
                      </div>
                      <div className="truncate text-xs text-muted-foreground" dir="ltr">
                        {p.contractNumber} · {p.status}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Quick navigation — only show when there are matching pages */}
            {filteredPages.length > 0 && (
              <CommandGroup heading={query.trim() ? "صفحات" : "دسترسی سریع"} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground">
                {filteredPages.map((p) => {
                  const Icon = p.icon
                  return (
                    <CommandItem
                      key={p.id}
                      value={`page-${p.id}`}
                      onSelect={() => goPage(p.id)}
                      className="group flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm aria-selected:bg-accent"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground group-aria-selected:bg-primary/10 group-aria-selected:text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="flex-1 truncate font-medium">{p.label}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground/70">{p.group}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}

            {/* Footer hint */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 text-[10px] text-muted-foreground/70">
              <div className="flex items-center gap-1.5">
                <ArrowLeft className="h-3 w-3" />
                <span>برای جابجایی</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CornerDownLeft className="h-3 w-3" />
                <span>برای انتخاب</span>
              </div>
            </div>
          </CommandList>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  )
}
