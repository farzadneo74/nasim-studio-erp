"use client"

import * as React from "react"
import { toPersianDigits } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

/**
 * iOS-alarm-style time picker: two scrollable wheels (hours 0-23, minutes 0-59)
 * with a 12-hour قبل/بعد از ظهر display. Returns "HH:MM" (24h) string.
 */
export function TimeWheelPicker({
  value,
  onChange,
  className,
}: {
  value?: string // "HH:MM" 24h
  onChange?: (hhmm: string) => void
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [hour, setHour] = React.useState(0)
  const [minute, setMinute] = React.useState(0)

  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(":").map((n) => parseInt(n, 10))
      if (!Number.isNaN(h)) setHour(h)
      if (!Number.isNaN(m)) setMinute(m)
    }
  }, [value])

  const confirm = () => {
    const hh = String(hour).padStart(2, "0")
    const mm = String(minute).padStart(2, "0")
    onChange?.(`${hh}:${mm}`)
    setOpen(false)
  }

  const display = value ? formatTime12h(value) : "انتخاب ساعت"

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors hover:bg-accent/50",
          className
        )}
        dir="rtl"
      >
        <span className={value ? "" : "text-muted-foreground"}>{display}</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[320px] p-0">
          <div className="p-4">
            <div className="mb-3 text-center text-sm font-semibold">انتخاب ساعت</div>
            <div className="relative flex justify-center gap-2">
              <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-11 -translate-y-1/2 rounded-lg bg-primary/10" />
              <Wheel
                values={Array.from({ length: 24 }, (_, i) => i)}
                value={hour}
                onChange={setHour}
                format={(v) => toPersianDigits(String(v).padStart(2, "0"))}
                label="ساعت"
              />
              <div className="flex items-center pt-[44px] text-xl font-bold">:</div>
              <Wheel
                values={Array.from({ length: 60 }, (_, i) => i)}
                value={minute}
                onChange={setMinute}
                format={(v) => toPersianDigits(String(v).padStart(2, "0"))}
                label="دقیقه"
              />
            </div>
            <div className="mt-3 text-center text-xs text-muted-foreground">
              {formatTime12h(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`)}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                انصراف
              </Button>
              <Button size="sm" onClick={confirm}>
                تأیید
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Wheel({
  values,
  value,
  onChange,
  format,
  label,
}: {
  values: number[]
  value: number
  onChange: (v: number) => void
  format: (v: number) => string
  label?: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const itemH = 40

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const idx = values.indexOf(value)
    if (idx >= 0) el.scrollTop = idx * itemH
  }, [value, values])

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    const idx = Math.round(el.scrollTop / itemH)
    const v = values[Math.max(0, Math.min(values.length - 1, idx))]
    if (v !== value) onChange(v)
  }

  return (
    <div className="flex flex-col items-center">
      {label && <div className="mb-1 text-[10px] text-muted-foreground">{label}</div>}
      <div
        ref={ref}
        onScroll={onScroll}
        className="h-[132px] w-[72px] overflow-y-auto scroll-thin"
        style={{
          scrollSnapType: "y mandatory",
          maskImage: "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)",
        }}
      >
        <div style={{ height: 44 }} />
        {values.map((v) => (
          <div
            key={v}
            className={cn(
              "flex items-center justify-center text-lg font-semibold transition-opacity",
              v === value ? "text-primary opacity-100" : "text-muted-foreground opacity-50"
            )}
            style={{ height: itemH, scrollSnapAlign: "center" }}
            onClick={() => onChange(v)}
          >
            {format(v)}
          </div>
        ))}
        <div style={{ height: 44 }} />
      </div>
    </div>
  )
}

/** Format "HH:MM" (24h) → Persian 12h with قبل/بعد از ظهر. */
export function formatTime12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10))
  if (Number.isNaN(h)) return hhmm
  const period = h < 12 ? "قبل از ظهر" : "بعد از ظهر"
  let h12 = h % 12
  if (h12 === 0) h12 = 12
  return `${toPersianDigits(h12)}:${toPersianDigits(String(m).padStart(2, "0"))} ${period}`
}

