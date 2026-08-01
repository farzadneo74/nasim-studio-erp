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
  // ✅ New-Project-Wizard transient state.
  // `wizardOpen` controls dialog visibility; `wizardInitialCustomerId` (when set)
  // pre-selects the customer and skips the wizard straight to step 2.
  // Both are excluded from persistence (see `partialize` below) so a refresh
  // never re-opens the wizard unexpectedly.
  wizardOpen: boolean
  wizardInitialCustomerId: string | null
  setPage: (p: PageId) => void
  openProject: (id: string) => void
  openProjectForCustomer: (projectId: string, customerId: string) => void
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
  // ✅ Wizard helpers
  openProjectWizard: (customerId?: string | null) => void
  closeProjectWizard: () => void
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
      wizardOpen: false,
      wizardInitialCustomerId: null,
      setPage: (p) =>
        set({ activePage: p, activeProjectId: null, activeCustomerId: null, activeProjectCustomerId: null, mobileSidebarOpen: false }),
      openProject: (id) => set({ activePage: "projects", activeProjectId: id, mobileSidebarOpen: false }),
      openProjectForCustomer: (projectId, customerId) =>
        set({ activePage: "projects", activeProjectId: projectId, activeProjectCustomerId: customerId, mobileSidebarOpen: false }),
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
      toggleSection: (key) =>
        set((s) => ({
          collapsedSections: { ...s.collapsedSections, [key]: !s.collapsedSections[key] },
        })),
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
      // ✅ Opens the New-Project Wizard. When `customerId` is provided, the wizard
      // starts at step 2 with that customer pre-selected (skipping step 1).
      // Navigates to the Projects page first so the wizard (rendered inside
      // CustomerList) is actually mounted on screen.
      openProjectWizard: (customerId) =>
        set({
          activePage: "projects",
          activeProjectId: null,
          activeCustomerId: null,
          activeProjectCustomerId: null,
          mobileSidebarOpen: false,
          wizardOpen: true,
          wizardInitialCustomerId: customerId ?? null,
        }),
      closeProjectWizard: () =>
        set({ wizardOpen: false, wizardInitialCustomerId: null }),
    }),
    {
      name: "studio-erp-workspace",
      // ✅ Exclude transient UI state from persistence so a page refresh doesn't
      // re-open the wizard or the mobile sidebar.
      partialize: (s) => ({
        activePage: s.activePage,
        activeProjectId: s.activeProjectId,
        activeCustomerId: s.activeCustomerId,
        activeProjectCustomerId: s.activeProjectCustomerId,
        role: s.role,
        sidebarMode: s.sidebarMode,
        collapsedSections: s.collapsedSections,
        projectStatusFilter: s.projectStatusFilter,
      }),
    }
  )
)
