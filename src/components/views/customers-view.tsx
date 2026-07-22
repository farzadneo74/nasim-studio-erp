"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Plus,
  Search,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Users,
  Heart,
  Wallet,
  Receipt,
  ArrowRightLeft,
  X,
  Check,
  ChevronDown,
  Baby,
  Phone,
  Gift,
  User as UserIcon,
  Tag as TagIcon,
  Network,
  FileText,
  Loader2,
  TrendingUp,
  Download,
  Camera,
  Image as ImageIcon,
  CalendarDays,
  ArrowDownUp,
  Settings2,
  MapPin,
  Building2,
  Filter,
  Maximize2,
  Clapperboard,
  CreditCard,
  StickyNote,
  Award,
  History,
  UserPlus,
  AlertCircle,
} from "lucide-react"

import { useWorkspace } from "@/stores/workspace"
import { useApi } from "@/lib/api/client"
import {
  formatRials,
  formatRialsShort,
  formatDate,
  formatDateTime,
  timeAgo,
  tomanToRials,
  toPersianDigits,
} from "@/lib/format"
import {
  CAN_MANAGE_CUSTOMERS,
  CUSTOMER_TYPES,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/constants"
import { cn } from "@/lib/utils"

import { PageHeader, StatCard, EmptyState, SectionCard } from "./_shared"
import { TomanInput } from "./_toman-input"
import { JalaliDatePicker } from "./_jalali-date-picker/jalali-date-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
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
  CustomFieldsFormSection,
  CustomFieldsDisplaySection,
  useCustomerCustomValues,
  encodeValue,
  decodeValue,
  type CustomFieldDef,
} from "./_custom-fields/custom-fields-form"

// ============================================================
// Types
// ============================================================
interface Tag {
  id: string
  name: string
  color: string
}
interface ExtraPhone {
  label: string
  phone: string
}
interface CityItem {
  id: string
  name: string
  province?: string | null
}
interface CustomerListItem {
  id: string
  name: string
  phone: string
  customerType: string
  profileImage?: string | null
  extraPhones?: ExtraPhone[]
  birthDate?: string | null
  engagementDate?: string | null
  weddingDate?: string | null
  city?: string | null
  address?: string | null
  tags: Tag[]
  totalProjects: number
  lastInteraction: string | null
  totalRevenue?: number
  creditBalance?: number
  credit?: number
  debt?: number
}
interface CustomerListResponse {
  items: CustomerListItem[]
  total: number
  page: number
  limit: number
}
interface ReferredCustomer {
  id: string
  name: string
  phone: string
  customerType: string
}
interface Referrer {
  id: string
  name: string
  phone: string
}
interface CreditTx {
  id: string
  amount: number
  transactionType: string
  note: string | null
  contractNumber: string | null
  createdAt: string
}
interface CustomerDetail {
  id: string
  name: string
  phone: string
  customerType: string
  profileImage?: string | null
  extraPhones?: ExtraPhone[]
  instagramId?: string | null
  birthDate?: string | null
  engagementDate?: string | null
  weddingDate?: string | null
  city?: string | null
  address?: string | null
  referrerId: string | null
  referrer: Referrer | null
  referred: ReferredCustomer[]
  tags: Tag[]
  totalProjects: number
  contractsCount: number
  projectsCount: number
  lastInteraction: string | null
  createdAt: string
  familyMeta?: string
  totalRevenue?: number
  totalPaidAll?: number
  totalPaidUsd?: number
  creditBalance?: number
  credit?: number
  debt?: number
  creditTxs?: CreditTx[]
}

interface CustomerProjectItem {
  id: string
  contractNumber: string
  title: string
  category: string
  status: string
  startDatetime: string | null
  endDatetime: string | null
  deliveryDeadline: string | null
  effectivePrice: number | null
  totalPaid: number | null
  balance: number | null
  isDelivered: boolean
}
interface CustomerProjectsResponse {
  customer: {
    id: string
    name: string
    phone: string
  }
  projects: CustomerProjectItem[]
}

interface FamilyMember {
  name: string
  birth: string
  gender?: "boy" | "girl" | ""
}
interface FamilyMeta {
  spouse: { name: string; birth: string; phone?: string; instagramId?: string } | null
  children: FamilyMember[]
}

// Phone label options for extraPhones (همسر حذف شده چون در بخش همسر فیلد جداگانه دارد)
const PHONE_LABELS: string[] = [
  "برادر",
  "خواهر",
  "پدر",
  "مادر",
  "فرزند",
  "دیگر",
]

type SortKey = "default" | "name_asc" | "name_desc" | "debt_desc" | "credit_desc"

// ============================================================
// Column visibility system
// ============================================================
type ColumnKey =
  | "profileImage"
  | "name"
  | "phone"
  | "city"
  | "address"
  | "birthDate"
  | "engagementDate"
  | "weddingDate"
  | "tags"
  | "customerType"
  | "totalProjects"
  | "totalRevenue"
  | "debt"
  | "credit"
  | "lastInteraction"

const COLUMN_LABELS: Record<ColumnKey, string> = {
  profileImage: "تصویر",
  name: "نام",
  phone: "تلفن",
  city: "شهر",
  address: "نشانی",
  birthDate: "تاریخ تولد",
  engagementDate: "تاریخ عقد",
  weddingDate: "تاریخ ازدواج",
  tags: "تگ‌ها",
  customerType: "نوع",
  totalProjects: "پروژه‌ها",
  totalRevenue: "درآمد کل",
  debt: "بدهی",
  credit: "اعتبار",
  lastInteraction: "آخرین تعامل",
}

// Default state per spec:
//   Hidden by default: customerType, tags, totalProjects, city, address,
//                       birthDate, engagementDate, weddingDate, totalRevenue
//   Visible by default: profileImage, name, phone, debt, credit, lastInteraction
const DEFAULT_COLUMNS: Record<ColumnKey, boolean> = {
  profileImage: true,
  name: true,
  phone: true,
  city: false,
  address: false,
  birthDate: false,
  engagementDate: false,
  weddingDate: false,
  tags: false,
  customerType: false,
  totalProjects: false,
  totalRevenue: false,
  debt: true,
  credit: true,
  lastInteraction: true,
}

const COLUMNS_STORAGE_KEY = "customer-columns"

function loadColumnState(): Record<ColumnKey, boolean> {
  if (typeof window === "undefined") return { ...DEFAULT_COLUMNS }
  try {
    const raw = window.localStorage.getItem(COLUMNS_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_COLUMNS }
    const parsed = JSON.parse(raw) as Partial<Record<ColumnKey, boolean>>
    // Merge with defaults so new keys appear.
    const merged: Record<ColumnKey, boolean> = { ...DEFAULT_COLUMNS }
    for (const key of Object.keys(DEFAULT_COLUMNS) as ColumnKey[]) {
      if (parsed[key] !== undefined) merged[key] = !!parsed[key]
    }
    return merged
  } catch {
    return { ...DEFAULT_COLUMNS }
  }
}

function saveColumnState(state: Record<ColumnKey, boolean>) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

// ============================================================
// Helpers
// ============================================================
function parseFamilyMeta(raw?: string | null): FamilyMeta {
  if (!raw) return { spouse: null, children: [] }
  try {
    const parsed = JSON.parse(raw) as {
      spouse?: { name?: string; birth?: string; phone?: string; instagramId?: string } | null
      children?: { name?: string; birth?: string; gender?: string }[] | null
    }
    const sp = parsed.spouse
    const spouse =
      sp && (sp.name || sp.birth || sp.phone || sp.instagramId)
        ? { name: sp.name || "", birth: sp.birth || "", phone: sp.phone || "", instagramId: sp.instagramId || "" }
        : null
    const children: FamilyMember[] = Array.isArray(parsed.children)
      ? parsed.children.map((c) => ({ name: c.name || "", birth: c.birth || "", gender: (c.gender as "boy" | "girl" | "") || "" }))
      : []
    return { spouse, children }
  } catch {
    return { spouse: null, children: [] }
  }
}

function serializeFamilyMeta(fm: FamilyMeta): string {
  return JSON.stringify({
    spouse: fm.spouse || { name: "", birth: "" },
    children: fm.children,
  })
}

function normalizeTags(data: unknown): Tag[] {
  if (!data) return []
  if (Array.isArray(data)) return data as Tag[]
  const obj = data as { items?: Tag[]; tags?: Tag[] }
  return obj.items ?? obj.tags ?? []
}

function normalizeCities(data: unknown): CityItem[] {
  if (!data) return []
  if (Array.isArray(data)) return data as CityItem[]
  const obj = data as { items?: CityItem[] }
  return obj.items ?? []
}

/** Returns initials (first 2 chars) for an Avatar fallback. */
function initialsOf(name: string): string {
  if (!name) return "؟"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

/**
 * Reads a File as a center-cropped 1080×1080 base64 JPEG data URL.
 * Non-square uploads are center-cropped to a square first. Quality ~0.85.
 *
 * For HEIC files (iPhone photos), browsers can't natively decode HEIC, so
 * `new Image()` will fail to load the data URL. We try `createImageBitmap`
 * first (some browsers support HEIC via that path); if that also fails, we
 * fall back to storing the raw base64 data URL as-is and surface a toast so
 * the user knows the photo was stored without resizing.
 *
 * Returns `{ dataUrl, wasRaw }` — `wasRaw=true` means no resizing happened
 * (HEIC fallback path).
 */
async function readImageSquare1080(
  file: File
): Promise<{ dataUrl: string; wasRaw: boolean }> {
  // Read the file once as a data URL — this is the fallback for HEIC and
  // also the source for the canvas path.
  const raw: string = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("خواندن فایل ناموفق بود"))
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })

  const isHeic =
    /\.heic$/i.test(file.name) ||
    file.type === "image/heic" ||
    file.type === "image/heif"

  // Try the HTMLImageElement path first (works for JPEG/PNG/WebP).
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image()
      im.onerror = () => reject(new Error("image-decode-failed"))
      im.onload = () => resolve(im)
      im.src = raw
    })
    const minEdge = Math.min(img.width, img.height)
    const sx = (img.width - minEdge) / 2
    const sy = (img.height - minEdge) / 2
    const size = 1080
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      // No canvas context — return raw.
      return { dataUrl: raw, wasRaw: true }
    }
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(img, sx, sy, minEdge, minEdge, 0, 0, size, size)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85)
    return { dataUrl, wasRaw: false }
  } catch {
    // HTMLImageElement failed — likely HEIC. Try createImageBitmap (some
    // browsers support HEIC through this API).
    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(file)
        const minEdge = Math.min(bitmap.width, bitmap.height)
        const sx = (bitmap.width - minEdge) / 2
        const sy = (bitmap.height - minEdge) / 2
        const size = 1080
        const canvas = document.createElement("canvas")
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"
          ctx.drawImage(bitmap, sx, sy, minEdge, minEdge, 0, 0, size, size)
          bitmap.close?.()
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85)
          return { dataUrl, wasRaw: false }
        }
        bitmap.close?.()
      } catch {
        // fall through to raw fallback
      }
    }
    // Last resort: store the raw data URL. For HEIC, this keeps the original
    // bytes; the <img> tag in the avatar may not render it, but the bytes
    // are preserved so the user can re-download / convert later.
    if (isHeic) {
      toast.info("فرمت HEIC به‌صورت خام ذخیره شد (بدون تغییر اندازه)")
    }
    return { dataUrl: raw, wasRaw: true }
  }
}

/**
 * Mutation fetcher that surfaces server error messages instead of swallowing them.
 */
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
        const errMsg =
          (data as { error?: string })?.error || `خطای درخواست (${res.status})`
        throw new Error(errMsg)
      }
      return data as T
    },
    [role]
  )
}

