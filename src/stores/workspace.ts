"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { Role, ProjectStatus } from "@/lib/constants"

export type PageId =
  | "dashboard"
  | "calendar"
  | "customers"
  | "projects"
  | "my-tasks"
  | "messages"
  | "finances"
  | "reports"
  | "qr-factory"
  | "scanner"
  | "settings-packages"
  | "settings-tags"
  | "settings-users"
  | "settings-salary-rules"
  | "settings-print-photo-prices"
  | "settings-sms-templates"
  | "settings-system"
  | "settings-leaves"
  | "settings-custom-fields"
  | "settings-storage"

interface WorkspaceState {
  activePage: PageId
  activeProjectId: string | null
  activeCustomerId: string | null
  activeProjectCustomerId: string | null
  role: Role
  sidebarMode: "expanded" | "hidden"
  mobileSidebarOpen: boolean
  collapsedSections: Record<string, boolean>
  // optional status filter applied when navigating to the Projects view
  // (set by the dashboard's status-flow widget, consumed by CustomerList)
  projectStatusFilter: ProjectStatus | null
  setPage: (p: PageId) => void
  openProject: (id: string) => void
  openCustomer: (id: string) => void
  openProjectCustomer: (id: string) => void
  backToProjectCustomerList: () => void
  backToProjectCustomer: () => void
  setRole: (r: Role) => void
  toggleSidebar: () => void
  toggleMobileSidebar: () => void
  toggleSection: (key: string) => void
  setProjectStatusFilter: (s: ProjectStatus | null) => void
  goToProjectsWithStatus: (s: ProjectStatus) => void
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set) => ({
      activePage: "dashboard",
      activeProjectId: null,
      activeCustomerId: null,
      activeProjectCustomerId: null,
      role: "admin",
      sidebarMode: "expanded",
      mobileSidebarOpen: false,
      collapsedSections: {},
      projectStatusFilter: null,
      setPage: (p) =>
        set({ activePage: p, activeProjectId: null, activeCustomerId: null, activeProjectCustomerId: null, mobileSidebarOpen: false }),
      openProject: (id) => set({ activePage: "projects", activeProjectId: id, mobileSidebarOpen: false }),
      openCustomer: (id) => set({ activePage: "customers", activeCustomerId: id, mobileSidebarOpen: false }),
      openProjectCustomer: (id) =>
        set({ activePage: "projects", activeProjectId: null, activeProjectCustomerId: id, mobileSidebarOpen: false }),
      backToProjectCustomerList: () => set({ activeProjectId: null, activeProjectCustomerId: null }),
      backToProjectCustomer: () => set({ activeProjectId: null }),
      setRole: (r) => set({ role: r }),
      toggleSidebar: () =>
        set((s) => ({
          sidebarMode: s.sidebarMode === "expanded" ? "hidden" : "expanded",
        })),
      toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
      setProjectStatusFilter: (s) => set({ projectStatusFilter: s }),
      goToProjectsWithStatus: (s) =>
        set({
          activePage: "projects",
          activeProjectId: null,
          activeCustomerId: null,
          activeProjectCustomerId: null,
          projectStatusFilter: s,
          mobileSidebarOpen: false,
        }),
    }),
    { name: "studio-erp-workspace" }
  )
)

