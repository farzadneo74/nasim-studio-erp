"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Plus,
  X,
  Upload,
  Loader2,
  ImageIcon,
  Music,
  Video,
  File as FileIcon,
  Download,
  Palette,
} from "lucide-react"

import { useApi } from "@/lib/api/client"
import { useWorkspace } from "@/stores/workspace"
import { toPersianDigits } from "@/lib/format"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SectionCard } from "../_shared"
import { JalaliDatePicker } from "../_jalali-date-picker/jalali-date-picker"

export type CustomFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "radio"
  | "checkbox"
  | "multiselect"
  | "date"
  | "datetime"
  | "image"
  | "audio"
  | "file"
  | "video"
  | "color"
  | "tags"

export interface CustomFieldDef {
  id: string
  name: string
  label: string
  type: CustomFieldType
  options: string[]
  required: boolean
  isActive: boolean
  order: number
}

export interface CustomFieldValueRow {
  id: string
  fieldId: string
  customerId: string
  value: string
  label: string
  name: string
  type: CustomFieldType
  options: string[]
  required: boolean
  isActive: boolean
  order: number
}

export const TYPE_LABELS: Record<CustomFieldType, string> = {
  text: "متن کوتاه",
  textarea: "متن بلند",
  number: "عدد",
  select: "انتخاب از لیست",
  radio: "تک‌انتخابی",
  checkbox: "چک‌باکس",
  multiselect: "چندانتخابی",
  date: "تاریخ",
  datetime: "تاریخ و ساعت",
  image: "تصویر",
  audio: "صوت",
  video: "ویدیو",
  file: "فایل",
  color: "رنگ",
  tags: "برچسب‌ها",
}

// ============================================================
// Encoding/decoding helpers
// ============================================================
// In the component state we keep typed values; we JSON-encode when sending.

/** Encodes a typed value into the JSON string the API stores. */
export function encodeValue(type: CustomFieldType, v: unknown): string {
  switch (type) {
    case "checkbox":
      return v === true || v === "true" ? "true" : "false"
    case "multiselect": {
      if (Array.isArray(v)) return JSON.stringify(v)
      return JSON.stringify([])
    }
    case "tags": {
      if (Array.isArray(v)) return JSON.stringify(v)
      return JSON.stringify([])
    }
    case "text":
    case "textarea":
    case "color":
    case "select":
    case "radio":
    case "image":
    case "audio":
    case "file":
    case "video":
    case "date":
    case "datetime":
    case "number":
    default:
      return typeof v === "string" ? v : v == null ? "" : String(v)
  }
}

/** Decodes the stored JSON string into a typed value for the editor. */
export function decodeValue(type: CustomFieldType, raw: string): unknown {
  if (!raw) {
    if (type === "checkbox") return false
    if (type === "multiselect" || type === "tags") return []
    return ""
  }
  switch (type) {
    case "checkbox":
      return raw === "true" || raw === true
    case "multiselect":
    case "tags": {
      try {
        const p = JSON.parse(raw)
        return Array.isArray(p) ? p.map((x) => String(x)) : []
      } catch {
        return []
      }
    }
    default:
      return raw
  }
}

// ============================================================
// Hooks
// ============================================================

/** Loads all *active* custom fields for the customer form. */
export function useActiveCustomFields(enabled = true) {
  const api = useApi()
  return useQuery<CustomFieldDef[]>({
    queryKey: ["custom-fields-active"],
    queryFn: () => api.get("/api/custom-fields?active=true"),
    enabled,
  })
}

/** Loads existing custom field values for a customer. */
export function useCustomerCustomValues(customerId: string | null, enabled = true) {
  const api = useApi()
  return useQuery<CustomFieldValueRow[]>({
    queryKey: ["custom-field-values", customerId],
    queryFn: () =>
      api.get(
        `/api/custom-fields/values?customerId=${encodeURIComponent(customerId!)}`
      ),
    enabled: !!customerId && enabled,
  })
}

// ============================================================
// Upload helper (single file)
// ============================================================
async function uploadFile(file: File, role: string): Promise<string> {
  const fd = new FormData()
  fd.append("file", file)
  const res = await fetch("/api/custom-fields/upload", {
    method: "POST",
    headers: { "x-demo-role": role },
    body: fd,
  })
  const d = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((d as { error?: string })?.error || `Upload failed (${res.status})`)
  }
  return (d as { url: string }).url
}

