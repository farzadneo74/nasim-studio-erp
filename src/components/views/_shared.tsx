"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  description,
  icon,
  actions,
}: {
  title: string
  description?: string
  icon?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-2xl">
            {icon}
          </div>
        )}
        <div>
          <h1 className="notion-title text-2xl sm:text-3xl">{title}</h1>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = "#64748b",
  trend,
}: {
  label: string
  value: React.ReactNode
  sub?: string
  icon?: React.ReactNode
  accent?: string
  trend?: { value: string; up: boolean }
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
      style={{ borderTopColor: accent, borderTopWidth: 3 }}
    >
      {/* Decorative gradient blob */}
      <div
        className="pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full opacity-10 blur-2xl transition-opacity duration-200 group-hover:opacity-20"
        style={{ background: accent }}
      />
      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight">{value}</div>
          {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
        </div>
        {icon && (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-110"
            style={{
              background: `linear-gradient(135deg, ${accent}28, ${accent}10)`,
              color: accent,
              border: `1px solid ${accent}20`,
            }}
          >
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div
          className={cn(
            "relative mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            trend.up ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
          )}
        >
          {trend.up ? "▲" : "▼"} {trend.value}
        </div>
      )}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
      {icon && <div className="mb-3 text-4xl opacity-60">{icon}</div>}
      <div className="text-sm font-medium">{title}</div>
      {description && (
        <div className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</div>
      )}
    </div>
  )
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card shadow-sm", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="min-w-0">
            {title && <div className="text-sm font-semibold">{title}</div>}
            {description && (
              <div className="text-xs text-muted-foreground">{description}</div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
        </div>
      )}
      <div className="overflow-x-hidden p-3 sm:p-4">{children}</div>
    </div>
  )
}

export function Placeholder({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-32 text-center">
      <div className="mb-3 text-5xl opacity-50">🚧</div>
      <div className="text-lg font-semibold">{name}</div>
      <div className="mt-1 text-sm text-muted-foreground">
        این بخش در حال آماده‌سازی است…
      </div>
    </div>
  )
}

