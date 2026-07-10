"use client"

import * as React from "react"
import { create } from "zustand"
import { persist } from "zustand/middleware"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

// Persisted dashboard widget order
type WidgetId =
  | "notes"
  | "reminders"
  | "notifications"
  | "kpis"
  | "charts"
  | "recent"

const DEFAULT_ORDER: WidgetId[] = ["notes", "reminders", "notifications", "kpis", "charts", "recent"]

interface DashboardOrderState {
  order: WidgetId[]
  setOrder: (o: WidgetId[]) => void
  reset: () => void
}

export const useDashboardOrder = create<DashboardOrderState>()(
  persist(
    (set) => ({
      order: DEFAULT_ORDER,
      setOrder: (order) => set({ order }),
      reset: () => set({ order: DEFAULT_ORDER }),
    }),
    { name: "dashboard-order" }
  )
)

interface ReorderableSectionProps {
  id: WidgetId
  title: string
  children: React.ReactNode
  className?: string
}

/** A section that can be dragged to reorder. Uses HTML5 drag-and-drop. */
export function ReorderableSection({ id, title, children, className }: ReorderableSectionProps) {
  const { order, setOrder } = useDashboardOrder()
  const [dragging, setDragging] = React.useState(false)
  const [over, setOver] = React.useState(false)

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/widget", id)
    e.dataTransfer.effectAllowed = "move"
    setDragging(true)
  }
  const onDragEnd = () => setDragging(false)
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setOver(true)
  }
  const onDragLeave = () => setOver(false)
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setOver(false)
    const draggedId = e.dataTransfer.getData("text/widget") as WidgetId
    if (!draggedId || draggedId === id) return
    const fromIdx = order.indexOf(draggedId)
    const toIdx = order.indexOf(id)
    if (fromIdx === -1 || toIdx === -1) return
    const next = [...order]
    next.splice(fromIdx, 1)
    next.splice(toIdx, 0, draggedId)
    setOrder(next)
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "relative rounded-xl transition-opacity",
        dragging && "opacity-50",
        over && "ring-2 ring-primary/50",
        className
      )}
    >
      <div className="absolute -top-2 right-2 z-20 flex items-center gap-1 rounded-md border bg-background/90 px-1.5 py-0.5 text-[9px] text-muted-foreground opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100">
        <GripVertical className="h-3 w-3 cursor-grab active:cursor-grabbing" />
        {title}
      </div>
      {children}
    </div>
  )
}