// ============================================================
// CustomFieldsFormSection
// ============================================================
interface CustomFieldsFormSectionProps {
  customerId: string | null
  /** Map of fieldId → typed value. */
  values: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}

export function CustomFieldsFormSection({
  customerId,
  values,
  onChange,
}: CustomFieldsFormSectionProps) {
  const { data: fields, isLoading } = useActiveCustomFields(true)

  if (isLoading) {
    return (
      <div className="space-y-2 rounded-xl border bg-card p-3">
        <div className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">در حال بارگذاری فیلدهای سفارشی…</span>
        </div>
      </div>
    )
  }

  if (!fields || fields.length === 0) {
    return null // hide the section entirely when there are no active custom fields
  }

  const setVal = (id: string, v: unknown) => {
    onChange({ ...values, [id]: v })
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2">
        <Palette className="size-4 text-muted-foreground" />
        <span className="text-sm font-semibold">فیلدهای سفارشی</span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <FieldInput
            key={f.id}
            field={f}
            value={values[f.id]}
            onChange={(v) => setVal(f.id, v)}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================================
// FieldInput — renders the appropriate input per type
// ============================================================
function FieldInput({
  field,
  value,
  onChange,
}: {
  field: CustomFieldDef
  value: unknown
  onChange: (v: unknown) => void
}) {
  const role = useWorkspace((s) => s.role)
  const [uploading, setUploading] = React.useState(false)

  const label = (
    <Label htmlFor={`cf-${field.id}`} className="text-xs text-muted-foreground">
      {field.label}
      {field.required && <span className="mr-1 text-rose-600">*</span>}
      <span className="mr-1 text-[10px] opacity-60">({TYPE_LABELS[field.type]})</span>
    </Label>
  )

  switch (field.type) {
    case "text":
    case "color":
      return (
        <div className="space-y-1.5">
          {label}
          {field.type === "color" ? (
            <ColorInput value={(value as string) || ""} onChange={onChange} />
          ) : (
            <Input
              id={`cf-${field.id}`}
              dir="rtl"
              value={(value as string) || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder={field.label}
            />
          )}
        </div>
      )

    case "textarea":
      return (
        <div className="space-y-1.5 sm:col-span-2">
          {label}
          <Textarea
            id={`cf-${field.id}`}
            dir="rtl"
            rows={3}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.label}
          />
        </div>
      )

    case "number":
      return (
        <div className="space-y-1.5">
          {label}
          <Input
            id={`cf-${field.id}`}
            dir="ltr"
            type="number"
            className="text-left"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.label}
          />
        </div>
      )

    case "select":
      return (
        <div className="space-y-1.5">
          {label}
          <Select
            value={(value as string) || ""}
            onValueChange={(v) => onChange(v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="انتخاب کنید…" />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )

    case "radio":
      return (
        <div className="space-y-1.5">
          {label}
          <RadioGroup
            value={(value as string) || ""}
            onValueChange={(v) => onChange(v)}
            className="flex flex-wrap gap-3 pt-1"
          >
            {field.options.map((opt) => (
              <label
                key={opt}
                htmlFor={`cf-${field.id}-${opt}`}
                className="flex items-center gap-1.5 cursor-pointer text-sm"
              >
                <RadioGroupItem
                  id={`cf-${field.id}-${opt}`}
                  value={opt}
                />
                {opt}
              </label>
            ))}
          </RadioGroup>
        </div>
      )

    case "checkbox":
      return (
        <div className="space-y-1.5">
          {label}
          <label
            htmlFor={`cf-${field.id}`}
            className="flex items-center gap-2 cursor-pointer pt-1"
          >
            <Checkbox
              id={`cf-${field.id}`}
              checked={!!value}
              onCheckedChange={(v) => onChange(!!v)}
            />
            <span className="text-sm">{value ? "بله" : "خیر"}</span>
          </label>
        </div>
      )

    case "multiselect":
      return (
        <div className="space-y-1.5">
          {label}
          <MultiCheckboxInput
            options={field.options}
            selected={(value as string[]) || []}
            onChange={onChange}
          />
        </div>
      )

    case "tags":
      return (
        <div className="space-y-1.5">
          {label}
          <TagsInput
            tags={(value as string[]) || []}
            onChange={(t) => onChange(t)}
          />
        </div>
      )

    case "date":
      return (
        <div className="space-y-1.5">
          {label}
          <JalaliDatePicker
            value={(value as string) || null}
            onChange={(iso) => onChange(iso || "")}
            placeholder="انتخاب تاریخ"
          />
        </div>
      )

    case "datetime": {
      const v = (value as string) || ""
      // Split ISO into date (yyyy-mm-dd) and time (HH:mm) for editing.
      const datePart = v ? v.slice(0, 10) : ""
      const timePart = v ? v.slice(11, 16) : ""
      return (
        <div className="space-y-1.5">
          {label}
          <div className="flex items-center gap-2">
            <JalaliDatePicker
              value={datePart ? new Date(datePart).toISOString() : null}
              onChange={(iso) => {
                if (!iso) {
                  onChange("")
                  return
                }
                const dPart = iso.slice(0, 10)
                onChange(`${dPart}T${timePart || "00:00"}:00.000Z`)
              }}
              placeholder="تاریخ"
            />
            <Input
              dir="ltr"
              type="time"
              className="w-[110px] text-left"
              value={timePart}
              onChange={(e) => {
                const t = e.target.value || "00:00"
                onChange(datePart ? `${datePart}T${t}:00.000Z` : "")
              }}
            />
          </div>
        </div>
      )
    }

    case "image":
    case "audio":
    case "video":
    case "file":
      return (
        <div className="space-y-1.5">
          {label}
          <FileInput
            kind={field.type}
            url={(value as string) || ""}
            uploading={uploading}
            onUpload={async (file) => {
              try {
                setUploading(true)
                const url = await uploadFile(file, role)
                onChange(url)
                toast.success("فایل بارگذاری شد")
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "بارگذاری ناموفق بود")
              } finally {
                setUploading(false)
              }
            }}
            onClear={() => onChange("")}
          />
        </div>
      )

    default:
      return null
  }
}

// ============================================================
// ColorInput
// ============================================================
function ColorInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || "#94a3b8"}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 cursor-pointer rounded-md border bg-transparent p-1"
        aria-label="انتخاب رنگ"
      />
      <Input
        dir="ltr"
        className="max-w-[140px] text-left font-mono"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#94a3b8"
      />
    </div>
  )
}

