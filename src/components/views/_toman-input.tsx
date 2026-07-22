"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { toPersianDigits, parseTomanInput } from "@/lib/format"

interface TomanInputProps extends Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> {
  value?: number
  onValueChange?: (toman: number) => void
}

/**
 * Toman amount input. Displays the value with thousand separators (Persian digits).
 * Calls onValueChange with the raw Toman number (no separators).
 */
export function TomanInput({ value = 0, onValueChange, ...props }: TomanInputProps) {
  const [display, setDisplay] = React.useState(() => (value ? formatGrouped(value) : ""))

  React.useEffect(() => {
    // sync when value changes externally (e.g. reset)
    const parsed = parseTomanInput(display)
    if (parsed !== value) {
      setDisplay(value ? formatGrouped(value) : "")
    }
  }, [value])

  return (
    <Input
      {...props}
      inputMode="numeric"
      dir="ltr"
      value={display}
      placeholder="۰"
      onChange={(e) => {
        const raw = e.target.value
        const num = parseTomanInput(raw)
        setDisplay(num ? formatGrouped(num) : "")
        onValueChange?.(num)
      }}
      className={`text-left ${props.className ?? ""}`}
    />
  )
}

function formatGrouped(n: number): string {
  return toPersianDigits(new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n))
}

