"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Plus,
  RefreshCw,
  Printer,
  Ban,
  Copy,
  Loader2,
  Filter,
  Users,
  Package,
  Sparkles,
  Image as ImageIcon,
  Pencil,
  Trash2,
  LayoutTemplate,
  Check,
  FileArchive,
  FileImage,
} from "lucide-react"
import JSZip from "jszip"

import { useWorkspace } from "@/stores/workspace"
import { useApi } from "@/lib/api/client"
import { useStudioName } from "@/lib/api/use-studio-name"
import { ROLE_PERMISSIONS, type Role } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { formatDate, toPersianDigits } from "@/lib/format"

import { PageHeader, EmptyState, SectionCard } from "./_shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// ============================================================
// Types
// ============================================================
interface ReferralCodeItem {
  id: string
  code: string
  ownerId: string
  owner: { id: string; name: string; phone: string; customerType: string }
  discountPercent: number
  maxUses: number
  usedCount: number
  isExpired: boolean
  validFrom: string
  validUntil: string | null
  relatedProjectId: string | null
  relatedProject: {
    id: string
    contractNumber: string
    customerName: string
    packageTitle: string
  } | null
  description?: string | null
  statusLabel: "available" | "used" | "expired"
  isAvailable: boolean
  isUsedUp: boolean
  createdAt: string
}
interface CodesListResponse {
  items: ReferralCodeItem[]
  total: number
  page: number
  limit: number
}
interface CustomerOption {
  id: string
  name: string
  phone: string
}
interface ProjectOption {
  id: string
  contractNumber: string
  customerId: string
  customerName: string
  packageTitle: string
}

