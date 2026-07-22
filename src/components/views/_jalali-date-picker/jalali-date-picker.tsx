"use client"

import * as React from "react"
import DatePicker from "react-multi-date-picker"
import persian from "react-date-object/calendars/persian"
import persian_fa from "react-date-object/locales/persian_fa"
import gregorian from "react-date-object/calendars/gregorian"
import gregorian_en from "react-date-object/locales/gregorian_en"
import DateObject from "react-date-object"
import { Input } from "@/components/ui/input"
import { Calendar as CalendarIcon, X } from "lucide-react"

interface JalaliDatePickerProps {
  value?: string | null // ISO date string (Gregorian, what we store in DB)
  onChange?: (iso: string | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

/**
 * A Jalali (Shamsi) date picker. Stores/returns a Gregorian ISO string so the
 * DB stays Gregorian. Displays a Persian calendar to the user.
 */
export function JalaliDatePicker({
  value,
  onChange,
  placeholder = "انتخاب تاریخ",
  className,
  disabled,
}: JalaliDatePickerProps) {
  // Convert stored ISO → DateObject for the picker
  const dateObj = React.useMemo(() => {
    if (!value) return undefined
    try {
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return undefined
      return new DateObject({ date: d, calendar: gregorian, locale: gregorian_en })
    } catch {
      return undefined
    }
  }, [value])

  const handleChange = (d: DateObject | null) => {
    if (!d) {
      onChange?.(null)
      return
    }
    // d is a Persian DateObject; convert to Gregorian then ISO
    const g = d.convert(gregorian, gregorian_en)
    const js = new Date(g.year, g.month.index, g.day, 12, 0, 0)
    onChange?.(js.toISOString())
  }

  return (
    <div className="relative">
      <DatePicker
        value={dateObj}
        onChange={handleChange}
        calendar={persian}
        locale={persian_fa}
        calendarPosition="bottom-center"
        format="YYYY/MM/DD"
        placeholder={placeholder}
        disabled={disabled}
        inputClass="jdp-input"
        containerClassName="jdp-container w-full"
        style={{ width: "100%" }}
        // render a custom input so it matches shadcn styling
        render={(v: string, openCalendar: () => void) => (
          <div
            className={`flex h-9 w-full items-center gap-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors hover:bg-accent/50 disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
            dir="rtl"
          >
            <button
              type="button"
              onClick={openCalendar}
              disabled={disabled}
              className="flex flex-1 items-center gap-2 text-right disabled:cursor-not-allowed"
            >
              <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className={v ? "" : "text-muted-foreground"}>
                {v || placeholder}
              </span>
            </button>
            {v && !disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange?.(null)
                }}
                className="shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600"
                aria-label="پاک کردن تاریخ"
                title="پاک کردن تاریخ"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      />
    </div>
  )
}