// ============================================================
// Small presentational pieces
// ============================================================
function CustomerAvatar({
  name,
  profileImage,
  size = "sm",
  onClick,
}: {
  name: string
  profileImage?: string | null
  size?: "sm" | "md" | "lg" | "xl"
  onClick?: () => void
}) {
  const dims =
    size === "xl"
      ? "size-24 text-2xl"
      : size === "lg"
      ? "size-16 text-lg"
      : size === "md"
      ? "size-10 text-sm"
      : "size-12 text-base"
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full ring-1 ring-border transition hover:ring-2 hover:ring-primary/60",
          dims
        )}
        title="نمایش اندازه کامل"
      >
        <Avatar className={cn("size-full", dims)}>
          {profileImage ? <AvatarImage src={profileImage} alt={name} /> : null}
          <AvatarFallback className="font-semibold">{initialsOf(name)}</AvatarFallback>
        </Avatar>
        {profileImage && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition hover:bg-black/30 hover:opacity-100">
            <Maximize2 className="size-4 text-white" />
          </span>
        )}
      </button>
    )
  }
  return (
    <Avatar className={dims}>
      {profileImage ? <AvatarImage src={profileImage} alt={name} /> : null}
      <AvatarFallback className="font-semibold">
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  )
}

function TagPill({
  tag,
  onRemove,
}: {
  tag: Tag
  onRemove?: () => void
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: tag.color + "1f",
        color: tag.color,
        borderColor: tag.color + "40",
      }}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="opacity-60 transition hover:opacity-100"
          aria-label={`حذف ${tag.name}`}
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  const isCompany = type === "company"
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium",
        isCompany
          ? "border-violet-300/60 bg-violet-50 text-violet-700 dark:border-violet-700/50 dark:bg-violet-950/40 dark:text-violet-300"
          : "border-sky-300/60 bg-sky-50 text-sky-700 dark:border-sky-700/50 dark:bg-sky-950/40 dark:text-sky-300"
      )}
    >
      {isCompany ? "🏢" : "👤"} {isCompany ? "حقوقی" : "حقیقی"}
    </Badge>
  )
}

function CreditTxBadge({ type }: { type: string }) {
  if (type === "reward_referral")
    return (
      <Badge className="gap-1 border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
        <Gift className="size-3" /> معرفی
      </Badge>
    )
  if (type === "used")
    return (
      <Badge className="gap-1 border-transparent bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
        <ArrowRightLeft className="size-3" /> مصرف
      </Badge>
    )
  return (
    <Badge
      variant="outline"
      className="gap-1 border-amber-300/60 bg-amber-50 text-amber-700 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300"
    >
      <Pencil className="size-3" /> تنظیم
    </Badge>
  )
}

// ============================================================
// Image lightbox dialog
// ============================================================
function ImageLightbox({
  src,
  name,
  open,
  onOpenChange,
}: {
  src: string | null
  name: string
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-fit border-0 bg-transparent p-0 shadow-none sm:max-w-fit"
        showCloseButton
      >
        <DialogTitle className="sr-only">تصویر پروفایل {name}</DialogTitle>
        <DialogDescription className="sr-only">
          نمایش اندازه کامل تصویر پروفایل
        </DialogDescription>
        {src ? (
          <img
            src={src}
            alt={name}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Profile photo uploader (1080×1080 center-crop, base64)
// Accepts JPEG, PNG, and HEIC (iPhone photos). HEIC files that
// can't be decoded by the browser are stored as raw base64.
// ============================================================
const IMAGE_ACCEPT = "image/jpeg,image/png,image/heic,image/heif,.heic,.heif,.jpg,.jpeg,.png"

function ProfilePhotoUploader({
  value,
  onChange,
}: {
  value: string | null
  onChange: (v: string | null) => void
}) {
  const fileRef = React.useRef<HTMLInputElement>(null)
  const cameraRef = React.useRef<HTMLInputElement>(null)
  const [busy, setBusy] = React.useState(false)
  const [lightboxOpen, setLightboxOpen] = React.useState(false)

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (file.size > 12 * 1024 * 1024) {
      toast.error("حجم تصویر نباید بیشتر از ۱۲ مگابایت باشد")
      return
    }
    setBusy(true)
    try {
      const { dataUrl, wasRaw } = await readImageSquare1080(file)
      onChange(dataUrl)
      if (wasRaw) {
        // Toast already shown inside readImageSquare1080 for HEIC.
      } else {
        toast.success("تصویر بارگذاری شد")
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "بارگذاری تصویر ناموفق بود")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <CustomerAvatar
        name=""
        profileImage={value}
        size="lg"
        onClick={value ? () => setLightboxOpen(true) : undefined}
      />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <ImageIcon className="mr-1.5 size-3.5" />
            )}
            انتخاب تصویر
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="mr-1.5 size-3.5" /> دوربین
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
              onClick={() => onChange(null)}
            >
              <X className="mr-1.5 size-3.5" /> حذف
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          تصویر به‌صورت مربع ۱۰۸۰×۱۰۸۰ و base64 ذخیره می‌شود. فرمت‌های JPEG، PNG و HEIC
          (عکس آیفون) پشتیبانی می‌شوند. برای مشاهده اندازه کامل روی تصویر کلیک کنید.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_ACCEPT}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <input
          ref={cameraRef}
          type="file"
          accept={IMAGE_ACCEPT}
          capture="user"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      <ImageLightbox
        src={value}
        name="پروفایل"
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </div>
  )
}

// ============================================================
// Extra phones editor
// ============================================================
function ExtraPhonesEditor({
  value,
  onChange,
}: {
  value: ExtraPhone[]
  onChange: (v: ExtraPhone[]) => void
}) {
  const rows = value.length > 0 ? value : []
  return (
    <div className="space-y-2">
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed py-3 text-center text-xs text-muted-foreground">
          شماره تماس اضافی ثبت نشده
        </p>
      ) : (
        rows.map((row, idx) => (
          <div
            key={idx}
            className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_auto]"
          >
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">نام</Label>
              <Input
                dir="rtl"
                value={row.label || ""}
                onChange={(e) => {
                  const next = [...rows]
                  next[idx] = { ...row, label: e.target.value }
                  onChange(next)
                }}
                placeholder="مثلاً برادر، خواهر..."
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">شماره</Label>
              <Input
                dir="ltr"
                value={row.phone}
                onChange={(e) => {
                  const next = [...rows]
                  next[idx] = { ...row, phone: e.target.value }
                  onChange(next)
                }}
                placeholder="09120000000"
                className="h-9 text-left"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-rose-600"
              onClick={() => onChange(rows.filter((_, i) => i !== idx))}
              aria-label="حذف شماره"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...rows, { label: "", phone: "" }])}
      >
        <Plus className="mr-1.5 size-3.5" /> افزودن شماره
      </Button>
    </div>
  )
}