interface QrTemplate {
  id: string
  name: string
  discountPercent: number
  maxUses: number
  /** Output canvas WIDTH (in pixels). Same DB column as `pixelSize`. */
  pixelSize: number
  /** Output canvas WIDTH (alias of pixelSize). */
  width: number
  /** Output canvas HEIGHT (in pixels). Stored in layoutConfig.height. */
  height: number
  dpi: number
  layoutConfig: { height?: number; aspect?: "portrait" | "square"; [k: string]: unknown }
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ============================================================
// Helpers — separate width + height = output canvas (NOT the QR code size)
// ============================================================
/**
 * The OUTPUT CANVAS is defined by two independent pixel dimensions:
 *   width  (default 1200)
 *   height (default 1680)
 *
 * The QR code inside the layout is always rendered at 65% of the canvas
 * WIDTH — independent of either dimension.
 */
const DEFAULT_WIDTH = 1200
const DEFAULT_HEIGHT = 1680
const DEFAULT_DPI = 150

/** QR image URL fetches a fixed, reasonable size — width/height only affect the canvas/export. */
const QR_FIXED_FETCH_SIZE = 300
/** QR code occupies 65% of the output canvas WIDTH (the `width` field). */
const QR_CANVAS_PROPORTION = 0.65

function qrUrl(code: string, size = QR_FIXED_FETCH_SIZE) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(code)}`
}

/**
 * Returns the explicit width + height stored on a QrTemplate. The API
 * already derives these for us (returns `width` and `height` as numbers),
 * but we keep a fallback for safety in case a stale row slips through.
 */
function dimensionsOf(t: QrTemplate | null | undefined): { width: number; height: number } {
  if (!t) return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }
  const width =
    typeof t.width === "number" && Number.isFinite(t.width) && t.width > 0
      ? t.width
      : t.pixelSize ?? DEFAULT_WIDTH
  const rawHeight =
    typeof t.height === "number" && Number.isFinite(t.height) && t.height > 0
      ? t.height
      : typeof t.layoutConfig?.height === "number" && t.layoutConfig.height > 0
      ? t.layoutConfig.height
      : t.layoutConfig?.aspect === "square"
      ? width
      : Math.round(width * 1.4)
  return { width, height: rawHeight }
}

function canvasDimensions(width: number, height: number) {
  const W = Math.max(64, Math.min(4000, Math.round(width)))
  const H = Math.max(64, Math.min(4000, Math.round(height)))
  return { W, H }
}

function specLabel(width: number, height: number, dpi: number) {
  const { W, H } = canvasDimensions(width, height)
  return `خروجی: ${toPersianDigits(W)}×${toPersianDigits(H)} پیکسل @ ${toPersianDigits(dpi)}dpi`
}

/**
 * Free-typing numeric pixel input.
 *
 * The width/height number inputs previously clamped on every keystroke, which
 * made it impossible to type an exact value (e.g. typing "2" to start "200"
 * would snap to the min 64, and an empty field would snap to the default).
 *
 * This component stores the raw text locally and only commits the parsed,
 * clamped number on blur (or Enter). While typing, the user can enter any
 * sequence of digits — including temporarily-empty / partial values — and
 * nothing is reformatted under their cursor.
 */
function PixelInput({
  value,
  onCommit,
  min = 64,
  max = 4000,
  defaultValue,
  placeholder,
  "aria-label": ariaLabel,
}: {
  value: number
  onCommit: (n: number) => void
  min?: number
  max?: number
  defaultValue?: number
  placeholder?: string
  "aria-label"?: string
}) {
  const [raw, setRaw] = React.useState<string>(() => String(value))
  const lastCommittedRef = React.useRef<number>(value)

  // If the parent pushes a new value externally (e.g. applyTemplate, reset),
  // sync the local raw text — but only when it differs from what we last
  // committed, so we don't clobber the user's in-progress typing.
  React.useEffect(() => {
    if (value !== lastCommittedRef.current) {
      lastCommittedRef.current = value
      setRaw(String(value))
    }
  }, [value])

  function commit() {
    const trimmed = raw.trim()
    const parsed = parseInt(trimmed, 10)
    let next: number
    if (trimmed === "" || !Number.isFinite(parsed)) {
      next = defaultValue ?? min
    } else {
      next = Math.max(min, Math.min(max, parsed))
    }
    lastCommittedRef.current = next
    setRaw(String(next))
    if (next !== value) onCommit(next)
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      dir="ltr"
      pattern="[0-9]*"
      value={raw}
      onChange={(e) => setRaw(e.target.value.replace(/[^0-9]/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          ;(e.currentTarget as HTMLInputElement).blur()
        }
      }}
      placeholder={placeholder ?? String(defaultValue ?? min)}
      aria-label={ariaLabel}
      className="text-left"
    />
  )
}

function useMutate() {
  const role = useWorkspace((s) => s.role)
  return React.useCallback(
    async function mutate<T = unknown>(
      url: string,
      method: "POST" | "PATCH" | "DELETE",
      body?: unknown
    ): Promise<T> {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-demo-role": role,
        },
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const errMsg = (data as { error?: string })?.error || `Request failed (${res.status})`
        throw new Error(errMsg)
      }
      return data as T
    },
    [role]
  )
}

function StatusBadge({ item }: { item: ReferralCodeItem }) {
  if (item.isExpired) {
    return (
      <Badge className="border-transparent bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
        منقضی
      </Badge>
    )
  }
  if (item.isUsedUp) {
    return (
      <Badge className="border-transparent bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
        استفاده‌شده
      </Badge>
    )
  }
  return (
    <Badge className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
      موجود
    </Badge>
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * Print/export layout — used by BOTH the per-card and bulk "چاپ" and "عکس" buttons.
 *
 * Layout per card (top → bottom):
 *   studio name | "کد تخفیف ویژه" (big bold) | QR barcode (65% of canvas WIDTH) |
 *   code (monospace) | discount % BIG RED | owner name | description | expiry | DPI line
 *
 * `width` × `height` define the OUTPUT CANVAS dimensions in pixels. The QR
 * image itself is fetched at a fixed reasonable size and rendered at 65% of
 * the canvas WIDTH via CSS — width/height do NOT change the QR resolution,
 * only the final exported image dimensions.
 */
function buildPrintHtml(
  studioName: string,
  items: ReferralCodeItem[],
  opts?: { width?: number; height?: number; dpi?: number }
): string {
  const width = Math.max(64, Math.min(4000, opts?.width ?? DEFAULT_WIDTH))
  const height = Math.max(64, Math.min(4000, opts?.height ?? DEFAULT_HEIGHT))
  const dpi = Math.max(72, Math.min(600, opts?.dpi ?? DEFAULT_DPI))
  const { W, H } = canvasDimensions(width, height)
  const qrPct = Math.round(QR_CANVAS_PROPORTION * 100)

  const cards = items
    .map((item) => {
      const discountLine = `<div class="discount">${toPersianDigits(item.discountPercent)}٪ تخفیف</div>`
      const ownerLine = `<div class="owner">صادر شده برای: ${escapeHtml(item.owner.name)}</div>`
      const descLine = item.description
        ? `<div class="desc">${escapeHtml(item.description)}</div>`
        : ""
      const validLine = item.validUntil
        ? `<div class="expires">معتبر تا ${escapeHtml(formatDate(item.validUntil))}</div>`
        : `<div class="expires">بدون تاریخ انقضا · ${toPersianDigits(item.maxUses)} استفاده مجاز</div>`
      return `
        <div class="card">
          <div class="studio">${escapeHtml(studioName)}</div>
          <div class="title">کد تخفیف ویژه</div>
          <div class="qr-wrap"><img src="${qrUrl(item.code)}" alt="کد QR" /></div>
          <div class="code">${escapeHtml(item.code)}</div>
          ${discountLine}
          ${ownerLine}
          ${descLine}
          ${validLine}
          <div class="dpi">${W}×${H}px · ${dpi}dpi</div>
        </div>`
    })
    .join("")

  const isBulk = items.length > 1
  return `
    <html lang="fa" dir="rtl">
    <head>
      <meta charset="utf-8" />
      <title>${isBulk ? "کدهای تخفیف — چاپ" : "کد تخفیف"}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: Vazirmatn, -apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 24px;
          background: #fff;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .card {
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          page-break-inside: avoid;
          background: #fff;
          position: relative;
          aspect-ratio: ${W} / ${H};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
        }
        .studio {
          font-size: 14px;
          letter-spacing: 0.05em;
          color: #475569;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .title {
          font-size: 22px;
          font-weight: 800;
          margin-bottom: 12px;
          color: #0f172a;
        }
        .qr-wrap {
          width: ${qrPct}%;
          aspect-ratio: 1 / 1;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .qr-wrap img {
          width: 100%;
          height: 100%;
          display: block;
          image-rendering: pixelated;
        }
        .code {
          font-family: "SFMono-Regular", Menlo, Consolas, monospace;
          font-size: 20px;
          letter-spacing: 0.12em;
          margin-top: 12px;
          font-weight: 700;
          color: #0f172a;
        }
        .discount {
          font-size: 26px;
          color: #dc2626;
          margin-top: 10px;
          font-weight: 800;
          letter-spacing: 0.02em;
        }
        .owner {
          font-size: 14px;
          color: #334155;
          margin-top: 12px;
          font-weight: 600;
        }
        .desc {
          font-size: 12px;
          color: #475569;
          margin-top: 6px;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
          max-width: 90%;
        }
        .expires {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 12px;
        }
        .dpi {
          position: absolute;
          bottom: 8px;
          left: 12px;
          font-size: 10px;
          color: #cbd5e1;
          letter-spacing: 0.02em;
          direction: ltr;
        }
        @media print {
          body { padding: 0; }
          .grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 600px) {
          .grid { grid-template-columns: 1fr; }
        }
      </style>
    </head>
    <body>
      ${isBulk ? `<div class="grid">${cards}</div>` : cards}
      <script>
        window.addEventListener('load', function () {
          setTimeout(function () { window.print(); }, 600);
        });
      </script>
    </body>
    </html>
  `
}

/** Opens a print window with the given HTML. Auto-triggers print on load. */
function openPrintWindow(html: string) {
  const w = window.open("", "_blank", "width=900,height=700")
  if (!w) {
    toast.error("پنجره popup مسدود شده — برای چاپ اجازه دهید")
    return
  }
  w.document.write(html)
  w.document.close()
}

// ============================================================
// Canvas PNG image export
// Renders the SAME layout as buildPrintHtml to a canvas, then downloads as PNG.
// Falls back to opening the print window if canvas rasterization fails
// (e.g. CORS-tainted QR image).
//
// Canvas dimensions = width × height. The QR is drawn at 65% of canvas WIDTH.
// All text sizes scale relative to canvas width so the layout is preserved
// at any output resolution.
// ============================================================
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  // Persian text shaping is handled natively by the browser canvas.
  const words = text.split(/\s+/)
  let line = ""
  let curY = y
  for (const w of words) {
    const test = line ? line + " " + w : w
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, curY)
      line = w
      curY += lineHeight
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, curY)
  return curY
}

async function drawCardToCanvas(
  item: ReferralCodeItem,
  opts: { studioName: string; width: number; height: number; dpi: number }
): Promise<Blob> {
  const { W, H } = canvasDimensions(opts.width, opts.height)
  const canvas = document.createElement("canvas")
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("canvas 2d context unavailable")

  // Make sure webfonts are ready (Vazirmatn) so Persian text shapes correctly.
  try {
    await (document as Document & { fonts?: FontFaceSet }).fonts?.ready
  } catch {
    /* ignore */
  }

  // White background
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, W, H)

  // Light border (scales with canvas width)
  const borderWidth = Math.max(2, Math.round(W * 0.005))
  ctx.strokeStyle = "#e2e8f0"
  ctx.lineWidth = borderWidth
  ctx.strokeRect(borderWidth, borderWidth, W - 2 * borderWidth, H - 2 * borderWidth)

  ctx.direction = "rtl"
  ctx.textAlign = "center"
  ctx.textBaseline = "alphabetic"

  // Studio name (small, top)
  ctx.fillStyle = "#475569"
  ctx.font = `bold ${Math.round(W * 0.03)}px Vazirmatn, Tahoma, sans-serif`
  ctx.fillText(opts.studioName, W / 2, Math.round(H * 0.065))

  // Title (large bold)
  ctx.fillStyle = "#0f172a"
  ctx.font = `bold ${Math.round(W * 0.05)}px Vazirmatn, Tahoma, sans-serif`
  ctx.fillText("کد تخفیف ویژه", W / 2, Math.round(H * 0.115))

  // QR image — fetched at fixed 300×300, drawn at 65% of canvas WIDTH.
  const qrSize = Math.round(W * QR_CANVAS_PROPORTION)
  const qrX = (W - qrSize) / 2
  const qrY = Math.round(H * 0.16)
  await new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize)
      resolve()
    }
    img.onerror = () => reject(new Error("QR image load failed (CORS or network)"))
    img.src = qrUrl(item.code)
  })

  // Code (below QR)
  ctx.fillStyle = "#0f172a"
  ctx.font = `bold ${Math.round(W * 0.045)}px 'SFMono-Regular', Menlo, Consolas, monospace`
  ctx.fillText(item.code, W / 2, qrY + qrSize + Math.round(W * 0.07))

  // Discount % BIG RED
  ctx.fillStyle = "#dc2626"
  ctx.font = `bold ${Math.round(W * 0.065)}px Vazirmatn, Tahoma, sans-serif`
  ctx.fillText(
    `${toPersianDigits(item.discountPercent)}٪ تخفیف`,
    W / 2,
    qrY + qrSize + Math.round(W * 0.16)
  )

  // Owner
  ctx.fillStyle = "#334155"
  ctx.font = `600 ${Math.round(W * 0.032)}px Vazirmatn, Tahoma, sans-serif`
  ctx.fillText(
    `صادر شده برای: ${item.owner.name}`,
    W / 2,
    qrY + qrSize + Math.round(W * 0.24)
  )

  // Description (optional)
  let nextY = qrY + qrSize + Math.round(W * 0.30)
  if (item.description) {
    ctx.fillStyle = "#475569"
    ctx.font = `${Math.round(W * 0.026)}px Vazirmatn, Tahoma, sans-serif`
    nextY =
      wrapText(
        ctx,
        item.description,
        W / 2,
        nextY,
        W - Math.round(W * 0.15),
        Math.round(W * 0.035)
      ) + Math.round(W * 0.02)
  }

  // Valid line (bottom)
  const validLine = item.validUntil
    ? `معتبر تا ${formatDate(item.validUntil)}`
    : `بدون تاریخ انقضا · ${toPersianDigits(item.maxUses)} استفاده مجاز`
  ctx.fillStyle = "#94a3b8"
  ctx.font = `${Math.round(W * 0.022)}px Vazirmatn, Tahoma, sans-serif`
  ctx.fillText(validLine, W / 2, H - Math.round(H * 0.05))

  // DPI info (bottom-left LTR)
  ctx.textAlign = "left"
  ctx.direction = "ltr"
  ctx.fillStyle = "#cbd5e1"
  ctx.font = `${Math.round(W * 0.018)}px sans-serif`
  ctx.fillText(
    `DPI: ${opts.dpi} · ${W}×${H}px`,
    Math.round(W * 0.025),
    H - Math.round(H * 0.02)
  )

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("canvas toBlob failed (image may be CORS-tainted)"))
          return
        }
        resolve(blob)
      },
      "image/png"
    )
  })
}

async function downloadQrCardPng(
  item: ReferralCodeItem,
  opts: { studioName: string; width: number; height: number; dpi: number }
): Promise<void> {
  const blob = await drawCardToCanvas(item, opts)
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `qr-${item.code}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ============================================================
// Combobox: Customer picker (for the generate form)
// ============================================================
function CustomerCombobox({
  value,
  onChange,
  placeholder = "انتخاب مشتری صاحب کد",
}: {
  value: string | null
  onChange: (id: string | null) => void
  placeholder?: string
}) {
  const role = useWorkspace((s) => s.role)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<CustomerOption[]>([])
  const [loading, setLoading] = React.useState(false)
  const [known, setKnown] = React.useState<CustomerOption | null>(null)

  // Hydrate the selected name when value changes from outside
  React.useEffect(() => {
    if (!value) {
      setKnown(null)
      return
    }
    if (known?.id === value) return
    let cancelled = false
    fetch(`/api/customers?limit=50&search=`, {
      headers: { "x-demo-role": role },
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        const all = (d.items || []) as CustomerOption[]
        const found = all.find((c) => c.id === value) || null
        setKnown(found)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [value, known, role])

  // Debounced search-as-you-type
  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ limit: "20" })
    if (query) params.set("search", query)
    const t = setTimeout(() => {
      fetch(`/api/customers?${params.toString()}`, {
        headers: { "x-demo-role": role },
      })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return
          setResults((d.items || []) as CustomerOption[])
        })
        .catch(() => {})
        .finally(() => !cancelled && setLoading(false))
    }, 220)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [open, query, role])

  const selected = results.find((r) => r.id === value) || known

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <Users className="size-3.5 text-muted-foreground" />
              <span className="truncate">{selected.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <Filter className="size-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="جستجو نام یا تلفن…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>{loading ? "در حال بارگذاری…" : "مشتری یافت نشد"}</CommandEmpty>
            <CommandGroup>
              {results.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  onSelect={() => {
                    onChange(c.id)
                    setKnown(c)
                    setOpen(false)
                  }}
                >
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.phone}</span>
                  </div>
                  {value === c.id && <Check className="size-3.5 text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Combobox: Owner filter (searchable, with "همه صاحبان" default)
// ============================================================
function OwnerFilterCombobox({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string) => void
}) {
  const role = useWorkspace((s) => s.role)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<CustomerOption[]>([])
  const [loading, setLoading] = React.useState(false)
  const [known, setKnown] = React.useState<CustomerOption | null>(null)

  // Hydrate the selected owner's name when value changes from outside
  React.useEffect(() => {
    if (!value) {
      setKnown(null)
      return
    }
    if (known?.id === value) return
    let cancelled = false
    fetch(`/api/customers?limit=50&search=`, {
      headers: { "x-demo-role": role },
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        const all = (d.items || []) as CustomerOption[]
        setKnown(all.find((c) => c.id === value) || null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [value, known, role])

  // Debounced search-as-you-type — fetch with ?search=X&limit=20
  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ limit: "20" })
    if (query) params.set("search", query)
    const t = setTimeout(() => {
      fetch(`/api/customers?${params.toString()}`, {
        headers: { "x-demo-role": role },
      })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return
          setResults((d.items || []) as CustomerOption[])
        })
        .catch(() => {})
        .finally(() => !cancelled && setLoading(false))
    }, 220)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [open, query, role])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" role="combobox" className="font-normal">
          <Users className="mr-1.5 size-3.5" />
          {known ? (
            <span className="truncate">{known.name}</span>
          ) : (
            <span>همه صاحبان</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="جستجوی نام یا تلفن مشتری…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>{loading ? "در حال بارگذاری…" : "مشتری یافت نشد"}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__all__"
                onSelect={() => {
                  onChange("")
                  setKnown(null)
                  setQuery("")
                  setOpen(false)
                }}
              >
                <Users className="ml-1 size-3.5 text-muted-foreground" />
                <span className="flex-1 text-sm">همه صاحبان</span>
                {value === "" && <Check className="size-3.5 text-primary" />}
              </CommandItem>
              {results.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  onSelect={() => {
                    onChange(c.id)
                    setKnown(c)
                    setOpen(false)
                  }}
                >
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm">{c.name}</span>
                    <span className="text-xs text-muted-foreground" dir="ltr">
                      {c.phone}
                    </span>
                  </div>
                  {value === c.id && <Check className="size-3.5 text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Combobox: Customer picker (full-width, for bulk export/print dialogs).
// Accepts null = "همه مشتریان" (no filter). Server-side debounced search.
// ============================================================
function CustomerPickerField({
  value,
  onChange,
}: {
  value: string | null
  onChange: (id: string | null) => void
}) {
  const role = useWorkspace((s) => s.role)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<CustomerOption[]>([])
  const [loading, setLoading] = React.useState(false)
  const [known, setKnown] = React.useState<CustomerOption | null>(null)

  // Hydrate the selected customer's name when value changes from outside
  React.useEffect(() => {
    if (!value) {
      setKnown(null)
      return
    }
    if (known?.id === value) return
    let cancelled = false
    fetch(`/api/customers?limit=50&search=`, {
      headers: { "x-demo-role": role },
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        const all = (d.items || []) as CustomerOption[]
        setKnown(all.find((c) => c.id === value) || null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [value, known, role])

  // Debounced search-as-you-type — fetch with ?search=X&limit=20
  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ limit: "20" })
    if (query) params.set("search", query)
    const t = setTimeout(() => {
      fetch(`/api/customers?${params.toString()}`, {
        headers: { "x-demo-role": role },
      })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return
          setResults((d.items || []) as CustomerOption[])
        })
        .catch(() => {})
        .finally(() => !cancelled && setLoading(false))
    }, 220)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [open, query, role])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
        >
          {known ? (
            <span className="flex items-center gap-2 truncate">
              <Users className="size-3.5 text-muted-foreground" />
              <span className="truncate">{known.name}</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Users className="size-3.5" />
              <span>همه مشتریان</span>
            </span>
          )}
          <Filter className="size-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[360px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="جستجوی نام یا تلفن مشتری…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>{loading ? "در حال بارگذاری…" : "مشتری یافت نشد"}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__all__"
                onSelect={() => {
                  onChange(null)
                  setKnown(null)
                  setQuery("")
                  setOpen(false)
                }}
              >
                <Users className="ml-1 size-3.5 text-muted-foreground" />
                <span className="flex-1 text-sm">همه مشتریان (بدون فیلتر)</span>
                {value === null && <Check className="size-3.5 text-primary" />}
              </CommandItem>
              {results.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  onSelect={() => {
                    onChange(c.id)
                    setKnown(c)
                    setOpen(false)
                  }}
                >
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm">{c.name}</span>
                    <span className="text-xs text-muted-foreground" dir="ltr">
                      {c.phone}
                    </span>
                  </div>
                  {value === c.id && <Check className="size-3.5 text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Helper: trigger a browser download for a blob with a filename.
// ============================================================
function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

/**
 * Fetches ALL referral codes for the studio (no status/owner filter) so the
 * bulk dialogs can pick from the entire pool. Caps at the API max (100 rows).
 */
async function fetchAllReferralCodes(role: Role): Promise<ReferralCodeItem[]> {
  const res = await fetch(`/api/referral-codes?limit=100`, {
    headers: { "x-demo-role": role },
  })
  if (!res.ok) throw new Error("بارگذاری کدها ناموفق بود")
  const data = (await res.json()) as CodesListResponse
  return data.items || []
}

// ============================================================
// Combobox: Project picker (optional, for related project).
// When `ownerId` is provided, the dropdown only shows that customer's projects.
// ============================================================
function ProjectCombobox({
  value,
  onChange,
  ownerId,
}: {
  value: string | null
  onChange: (id: string | null) => void
  ownerId: string | null
}) {
  const role = useWorkspace((s) => s.role)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<ProjectOption[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ limit: "100" })
    fetch(`/api/projects?${params.toString()}`, {
      headers: { "x-demo-role": role },
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        const items: ProjectOption[] = (d.items || []).map((p: {
          id: string
          contractNumber: string
          customer?: { id: string; name: string }
          package?: { title: string }
        }) => ({
          id: p.id,
          contractNumber: p.contractNumber,
          customerId: p.customer?.id ?? "",
          customerName: p.customer?.name ?? "—",
          packageTitle: p.package?.title ?? "—",
        }))
        setResults(items)
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [open, role])

  // Owner-filtered list (only projects for the selected customer)
  const ownerFiltered = ownerId
    ? results.filter((r) => r.customerId === ownerId)
    : results

  const filtered = query
    ? ownerFiltered.filter(
        (r) =>
          r.contractNumber.toLowerCase().includes(query.toLowerCase()) ||
          r.customerName.toLowerCase().includes(query.toLowerCase()) ||
          r.packageTitle.toLowerCase().includes(query.toLowerCase())
      )
    : ownerFiltered
  const selected = ownerFiltered.find((r) => r.id === value) || null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <Package className="size-3.5 text-muted-foreground" />
              <span className="truncate">
                {selected.contractNumber} · {selected.customerName}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              {ownerId ? "هیچ‌کدام (اختیاری)" : "ابتدا مشتری را انتخاب کنید"}
            </span>
          )}
          <Filter className="size-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[360px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="جستجو شماره قرارداد / پکیج…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              {loading
                ? "در حال بارگذاری…"
                : ownerId
                ? "پروژه‌ای برای این مشتری یافت نشد"
                : "پروژه‌ای یافت نشد"}
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange(null)
                  setOpen(false)
                }}
              >
                <span className="text-muted-foreground">— هیچ‌کدام (اختیاری)</span>
              </CommandItem>
              {filtered.map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.id}
                  onSelect={() => {
                    onChange(p.id)
                    setOpen(false)
                  }}
                >
                  <div className="flex flex-col">
                    <span className="text-sm">
                      {p.contractNumber} · {p.customerName}
                    </span>
                    <span className="text-xs text-muted-foreground">{p.packageTitle}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Templates: create/edit dialog
// ============================================================
const EMPTY_TEMPLATE_FORM = {
  name: "",
  discountPercent: 10,
  maxUses: 1,
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  dpi: DEFAULT_DPI,
  description: "",
  isActive: true,
}

function TemplateDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  saving,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial: QrTemplate | null
  onSave: (data: {
    name: string
    discountPercent: number
    maxUses: number
    width: number
    height: number
    dpi: number
    description: string
    isActive: boolean
  }) => void
  saving: boolean
}) {
  const [form, setForm] = React.useState(EMPTY_TEMPLATE_FORM)

  React.useEffect(() => {
    if (!open) return
    if (initial) {
      const dim = dimensionsOf(initial)
      setForm({
        name: initial.name,
        discountPercent: initial.discountPercent,
        maxUses: initial.maxUses,
        width: dim.width,
        height: dim.height,
        dpi: initial.dpi,
        description: initial.description ?? "",
        isActive: initial.isActive,
      })
    } else {
      setForm(EMPTY_TEMPLATE_FORM)
    }
  }, [open, initial])

  const isEdit = !!initial

  function submit() {
    if (!form.name.trim()) {
      toast.error("نام قالب الزامی است")
      return
    }
    onSave({
      name: form.name.trim(),
      discountPercent: form.discountPercent,
      maxUses: form.maxUses,
      width: form.width,
      height: form.height,
      dpi: form.dpi,
      description: form.description.trim(),
      isActive: form.isActive,
    })
  }

  // Width + height → output canvas dimensions + print inches (informational only)
  const { W: prevW, H: prevH } = canvasDimensions(form.width, form.height)
  const inchesW = (prevW / Math.max(72, form.dpi)).toFixed(2)
  const inchesH = (prevH / Math.max(72, form.dpi)).toFixed(2)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "ویرایش قالب QR" : "قالب جدید QR"}
          </DialogTitle>
          <DialogDescription>
            قالب‌ها مانند پکیج‌های پروژه هستند — تنظیمات پیش‌فرض برای تولید کد تخفیف.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs text-muted-foreground">نام قالب</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="مثلاً: عروسی پلاتین — ۲۰٪"
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">درصد تخفیف</Label>
            <Input
              type="number"
              dir="ltr"
              min={0}
              max={100}
              value={form.discountPercent}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  discountPercent: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                }))
              }
              className="text-left"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">حداکثر استفاده</Label>
            <Input
              type="number"
              dir="ltr"
              min={1}
              max={1000}
              value={form.maxUses}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  maxUses: Math.max(1, Number(e.target.value) || 1),
                }))
              }
              className="text-left"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">عرض (پیکسل)</Label>
            <PixelInput
              value={form.width}
              onCommit={(n) => setForm((s) => ({ ...s, width: n }))}
              min={64}
              max={4000}
              defaultValue={DEFAULT_WIDTH}
              aria-label="عرض بوم خروجی به پیکسل"
            />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              عرض بوم خروجی (تصویر نهایی برای چاپ و عکس).
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">طول (پیکسل)</Label>
            <PixelInput
              value={form.height}
              onCommit={(n) => setForm((s) => ({ ...s, height: n }))}
              min={64}
              max={4000}
              defaultValue={DEFAULT_HEIGHT}
              aria-label="طول بوم خروجی به پیکسل"
            />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              طول بوم خروجی — مستقل از عرض. کد QR همیشه ۶۵٪ عرض بوم رسم می‌شود.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">DPI (وضوح چاپ)</Label>
            <Input
              type="number"
              dir="ltr"
              min={72}
              max={600}
              value={form.dpi}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  dpi: Math.max(72, Math.min(600, Number(e.target.value) || 150)),
                }))
              }
              className="text-left"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs text-muted-foreground">توضیحات (اختیاری)</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              placeholder="یادداشت کوتاه دربارهٔ این قالب"
              rows={2}
              maxLength={500}
            />
          </div>
          <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 px-3 py-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((s) => ({ ...s, isActive: v }))}
                />
                <span className="text-sm">فعال</span>
              </div>
              <span className="text-[11px] text-muted-foreground" dir="ltr">
                {specLabel(form.width, form.height, form.dpi)}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground" dir="ltr">
              ≈ {toPersianDigits(inchesW)}″ × {toPersianDigits(inchesH)}″ print @ {toPersianDigits(form.dpi)}dpi
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            لغو
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> در حال ذخیره…
              </>
            ) : (
              <>
                <Plus className="mr-2 size-4" /> {isEdit ? "ذخیره تغییرات" : "ایجاد قالب"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Templates section
// ============================================================
function QrTemplatesSection() {
  const role = useWorkspace((s) => s.role) as Role
  const api = useApi()
  const mutate = useMutate()
  const qc = useQueryClient()

  const canManage = role === "admin"

  const { data, isLoading } = useQuery<QrTemplate[]>({
    queryKey: ["qr-templates"],
    queryFn: () => api.get<QrTemplate[]>("/api/qr-templates"),
  })

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<QrTemplate | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<QrTemplate | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [togglingId, setTogglingId] = React.useState<string | null>(null)

  const templates = data ?? []

  function openCreate() {
    setEditTarget(null)
    setDialogOpen(true)
  }
  function openEdit(t: QrTemplate) {
    setEditTarget(t)
    setDialogOpen(true)
  }

  async function handleSave(payload: {
    name: string
    discountPercent: number
    maxUses: number
    width: number
    height: number
    dpi: number
    description: string
    isActive: boolean
  }) {
    setSaving(true)
    try {
      const body = {
        name: payload.name,
        discountPercent: payload.discountPercent,
        maxUses: payload.maxUses,
        width: payload.width,
        height: payload.height,
        dpi: payload.dpi,
        description: payload.description || null,
        isActive: payload.isActive,
      }
      if (editTarget) {
        await mutate(`/api/qr-templates/${editTarget.id}`, "PATCH", body)
        toast.success("قالب به‌روزرسانی شد")
      } else {
        await mutate("/api/qr-templates", "POST", body)
        toast.success("قالب جدید ساخته شد")
      }
      qc.invalidateQueries({ queryKey: ["qr-templates"] })
      setDialogOpen(false)
      setEditTarget(null)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "ذخیره قالب ناموفق بود"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(t: QrTemplate) {
    if (!canManage) return
    setTogglingId(t.id)
    try {
      await mutate(`/api/qr-templates/${t.id}`, "PATCH", { isActive: !t.isActive })
      qc.invalidateQueries({ queryKey: ["qr-templates"] })
      toast.success(t.isActive ? "قالب غیرفعال شد" : "قالب فعال شد")
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "تغییر وضعیت ناموفق بود"
      toast.error(msg)
    } finally {
      setTogglingId(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await mutate(`/api/qr-templates/${deleteTarget.id}`, "DELETE")
      qc.invalidateQueries({ queryKey: ["qr-templates"] })
      toast.success("قالب حذف شد")
      setDeleteTarget(null)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "حذف ناموفق بود"
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <SectionCard
      title="قالب‌های کد QR"
      description="قالب‌های آماده برای تولید سریع کد تخفیف — مانند پکیج‌های پروژه."
      actions={
        canManage ? (
          <Button size="sm" onClick={openCreate}>
            <LayoutTemplate className="mr-1.5 size-3.5" /> قالب جدید
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          icon="📐"
          title="هنوز قالبی تعریف نشده"
          description={
            canManage
              ? "با ساخت قالب، تنظیمات درصد تخفیف، تعداد استفاده، عرض و طول خروجی و DPI را برای تولید کدهای بعدی ذخیره کنید."
              : "از مدیریت بخواهید قالب‌های آماده برای کدهای تخفیف تعریف کند."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const { width: W, height: H } = dimensionsOf(t)
            return (
              <div
                key={t.id}
                className={cn(
                  "flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm",
                  !t.isActive && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <LayoutTemplate className="size-4 text-muted-foreground" />
                      <span className="truncate text-sm font-semibold">{t.name}</span>
                    </div>
                    {t.description && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                        {t.description}
                      </p>
                    )}
                  </div>
                  {canManage && (
                    <Switch
                      checked={t.isActive}
                      disabled={togglingId === t.id}
                      onCheckedChange={() => handleToggleActive(t)}
                      aria-label="فعال/غیرفعال"
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="rounded-md bg-rose-50 px-2 py-1 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                    تخفیف: {toPersianDigits(t.discountPercent)}٪
                  </div>
                  <div className="rounded-md bg-muted px-2 py-1">
                    حداکثر استفاده: {toPersianDigits(t.maxUses)}
                  </div>
                  <div className="rounded-md bg-muted px-2 py-1">
                    عرض: {toPersianDigits(W)} / طول: {toPersianDigits(H)} پیکسل
                  </div>
                  <div className="rounded-md bg-muted px-2 py-1">
                    {toPersianDigits(t.dpi)} DPI
                  </div>
                </div>
                {canManage && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 flex-1"
                      onClick={() => openEdit(t)}
                    >
                      <Pencil className="mr-1 size-3" /> ویرایش
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                      onClick={() => setDeleteTarget(t)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <TemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editTarget}
        onSave={handleSave}
        saving={saving}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>این قالب حذف شود؟</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  قالب <span className="font-semibold">{deleteTarget.name}</span> حذف می‌شود.
                  کدهای قبلاً صادرشده تحت این قالب بدون تغییر باقی می‌مانند.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>لغو</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" /> در حال حذف…
                </>
              ) : (
                <>
                  <Trash2 className="mr-1.5 size-3.5" /> حذف قالب
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionCard>
  )
}

// ============================================================
// Generation form (with template select + width + height + dpi)
// ============================================================
function GenerateForm({ onDone }: { onDone: () => void }) {
  const api = useApi()
  const qc = useQueryClient()
  const mutate = useMutate()

  const [ownerId, setOwnerId] = React.useState<string | null>(null)
  const [quantity, setQuantity] = React.useState(5)
  const [discountPercent, setDiscountPercent] = React.useState(10)
  const [maxUses, setMaxUses] = React.useState(1)
  const [width, setWidth] = React.useState(DEFAULT_WIDTH)
  const [height, setHeight] = React.useState(DEFAULT_HEIGHT)
  const [dpi, setDpi] = React.useState(DEFAULT_DPI)
  const [templateId, setTemplateId] = React.useState<string>("__none__")
  const [relatedProjectId, setRelatedProjectId] = React.useState<string | null>(null)
  const [description, setDescription] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  // Load templates for the form's template Select (activeOnly to limit noise)
  const { data: templatesData } = useQuery<QrTemplate[]>({
    queryKey: ["qr-templates", "activeOnly"],
    queryFn: () => api.get<QrTemplate[]>("/api/qr-templates?activeOnly=true"),
  })
  const templates = templatesData ?? []

  // When owner changes, reset related project (the dropdown filters by owner)
  React.useEffect(() => {
    setRelatedProjectId(null)
  }, [ownerId])

  // When template is changed, autofill fields (still editable)
  function applyTemplate(id: string) {
    setTemplateId(id)
    if (id === "__none__") return
    const t = templates.find((x) => x.id === id)
    if (!t) return
    const dim = dimensionsOf(t)
    setDiscountPercent(t.discountPercent)
    setMaxUses(t.maxUses)
    setWidth(dim.width)
    setHeight(dim.height)
    setDpi(t.dpi)
    if (t.description && !description) {
      setDescription(t.description)
    }
    toast.info(`قالب «${t.name}» اعمال شد`, {
      description: specLabel(dim.width, dim.height, t.dpi),
    })
  }

  async function handleSubmit() {
    if (!ownerId) {
      toast.error("لطفاً مشتری صاحب کد را انتخاب کنید")
      return
    }
    setSubmitting(true)
    try {
      const res = await mutate<{ items: ReferralCodeItem[] }>(
        "/api/referral-codes",
        "POST",
        {
          ownerId,
          quantity,
          discountPercent,
          maxUses,
          relatedProjectId: relatedProjectId || undefined,
          description: description.trim() || undefined,
        }
      )
      toast.success(`تعداد ${res.items.length} کد معرفی تولید شد`)
      qc.invalidateQueries({ queryKey: ["referral-codes"] })
      // Reset partial
      setRelatedProjectId(null)
      setDescription("")
      onDone()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "تولید کدها ناموفق بود"
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const { W: prevW, H: prevH } = canvasDimensions(width, height)

  return (
    <SectionCard
      title="تولید کدهای جدید"
      description="صدور کد تخفیف معرفی برای یک مشتری."
      actions={<Sparkles className="size-4 text-muted-foreground" />}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">قالب (اختیاری)</Label>
          <Select value={templateId} onValueChange={applyTemplate}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="— بدون قالب —" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— بدون قالب —</SelectItem>
              {templates.map((t) => {
                const { width: tW, height: tH } = dimensionsOf(t)
                return (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} · {toPersianDigits(t.discountPercent)}٪ · {tW}×{tH}px
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            با انتخاب قالب، فیلدهای تخفیف، تعداد استفاده، عرض، طول و DPI به‌صورت خودکار پر می‌شوند (قابل ویرایش).
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">مشتری صاحب کد</Label>
          <CustomerCombobox value={ownerId} onChange={setOwnerId} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">تعداد</Label>
            <Input
              type="number"
              dir="ltr"
              min={1}
              max={20}
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
              }
              className="text-left"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">درصد تخفیف</Label>
            <Input
              type="number"
              dir="ltr"
              min={0}
              max={100}
              value={discountPercent}
              onChange={(e) =>
                setDiscountPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))
              }
              className="text-left"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">حداکثر استفاده برای هر کد</Label>
          <Input
            type="number"
            dir="ltr"
            min={1}
            max={1000}
            value={maxUses}
            onChange={(e) => setMaxUses(Math.max(1, Number(e.target.value) || 1))}
            className="text-left"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">عرض بوم خروجی (پیکسل)</Label>
          <PixelInput
            value={width}
            onCommit={setWidth}
            min={64}
            max={4000}
            defaultValue={DEFAULT_WIDTH}
            aria-label="عرض بوم خروجی به پیکسل"
          />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            عرض تصویر خروجی (برای چاپ و عکس). کد QR همیشه در ۶۵٪ عرض بوم رسم می‌شود.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">طول بوم خروجی (پیکسل)</Label>
          <PixelInput
            value={height}
            onCommit={setHeight}
            min={64}
            max={4000}
            defaultValue={DEFAULT_HEIGHT}
            aria-label="طول بوم خروجی به پیکسل"
          />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            طول تصویر خروجی — مستقل از عرض. مقادیر پیش‌فرض ۱۲۰۰×۱۶۸۰ عمودی است.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">DPI</Label>
          <Input
            type="number"
            dir="ltr"
            min={72}
            max={600}
            value={dpi}
            onChange={(e) =>
              setDpi(Math.max(72, Math.min(600, Number(e.target.value) || DEFAULT_DPI)))
            }
            className="text-left"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">پروژه مرتبط (اختیاری)</Label>
          <ProjectCombobox
            value={relatedProjectId}
            onChange={setRelatedProjectId}
            ownerId={ownerId}
          />
          {ownerId && (
            <p className="text-[11px] text-muted-foreground">
              فقط پروژه‌های این مشتری نمایش داده می‌شوند.
            </p>
          )}
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs text-muted-foreground">توضیحات (اختیاری)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="یادداشت کوتاه برای این کد — روی کارت و در چاپ نمایش داده می‌شود."
            rows={2}
            maxLength={500}
          />
        </div>
        {/* Preview hint: shows how the OUTPUT CANVAS will be rendered */}
        <div className="rounded-lg border bg-muted/30 p-3 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] text-muted-foreground">
              پیش‌نمایش اندازه تصویر خروجی (بوم چاپ/عکس):
            </div>
            <div className="flex items-center gap-3 text-[11px]" dir="ltr">
              <span className="font-mono text-foreground">
                {specLabel(width, height, dpi)}
              </span>
              <span className="text-muted-foreground">
                QR ≈ {toPersianDigits(Math.round(width * QR_CANVAS_PROPORTION))}px
              </span>
              <span className="text-muted-foreground">
                ≈ {(prevW / Math.max(72, dpi)).toFixed(2)}″ × {(prevH / Math.max(72, dpi)).toFixed(2)}″
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setOwnerId(null)
            setQuantity(5)
            setDiscountPercent(10)
            setMaxUses(1)
            setWidth(DEFAULT_WIDTH)
            setHeight(DEFAULT_HEIGHT)
            setDpi(DEFAULT_DPI)
            setTemplateId("__none__")
            setRelatedProjectId(null)
            setDescription("")
          }}
          disabled={submitting}
        >
          بازنشانی
        </Button>
        <Button onClick={handleSubmit} disabled={submitting || !ownerId}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" /> در حال تولید…
            </>
          ) : (
            <>
              <Plus className="mr-2 size-4" /> تولید {toPersianDigits(quantity)} کد
            </>
          )}
        </Button>
      </div>
    </SectionCard>
  )
}

// ============================================================
// Code card
// ============================================================
function CodeCard({
  item,
  onExpire,
  width,
  height,
  dpi,
  studioName,
}: {
  item: ReferralCodeItem
  onExpire: (item: ReferralCodeItem) => void
  width: number
  height: number
  dpi: number
  studioName: string
}) {
  const [imgError, setImgError] = React.useState(false)
  const [downloading, setDownloading] = React.useState(false)

  function copyCode() {
    navigator.clipboard
      .writeText(item.code)
      .then(() => toast.success("کد کپی شد", { description: item.code }))
      .catch(() => toast.error("کپی کد ناموفق بود"))
  }

  function printOne() {
    openPrintWindow(buildPrintHtml(studioName, [item], { width, height, dpi }))
  }

  /**
   * Image export = identical layout as print (studio name → "کد تخفیف ویژه" → QR →
   * code → discount % big red → owner → description → expiry + DPI footer).
   * Renders the layout to a <canvas> at width × height and downloads as PNG.
   * If canvas rasterization fails (e.g. CORS), falls back to opening the
   * same print window — guaranteeing the image export is always identical
   * to print.
   */
  async function handleDownload() {
    setDownloading(true)
    try {
      await downloadQrCardPng(item, { studioName, width, height, dpi })
    } catch {
      // Fallback: open the same print window — layout stays identical
      toast.info("به‌دلیل محدودیت مرورگر، پنجره چاپ باز شد — از آنجا به‌عنوان PDF/تصویر ذخیره کنید")
      openPrintWindow(buildPrintHtml(studioName, [item], { width, height, dpi }))
    } finally {
      setDownloading(false)
    }
  }

  // Display thumbnail — fixed reasonable size, independent of width/height.
  const displaySize = 96
  const { W, H } = canvasDimensions(width, height)

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusBadge item={item} />
            <span className="text-[11px] text-muted-foreground">
              {toPersianDigits(item.usedCount)} از {toPersianDigits(item.maxUses)} استفاده‌شده
            </span>
          </div>
          <button
            type="button"
            onClick={copyCode}
            className="mt-2 flex items-center gap-1.5 rounded-md px-1 py-0.5 font-mono text-sm font-semibold tracking-wider transition hover:bg-accent"
            title="برای کپی کلیک کنید"
          >
            {item.code}
            <Copy className="size-3 text-muted-foreground" />
          </button>
        </div>
        <div className="rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-border">
          {imgError ? (
            <div
              className="flex items-center justify-center bg-slate-100 text-[10px] text-slate-500"
              style={{ width: displaySize, height: displaySize }}
            >
              {item.code}
            </div>
          ) : (
            <img
              src={qrUrl(item.code)}
              alt={`کد QR برای ${item.code}`}
              width={displaySize}
              height={displaySize}
              onError={() => setImgError(true)}
            />
          )}
        </div>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">صاحب</span>
          <span className="font-medium">{item.owner.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">تخفیف</span>
          <span className="text-base font-bold text-rose-600 dark:text-rose-400">
            {toPersianDigits(item.discountPercent)}٪
          </span>
        </div>
        {item.relatedProject && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">پروژه مرتبط</span>
            <span className="ml-2 truncate font-medium">
              {item.relatedProject.contractNumber} · {item.relatedProject.customerName}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">صادر شده</span>
          <span>{formatDate(item.createdAt)}</span>
        </div>
        <div className="flex items-center justify-between" dir="ltr">
          <span className="text-muted-foreground">spec:</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {W}×{H}px · {dpi}dpi
          </span>
        </div>
        {item.description && (
          <div className="mt-2 rounded-md border bg-muted/30 px-2 py-1.5 text-[11px] leading-relaxed text-foreground">
            {item.description}
          </div>
        )}
      </div>

      <div className="mt-1 grid grid-cols-3 gap-1.5">
        <Button variant="outline" size="sm" onClick={printOne}>
          <Printer className="mr-1 size-3.5" /> چاپ
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <Loader2 className="mr-1 size-3.5 animate-spin" />
          ) : (
            <ImageIcon className="mr-1 size-3.5" />
          )}
          عکس
        </Button>
        {!item.isExpired ? (
          <Button
            variant="outline"
            size="sm"
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
            onClick={() => onExpire(item)}
          >
            <Ban className="mr-1 size-3.5" /> انقضا
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <Ban className="mr-1 size-3.5" /> منقضی
          </Button>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Bulk Export Images dialog (per-customer + ZIP option)
// ============================================================
function BulkExportDialog({
  open,
  onOpenChange,
  studioName,
  printDimensions,
  printDpi,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  studioName: string
  printDimensions: { width: number; height: number }
  printDpi: number
}) {
  const role = useWorkspace((s) => s.role) as Role
  const [customerId, setCustomerId] = React.useState<string | null>(null)
  const [mode, setMode] = React.useState<"individual" | "zip">("zip")
  const [loading, setLoading] = React.useState(false)
  const [allCodes, setAllCodes] = React.useState<ReferralCodeItem[]>([])

  // Reset customer selection when dialog (re-)opens
  React.useEffect(() => {
    if (open) {
      setCustomerId(null)
      setMode("zip")
    }
  }, [open])

  // Fetch ALL codes once when the dialog opens (no filters applied)
  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    fetchAllReferralCodes(role)
      .then((items) => {
        if (cancelled) return
        setAllCodes(items)
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "بارگذاری کدها ناموفق بود"
        toast.error(msg)
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [open, role])

  const filtered = React.useMemo(() => {
    if (!customerId) return allCodes
    return allCodes.filter((c) => c.owner?.id === customerId)
  }, [allCodes, customerId])

  const selectedCustomerName = React.useMemo(() => {
    if (!customerId) return null
    return filtered[0]?.owner?.name ?? null
  }, [filtered, customerId])

  async function handleExport() {
    if (!filtered.length) {
      toast.error("کدی برای خروجی وجود ندارد")
      return
    }
    const label = selectedCustomerName ?? "all"
    setLoading(true)
    try {
      if (mode === "zip") {
        const zip = new JSZip()
        let okCount = 0
        let failCount = 0
        for (const item of filtered) {
          try {
            const blob = await drawCardToCanvas(item, {
              studioName,
              width: printDimensions.width,
              height: printDimensions.height,
              dpi: printDpi,
            })
            zip.file(`qr-${item.code}.png`, blob)
            okCount++
          } catch {
            failCount++
          }
        }
        if (okCount === 0) {
          toast.error("هیچ تصویری ساخته نشد — احتمالاً به‌دلیل محدودیت CORS")
          return
        }
        const zipBlob = await zip.generateAsync({ type: "blob" })
        triggerBrowserDownload(
          zipBlob,
          `qr-codes-${label.replace(/[\\/:*?"<>|\s]+/g, "-")}.zip`
        )
        if (failCount > 0) {
          toast.warning(
            `${toPersianDigits(okCount)} تصویر در ZIP ذخیره شد، ${toPersianDigits(failCount)} ناموفق`
          )
        } else {
          toast.success(`${toPersianDigits(okCount)} تصویر در یک فایل ZIP ذخیره شد`)
        }
      } else {
        // individual sequential downloads
        toast.info(`دانلود ${toPersianDigits(filtered.length)} تصویر آغاز شد…`)
        let failed = 0
        for (const item of filtered) {
          try {
            await downloadQrCardPng(item, {
              studioName,
              width: printDimensions.width,
              height: printDimensions.height,
              dpi: printDpi,
            })
          } catch {
            failed++
          }
          await new Promise((r) => setTimeout(r, 350))
        }
        if (failed > 0) {
          toast.warning(
            `${toPersianDigits(filtered.length - failed)} تصویر دانلود شد، ${toPersianDigits(failed)} ناموفق`
          )
        } else {
          toast.success("دانلود همه تصاویر انجام شد")
        }
      }
      onOpenChange(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "خروجی ناموفق بود"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>خروجی عکس کدها</DialogTitle>
          <DialogDescription>
            یک مشتری را برای فیلتر کردن کدها انتخاب کنید، یا همه مشتریان را خروجی بگیرید.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">مشتری</Label>
            <CustomerPickerField value={customerId} onChange={setCustomerId} />
            {!customerId && (
              <p className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                <span aria-hidden>⚠</span>
                هیچ مشتری انتخاب نشده — همه کدها ({toPersianDigits(allCodes.length)} عدد) خروجی گرفته می‌شوند.
              </p>
            )}
            {customerId && (
              <p className="text-[11px] text-muted-foreground">
                کدهای این مشتری: {toPersianDigits(filtered.length)} عدد
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">نحوه خروجی</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as "individual" | "zip")}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              <label
                htmlFor="bulk-export-zip"
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition-colors",
                  mode === "zip" ? "border-primary bg-primary/5" : "hover:bg-accent"
                )}
              >
                <RadioGroupItem id="bulk-export-zip" value="zip" className="mt-0.5" />
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <FileArchive className="size-3.5" /> یک فایل ZIP
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    همه تصاویر در یک فایل فشرده — مناسب اشتراک‌گذاری.
                  </p>
                </div>
              </label>
              <label
                htmlFor="bulk-export-individual"
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition-colors",
                  mode === "individual" ? "border-primary bg-primary/5" : "hover:bg-accent"
                )}
              >
                <RadioGroupItem id="bulk-export-individual" value="individual" className="mt-0.5" />
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <FileImage className="size-3.5" /> تک به تک (فایل‌های جدا)
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    هر کد به‌صورت یک فایل PNG جدا دانلود می‌شود.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          <div className="rounded-md border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground" dir="ltr">
            spec: {specLabel(printDimensions.width, printDimensions.height, printDpi)} ·{" "}
            {toPersianDigits(filtered.length)} codes
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            لغو
          </Button>
          <Button onClick={handleExport} disabled={loading || !filtered.length}>
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> در حال خروجی…
              </>
            ) : (
              <>
                <ImageIcon className="mr-2 size-4" /> خروجی
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Bulk Print dialog (per-customer selection with search)
// ============================================================
function BulkPrintDialog({
  open,
  onOpenChange,
  studioName,
  printDimensions,
  printDpi,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  studioName: string
  printDimensions: { width: number; height: number }
  printDpi: number
}) {
  const role = useWorkspace((s) => s.role) as Role
  const [customerId, setCustomerId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [allCodes, setAllCodes] = React.useState<ReferralCodeItem[]>([])

  React.useEffect(() => {
    if (open) {
      setCustomerId(null)
    }
  }, [open])

  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    fetchAllReferralCodes(role)
      .then((items) => {
        if (cancelled) return
        setAllCodes(items)
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "بارگذاری کدها ناموفق بود"
        toast.error(msg)
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [open, role])

  const filtered = React.useMemo(() => {
    if (!customerId) return allCodes
    return allCodes.filter((c) => c.owner?.id === customerId)
  }, [allCodes, customerId])

  function handlePrint() {
    if (!filtered.length) {
      toast.error("کدی برای چاپ وجود ندارد")
      return
    }
    openPrintWindow(
      buildPrintHtml(studioName, filtered, {
        width: printDimensions.width,
        height: printDimensions.height,
        dpi: printDpi,
      })
    )
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>چاپ کدها</DialogTitle>
          <DialogDescription>
            یک مشتری را برای فیلتر کردن کدها انتخاب کنید، یا همه را چاپ کنید.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">مشتری</Label>
            <CustomerPickerField value={customerId} onChange={setCustomerId} />
            {!customerId && (
              <p className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                <span aria-hidden>⚠</span>
                هیچ مشتری انتخاب نشده — همه کدها ({toPersianDigits(allCodes.length)} عدد) چاپ می‌شوند.
              </p>
            )}
            {customerId && (
              <p className="text-[11px] text-muted-foreground">
                کدهای این مشتری: {toPersianDigits(filtered.length)} عدد
              </p>
            )}
          </div>

          <div className="rounded-md border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground" dir="ltr">
            spec: {specLabel(printDimensions.width, printDimensions.height, printDpi)} ·{" "}
            {toPersianDigits(filtered.length)} codes
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            لغو
          </Button>
          <Button onClick={handlePrint} disabled={loading || !filtered.length}>
            <Printer className="mr-2 size-4" /> چاپ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Main view
// ============================================================
export function QrFactoryView() {
  const role = useWorkspace((s) => s.role) as Role
  const api = useApi()
  const qc = useQueryClient()
  const mutate = useMutate()
  const { fa: studioName } = useStudioName()

  const canAccess = ROLE_PERMISSIONS[role].qr
  const canExpire = role === "admin" || role === "manager"

  const [statusFilter, setStatusFilter] = React.useState<"all" | "available" | "used" | "expired">("all")
  const [ownerFilter, setOwnerFilter] = React.useState<string>("")

  const [expireTarget, setExpireTarget] = React.useState<ReferralCodeItem | null>(null)
  const [expiring, setExpiring] = React.useState(false)

  // Bulk dialog open-state (per-customer export & print)
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false)
  const [printDialogOpen, setPrintDialogOpen] = React.useState(false)

  // Default print/export template — affects width + height + dpi for all cards.
  // Sentinel "__default__" = use DEFAULT_WIDTH / DEFAULT_HEIGHT / DEFAULT_DPI.
  const [defaultTemplateId, setDefaultTemplateId] = React.useState<string>("__default__")

  // Load all templates (active + inactive) for the default-template selector
  const { data: templatesData } = useQuery<QrTemplate[]>({
    queryKey: ["qr-templates"],
    queryFn: () => api.get<QrTemplate[]>("/api/qr-templates"),
    enabled: canAccess,
  })
  const templates = templatesData ?? []

  // Auto-select the first active template as the default for print/export
  // (only on first load — preserves user choice thereafter).
  const autoPickedRef = React.useRef(false)
  React.useEffect(() => {
    if (autoPickedRef.current) return
    if (!templates.length) return
    const firstActive = templates.find((t) => t.isActive) ?? templates[0]
    if (firstActive) {
      setDefaultTemplateId(firstActive.id)
      autoPickedRef.current = true
    }
  }, [templates])

  // Resolve the active print/export spec from default template id
  const activeTemplate =
    defaultTemplateId === "__default__"
      ? null
      : templates.find((t) => t.id === defaultTemplateId) ?? null
  const printDimensions = activeTemplate
    ? dimensionsOf(activeTemplate)
    : { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT }
  const printDpi = activeTemplate?.dpi ?? DEFAULT_DPI

  const queryKey = React.useMemo(
    () => ["referral-codes", statusFilter, ownerFilter] as const,
    [statusFilter, ownerFilter]
  )

  const { data, isLoading, isFetching, refetch } = useQuery<CodesListResponse>({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ limit: "50" })
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (ownerFilter) params.set("ownerId", ownerFilter)
      return api.get(`/api/referral-codes?${params.toString()}`)
    },
    enabled: canAccess,
  })

  // Sort newest → oldest client-side (defensive; the API already orders desc).
  const items = React.useMemo(() => {
    const list = data?.items || []
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [data])

  async function confirmExpire() {
    if (!expireTarget) return
    setExpiring(true)
    try {
      await mutate(`/api/referral-codes/${expireTarget.id}`, "PATCH", { isExpired: true })
      toast.success("کد منقضی شد", { description: expireTarget.code })
      qc.invalidateQueries({ queryKey: ["referral-codes"] })
      setExpireTarget(null)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "منقضی کردن کد ناموفق بود"
      toast.error(msg)
    } finally {
      setExpiring(false)
    }
  }

  if (!canAccess) {
    return (
      <div>
        <PageHeader title="کارخانه کد QR" icon="🎟️" description="تولید کد تخفیف معرفی برای مشتریان" />
        <EmptyState
          icon="🔒"
          title="دسترسی محدود"
          description="نقش شما اجازه دسترسی به کارخانه کد QR را ندارد."
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="کارخانه کد QR"
        icon="🎟️"
        description="تولید کد تخفیف معرفی برای مشتریان"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("mr-1.5 size-3.5", isFetching && "animate-spin")} />
              بازخوانی
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportDialogOpen(true)}
              disabled={!items.length}
            >
              <ImageIcon className="mr-1.5 size-3.5" /> خروجی عکس همه
            </Button>
            <Button size="sm" onClick={() => setPrintDialogOpen(true)} disabled={!items.length}>
              <Printer className="mr-1.5 size-3.5" /> چاپ همه
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <QrTemplatesSection />

        <GenerateForm onDone={() => refetch()} />

        {/* Filters + list */}
        <SectionCard
          title="کدهای صادر شده"
          description={`${toPersianDigits(data?.total ?? 0)} مجموع${statusFilter !== "all" || ownerFilter ? " · فیلتر شده" : ""}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Select value={defaultTemplateId} onValueChange={setDefaultTemplateId}>
                <SelectTrigger size="sm" className="h-8 w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">
                    پیش‌فرض ({toPersianDigits(DEFAULT_WIDTH)}×{toPersianDigits(DEFAULT_HEIGHT)}px)
                  </SelectItem>
                  {templates.map((t) => {
                    const { width: tW, height: tH } = dimensionsOf(t)
                    return (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({toPersianDigits(tW)}×{toPersianDigits(tH)}px / {toPersianDigits(t.dpi)}dpi)
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>

              <OwnerFilterCombobox value={ownerFilter} onChange={setOwnerFilter} />

              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger size="sm" className="h-8 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                  <SelectItem value="available">موجود</SelectItem>
                  <SelectItem value="used">استفاده‌شده</SelectItem>
                  <SelectItem value="expired">منقضی</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        >
          <div className="mb-3 rounded-md border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            قالب فعلی چاپ/خروجی:{" "}
            <span className="font-medium text-foreground">
              {activeTemplate ? activeTemplate.name : "پیش‌فرض"}
            </span>{" "}
            ·{" "}
            <span dir="ltr" className="font-mono text-foreground">
              {specLabel(printDimensions.width, printDimensions.height, printDpi)}
            </span>
            {" — "}
            دکمه‌های «چاپ» و «عکس» و خروجی‌های گروهی همگی از همین قالب و چیدمان یکسان استفاده می‌کنند.
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon="🎟️"
              title="هنوز کد معرفی وجود ندارد"
              description="برای مشتریان خود کد تولید کنید. کدها با تصویر QR و گزینه چاپ اینجا نمایش داده می‌شوند."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <CodeCard
                  key={item.id}
                  item={item}
                  width={printDimensions.width}
                  height={printDimensions.height}
                  dpi={printDpi}
                  studioName={studioName}
                  onExpire={(it) => {
                    if (!canExpire) {
                      toast.error("فقط ادمین/مدیر می‌تواند کد را منقضی کند")
                      return
                    }
                    setExpireTarget(it)
                  }}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <AlertDialog open={!!expireTarget} onOpenChange={(o) => !o && setExpireTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>این کد معرفی منقضی شود؟</AlertDialogTitle>
            <AlertDialogDescription>
              {expireTarget && (
                <>
                  کد <span className="font-mono font-semibold">{expireTarget.code}</span> برای{" "}
                  <span className="font-medium">{expireTarget.owner.name}</span> به‌عنوان منقضی
                  علامت‌گذاری می‌شود و دیگر قابل استفاده نخواهد بود. این عمل از این بخش قابل بازگشت نیست.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={expiring}>لغو</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmExpire}
              disabled={expiring}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {expiring ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" /> در حال انقضا…
                </>
              ) : (
                <>
                  <Ban className="mr-1.5 size-3.5" /> منقضی کردن کد
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk export images dialog (per-customer + ZIP) */}
      <BulkExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        studioName={studioName}
        printDimensions={printDimensions}
        printDpi={printDpi}
      />

      {/* Bulk print dialog (per-customer with search) */}
      <BulkPrintDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        studioName={studioName}
        printDimensions={printDimensions}
        printDpi={printDpi}
      />
    </div>
  )
}
