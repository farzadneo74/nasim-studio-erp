"use client"

import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { ViewRouter } from "./view-router"
import { useWorkspace } from "@/stores/workspace"
import { Button } from "@/components/ui/button"
import { PanelLeft } from "lucide-react"

export function WorkspaceShell() {
  const { sidebarMode, toggleSidebar } = useWorkspace()
  const isHidden = sidebarMode === "hidden"

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-thin">
          <ViewRouter />
        </main>
      </div>
      {isHidden && (
        <Button
          variant="outline"
          size="icon"
          className="fixed top-16 right-2 z-30 hidden h-9 w-9 shadow-md lg:flex"
          onClick={toggleSidebar}
          aria-label="نمایش منو"
          title="نمایش منو"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