// ============================================================
// Family metadata editor
// ============================================================
function FamilyMetaEditor({
  value,
  onChange,
}: {
  value: FamilyMeta
  onChange: (v: FamilyMeta) => void
}) {
  const hasSpouse = value.spouse !== null
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <Heart className="size-4 text-rose-500" />
          <span className="text-sm font-medium">همسر</span>
        </div>
        <Switch
          checked={hasSpouse}
          onCheckedChange={(checked) =>
            onChange({
              ...value,
              spouse: checked ? { name: "", birth: "" } : null,
            })
          }
        />
      </div>
      {hasSpouse && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">نام همسر</Label>
            <Input
              value={value.spouse?.name ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  spouse: {
                    name: e.target.value,
                    birth: value.spouse?.birth ?? "",
                    phone: value.spouse?.phone ?? "",
                    instagramId: value.spouse?.instagramId ?? "",
                  },
                })
              }
              placeholder="نام و نام خانوادگی"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">شماره تماس همسر</Label>
            <Input
              dir="ltr"
              value={value.spouse?.phone ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  spouse: {
                    name: value.spouse?.name ?? "",
                    birth: value.spouse?.birth ?? "",
                    phone: e.target.value,
                    instagramId: value.spouse?.instagramId ?? "",
                  },
                })
              }
              placeholder="09120000000"
              className="text-left"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">آیدی اینستاگرام همسر</Label>
            <div className="relative">
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
              <Input
                dir="ltr"
                value={value.spouse?.instagramId ?? ""}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^a-zA-Z0-9._]/g, "")
                  onChange({
                    ...value,
                    spouse: {
                      name: value.spouse?.name ?? "",
                      birth: value.spouse?.birth ?? "",
                      phone: value.spouse?.phone ?? "",
                      instagramId: v,
                    },
                  })
                }}
                placeholder="instagram_id"
                className="pr-6 text-left"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">تاریخ تولد همسر</Label>
            <JalaliDatePicker
              value={value.spouse?.birth ?? null}
              onChange={(iso) =>
                onChange({
                  ...value,
                  spouse: {
                    name: value.spouse?.name ?? "",
                    birth: iso ?? "",
                    phone: value.spouse?.phone ?? "",
                    instagramId: value.spouse?.instagramId ?? "",
                  },
                })
              }
              placeholder="انتخاب تاریخ"
            />
          </div>
        </div>
      )}

      <Separator />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Baby className="size-4 text-emerald-500" />
          <span className="text-sm font-medium">فرزندان</span>
          <span className="text-xs text-muted-foreground">
            ({value.children.length})
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({ ...value, children: [...value.children, { name: "", birth: "" }] })
          }
        >
          <Plus className="mr-1 size-3.5" /> افزودن فرزند
        </Button>
      </div>

      {value.children.length === 0 ? (
        <p className="rounded-lg border border-dashed py-4 text-center text-xs text-muted-foreground">
          هنوز فرزندی اضافه نشده
        </p>
      ) : (
        <div className="space-y-2">
          {value.children.map((child, idx) => (
            <div
              key={idx}
              className="grid grid-cols-1 items-end gap-2 rounded-lg border bg-muted/20 p-2 sm:grid-cols-[1fr_auto_1fr_auto]"
            >
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">نام</Label>
                <Input
                  value={child.name}
                  onChange={(e) => {
                    const next = [...value.children]
                    next[idx] = { ...child, name: e.target.value }
                    onChange({ ...value, children: next })
                  }}
                  placeholder="نام فرزند"
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">جنسیت</Label>
                <Select
                  value={child.gender || ""}
                  onValueChange={(v) => {
                    const next = [...value.children]
                    next[idx] = { ...child, gender: v as "boy" | "girl" }
                    onChange({ ...value, children: next })
                  }}
                >
                  <SelectTrigger className="h-8 w-[100px]">
                    <SelectValue placeholder="انتخاب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boy">پسر</SelectItem>
                    <SelectItem value="girl">دختر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">تاریخ تولد</Label>
                <JalaliDatePicker
                  value={child.birth || null}
                  onChange={(iso) => {
                    const next = [...value.children]
                    next[idx] = { ...child, birth: iso ?? "" }
                    onChange({ ...value, children: next })
                  }}
                  placeholder="انتخاب تاریخ"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                onClick={() =>
                  onChange({
                    ...value,
                    children: value.children.filter((_, i) => i !== idx),
                  })
                }
                aria-label="حذف فرزند"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Tags multi-select popover
// ============================================================
function TagsMultiSelect({
  allTags,
  selected,
  onChange,
  align = "start",
  className,
  trigger,
}: {
  allTags: Tag[]
  selected: string[]
  onChange: (ids: string[]) => void
  align?: "start" | "center" | "end"
  className?: string
  trigger: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const selectedTags = allTags.filter((t) => selected.includes(t.id))
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} className={cn("w-64 p-0", className)}>
        <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
          {selectedTags.length} انتخاب شده
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {allTags.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              تگ‌ای موجود نیست
            </div>
          ) : (
            allTags.map((tag) => {
              const checked = selected.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() =>
                    onChange(
                      checked
                        ? selected.filter((id) => id !== tag.id)
                        : [...selected, tag.id]
                    )
                  }
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-accent"
                >
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded border"
                    style={{
                      backgroundColor: checked ? tag.color : "transparent",
                      borderColor: checked ? tag.color : "currentColor",
                      color: tag.color,
                    }}
                  >
                    {checked && <Check className="size-3 text-white" />}
                  </span>
                  <span className="flex-1 text-left">{tag.name}</span>
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Referrer combobox (searchable)
// ============================================================
function ReferrerCombobox({
  value,
  onChange,
  excludeId,
  initialItem,
}: {
  value: string | null
  onChange: (id: string | null) => void
  excludeId?: string | null
  initialItem?: { id: string; name: string } | null
}) {
  const role = useWorkspace((s) => s.role)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<CustomerListItem[]>([])
  const [loading, setLoading] = React.useState(false)

  const fromResults = results.find((r) => r.id === value)
  const selected =
    fromResults ?? (value && initialItem && initialItem.id === value ? initialItem : null)

  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ limit: "20" })
    if (query) params.set("search", query)
    fetch(`/api/customers?${params.toString()}`, {
      headers: { "x-demo-role": role },
    })
      .then((r) => r.json())
      .then((data: CustomerListResponse) => {
        if (cancelled) return
        setResults(
          (data.items || []).filter((c) => c.id !== excludeId)
        )
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [open, query, role, excludeId])

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
              <UserIcon className="size-3.5 text-muted-foreground" />
              <span className="truncate">{selected.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">بدون معرف</span>
          )}
          <ChevronDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="جستجوی مشتریان…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                <Loader2 className="mr-2 size-3.5 animate-spin" /> در حال بارگذاری…
              </div>
            )}
            {!loading && (
              <CommandEmpty>مشتری‌ای یافت نشد.</CommandEmpty>
            )}
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  onChange(null)
                  setOpen(false)
                }}
                className="text-muted-foreground"
              >
                <X className="size-3.5" />
                پاک کردن معرف
              </CommandItem>
              {results.map((c) => (
                <CommandItem
                  key={c.id}
                  onSelect={() => {
                    onChange(c.id)
                    setOpen(false)
                  }}
                  className="justify-between"
                >
                  <span className="flex items-center gap-2 truncate">
                    <UserIcon className="size-3.5 text-muted-foreground" />
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{c.phone}</span>
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
// Cities API helpers
// ============================================================
function useCities() {
  const api = useApi()
  return useQuery({
    queryKey: ["cities"],
    queryFn: () => api.get<unknown>("/api/cities"),
    staleTime: 60_000,
  })
}

// ============================================================
// City combobox with "manage cities" link
// ============================================================
function CityCombobox({
  value,
  onChange,
  onManageCities,
}: {
  value: string | null
  onChange: (v: string | null) => void
  onManageCities?: () => void
}) {
  const api = useApi()
  const queryClient = useQueryClient()
  const role = useWorkspace((s) => s.role)
  const canManage = CAN_MANAGE_CUSTOMERS.includes(role)
  const { data: citiesData } = useCities()
  const cities = React.useMemo(() => normalizeCities(citiesData), [citiesData])

  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [managerOpen, setManagerOpen] = React.useState(false)
  const [creating, setCreating] = React.useState(false)

  // Show current value (which may be a custom string not in presets)
  const displayValue = value ?? ""
  const trimmedQuery = query.trim()

  // Filter presets by query
  const filteredPresets = cities.filter((c) =>
    !trimmedQuery ? true : c.name.includes(trimmedQuery)
  )
  const exactMatch = cities.find(
    (c) => c.name === trimmedQuery || c.name.trim() === trimmedQuery
  )

  // Inline-create a new city via POST /api/cities and select it.
  const createAndSelect = async (name: string) => {
    if (!name.trim()) return
    setCreating(true)
    try {
      await api.post("/api/cities", { name: name.trim(), province: null })
      queryClient.invalidateQueries({ queryKey: ["cities"] })
      toast.success(`شهر «${name.trim()}» به فهرست شهرها افزوده شد`)
      onChange(name.trim())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "افزودن شهر ناموفق بود")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              className="w-full justify-between font-normal"
            >
              <span className="flex items-center gap-2 truncate">
                <MapPin className="size-3.5 text-muted-foreground" />
                {displayValue ? (
                  <span className="truncate">{displayValue}</span>
                ) : (
                  <span className="text-muted-foreground">انتخاب شهر</span>
                )}
              </span>
              <ChevronDown className="size-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="جستجوی شهر…"
                value={query}
                onValueChange={setQuery}
              />
              <CommandList>
                {creating && (
                  <div className="flex items-center justify-center py-3 text-xs text-muted-foreground">
                    <Loader2 className="mr-2 size-3.5 animate-spin" /> در حال افزودن شهر…
                  </div>
                )}
                {!creating && filteredPresets.length === 0 && !trimmedQuery && (
                  <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                    هنوز شهری ثبت نشده. نام شهر را تایپ کنید تا افزوده شود.
                  </div>
                )}
                {!creating && filteredPresets.length === 0 && trimmedQuery && !exactMatch && (
                  <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                    شهری با این نام یافت نشد. برای افزودن، گزینهٔ زیر را انتخاب کنید.
                  </div>
                )}
                {!creating && filteredPresets.length > 0 && (
                  <CommandGroup heading="شهرهای ذخیره‌شده">
                    {filteredPresets.map((c) => (
                      <CommandItem
                        key={c.id}
                        onSelect={() => {
                          onChange(c.name)
                          setOpen(false)
                          setQuery("")
                        }}
                        className="justify-between"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <MapPin className="size-3.5 text-muted-foreground" />
                          <span className="truncate">{c.name}</span>
                        </span>
                        {c.province && (
                          <span className="text-xs text-muted-foreground">{c.province}</span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {!creating && trimmedQuery && !exactMatch && (
                  <CommandGroup heading="افزودن شهر جدید">
                    <CommandItem
                      onSelect={() => {
                        createAndSelect(trimmedQuery)
                        setOpen(false)
                        setQuery("")
                      }}
                    >
                      <Plus className="size-3.5" />
                      <span>افزودن «{trimmedQuery}» به شهرها</span>
                    </CommandItem>
                  </CommandGroup>
                )}
                {!creating && value && (
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        onChange(null)
                        setOpen(false)
                        setQuery("")
                      }}
                      className="text-muted-foreground"
                    >
                      <X className="size-3.5" />
                      پاک کردن شهر
                    </CommandItem>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

// ============================================================
// Cities manager button (for city section header)
// ============================================================
function CitiesManagerButton() {
  const role = useWorkspace((s) => s.role)
  const canManage = CAN_MANAGE_CUSTOMERS.includes(role)
  const [managerOpen, setManagerOpen] = React.useState(false)
  if (!canManage) return null
  return (
    <Popover open={managerOpen} onOpenChange={setManagerOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 gap-1 px-2 text-xs text-muted-foreground"
          title="مدیریت شهرها"
          aria-label="مدیریت شهرها"
        >
          <MoreVertical className="size-3.5" />
          مدیریت شهرها
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <CitiesManager />
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Cities manager — inline (rendered inside the CityCombobox popover)
// ============================================================
function CitiesManager() {
  const api = useApi()
  const queryClient = useQueryClient()
  const role = useWorkspace((s) => s.role)
  const { data: citiesData } = useCities()
  const cities = React.useMemo(() => normalizeCities(citiesData), [citiesData])

  const [newName, setNewName] = React.useState("")
  const [newProvince, setNewProvince] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editProvince, setEditProvince] = React.useState("")
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const canManagePreset = role === "admin" || role === "manager"

  const create = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await api.post("/api/cities", { name: newName.trim(), province: newProvince.trim() || null })
      toast.success("شهر افزوده شد")
      setNewName("")
      setNewProvince("")
      queryClient.invalidateQueries({ queryKey: ["cities"] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "افزودن شهر ناموفق بود")
    } finally {
      setCreating(false)
    }
  }

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return
    try {
      await api.patch(`/api/cities/${id}`, {
        name: editName.trim(),
        province: editProvince.trim() || null,
      })
      toast.success("شهر به‌روزرسانی شد")
      setEditingId(null)
      queryClient.invalidateQueries({ queryKey: ["cities"] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "به‌روزرسانی شهر ناموفق بود")
    }
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    try {
      await api.del(`/api/cities/${deletingId}`)
      toast.success("شهر حذف شد")
      setDeletingId(null)
      queryClient.invalidateQueries({ queryKey: ["cities"] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "حذف شهر ناموفق بود")
    }
  }

  return (
    <div className="p-3">
      <div className="mb-2 flex items-center gap-2">
        <MapPin className="size-4 text-muted-foreground" />
        <span className="text-sm font-semibold">مدیریت شهرها</span>
      </div>

      {canManagePreset && (
        <div className="mb-3 space-y-2 rounded-lg border bg-muted/30 p-2">
          <div className="grid grid-cols-1 gap-1.5">
            <Input
              placeholder="نام شهر"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              dir="rtl"
              className="h-8 text-sm"
            />
            <Input
              placeholder="استان (اختیاری)"
              value={newProvince}
              onChange={(e) => setNewProvince(e.target.value)}
              dir="rtl"
              className="h-8 text-sm"
            />
          </div>
          <Button
            size="sm"
            onClick={create}
            disabled={creating || !newName.trim()}
            className="h-8 w-full text-xs"
          >
            {creating ? (
              <Loader2 className="mr-1.5 size-3 animate-spin" />
            ) : (
              <Plus className="mr-1.5 size-3" />
            )}
            افزودن
          </Button>
        </div>
      )}

      <div className="max-h-60 space-y-1 overflow-y-auto pr-1">
        {cities.length === 0 ? (
          <p className="rounded-lg border border-dashed py-4 text-center text-xs text-muted-foreground">
            هنوز شهری ثبت نشده
          </p>
        ) : (
          cities.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-md border bg-card px-2.5 py-1.5"
            >
              {editingId === c.id ? (
                <div className="flex w-full flex-1 flex-wrap items-center gap-1.5">
                  <Input
                    className="h-7 flex-1 text-xs"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    dir="rtl"
                  />
                  <Input
                    className="h-7 flex-1 text-xs"
                    placeholder="استان"
                    value={editProvince}
                    onChange={(e) => setEditProvince(e.target.value)}
                    dir="rtl"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 text-emerald-600"
                    onClick={() => saveEdit(c.id)}
                    title="ذخیره"
                  >
                    <Check className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => setEditingId(null)}
                    title="انصراف"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="size-3 text-muted-foreground" />
                    <span className="truncate text-xs font-medium">{c.name}</span>
                    {c.province && (
                      <span className="text-[10px] text-muted-foreground">· {c.province}</span>
                    )}
                  </div>
                  {canManagePreset && (
                    <div className="flex items-center gap-0.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6"
                        onClick={() => {
                          setEditingId(c.id)
                          setEditName(c.name)
                          setEditProvince(c.province ?? "")
                        }}
                        title="ویرایش"
                      >
                        <Pencil className="size-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6 text-rose-600 hover:text-rose-700"
                        onClick={() => setDeletingId(c.id)}
                        title="حذف"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>

      <AlertDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف شهر؟</AlertDialogTitle>
            <AlertDialogDescription>
              این شهر از فهرست پیش‌فرض‌ها حذف می‌شود. مشتریانی که قبلاً این شهر را
              داشته‌اند تحت تأثیر قرار نمی‌گیرند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              className="bg-rose-600 hover:bg-rose-700"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================
// Cities manager dialog (CRUD)
// ============================================================
function CitiesManagerDialog({
  open,
  onOpenChange,
  cities,
  api,
  queryClient,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  cities: CityItem[]
  api: ReturnType<typeof useApi>
  queryClient: ReturnType<typeof useQueryClient>
}) {
  const role = useWorkspace((s) => s.role)
  const [newName, setNewName] = React.useState("")
  const [newProvince, setNewProvince] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editProvince, setEditProvince] = React.useState("")
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const canManagePreset = role === "admin" || role === "manager"

  const create = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await api.post("/api/cities", { name: newName.trim(), province: newProvince.trim() || null })
      toast.success("شهر افزوده شد")
      setNewName("")
      setNewProvince("")
      queryClient.invalidateQueries({ queryKey: ["cities"] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "افزودن شهر ناموفق بود")
    } finally {
      setCreating(false)
    }
  }

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return
    try {
      await api.patch(`/api/cities/${id}`, {
        name: editName.trim(),
        province: editProvince.trim() || null,
      })
      toast.success("شهر به‌روزرسانی شد")
      setEditingId(null)
      queryClient.invalidateQueries({ queryKey: ["cities"] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "به‌روزرسانی شهر ناموفق بود")
    }
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    try {
      await api.del(`/api/cities/${deletingId}`)
      toast.success("شهر حذف شد")
      setDeletingId(null)
      queryClient.invalidateQueries({ queryKey: ["cities"] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "حذف شهر ناموفق بود")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>مدیریت شهرها</DialogTitle>
          <DialogDescription>
            فهرست شهرهای پیش‌فرض برای انتخاب سریع در فرم مشتری.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {canManagePreset && (
            <div className="space-y-2 rounded-xl border bg-card p-3">
              <div className="text-sm font-semibold">افزودن شهر جدید</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  placeholder="نام شهر"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  dir="rtl"
                />
                <Input
                  placeholder="استان (اختیاری)"
                  value={newProvince}
                  onChange={(e) => setNewProvince(e.target.value)}
                  dir="rtl"
                />
              </div>
              <Button
                size="sm"
                onClick={create}
                disabled={creating || !newName.trim()}
              >
                {creating ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Plus className="mr-1.5 size-3.5" />
                )}
                افزودن
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {cities.length === 0 ? (
              <p className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
                هنوز شهری ثبت نشده
              </p>
            ) : (
              <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
                {cities.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2"
                  >
                    {editingId === c.id ? (
                      <div className="flex w-full flex-1 flex-wrap items-center gap-2">
                        <Input
                          className="h-8 flex-1"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          dir="rtl"
                        />
                        <Input
                          className="h-8 flex-1"
                          placeholder="استان"
                          value={editProvince}
                          onChange={(e) => setEditProvince(e.target.value)}
                          dir="rtl"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-emerald-600"
                          onClick={() => saveEdit(c.id)}
                          title="ذخیره"
                        >
                          <Check className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          onClick={() => setEditingId(null)}
                          title="انصراف"
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 truncate">
                          <MapPin className="size-3.5 text-muted-foreground" />
                          <span className="truncate text-sm font-medium">{c.name}</span>
                          {c.province && (
                            <span className="text-xs text-muted-foreground">
                              · {c.province}
                            </span>
                          )}
                        </div>
                        {canManagePreset && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() => {
                                setEditingId(c.id)
                                setEditName(c.name)
                                setEditProvince(c.province ?? "")
                              }}
                              title="ویرایش"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-rose-600 hover:text-rose-700"
                              onClick={() => setDeletingId(c.id)}
                              title="حذف"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            بستن
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف شهر؟</AlertDialogTitle>
            <AlertDialogDescription>
              این شهر از فهرست پیش‌فرض‌ها حذف می‌شود. مشتریانی که قبلاً این شهر را
              داشته‌اند تحت تأثیر قرار نمی‌گیرند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              className="bg-rose-600 hover:bg-rose-700"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}

// ============================================================
// Customer form dialog (create / edit)
// ============================================================
function CustomerFormDialog({
  open,
  onOpenChange,
  customerId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  customerId: string | null
  onSaved?: (id: string) => void
}) {
  const api = useApi()
  const mutate = useMutate()
  const queryClient = useQueryClient()
  const role = useWorkspace((s) => s.role)

  const isEdit = !!customerId
  const canSeeFamily = role === "admin" || role === "manager"

  const { data: tagsData } = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get<unknown>("/api/tags"),
    enabled: open,
  })
  const allTags = React.useMemo(
    () => normalizeTags(tagsData),
    [tagsData]
  )

  const { data: existing, isLoading: loadingDetail } = useQuery({
    queryKey: ["customer-detail", customerId],
    queryFn: () => api.get<CustomerDetail>(`/api/customers/${customerId}`),
    enabled: open && !!customerId,
  })

  // Active custom-field definitions (so we can encode values correctly on save).
  const { data: cfDefs } = useQuery<CustomFieldDef[]>({
    queryKey: ["custom-fields-active"],
    queryFn: () => api.get("/api/custom-fields?active=true"),
    enabled: open,
  })
  // Existing custom-field values when editing.
  const { data: cfExisting } = useCustomerCustomValues(
    customerId,
    open && !!customerId
  )

  const [name, setName] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [instagramId, setInstagramId] = React.useState("")
  const [customerType, setCustomerType] = React.useState<"individual" | "company">("individual")
  const [referrerId, setReferrerId] = React.useState<string | null>(null)
  const [tagIds, setTagIds] = React.useState<string[]>([])
  const [family, setFamily] = React.useState<FamilyMeta>({ spouse: null, children: [] })
  const [profileImage, setProfileImage] = React.useState<string | null>(null)
  const [extraPhones, setExtraPhones] = React.useState<ExtraPhone[]>([])
  const [birthDate, setBirthDate] = React.useState<string | null>(null)
  const [engagementDate, setEngagementDate] = React.useState<string | null>(null)
  const [weddingDate, setWeddingDate] = React.useState<string | null>(null)
  const [city, setCity] = React.useState<string | null>(null)
  const [address, setAddress] = React.useState<string>("")
  const [cfValues, setCfValues] = React.useState<Record<string, unknown>>({})
  const [cfHydrated, setCfHydrated] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Hydrate form once per open session (avoids wiping user input on refetch)
  const hydratedKey = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!open) {
      hydratedKey.current = null
      setError(null)
      return
    }
    if (isEdit) {
      if (existing && hydratedKey.current !== existing.id) {
        hydratedKey.current = existing.id
        setName(existing.name)
        setPhone(existing.phone)
        setInstagramId(existing.instagramId ?? "")
        setCustomerType(
          existing.customerType === "company" ? "company" : "individual"
        )
        setReferrerId(existing.referrerId)
        setTagIds(existing.tags.map((t) => t.id))
        setProfileImage(existing.profileImage ?? null)
        setExtraPhones(existing.extraPhones ?? [])
        setBirthDate(existing.birthDate ?? null)
        setEngagementDate(existing.engagementDate ?? null)
        setWeddingDate(existing.weddingDate ?? null)
        setCity(existing.city ?? null)
        setAddress(existing.address ?? "")
        if (canSeeFamily) setFamily(parseFamilyMeta(existing.familyMeta))
      }
    } else {
      if (hydratedKey.current !== "__new__") {
        hydratedKey.current = "__new__"
        setName("")
        setPhone("")
        setInstagramId("")
        setCustomerType("individual")
        setReferrerId(null)
        setTagIds([])
        setProfileImage(null)
        setExtraPhones([])
        setBirthDate(null)
        setEngagementDate(null)
        setWeddingDate(null)
        setCity(null)
        setAddress("")
        setFamily({ spouse: null, children: [] })
        setError(null)
      }
    }
  }, [open, isEdit, existing, canSeeFamily])

  // Hydrate custom-field values once per open session.
  React.useEffect(() => {
    if (!open) {
      setCfHydrated(null)
      setCfValues({})
      return
    }
    if (isEdit) {
      if (cfExisting && cfHydrated !== (customerId || "__edit__")) {
        setCfHydrated(customerId || "__edit__")
        const next: Record<string, unknown> = {}
        for (const row of cfExisting) {
          next[row.fieldId] = decodeValue(row.type, row.value)
        }
        setCfValues(next)
      }
    } else {
      if (cfHydrated !== "__new__") {
        setCfHydrated("__new__")
        setCfValues({})
      }
    }
  }, [open, isEdit, cfExisting, customerId, cfHydrated])

  const submit = async () => {
    setError(null)
    if (!name.trim()) {
      setError("نام الزامی است")
      return
    }
    if (!phone.trim()) {
      setError("تلفن الزامی است")
      return
    }
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        phone: phone.trim(),
        instagramId: instagramId.trim() || null,
        customerType,
        referrerId: referrerId || null,
        tagIds,
        profileImage: profileImage || null,
        extraPhones: extraPhones.filter((p) => p.phone.trim().length > 0),
        birthDate: birthDate || null,
        engagementDate: engagementDate || null,
        weddingDate: weddingDate || null,
        city: city || null,
        address: address.trim() || null,
      }
      if (canSeeFamily) {
        payload.familyMeta = serializeFamilyMeta(family)
      }
      if (isEdit) {
        await mutate(`/api/customers/${customerId}`, "PATCH", payload)
        toast.success("مشتری به‌روزرسانی شد")
        queryClient.invalidateQueries({ queryKey: ["customer-detail", customerId] })
        queryClient.invalidateQueries({ queryKey: ["customers"] })
        // Save custom-field values for this customer.
        await saveCustomFieldValues(customerId!)
        onSaved?.(customerId!)
      } else {
        const created = await mutate<{ id: string }>("/api/customers", "POST", payload)
        toast.success("مشتری ایجاد شد")
        queryClient.invalidateQueries({ queryKey: ["customers"] })
        // Save custom-field values for the newly-created customer.
        await saveCustomFieldValues(created.id)
        onSaved?.(created.id)
      }
      onOpenChange(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطایی رخ داد"
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // PUT custom field values for a customer (encodes typed state to JSON strings).
  async function saveCustomFieldValues(custId: string) {
    if (!cfDefs || cfDefs.length === 0) return
    try {
      const valuesPayload = cfDefs
        .filter((f) => cfValues[f.id] !== undefined)
        .map((f) => ({
          fieldId: f.id,
          value: encodeValue(f.type, cfValues[f.id]),
        }))
      if (valuesPayload.length === 0) return
      await fetch("/api/custom-fields/values", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-demo-role": role },
        body: JSON.stringify({ customerId: custId, values: valuesPayload }),
      })
      queryClient.invalidateQueries({ queryKey: ["custom-field-values", custId] })
    } catch {
      // Non-fatal: customer save already succeeded.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "ویرایش مشتری" : "مشتری جدید"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "به‌روزرسانی اطلاعات مشتری، تگ‌ها، تصویر پروفایل، شهر/نشانی و اطلاعات خانواده."
              : "افزودن مشتری جدید به لیست شما."}
          </DialogDescription>
        </DialogHeader>

        {isEdit && loadingDetail ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> در حال بارگذاری…
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {error && (
              <div className="rounded-lg border border-rose-300/60 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-700/50 dark:bg-rose-950/40 dark:text-rose-300">
                {error}
              </div>
            )}

            {/* Profile photo */}
            <div className="space-y-2 rounded-xl border bg-card p-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">تصویر پروفایل</span>
              </div>
              <ProfilePhotoUploader value={profileImage} onChange={setProfileImage} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cust-name">نام *</Label>
              <Input
                id="cust-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً سحر و رضا"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cust-phone">تلفن اصلی *</Label>
                <Input
                  id="cust-phone"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09120000000"
                  className="text-left"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cust-instagram">آیدی اینستاگرام</Label>
                <div className="relative">
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                  <Input
                    id="cust-instagram"
                    dir="ltr"
                    value={instagramId}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^a-zA-Z0-9._]/g, "")
                      setInstagramId(v)
                    }}
                    placeholder="instagram_id"
                    className="pr-6 text-left"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>نوع مشتری</Label>
                <Select
                  value={customerType}
                  onValueChange={(v) =>
                    setCustomerType(v as "individual" | "company")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOMER_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t === "company" ? "🏢 حقوقی" : "👤 حقیقی"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* City + Address */}
            <div className="space-y-3 rounded-xl border bg-card p-3">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">شهر و نشانی</span>
                <div className="mr-auto">
                  <CitiesManagerButton />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">شهر</Label>
                <CityCombobox value={city} onChange={setCity} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">نشانی</Label>
                <Textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="نشانی کامل پستی (اختیاری)"
                  rows={2}
                  dir="rtl"
                />
              </div>
            </div>

            {/* Extra phones */}
            <div className="space-y-2 rounded-xl border bg-card p-3">
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">شماره‌های تماس اضافی</span>
              </div>
              <ExtraPhonesEditor value={extraPhones} onChange={setExtraPhones} />
            </div>

            {/* Three dates — Jalali pickers */}
            <div className="grid grid-cols-1 gap-3 rounded-xl border bg-card p-3 sm:grid-cols-3">
              <div className="flex items-center gap-2 sm:col-span-3">
                <CalendarDays className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">تاریخ‌های مهم</span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">تاریخ تولد</Label>
                <JalaliDatePicker
                  value={birthDate}
                  onChange={setBirthDate}
                  placeholder="انتخاب تاریخ"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">تاریخ عقد</Label>
                <JalaliDatePicker
                  value={engagementDate}
                  onChange={setEngagementDate}
                  placeholder="انتخاب تاریخ"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">تاریخ ازدواج</Label>
                <JalaliDatePicker
                  value={weddingDate}
                  onChange={setWeddingDate}
                  placeholder="انتخاب تاریخ"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>معرفی‌شده توسط</Label>
              <ReferrerCombobox
                value={referrerId}
                onChange={setReferrerId}
                excludeId={customerId}
                initialItem={
                  existing?.referrer
                    ? { id: existing.referrer.id, name: existing.referrer.name }
                    : null
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>تگ‌ها</Label>
              <TagsMultiSelect
                allTags={allTags}
                selected={tagIds}
                onChange={setTagIds}
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between font-normal"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <TagIcon className="size-3.5 text-muted-foreground" />
                      {tagIds.length === 0 ? (
                        <span className="text-muted-foreground">بدون تگ</span>
                      ) : (
                        <span className="truncate">
                          {allTags
                            .filter((t) => tagIds.includes(t.id))
                            .map((t) => t.name)
                            .join(", ")}
                        </span>
                      )}
                    </span>
                    <ChevronDown className="size-4 opacity-50" />
                  </Button>
                }
              />
              {tagIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {allTags
                    .filter((t) => tagIds.includes(t.id))
                    .map((t) => (
                      <TagPill key={t.id} tag={t} onRemove={() => setTagIds(tagIds.filter((id) => id !== t.id))} />
                    ))}
                </div>
              )}
            </div>

            {canSeeFamily && (
              <div className="space-y-2 rounded-xl border bg-card p-3">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">اطلاعات خانواده</span>
                </div>
                <FamilyMetaEditor value={family} onChange={setFamily} />
              </div>
            )}

            {/* Custom fields (active fields defined in Settings → Custom Fields) */}
            <CustomFieldsFormSection
              customerId={customerId}
              values={cfValues}
              onChange={setCfValues}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            انصراف
          </Button>
          <Button onClick={submit} disabled={submitting || (isEdit && loadingDetail)}>
            {submitting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            {isEdit ? "ذخیره تغییرات" : "ایجاد مشتری"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Add credit dialog (admin / manager)
// ============================================================
function AddCreditDialog({
  open,
  onOpenChange,
  customerId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  customerId: string
}) {
  const mutate = useMutate()
  const queryClient = useQueryClient()
  const [amount, setAmount] = React.useState(0)
  const [note, setNote] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setAmount(0)
      setNote("")
      setError(null)
    }
  }, [open])

  const submit = async () => {
    setError(null)
    if (!Number.isFinite(amount) || amount === 0) {
      setError("مبلغ غیر از صفر وارد کنید (برای کسر از عدد منفی استفاده کنید)")
      return
    }
    setSubmitting(true)
    try {
      // Convert Toman → Rials before sending to the API (which stores Decimal Rials).
      const rials = tomanToRials(amount)
      await mutate(`/api/customers/${customerId}/credit-transactions`, "POST", {
        amount: rials,
        note: note.trim() || undefined,
      })
      toast.success("اعتبار تنظیم شد")
      queryClient.invalidateQueries({ queryKey: ["customer-detail", customerId] })
      queryClient.invalidateQueries({ queryKey: ["credit-txs", customerId] })
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      onOpenChange(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "تنظیم اعتبار ناموفق بود"
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>تنظیم دستی اعتبار</DialogTitle>
          <DialogDescription>
            افزود یا کسر اعتبار. برای کسر از مبلغ منفی استفاده کنید. مبلغ به تومان وارد می‌شود.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {error && (
            <div className="rounded-lg border border-rose-300/60 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-700/50 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="credit-amount">مبلغ (تومان)</Label>
            <TomanInput
              id="credit-amount"
              value={amount}
              onValueChange={setAmount}
              placeholder="مثلاً ۵۰۰٬۰۰۰ یا -۲۰۰٬۰۰۰"
            />
            {amount !== 0 && (
              <p className="text-xs text-muted-foreground">
                {amount > 0 ? "+" : ""}
                {formatRialsShort(tomanToRials(amount))} تومان
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="credit-note">یادداشت (اختیاری)</Label>
            <Input
              id="credit-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="دلیل تنظیم"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            انصراف
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            اعمال تغییر
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Manage tags popover (used in profile sheet)
// Local pending state, persisted on Save (single PATCH).
// ============================================================
function ManageTagsPopover({
  customerId,
  allTags,
  currentTags,
}: {
  customerId: string
  allTags: Tag[]
  currentTags: Tag[]
}) {
  const mutate = useMutate()
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState<string[]>([])
  const [saving, setSaving] = React.useState(false)

  const serverIds = currentTags.map((t) => t.id)
  const selected = open ? pending : serverIds
  const dirty = open && pending.join(",") !== serverIds.join(",")

  React.useEffect(() => {
    if (open) setPending(serverIds)
  }, [open])

  const save = async () => {
    setSaving(true)
    try {
      await mutate(`/api/customers/${customerId}`, "PATCH", { tagIds: pending })
      toast.success("تگ‌ها به‌روزرسانی شدند")
      queryClient.invalidateQueries({ queryKey: ["customer-detail", customerId] })
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      setOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "به‌روزرسانی تگ‌ها ناموفق بود")
    } finally {
      setSaving(false)
    }
  }

  const toggle = (id: string) => {
    setPending((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <TagIcon className="size-3.5" /> مدیریت تگ‌ها
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
          {selected.length} انتخاب شده
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {allTags.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              تگ‌ای موجود نیست
            </div>
          ) : (
            allTags.map((tag) => {
              const checked = selected.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggle(tag.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-accent"
                >
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded border"
                    style={{
                      backgroundColor: checked ? tag.color : "transparent",
                      borderColor: checked ? tag.color : "currentColor",
                      color: tag.color,
                    }}
                  >
                    {checked && <Check className="size-3 text-white" />}
                  </span>
                  <span className="flex-1 text-left">{tag.name}</span>
                </button>
              )
            })
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            انصراف
          </Button>
          <Button size="sm" onClick={save} disabled={saving || !dirty}>
            {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            ذخیره
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Projects section (in profile sheet) — shows ALL customer projects
// ============================================================
function CustomerProjectsSection({ customerId }: { customerId: string }) {
  const api = useApi()
  const role = useWorkspace((s) => s.role)
  const openProject = useWorkspace((s) => s.openProject)
  const seeBalance = role === "admin" || role === "manager" || role === "sales"

  const { data, isLoading } = useQuery({
    queryKey: ["customer-projects", customerId],
    queryFn: () => api.get<CustomerProjectsResponse>(`/api/customers/${customerId}/projects`),
    enabled: !!customerId,
  })

  const projects = data?.projects ?? []

  return (
    <SectionCard
      title="پروژه‌ها"
      description={
        projects.length === 0
          ? "این مشتری هنوز پروژه‌ای ندارد."
          : `مجموع ${projects.length} پروژه — پروژه‌های در حال انجام با پس‌زمینه کهربایی مشخص شده‌اند.`
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" /> در حال بارگذاری…
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
          هنوز پروژه‌ای ثبت نشده
        </div>
      ) : (
        <div className="max-h-96 space-y-1.5 overflow-y-auto pr-1">
          {projects.map((p) => {
            const isDelivered = p.status === "delivered"
            const statusColor = STATUS_COLORS[p.status as keyof typeof STATUS_COLORS] || "#64748b"
            const statusLabel = STATUS_LABELS[p.status as keyof typeof STATUS_LABELS] || p.status
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => openProject(p.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-right transition",
                  isDelivered
                    ? "border-border/60 bg-muted/20 opacity-70 hover:opacity-100"
                    : "border-amber-300/50 bg-amber-50 hover:bg-amber-100/70 dark:border-amber-700/40 dark:bg-amber-950/20"
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "truncate text-sm font-medium",
                          isDelivered && "line-through"
                        )}
                      >
                        {p.title}
                      </span>
                      {!isDelivered && (
                        <Badge
                          variant="outline"
                          className="shrink-0 border-amber-400/60 bg-amber-100/60 text-amber-700 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300"
                        >
                          در حال انجام
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {p.startDatetime ? formatDate(p.startDatetime) : "بدون تاریخ شروع"}
                      {p.contractNumber && ` · قرارداد ${p.contractNumber}`}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {seeBalance && p.balance !== null && (
                    <div className="text-left">
                      <div className="text-[10px] text-muted-foreground">مانده</div>
                      <div
                        className={cn(
                          "font-mono text-xs font-semibold",
                          p.balance > 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        {formatRialsShort(p.balance)} تومان
                      </div>
                    </div>
                  )}
                  <Badge
                    variant="outline"
                    className="shrink-0"
                    style={{
                      borderColor: statusColor + "60",
                      color: statusColor,
                      backgroundColor: statusColor + "14",
                    }}
                  >
                    {statusLabel}
                  </Badge>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}

// ============================================================
// Customer profile sheet
// ============================================================
// ============================================================
// Activity Timeline — aggregates all customer interactions
// ============================================================
interface ActivityItem {
  id: string
  type: "project_created" | "project_status" | "payment" | "note" | "credit" | "contract"
  title: string
  description: string
  date: string
  amount?: string | null
}

const ACTIVITY_CONFIG: Record<ActivityItem["type"], { icon: React.ElementType; color: string; label: string }> = {
  project_created: { icon: Clapperboard, color: "#a855f7", label: "پروژه" },
  project_status: { icon: CalendarDays, color: "#0ea5e9", label: "زمان‌بندی" },
  payment: { icon: CreditCard, color: "#10b981", label: "پرداخت" },
  note: { icon: StickyNote, color: "#f59e0b", label: "یادداشت" },
  credit: { icon: Award, color: "#8b5cf6", label: "اعتبار" },
  contract: { icon: FileText, color: "#64748b", label: "قرارداد" },
}

function ActivityTimeline({ customerId }: { customerId: string }) {
  const api = useApi()
  const { data, isLoading } = useQuery<{ items: ActivityItem[]; total: number }>({
    queryKey: ["customer-activity", customerId],
    queryFn: () => api.get(`/api/customers/${customerId}/activity`),
    enabled: !!customerId,
  })

  const items = data?.items ?? []

  return (
    <SectionCard
      title="خط زمانی تعاملات"
      description="آخرین فعالیت‌های این مشتری"
      actions={
        data?.total != null && data.total > 0 ? (
          <span className="text-[11px] text-muted-foreground">{toPersianDigits(data.total)} مورد</span>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <History className="mb-2 size-7 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">هنوز تعاملی ثبت نشده</p>
        </div>
      ) : (
        <div className="relative max-h-80 overflow-y-auto pl-1">
          {items.map((item, idx) => {
            const config = ACTIVITY_CONFIG[item.type]
            const Icon = config.icon
            const isLast = idx === items.length - 1
            return (
              <div key={item.id} className="relative flex gap-3 pb-3 last:pb-0">
                {/* Vertical connector */}
                {!isLast && (
                  <div className="absolute right-[15px] top-8 h-[calc(100%-0.5rem)] w-0.5 bg-border/60" />
                )}
                {/* Icon dot */}
                <div
                  className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full"
                  style={{ background: config.color + "18", color: config.color }}
                >
                  <Icon className="size-3.5" />
                </div>
                {/* Content */}
                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-semibold">{item.title}</span>
                        <Badge
                          variant="outline"
                          className="h-3.5 shrink-0 px-1 text-[8px]"
                          style={{ color: config.color, borderColor: config.color + "30" }}
                        >
                          {config.label}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <div className="shrink-0 text-left text-[10px] text-muted-foreground/70" dir="ltr">
                      {timeAgo(item.date)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}

function CustomerProfileSheet({
  customerId,
  onClose,
  onEdit,
}: {
  customerId: string
  onClose: () => void
  onEdit: (id: string) => void
}) {
  const api = useApi()
  const mutate = useMutate()
  const role = useWorkspace((s) => s.role)
  const openCustomer = useWorkspace((s) => s.openCustomer)
  const setPage = useWorkspace((s) => s.setPage)
  const queryClient = useQueryClient()

  const canSeeFinance = role === "admin" || role === "manager"
  const canManage = CAN_MANAGE_CUSTOMERS.includes(role)

  const { data: tagsData } = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get<unknown>("/api/tags"),
  })
  const allTags = React.useMemo(() => normalizeTags(tagsData), [tagsData])

  const { data: customer, isLoading, isError } = useQuery({
    queryKey: ["customer-detail", customerId],
    queryFn: () => api.get<CustomerDetail>(`/api/customers/${customerId}`),
    enabled: !!customerId,
    retry: false,
  })

  const [creditOpen, setCreditOpen] = React.useState(false)
  const [familyEditing, setFamilyEditing] = React.useState(false)
  const [familyDraft, setFamilyDraft] = React.useState<FamilyMeta>({ spouse: null, children: [] })
  const [savingFamily, setSavingFamily] = React.useState(false)
  const [lightboxOpen, setLightboxOpen] = React.useState(false)

  React.useEffect(() => {
    if (customer && canSeeFinance) {
      setFamilyDraft(parseFamilyMeta(customer.familyMeta))
      setFamilyEditing(false)
    }
  }, [customer, canSeeFinance])

  const saveFamily = async () => {
    if (!customer) return
    setSavingFamily(true)
    try {
      await mutate(`/api/customers/${customer.id}`, "PATCH", {
        familyMeta: serializeFamilyMeta(familyDraft),
      })
      toast.success("اطلاعات خانواده ذخیره شد")
      queryClient.invalidateQueries({ queryKey: ["customer-detail", customer.id] })
      setFamilyEditing(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ذخیره اطلاعات خانواده ناموفق بود")
    } finally {
      setSavingFamily(false)
    }
  }

  return (
    <>
      <Sheet open={!!customerId} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="right"
          className="w-full gap-0 sm:w-3/4 sm:max-w-2xl"
        >
          {/* Header */}
          <SheetHeader className="border-b px-6 py-5">
            <div className="flex items-start justify-between gap-3 pr-6">
              <div className="flex min-w-0 items-start gap-3">
                {customer && (
                  <CustomerAvatar
                    name={customer.name}
                    profileImage={customer.profileImage}
                    size="xl"
                    onClick={customer.profileImage ? () => setLightboxOpen(true) : undefined}
                  />
                )}
                <div className="min-w-0 space-y-1">
                  <SheetTitle className="text-xl">
                    {isLoading ? "در حال بارگذاری…" : customer?.name ?? "مشتری"}
                  </SheetTitle>
                  <SheetDescription className="flex flex-wrap items-center gap-2">
                    {customer && <TypeBadge type={customer.customerType} />}
                    {customer && (
                      <span className="inline-flex items-center gap-1 text-xs" dir="ltr">
                        <Phone className="size-3" />
                        {customer.phone}
                      </span>
                    )}
                    {customer && (
                      <span className="text-xs">
                        عضو از {formatDate(customer.createdAt)}
                      </span>
                    )}
                  </SheetDescription>
                  {customer && (customer.city || customer.address) && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {customer.city && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" /> {customer.city}
                        </span>
                      )}
                      {customer.address && (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="size-3" /> {customer.address}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {canManage && customer && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onClose()
                        setPage("projects")
                      }}
                      title="ایجاد پروژه برای این مشتری"
                    >
                      <Plus className="mr-1.5 size-3.5" /> پروژه جدید
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onEdit(customer.id)}>
                      <Pencil className="mr-1.5 size-3.5" /> ویرایش
                    </Button>
                  </>
                )}
              </div>
            </div>
          </SheetHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {isError ? (
              <EmptyState
                icon="🔍"
                title="مشتری یافت نشد"
                description="این مشتری ممکن است حذف شده باشد. ببندید و مورد دیگری از لیست انتخاب کنید."
              />
            ) : isLoading || !customer ? (
              <ProfileSkeleton />
            ) : (
              <div className="space-y-5">
                {/* Contact info: extra phones + dates */}
                <SectionCard title="اطلاعات تماس و تاریخ‌ها">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Phone className="mt-0.5 size-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          تلفن اصلی
                        </div>
                        <div className="mt-0.5 text-sm font-mono" dir="ltr">
                          {customer.phone}
                        </div>
                      </div>
                    </div>
                    {(customer.extraPhones ?? []).length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            شماره‌های تماس اضافی
                          </div>
                          <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {(customer.extraPhones ?? []).map((p, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between rounded-md border bg-muted/30 px-2 py-1"
                              >
                                <span className="text-xs text-muted-foreground">
                                  {p.label || "دیگر"}
                                </span>
                                <span className="text-sm font-mono" dir="ltr">
                                  {p.phone}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    {(customer.city || customer.address) && (
                      <>
                        <Separator />
                        <div className="grid grid-cols-1 gap-2">
                          {customer.city && (
                            <div className="rounded-md border bg-muted/30 px-2 py-1 text-xs">
                              <span className="text-muted-foreground">شهر: </span>
                              <span className="font-medium">{customer.city}</span>
                            </div>
                          )}
                          {customer.address && (
                            <div className="rounded-md border bg-muted/30 px-2 py-1 text-xs">
                              <span className="text-muted-foreground">نشانی: </span>
                              <span className="font-medium">{customer.address}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    {(customer.birthDate || customer.engagementDate || customer.weddingDate) && (
                      <>
                        <Separator />
                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            تاریخ‌های مهم
                          </div>
                          <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                            {customer.birthDate && (
                              <div className="rounded-md border bg-muted/30 px-2 py-1 text-xs">
                                <span className="text-muted-foreground">تولد: </span>
                                <span className="font-medium">{formatDate(customer.birthDate)}</span>
                              </div>
                            )}
                            {customer.engagementDate && (
                              <div className="rounded-md border bg-muted/30 px-2 py-1 text-xs">
                                <span className="text-muted-foreground">عقد: </span>
                                <span className="font-medium">{formatDate(customer.engagementDate)}</span>
                              </div>
                            )}
                            {customer.weddingDate && (
                              <div className="rounded-md border bg-muted/30 px-2 py-1 text-xs">
                                <span className="text-muted-foreground">ازدواج: </span>
                                <span className="font-medium">{formatDate(customer.weddingDate)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </SectionCard>

                {/* Custom fields (read-only display) */}
                <CustomFieldsDisplaySection customerId={customer.id} />

                {/* All projects section */}
                <CustomerProjectsSection customerId={customer.id} />

                {/* Referral network */}
                <SectionCard title="شبکه معرفی" description="چه کسی این مشتری را معرفی کرده و چه کسانی توسط او معرفی شده‌اند.">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Network className="mt-0.5 size-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          معرفی‌شده توسط
                        </div>
                        {customer.referrer ? (
                          <button
                            onClick={() => openCustomer(customer.referrer!.id)}
                            className="mt-1 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-sm font-medium text-primary transition hover:bg-accent"
                          >
                            <UserIcon className="size-3.5" />
                            {customer.referrer.name}
                            <span className="text-xs text-muted-foreground">{customer.referrer.phone}</span>
                          </button>
                        ) : (
                          <div className="mt-1 text-sm text-muted-foreground">بدون معرف</div>
                        )}
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        معرفی‌شده‌ها ({customer.referred.length})
                      </div>
                      {customer.referred.length === 0 ? (
                        <div className="mt-1 text-sm text-muted-foreground">هنوز معرفی‌ای وجود ندارد</div>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {customer.referred.map((r) => (
                            <button
                              key={r.id}
                              onClick={() => openCustomer(r.id)}
                              className="inline-flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1 text-xs font-medium transition hover:bg-accent"
                            >
                              <UserIcon className="size-3 text-muted-foreground" />
                              {r.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </SectionCard>

                {/* Tags */}
                <SectionCard
                  title="تگ‌ها"
                  actions={
                    canManage ? (
                      <ManageTagsPopover
                        customerId={customer.id}
                        allTags={allTags}
                        currentTags={customer.tags}
                      />
                    ) : null
                  }
                >
                  {customer.tags.length === 0 ? (
                    <div className="text-sm text-muted-foreground">تگی اختصاص داده نشده</div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {customer.tags.map((t) => (
                        <TagPill key={t.id} tag={t} />
                      ))}
                    </div>
                  )}
                </SectionCard>

                {/* Family metadata (admin/manager) */}
                {canSeeFinance && (
                  <SectionCard
                    title="اطلاعات خانواده"
                    description="همسر و فرزندان — برای هدیه‌ها و یادآوری‌ها استفاده می‌شود."
                    actions={
                      !familyEditing ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFamilyDraft(parseFamilyMeta(customer.familyMeta))
                            setFamilyEditing(true)
                          }}
                        >
                          <Pencil className="mr-1.5 size-3.5" /> ویرایش
                        </Button>
                      ) : null
                    }
                  >
                    {!familyEditing ? (
                      <FamilyMetaReadOnly data={parseFamilyMeta(customer.familyMeta)} />
                    ) : (
                      <div className="space-y-4">
                        <FamilyMetaEditor value={familyDraft} onChange={setFamilyDraft} />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFamilyEditing(false)
                              setFamilyDraft(parseFamilyMeta(customer.familyMeta))
                            }}
                            disabled={savingFamily}
                          >
                            انصراف
                          </Button>
                          <Button size="sm" onClick={saveFamily} disabled={savingFamily}>
                            {savingFamily && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                            ذخیره
                          </Button>
                        </div>
                      </div>
                    )}
                  </SectionCard>
                )}

                {/* Financials (admin/manager) */}
                {canSeeFinance && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <StatCard
                      label="جمع پرداخت‌ها"
                      value={formatRialsShort(customer.totalPaidAll ?? 0)}
                      sub={
                        <>
                          {formatRials(customer.totalPaidAll ?? 0) + " تومان"}
                          {(customer.totalPaidUsd ?? 0) > 0 && (
                            <span className="mr-1 text-[10px] text-emerald-600">
                              ≈ {toPersianDigits(customer.totalPaidUsd ?? 0)} دلار
                            </span>
                          )}
                        </>
                      }
                      icon={<TrendingUp className="size-4" />}
                      accent="#10b981"
                    />
                    <StatCard
                      label="بدهی به ما"
                      value={formatRialsShort(customer.debt ?? 0)}
                      sub={formatRials(customer.debt ?? 0) + " تومان"}
                      icon={<Receipt className="size-4" />}
                      accent="#ef4444"
                    />
                    <StatCard
                      label="موجودی اعتبار"
                      value={formatRialsShort(customer.creditBalance ?? 0)}
                      sub={formatRials(customer.creditBalance ?? 0) + " تومان"}
                      icon={<Wallet className="size-4" />}
                      accent="#f59e0b"
                    />
                    <StatCard
                      label="پروژه‌ها"
                      value={String(customer.projectsCount)}
                      sub={`${customer.contractsCount} قرارداد`}
                      icon={<FileText className="size-4" />}
                      accent="#0ea5e9"
                    />
                  </div>
                )}

                {/* Sales sees projects count only */}
                {!canSeeFinance && (
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="پروژه‌ها" value={String(customer.projectsCount)} icon={<FileText className="size-4" />} accent="#0ea5e9" />
                    <StatCard label="قراردادها" value={String(customer.contractsCount)} icon={<Receipt className="size-4" />} accent="#a855f7" />
                  </div>
                )}

                {/* Credit transactions (admin/manager) */}
                {canSeeFinance && (
                  <SectionCard
                    title="تراکنش‌های اعتبار"
                    description="پاداش‌ها، تنظیمات دستی و مصرف‌ها."
                    actions={
                      <Button variant="outline" size="sm" onClick={() => setCreditOpen(true)}>
                        <Plus className="mr-1.5 size-3.5" /> افزودن اعتبار دستی
                      </Button>
                    }
                  >
                    {(!customer.creditTxs || customer.creditTxs.length === 0) ? (
                      <div className="text-sm text-muted-foreground">تراکنش اعتباری وجود ندارد</div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-card text-xs text-muted-foreground">
                            <tr className="border-b">
                              <th className="py-2 pr-3 text-left font-medium">تاریخ</th>
                              <th className="py-2 pr-3 text-left font-medium">نوع</th>
                              <th className="py-2 pr-3 text-right font-medium">مبلغ</th>
                              <th className="py-2 text-left font-medium">یادداشت</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customer.creditTxs!.map((tx) => {
                              const positive = tx.amount > 0
                              const isUsed = tx.transactionType === "used"
                              const isNegative = isUsed || tx.amount < 0
                              return (
                                <tr key={tx.id} className="border-b last:border-0">
                                  <td className="py-2 pr-3 text-xs text-muted-foreground">
                                    {formatDateTime(tx.createdAt)}
                                  </td>
                                  <td className="py-2 pr-3">
                                    <CreditTxBadge type={tx.transactionType} />
                                  </td>
                                  <td
                                    className={cn(
                                      "py-2 pr-3 text-right font-mono text-sm font-semibold",
                                      isNegative ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                                    )}
                                  >
                                    {positive ? "+" : ""}
                                    {formatRials(tx.amount)}
                                  </td>
                                  <td className="py-2 text-xs text-muted-foreground">
                                    {tx.note || (tx.contractNumber ? `قرارداد ${tx.contractNumber}` : "—")}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </SectionCard>
                )}

                {/* Activity Timeline */}
                <ActivityTimeline customerId={customer.id} />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {customer && (
        <AddCreditDialog
          open={creditOpen}
          onOpenChange={setCreditOpen}
          customerId={customer.id}
        />
      )}

      <ImageLightbox
        src={customer?.profileImage ?? null}
        name={customer?.name ?? ""}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </>
  )
}

function FamilyMetaReadOnly({ data }: { data: FamilyMeta }) {
  if (!data.spouse && data.children.length === 0) {
    return <div className="text-sm text-muted-foreground">اطلاعات خانواده‌ای ثبت نشده</div>
  }
  return (
    <div className="space-y-3">
      {data.spouse && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
          <Heart className="size-4 text-rose-500" />
          <div className="flex-1">
            <div className="text-sm font-medium">{data.spouse.name || "—"}</div>
            {data.spouse.birth && (
              <div className="text-xs text-muted-foreground">
                متولد {formatDate(data.spouse.birth)}
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground">همسر</span>
        </div>
      )}
      {data.children.length > 0 && (
        <div className="space-y-1.5">
          {data.children.map((c, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
              <Baby className="size-4 text-emerald-500" />
              <div className="flex-1">
                <div className="text-sm font-medium">{c.name || "—"}</div>
                {c.birth && (
                  <div className="text-xs text-muted-foreground">
                    متولد {formatDate(c.birth)}
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground">فرزند</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  )
}

// ============================================================
// Column visibility popover (toolbar)
// ============================================================
function ColumnVisibilityPopover({
  state,
  onChange,
}: {
  state: Record<ColumnKey, boolean>
  onChange: (s: Record<ColumnKey, boolean>) => void
}) {
  const [open, setOpen] = React.useState(false)
  const toggle = (k: ColumnKey) => {
    const next = { ...state, [k]: !state[k] }
    onChange(next)
    saveColumnState(next)
  }
  const reset = () => {
    onChange({ ...DEFAULT_COLUMNS })
    saveColumnState({ ...DEFAULT_COLUMNS })
  }
  const visibleCount = Object.values(state).filter(Boolean).length
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" title="نمایش ستون‌ها" className="shrink-0 gap-1.5 whitespace-nowrap">
          <Settings2 className="size-3.5 text-muted-foreground" />
          <span className="text-xs">ستون‌ها</span>
          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
            {visibleCount}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-xs font-medium">نمایش ستون‌ها</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={reset}
          >
            پیش‌فرض
          </Button>
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {(Object.keys(COLUMN_LABELS) as ColumnKey[]).map((k) => (
            <label
              key={k}
              className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-accent"
            >
              <Checkbox
                checked={state[k]}
                onCheckedChange={() => toggle(k)}
              />
              <span className="flex-1">{COLUMN_LABELS[k]}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Money range filter popover (debt / credit)
// ============================================================
function MoneyRangePopover({
  label,
  icon,
  minValue,
  maxValue,
  onChange,
}: {
  label: string
  icon: React.ReactNode
  minValue: number
  maxValue: number
  onChange: (min: number, max: number) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [localMin, setLocalMin] = React.useState(minValue)
  const [localMax, setLocalMax] = React.useState(maxValue)

  React.useEffect(() => {
    if (open) {
      setLocalMin(minValue)
      setLocalMax(maxValue)
    }
  }, [open, minValue, maxValue])

  const hasFilter = minValue > 0 || maxValue > 0
  const apply = () => {
    onChange(localMin, localMax)
    setOpen(false)
  }
  const clear = () => {
    setLocalMin(0)
    setLocalMax(0)
    onChange(0, 0)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={hasFilter ? "default" : "outline"}
          className="shrink-0 gap-1.5 whitespace-nowrap"
          title={label}
        >
          {icon}
          <span className="text-xs">{label}</span>
          {hasFilter && (
            <span className="mr-1 inline-flex h-1.5 w-1.5 rounded-full bg-primary-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <div className="mb-2 text-xs font-semibold">{label} (تومان)</div>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">حداقل</Label>
            <TomanInput
              value={localMin}
              onValueChange={setLocalMin}
              placeholder="۰"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">حداکثر</Label>
            <TomanInput
              value={localMax}
              onValueChange={setLocalMax}
              placeholder="۰"
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={clear} className="text-xs">
            پاک کردن
          </Button>
          <Button size="sm" onClick={apply}>
            اعمال
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Customer row (with column visibility)
// ============================================================
function CustomerRow({
  customer,
  visible,
  canSeeFinance,
  canManage,
  isAdmin,
  onEdit,
  onDelete,
  onImageClick,
}: {
  customer: CustomerListItem
  visible: Record<ColumnKey, boolean>
  canSeeFinance: boolean
  canManage: boolean
  isAdmin: boolean
  onEdit: (id: string) => void
  onDelete: (c: CustomerListItem) => void
  onImageClick: (c: CustomerListItem) => void
}) {
  const openCustomer = useWorkspace((s) => s.openCustomer)
  const visibleTags = customer.tags.slice(0, 3)
  const extraTags = customer.tags.length - visibleTags.length
  const debt = customer.debt ?? 0
  const credit = customer.credit ?? customer.creditBalance ?? 0
  const revenue = customer.totalRevenue ?? 0

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 transition hover:bg-accent/40">
      {/* Profile image (always rendered as the first cell, toggled) */}
      {visible.profileImage ? (
        <CustomerAvatar
          name={customer.name}
          profileImage={customer.profileImage}
          size="sm"
          onClick={customer.profileImage ? () => onImageClick(customer) : undefined}
        />
      ) : (
        <div className="size-1" aria-hidden />
      )}

      {/* Name + meta */}
      <button
        onClick={() => openCustomer(customer.id)}
        className="flex min-w-0 flex-1 items-center gap-2 text-right"
      >
        <div className="min-w-0 flex-1">
          {visible.name && (
            <span className="block truncate text-sm font-medium">{customer.name}</span>
          )}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {visible.phone && (
              <span dir="ltr" className="font-mono">{customer.phone}</span>
            )}
            {visible.city && customer.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" /> {customer.city}
              </span>
            )}
            {visible.address && customer.address && (
              <span className="inline-flex max-w-[180px] items-center gap-1 truncate">
                <Building2 className="size-3 shrink-0" />
                <span className="truncate">{customer.address}</span>
              </span>
            )}
            {visible.birthDate && customer.birthDate && (
              <span>تولد: {formatDate(customer.birthDate)}</span>
            )}
            {visible.engagementDate && customer.engagementDate && (
              <span>عقد: {formatDate(customer.engagementDate)}</span>
            )}
            {visible.weddingDate && customer.weddingDate && (
              <span>ازدواج: {formatDate(customer.weddingDate)}</span>
            )}
            {visible.customerType && <TypeBadge type={customer.customerType} />}
            {visible.tags && (
              <span className="inline-flex items-center gap-1">
                {visibleTags.length === 0 ? (
                  <span>—</span>
                ) : (
                  visibleTags.map((t) => <TagPill key={t.id} tag={t} />)
                )}
                {extraTags > 0 && <span>+{extraTags}</span>}
              </span>
            )}
            {visible.totalProjects && (
              <span>پروژه‌ها: {customer.totalProjects}</span>
            )}
            {visible.totalRevenue && canSeeFinance && (
              <span>درآمد: {formatRialsShort(revenue)} ت</span>
            )}
            {visible.debt && canSeeFinance && (
              <span
                className={cn(
                  "font-mono",
                  debt > 0 && "text-rose-600 dark:text-rose-400"
                )}
              >
                بدهی: {formatRialsShort(debt)} {debt > 0 && "ت"}
              </span>
            )}
            {visible.credit && canSeeFinance && (
              <span
                className={cn(
                  "font-mono",
                  credit > 0 && "text-amber-600 dark:text-amber-400"
                )}
              >
                اعتبار: {formatRialsShort(credit)} {credit > 0 && "ت"}
              </span>
            )}
            {visible.lastInteraction && (
              <span>{customer.lastInteraction ? timeAgo(customer.lastInteraction) : "—"}</span>
            )}
          </div>
        </div>
      </button>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => openCustomer(customer.id)}>
              <Eye className="mr-2 size-3.5" /> مشاهده پروفایل
            </DropdownMenuItem>
            {canManage && (
              <DropdownMenuItem onClick={() => onEdit(customer.id)}>
                <Pencil className="mr-2 size-3.5" /> ویرایش
              </DropdownMenuItem>
            )}
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-rose-600 focus:text-rose-700"
                  onClick={() => onDelete(customer)}
                >
                  <Trash2 className="mr-2 size-3.5" /> حذف
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// ============================================================
// Main view
// ============================================================
// ============================================================
// Customer Stats Bar — compact summary at top of customers list
// ============================================================
interface CustomerStats {
  totalCustomers: number
  totalDebt: number
  totalCredit: number
  newThisMonth: number
  individualCount: number
  companyCount: number
}

function CustomerStatsBar() {
  const api = useApi()
  const apiRef = React.useRef(api)
  React.useEffect(() => { apiRef.current = api }, [api])
  const { data, isLoading } = useQuery<CustomerStats>({
    queryKey: ["customer-stats"],
    queryFn: () => apiRef.current.get("/api/customers/stats"),
  })

  if (isLoading || !data) {
    return (
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  const stats = [
    {
      label: "کل مشتریان",
      value: toPersianDigits(data.totalCustomers),
      sub: `${toPersianDigits(data.individualCount)} حقیقی · ${toPersianDigits(data.companyCount)} حقوقی`,
      icon: Users,
      accent: "#0ea5e9",
    },
    {
      label: "بدهی کل",
      value: `${formatRialsShort(data.totalDebt)}`,
      sub: "مانده قابل دریافت",
      icon: AlertCircle,
      accent: "#ef4444",
    },
    {
      label: "اعتبار کل",
      value: `${formatRialsShort(data.totalCredit)}`,
      sub: "اعتبار مشتریان",
      icon: Wallet,
      accent: "#10b981",
    },
    {
      label: "جدید این ماه",
      value: toPersianDigits(data.newThisMonth),
      sub: "مشتری جدید",
      icon: UserPlus,
      accent: "#a855f7",
    },
  ]

  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map((s, i) => {
        const Icon = s.icon
        return (
          <div
            key={i}
            className="group relative overflow-hidden rounded-xl border bg-card p-3 shadow-sm transition-all hover:shadow-md"
            style={{ borderTopColor: s.accent, borderTopWidth: 2 }}
          >
            {/* Gradient blob */}
            <div
              className="pointer-events-none absolute -left-6 -top-6 size-16 rounded-full opacity-10 blur-2xl transition-opacity group-hover:opacity-20"
              style={{ background: s.accent }}
            />
            <div className="relative flex items-center gap-2.5">
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-lg shadow-sm transition-transform group-hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, ${s.accent}28, ${s.accent}10)`,
                  color: s.accent,
                  border: `1px solid ${s.accent}20`,
                }}
              >
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-medium text-muted-foreground">{s.label}</div>
                <div className="truncate text-sm font-bold text-foreground">
                  {(s.label.includes("بدهی") || s.label.includes("اعتبار")) ? (
                    <>
                      <span>{s.value.split(" ")[0]}</span>
                      <span className="mr-1 text-[9px] font-normal text-muted-foreground">
                        {s.value.split(" ").slice(1).join(" ")} تومان
                      </span>
                    </>
                  ) : (
                    s.value
                  )}
                </div>
                <div className="truncate text-[9px] text-muted-foreground">{s.sub}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function CustomersView() {
  const api = useApi()
  const role = useWorkspace((s) => s.role)
  const activeCustomerId = useWorkspace((s) => s.activeCustomerId)
  const setPageState = useWorkspace.setState
  const mutate = useMutate()
  const queryClient = useQueryClient()

  const canManage = CAN_MANAGE_CUSTOMERS.includes(role)
  const canSeeFinance = role === "admin" || role === "manager"
  const isAdmin = role === "admin"

  // Column visibility state (localStorage-backed)
  const [columns, setColumns] = React.useState<Record<ColumnKey, boolean>>(() =>
    loadColumnState()
  )
  // Re-hydrate on mount (in case SSR returned defaults)
  React.useEffect(() => {
    setColumns(loadColumnState())
  }, [])

  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>([])
  const [typeFilter, setTypeFilter] = React.useState<"all" | "individual" | "company">("all")
  const [sort, setSort] = React.useState<SortKey>("default")
  // Money range filters (Toman)
  const [debtMin, setDebtMin] = React.useState(0)
  const [debtMax, setDebtMax] = React.useState(0)
  const [creditMin, setCreditMin] = React.useState(0)
  const [creditMax, setCreditMax] = React.useState(0)
  // City filter (city name string)
  const [cityFilter, setCityFilter] = React.useState<string>("all")
  const [page, setPage] = React.useState(1)
  const limit = 10

  const [formOpen, setFormOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<CustomerListItem | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)
  const [lightbox, setLightbox] = React.useState<{ src: string; name: string } | null>(null)

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const { data: tagsData } = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get<unknown>("/api/tags"),
  })
  const allTags = React.useMemo(() => normalizeTags(tagsData), [tagsData])

  const { data: citiesData } = useCities()
  const cities = React.useMemo(() => normalizeCities(citiesData), [citiesData])

  const queryKey = [
    "customers",
    debouncedSearch,
    selectedTagIds.join(","),
    typeFilter,
    sort,
    cityFilter,
    debtMin,
    debtMax,
    creditMin,
    creditMax,
    page,
  ]
  const { data, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (selectedTagIds.length) params.set("tagId", selectedTagIds.join(","))
      if (typeFilter !== "all") params.set("type", typeFilter)
      if (sort !== "default") params.set("sort", sort)
      if (cityFilter !== "all") params.set("city", cityFilter)
      if (debtMin > 0) params.set("debtMin", String(debtMin))
      if (debtMax > 0) params.set("debtMax", String(debtMax))
      if (creditMin > 0) params.set("creditMin", String(creditMin))
      if (creditMax > 0) params.set("creditMax", String(creditMax))
      return api.get<CustomerListResponse>(`/api/customers?${params.toString()}`)
    },
    enabled: canManage,
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const openForm = (id: string | null) => {
    setEditingId(id)
    setFormOpen(true)
  }

  const closeSheet = () => setPageState({ activeCustomerId: null })

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await mutate(`/api/customers/${deleteTarget.id}`, "DELETE")
      toast.success("مشتری حذف شد")
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      setDeleteTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "حذف مشتری ناموفق بود")
    } finally {
      setDeleting(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch("/api/customers/export", {
        headers: { "x-demo-role": role },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = (data as { error?: string })?.error || `خطای درخواست (${res.status})`
        throw new Error(msg)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "customers.csv"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("خروجی Excel با موفقیت دانلود شد")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خروجی Excel ناموفق بود")
    } finally {
      setExporting(false)
    }
  }

  const hasMoneyFilter =
    debtMin > 0 || debtMax > 0 || creditMin > 0 || creditMax > 0
  const hasFilters =
    !!debouncedSearch ||
    selectedTagIds.length > 0 ||
    typeFilter !== "all" ||
    cityFilter !== "all" ||
    hasMoneyFilter

  const clearAllFilters = () => {
    setSearch("")
    setSelectedTagIds([])
    setTypeFilter("all")
    setCityFilter("all")
    setDebtMin(0)
    setDebtMax(0)
    setCreditMin(0)
    setCreditMax(0)
    setSort("default")
    setPage(1)
  }

  if (!canManage) {
    return (
      <div>
        <PageHeader
          title="مشتریان"
          description="لیست مشتریان و شبکه معرفی شما"
          icon="👤"
        />
        <EmptyState
          icon="🔒"
          title="دسترسی محدود"
          description="نقش فعلی شما اجازه مشاهده لیست مشتریان را ندارد."
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="مشتریان"
        description="لیست مشتریان، تصویر پروفایل، شهر/نشانی، بدهی/اعتبار و شبکه معرفی"
        icon="👤"
        actions={
          canManage && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={exporting}
                title="دانلود فایل CSV با هدرهای فارسی (سازگار با Excel)"
              >
                {exporting ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <Download className="mr-1.5 size-4" />
                )}
                خروجی Excel
              </Button>
              <Button onClick={() => openForm(null)}>
                <Plus className="mr-1.5 size-4" /> مشتری جدید
              </Button>
            </div>
          )
        }
      />

      {/* Quick Stats Bar */}
      <CustomerStatsBar />

      {/* Toolbar */}
      <div className="mb-4 space-y-3">
        {/* Row 1: prominent search bar (full width on its own row) */}
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی مشتری بر اساس نام یا تلفن…"
              className="h-12 pr-11 text-base"
              autoFocus={false}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label="پاک کردن جستجو"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: secondary filters (tags, type, city, debt range, credit range, sort, columns) */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-sm">
          <TagsMultiSelect
            allTags={allTags}
            selected={selectedTagIds}
            onChange={(v) => {
              setSelectedTagIds(v)
              setPage(1)
            }}
            align="start"
            trigger={
              <Button variant="outline" className="justify-between gap-2 font-normal">
                <TagIcon className="size-3.5 text-muted-foreground" />
                <span className="truncate">
                  {selectedTagIds.length === 0
                    ? "همه تگ‌ها"
                    : `${selectedTagIds.length} تگ`}
                </span>
                <ChevronDown className="size-4 opacity-50" />
              </Button>
            }
          />

          <Select
            value={typeFilter}
            onValueChange={(v) => {
              setTypeFilter(v as typeof typeFilter)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full justify-between gap-2 sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه نوع‌ها</SelectItem>
              <SelectItem value="individual">👤 حقیقی</SelectItem>
              <SelectItem value="company">🏢 حقوقی</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={cityFilter}
            onValueChange={(v) => {
              setCityFilter(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full justify-between gap-2 sm:w-[150px]">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-muted-foreground" />
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه شهرها</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name}
                  {c.province ? ` · ${c.province}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canSeeFinance && (
            <MoneyRangePopover
              label="بدهی"
              icon={<Receipt className="size-3.5 text-muted-foreground" />}
              minValue={debtMin}
              maxValue={debtMax}
              onChange={(mn, mx) => {
                setDebtMin(mn)
                setDebtMax(mx)
                setPage(1)
              }}
            />
          )}

          {canSeeFinance && (
            <MoneyRangePopover
              label="اعتبار"
              icon={<Wallet className="size-3.5 text-muted-foreground" />}
              minValue={creditMin}
              maxValue={creditMax}
              onChange={(mn, mx) => {
                setCreditMin(mn)
                setCreditMax(mx)
                setPage(1)
              }}
            />
          )}

          {canSeeFinance && (
            <Select
              value={sort}
              onValueChange={(v) => {
                setSort(v as SortKey)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full justify-between gap-2 sm:w-[170px]">
                <span className="flex items-center gap-1.5">
                  <ArrowDownUp className="size-3.5 text-muted-foreground" />
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">آخرین تعامل</SelectItem>
                <SelectItem value="name_asc">نام (الفبا)</SelectItem>
                <SelectItem value="name_desc">نام (معکوس)</SelectItem>
                <SelectItem value="debt_desc">بیشترین بدهی</SelectItem>
                <SelectItem value="credit_desc">بیشترین اعتبار</SelectItem>
              </SelectContent>
            </Select>
          )}

          <div className="ml-auto">
            <ColumnVisibilityPopover state={columns} onChange={setColumns} />
          </div>
        </div>

        {/* Active filter chips */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Filter className="size-3" /> فیلترهای فعال:
            </span>
            {debouncedSearch && (
              <Badge variant="secondary" className="gap-1">
                جستجو: {debouncedSearch}
                <button
                  onClick={() => setSearch("")}
                  className="opacity-60 hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {selectedTagIds.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                {selectedTagIds.length} تگ
                <button
                  onClick={() => setSelectedTagIds([])}
                  className="opacity-60 hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {typeFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                نوع: {typeFilter === "individual" ? "حقیقی" : "حقوقی"}
                <button
                  onClick={() => setTypeFilter("all")}
                  className="opacity-60 hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {cityFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                شهر: {cityFilter}
                <button
                  onClick={() => setCityFilter("all")}
                  className="opacity-60 hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {debtMin > 0 && (
              <Badge variant="secondary" className="gap-1">
                بدهی ≥ {formatRials(tomanToRials(debtMin))} ت
                <button
                  onClick={() => setDebtMin(0)}
                  className="opacity-60 hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {debtMax > 0 && (
              <Badge variant="secondary" className="gap-1">
                بدهی ≤ {formatRials(tomanToRials(debtMax))} ت
                <button
                  onClick={() => setDebtMax(0)}
                  className="opacity-60 hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {creditMin > 0 && (
              <Badge variant="secondary" className="gap-1">
                اعتبار ≥ {formatRials(tomanToRials(creditMin))} ت
                <button
                  onClick={() => setCreditMin(0)}
                  className="opacity-60 hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            {creditMax > 0 && (
              <Badge variant="secondary" className="gap-1">
                اعتبار ≤ {formatRials(tomanToRials(creditMax))} ت
                <button
                  onClick={() => setCreditMax(0)}
                  className="opacity-60 hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-6 px-2 text-[11px]"
            >
              <X className="mr-1 size-3" /> پاک کردن همه
            </Button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="size-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-7 w-7" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="👤"
            title={hasFilters ? "مشتری‌ای با فیلترهای شما مطابقت ندارد" : "هنوز مشتری‌ای وجود ندارد"}
            description={
              hasFilters
                ? "جستجو یا فیلترها را تغییر دهید."
                : canManage
                ? "برای شروع، اولین مشتری خود را ایجاد کنید."
                : undefined
            }
          />
        ) : (
          <div className="relative divide-y">
            {isFetching && (
              <div className="absolute left-0 right-0 top-0 z-10 h-0.5 bg-primary/40" />
            )}
            {items.map((c) => (
              <CustomerRow
                key={c.id}
                customer={c}
                visible={columns}
                canSeeFinance={canSeeFinance}
                canManage={canManage}
                isAdmin={isAdmin}
                onEdit={openForm}
                onDelete={setDeleteTarget}
                onImageClick={(cust) =>
                  cust.profileImage
                    ? setLightbox({ src: cust.profileImage, name: cust.name })
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="text-xs text-muted-foreground">
            نمایش {(page - 1) * limit + 1}–{Math.min(page * limit, total)} از {total}{" "}
            مشتری
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              قبلی
            </Button>
            <span className="text-xs text-muted-foreground">
              صفحه {page} از {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              بعدی
            </Button>
          </div>
        </div>
      )}

      {/* Profile sheet */}
      {activeCustomerId && (
        <CustomerProfileSheet
          customerId={activeCustomerId}
          onClose={closeSheet}
          onEdit={(id) => {
            closeSheet()
            openForm(id)
          }}
        />
      )}

      {/* Form dialog */}
      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customerId={editingId}
        onSaved={(id) => {
          // Open (or reopen) the customer's profile sheet after save.
          useWorkspace.getState().openCustomer(id)
        }}
      />

      {/* Image lightbox (list-level) */}
      <ImageLightbox
        src={lightbox?.src ?? null}
        name={lightbox?.name ?? ""}
        open={!!lightbox}
        onOpenChange={(o) => !o && setLightbox(null)}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف مشتری؟</AlertDialogTitle>
            <AlertDialogDescription>
              این عمل{" "}
              <span className="font-medium text-foreground">{deleteTarget?.name}</span> را برای همیشه حذف می‌کند.
              مشتری دارای قرارداد یا پروژه قابل حذف نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deleting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