// ============================================================
// MultiCheckboxInput (multiselect)
// ============================================================
function MultiCheckboxInput({
  options,
  selected,
  onChange,
}: {
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const sel = selected || []
  const toggle = (opt: string) => {
    if (sel.includes(opt)) {
      onChange(sel.filter((x) => x !== opt))
    } else {
      onChange([...sel, opt])
    }
  }
  return (
    <div className="flex flex-wrap gap-3 pt-1">
      {options.map((opt) => (
        <label
          key={opt}
          className="flex cursor-pointer items-center gap-1.5 text-sm"
        >
          <Checkbox
            checked={sel.includes(opt)}
            onCheckedChange={() => toggle(opt)}
          />
          {opt}
        </label>
      ))}
    </div>
  )
}

// ============================================================
// TagsInput (tags)
// ============================================================
function TagsInput({
  tags,
  onChange,
}: {
  tags: string[]
  onChange: (v: string[]) => void
}) {
  const [draft, setDraft] = React.useState("")
  const list = tags || []

  const add = () => {
    const v = draft.trim()
    if (!v) return
    if (list.includes(v)) {
      setDraft("")
      return
    }
    onChange([...list, v])
    setDraft("")
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          dir="rtl"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add()
            }
          }}
          placeholder="یک برچسب تایپ کرده و Enter بزنید…"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="mr-1 size-3.5" /> افزودن
        </Button>
      </div>
      {list.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {list.map((t, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
            >
              {t}
              <button
                type="button"
                onClick={() => onChange(list.filter((_, idx) => idx !== i))}
                className="text-purple-500 hover:text-purple-800"
                aria-label="حذف برچسب"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// FileInput (image/audio/video/file)
// ============================================================
function FileInput({
  kind,
  url,
  uploading,
  onUpload,
  onClear,
}: {
  kind: "image" | "audio" | "video" | "file"
  url: string
  uploading: boolean
  onUpload: (file: File) => void
  onClear: () => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const acceptMap: Record<"image" | "audio" | "video" | "file", string> = {
    image: "image/*",
    audio: "audio/*",
    video: "video/*",
    file: "*/*",
  }
  const iconMap: Record<"image" | "audio" | "video" | "file", React.ReactNode> = {
    image: <ImageIcon className="size-4" />,
    audio: <Music className="size-4" />,
    video: <Video className="size-4" />,
    file: <FileIcon className="size-4" />,
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={acceptMap[kind]}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onUpload(f)
          if (inputRef.current) inputRef.current.value = ""
        }}
      />
      {!url ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <Upload className="mr-1.5 size-3.5" />
          )}
          {uploading ? "در حال بارگذاری…" : "انتخاب فایل"}
        </Button>
      ) : (
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5">
          <span className="text-muted-foreground">{iconMap}</span>
          {kind === "image" ? (
             
            <img
              src={url}
              alt="پیش‌نمایش"
              className="size-10 rounded object-cover"
            />
          ) : (
            <span className="text-xs text-muted-foreground">فایل بارگذاری شد</span>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Download className="size-3" />
            دانلود
          </a>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-rose-600 hover:text-rose-700"
            onClick={onClear}
            aria-label="حذف فایل"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}

// ============================================================
// CustomFieldsDisplaySection (read-only, used in profile sheet)
// ============================================================
export function CustomFieldsDisplaySection({
  customerId,
}: {
  customerId: string
}) {
  const api = useApi()
  const qc = useQueryClient()
  // Subscribe to updates so newly saved values show up.
  const { data: values, isLoading } = useQuery<CustomFieldValueRow[]>({
    queryKey: ["custom-field-values", customerId],
    queryFn: () =>
      api.get(
        `/api/custom-fields/values?customerId=${encodeURIComponent(customerId)}`
      ),
    enabled: !!customerId,
  })

  // Invalidate on mount so it always re-fetches after the form save.
  React.useEffect(() => {
    qc.invalidateQueries({ queryKey: ["custom-field-values", customerId] })
  }, [customerId, qc])

  if (isLoading) {
    return (
      <SectionCard title="فیلدهای سفارشی">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> در حال بارگذاری…
        </div>
      </SectionCard>
    )
  }

  if (!values || values.length === 0) {
    return null
  }

  return (
    <SectionCard title="فیلدهای سفارشی" description="اطلاعات تکمیلی مشتری">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {values.map((v) => (
          <DisplayField key={v.id} row={v} />
        ))}
      </div>
    </SectionCard>
  )
}

function DisplayField({ row }: { row: CustomFieldValueRow }) {
  const val = decodeValue(row.type, row.value)
  return (
    <div className="rounded-md border bg-muted/30 px-2.5 py-1.5">
      <div className="text-[11px] text-muted-foreground">
        {row.label}
        <span className="mr-1 opacity-60">({TYPE_LABELS[row.type]})</span>
      </div>
      <div className="mt-0.5 text-sm font-medium">
        <DisplayValue type={row.type} value={val} />
      </div>
    </div>
  )
}

function DisplayValue({
  type,
  value,
}: {
  type: CustomFieldType
  value: unknown
}) {
  if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) {
    return <span className="text-muted-foreground">—</span>
  }
  switch (type) {
    case "checkbox":
      return value === true || value === "true" ? "بله" : "خیر"
    case "multiselect":
    case "tags":
      return (value as string[]).join("، ")
    case "color": {
      const v = String(value)
      return (
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block size-4 rounded border"
            style={{ backgroundColor: v }}
            aria-hidden
          />
          <code dir="ltr" className="font-mono text-xs">
            {v}
          </code>
        </span>
      )
    }
    case "date":
      return <DateValue iso={String(value)} />
    case "datetime":
      return <DateTimeValue iso={String(value)} />
    case "image": {
      const v = String(value)
      return (
         
        <a href={v} target="_blank" rel="noopener noreferrer" className="inline-block">
          { }
          <img
            src={v}
            alt="تصویر"
            className="size-16 rounded border object-cover hover:opacity-80"
          />
        </a>
      )
    }
    case "audio":
    case "video":
    case "file": {
      const v = String(value)
      return (
        <a
          href={v}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          <Download className="size-3.5" />
          دانلود فایل
        </a>
      )
    }
    default:
      return String(value)
  }
}

function DateValue({ iso }: { iso: string }) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    // Use the project's Jalali formatter indirectly.
    return toPersianDigits(
      new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(d)
    )
  } catch {
    return iso
  }
}

function DateTimeValue({ iso }: { iso: string }) {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return toPersianDigits(
      new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d)
    )
  } catch {
    return iso
  }
}
