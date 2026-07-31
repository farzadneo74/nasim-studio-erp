"use client"

import * as React from "react"
import { useWorkspace } from "@/stores/workspace"
import { Skeleton } from "@/components/ui/skeleton"

const REGISTRY: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  dashboard: React.lazy(() => import("@/components/views/dashboard-view").then(m => ({ default: m.DashboardView }))),
  calendar: React.lazy(() => import("@/components/views/calendar-view").then(m => ({ default: m.CalendarView }))),
  customers: React.lazy(() => import("@/components/views/customers-view").then(m => ({ default: m.CustomersView }))),
  projects: React.lazy(() => import("@/components/views/projects-view").then(m => ({ default: m.ProjectsView }))),
  "my-tasks": React.lazy(() => import("@/components/views/my-tasks-view").then(m => ({ default: m.MyTasksView }))),
  messages: React.lazy(() => import("@/components/views/messages-view").then(m => ({ default: m.MessagesView }))),
  finances: React.lazy(() => import("@/components/views/finances-view").then(m => ({ default: m.FinancesView }))),
  reports: React.lazy(() => import("@/components/views/reports-view").then(m => ({ default: m.ReportsView }))),
  "qr-factory": React.lazy(() => import("@/components/views/qr-factory-view").then(m => ({ default: m.QrFactoryView }))),
  scanner: React.lazy(() => import("@/components/views/scanner-view").then(m => ({ default: m.ScannerView }))),
  "settings-packages": React.lazy(() => import("@/components/views/settings-packages-view").then(m => ({ default: m.SettingsPackagesView }))),
  "settings-tags": React.lazy(() => import("@/components/views/settings-tags-view").then(m => ({ default: m.SettingsTagsView }))),
  "settings-employees": React.lazy(() => import("@/components/views/settings-employees-view").then(m => ({ default: m.SettingsEmployeesView }))),
  "settings-print-photo-prices": React.lazy(() => import("@/components/views/settings-print-photo-prices-view").then(m => ({ default: m.SettingsPrintPhotoPricesView }))),
  "settings-sms-templates": React.lazy(() => import("@/components/views/settings-sms-templates-view").then(m => ({ default: m.SettingsSmsTemplatesView }))),
  "settings-system": React.lazy(() => import("@/components/views/settings-system-view").then(m => ({ default: m.SettingsSystemView }))),
  "settings-custom-fields": React.lazy(() => import("@/components/views/settings-custom-fields-view").then(m => ({ default: m.SettingsCustomFieldsView }))),
  "settings-storage": React.lazy(() => import("@/components/views/storage-management-view").then(m => ({ default: m.StorageManagementView }))),
  "super-admin": React.lazy(() => import("@/components/views/super-admin-view").then(m => ({ default: m.SuperAdminView }))),
}

export function ViewRouter() {
  const activePage = useWorkspace((s) => s.activePage)
  const View = REGISTRY[activePage] ?? REGISTRY.dashboard
  return (
    <div className="mx-auto w-full max-w-[1400px] overflow-x-hidden px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <React.Suspense
        fallback={
          <div className="flex h-96 items-center justify-center">
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        }
      >
        <View />
      </React.Suspense>
    </div>
  )
}

