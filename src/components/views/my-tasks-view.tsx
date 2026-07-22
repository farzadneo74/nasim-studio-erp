"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  rectIntersection,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type CollisionDetection,
  type PointerActivationConstraint,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  CheckCircle2,
  Circle,
  Clock,
  Timer,
  Calendar as CalendarIcon,
  FolderKanban,
  Briefcase,
  Loader2,
  Camera,
  Film,
  Truck,
  ChevronRight,
  Pencil,
  Check,
  X,
  Plus,
  Trash2,
  MoreVertical,
  GripVertical,
  Flag,
  Tag,
  Bell,
  User as UserIcon,
  CheckCheck,
  AlertTriangle,
  Camera as CameraIcon,
  ArrowLeft,
  Move,
} from "lucide-react"

import { useWorkspace } from "@/stores/workspace"
import { useApi } from "@/lib/api/client"
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  ROLE_LABELS,
  type TaskStatus,
  type Role,
} from "@/lib/constants"
import { cn } from "@/lib/utils"
import { formatDate, toPersianDigits } from "@/lib/format"

import { PageHeader, StatCard, EmptyState, SectionCard } from "./_shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { JalaliDatePicker } from "./_jalali-date-picker/jalali-date-picker"

// ============================================================
// Types
// ============================================================
interface KanbanCardData {
  id: string
  columnId: string
  title: string
  description: string | null
  order: number
  priority: string
  dueDate: string | null
  labels: string[]
  linkType: string | null
  linkId: string | null
  completed: boolean
  assignedToName: string | null
  notifyUserId: string | null
  notifyUserName: string | null
  notifiedAt: string | null
  sourceProjectId: string | null
  sourceCustomerId: string | null
  createdAt: string
  updatedAt: string
}
interface KanbanColumnData {
  id: string
  title: string
  color: string
  order: number
  cards: KanbanCardData[]
}
interface KanbanResponse {
  columns: KanbanColumnData[]
}
interface KanbanOptionsUser {
  id: string
  fullName: string
  role: string
  roleLabel: string
  isAvailable: boolean
}
interface KanbanOptionsProject {
  id: string
  contractNumber: string
  customerId: string
  customerName: string
  packageTitle: string
  status: string
}
interface KanbanOptionsCustomer {
  id: string
  name: string
  phone: string
}
interface KanbanOptions {
  users: KanbanOptionsUser[]
  projects: KanbanOptionsProject[]
  customers: KanbanOptionsCustomer[]
}

// Legacy: my-tasks API (project tasks assigned to me + my projects)
interface MyUser {
  id: string
  firstName: string
  lastName: string
  fullName: string
  role: string
  isAvailable: boolean
}
interface MyTask {
  id: string
  title: string
  status: string
  order: number
  deadline: string | null
  estimatedMinutes: number | null
  actualMinutes: number | null
  createdAt: string | null
  project: {
    id: string
    status: string
    contractNumber: string
    customerName: string
    packageTitle: string
    category: string
    deliveryDeadline: string | null
    startDatetime: string | null
  }
}
interface MyProject {
  id: string
  contractNumber: string
  customerId: string
  customerName: string
  packageTitle: string
  category: string
  status: string
  startDatetime: string | null
  deliveryDeadline: string | null
  myTeamTypes: string[]
}
interface MyTasksResponse {
  user: MyUser | null
  tasks: MyTask[]
  projects: MyProject[]
}

// ============================================================
// Constants
// ============================================================
const PRIORITY_OPTIONS: { value: string; label: string; color: string }[] = [
  { value: "none", label: "بدون اولویت", color: "#64748b" },
  { value: "low", label: "کم", color: "#0ea5e9" },
  { value: "medium", label: "متوسط", color: "#f59e0b" },
  { value: "high", label: "بالا", color: "#ef4444" },
]
const COLUMN_COLORS = [
  "#64748b",
  "#f59e0b",
  "#22c55e",
  "#0ea5e9",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f43f5e",
  "#84cc16",
  "#eab308",
]

function priorityCfg(value: string) {
  return PRIORITY_OPTIONS.find((p) => p.value === value) || PRIORITY_OPTIONS[0]
}

function isOverdue(dueDate: string | null, completed: boolean): boolean {
  if (!dueDate || completed) return false
  // Compare day-only (YYYY-MM-DD) so a due date of "today" isn't flagged overdue.
  const d = new Date(dueDate)
  const today = new Date()
  const dueDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  return dueDay < todayDay
}

// ============================================================
// useMutate hook (with role header)
// ============================================================
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

// ============================================================
// Color picker popover (for column color)
// ============================================================
function ColorPickerPopover({
  color,
  onChange,
  children,
  align = "start",
}: {
  color: string
  onChange: (c: string) => void
  children: React.ReactNode
  align?: "start" | "center" | "end"
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-3">
        <div className="grid grid-cols-5 gap-2">
          {COLUMN_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onChange(c)
                setOpen(false)
              }}
              className={cn(
                "size-7 rounded-full ring-offset-2 ring-offset-background transition hover:scale-110",
                color === c && "ring-2 ring-primary"
              )}
              style={{ background: c }}
              aria-label={`رنگ ${c}`}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Priority badge
// ============================================================
function PriorityBadge({ priority }: { priority: string }) {
  if (!priority || priority === "none") return null
  const cfg = priorityCfg(priority)
  return (
    <Badge
      variant="outline"
      className="h-5 gap-0.5 px-1.5 text-[10px]"
      style={{
        color: cfg.color,
        borderColor: cfg.color + "60",
        backgroundColor: cfg.color + "14",
      }}
    >
      <Flag className="size-2.5" />
      {cfg.label}
    </Badge>
  )
}

// ============================================================
// Multi-link chips (clickable customer + project badges on a card)
// ============================================================
function MultiLinkChips({
  card,
  options,
}: {
  card: KanbanCardData
  options?: KanbanOptions
}) {
  const openCustomer = useWorkspace((s) => s.openCustomer)
  const openProject = useWorkspace((s) => s.openProject)
  const { customerId, projectId } = parseMultiLink(card)

  if (!customerId && !projectId) return null

  const chips: React.ReactNode[] = []

  if (customerId) {
    const c = options?.customers.find((x) => x.id === customerId)
    if (c) {
      chips.push(
        <button
          key={`cust-${customerId}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            openCustomer(customerId)
          }}
          className="inline-flex max-w-full items-center gap-1 rounded-md border bg-muted/50 px-1.5 py-0.5 text-[10px] transition hover:bg-muted"
          title={`${c.name} · ${c.phone}`}
        >
          <UserIcon className="size-2.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{c.name}</span>
        </button>
      )
    }
  }

  if (projectId) {
    const p = options?.projects.find((x) => x.id === projectId)
    if (p) {
      chips.push(
        <button
          key={`proj-${projectId}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            openProject(projectId)
          }}
          className="inline-flex max-w-full items-center gap-1 rounded-md border bg-muted/50 px-1.5 py-0.5 text-[10px] transition hover:bg-muted"
          title={`${p.contractNumber} · ${p.customerName}`}
        >
          <Briefcase className="size-2.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{p.contractNumber}</span>
        </button>
      )
    }
  }

  if (chips.length === 0) return null
  return <>{chips}</>
}

// ============================================================
// Multi-link helpers (customer + project, both independent)
// ============================================================
interface MultiLink {
  customerId: string | null
  projectId: string | null
}

function parseMultiLink(card: { linkType: string | null; linkId: string | null; sourceProjectId?: string | null; sourceCustomerId?: string | null }): MultiLink {
  // First check explicit multi-link
  if (card.linkType && card.linkId) {
    if (card.linkType === "multi") {
      try {
        const parsed = JSON.parse(card.linkId) as Partial<MultiLink>
        return {
          customerId: typeof parsed.customerId === "string" ? parsed.customerId : null,
          projectId: typeof parsed.projectId === "string" ? parsed.projectId : null,
        }
      } catch {
        // fall through
      }
    }
    // Legacy formats
    if (card.linkType === "customer") return { customerId: card.linkId, projectId: null }
    if (card.linkType === "project") return { customerId: null, projectId: card.linkId }
  }
  // Fall back to sourceProjectId / sourceCustomerId (from workflow assignment)
  if (card.sourceProjectId || card.sourceCustomerId) {
    return {
      customerId: card.sourceCustomerId ?? null,
      projectId: card.sourceProjectId ?? null,
    }
  }
  return { customerId: null, projectId: null }
}

function hasMultiLink(card: { linkType: string | null; linkId: string | null; sourceProjectId?: string | null; sourceCustomerId?: string | null }): boolean {
  const { customerId, projectId } = parseMultiLink(card)
  return Boolean(customerId || projectId)
}

function serializeMultiLink(link: MultiLink): { linkType: string | null; linkId: string | null } {
  if (!link.customerId && !link.projectId) return { linkType: null, linkId: null }
  return {
    linkType: "multi",
    linkId: JSON.stringify({ customerId: link.customerId, projectId: link.projectId }),
  }
}

// ============================================================
// Card editor dialog
// ============================================================
interface CardEditorState {
  title: string
  description: string
  priority: string
  dueDate: string | null
  labels: string[]
  customerId: string | null
  projectId: string | null
}
const EMPTY_CARD: CardEditorState = {
  title: "",
  description: "",
  priority: "none",
  dueDate: null,
  labels: [],
  customerId: null,
  projectId: null,
}

function CardEditorDialog({
  open,
  mode,
  initial,
  options,
  onOpenChange,
  onSave,
  saving,
}: {
  open: boolean
  mode: "create" | "edit"
  initial: CardEditorState | null
  options?: KanbanOptions
  onOpenChange: (o: boolean) => void
  onSave: (state: CardEditorState) => void
  saving: boolean
}) {
  const [form, setForm] = React.useState<CardEditorState>(EMPTY_CARD)
  const [labelDraft, setLabelDraft] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setForm(initial ? { ...initial } : EMPTY_CARD)
      setLabelDraft("")
    }
  }, [open, initial])

  function addLabel() {
    const v = labelDraft.trim()
    if (!v) return
    if (form.labels.includes(v)) {
      setLabelDraft("")
      return
    }
    setForm((f) => ({ ...f, labels: [...f.labels, v] }))
    setLabelDraft("")
  }

  function removeLabel(l: string) {
    setForm((f) => ({ ...f, labels: f.labels.filter((x) => x !== l) }))
  }

  function handleSave() {
    if (!form.title.trim()) {
      toast.error("عنوان کارت الزامی است")
      return
    }
    onSave(form)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "کارت جدید" : "ویرایش کارت"}</DialogTitle>
          <DialogDescription>
            عنوان، توضیحات، اولویت، زمان تحویل، برچسب‌ها و پیوند به پروژه/مشتری را وارد کنید.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="card-title">عنوان <span className="text-rose-500">*</span></Label>
            <Input
              id="card-title"
              autoFocus
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="مثلاً: تماس با مشتری برای تأیید زمان"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave()
              }}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="card-desc">توضیحات</Label>
            <Textarea
              id="card-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="جزئیات کار…"
            />
          </div>

          {/* Priority + Due date */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>اولویت</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="inline-flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: p.color }} />
                        {p.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>زمان تحویل (جلالی)</Label>
              <JalaliDatePicker
                value={form.dueDate}
                onChange={(iso) => setForm((f) => ({ ...f, dueDate: iso }))}
                placeholder="انتخاب تاریخ"
              />
            </div>
          </div>

          {/* Labels */}
          <div className="space-y-1.5">
            <Label>برچسب‌ها</Label>
            <div className="flex gap-1.5">
              <Input
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                placeholder="برچسب را بنویسید و Enter بزنید"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addLabel()
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addLabel} disabled={!labelDraft.trim()}>
                <Plus className="size-3.5" />
              </Button>
            </div>
            {form.labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.labels.map((l) => (
                  <Badge key={l} variant="secondary" className="gap-1 text-[11px]">
                    <Tag className="size-2.5" />
                    {l}
                    <button
                      type="button"
                      onClick={() => removeLabel(l)}
                      className="rounded-full p-0.5 hover:bg-foreground/10"
                      aria-label={`حذف ${l}`}
                    >
                      <X className="size-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Link — independent customer + project comboboxes (free fields) */}
          <div className="space-y-2">
            <Label>پیوند (اختیاری)</Label>
            <CustomerCombobox
              value={form.customerId}
              onChange={(id) => setForm((f) => ({ ...f, customerId: id }))}
              options={options}
            />
            <ProjectCombobox
              value={form.projectId}
              onChange={(id) => setForm((f) => ({ ...f, projectId: id }))}
              customerId={form.customerId}
              options={options}
            />
            <p className="text-[11px] text-muted-foreground">
              مشتری و پروژه مستقل هستند — می‌توانید هرکدام، هردو یا هیچ‌کدام را انتخاب کنید.
              هنگام انتخاب مشتری، فهرست پروژه‌ها به پروژه‌های همان مشتری محدود می‌شود.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            انصراف
          </Button>
          <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
            {saving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
            {mode === "create" ? "افزودن کارت" : "ذخیره تغییرات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Customer combobox (free field — debounced server-side search)
// ============================================================
function CustomerCombobox({
  value,
  onChange,
  options,
  placeholder = "انتخاب مشتری (اختیاری)",
}: {
  value: string | null
  onChange: (id: string | null) => void
  options?: KanbanOptions
  placeholder?: string
}) {
  const api = useApi()
  const apiRef = React.useRef(api)
  React.useEffect(() => { apiRef.current = api }, [api])
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<KanbanOptionsCustomer[]>([])
  const [loading, setLoading] = React.useState(false)

  // Resolve name from the kanban options (pre-fetched top 200) — no API call needed.
  const known = React.useMemo(
    () => options?.customers.find((c) => c.id === value) || null,
    [options, value]
  )

  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams({ limit: "20" })
    if (query.trim()) params.set("search", query.trim())
    const t = setTimeout(() => {
      apiRef.current
        .get<{ items?: KanbanOptionsCustomer[] }>(`/api/customers?${params.toString()}`)
        .then((d) => { if (!cancelled) setResults(d.items || []) })
        .catch(() => { if (!cancelled) setResults([]) })
        .finally(() => !cancelled && setLoading(false))
    }, 220)
    return () => { cancelled = true; clearTimeout(t) }
  }, [open, query])

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
            <span className="flex min-w-0 items-center gap-2">
              <UserIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{selected.name}</span>
            </span>
          ) : value ? (
            <span className="flex min-w-0 items-center gap-2">
              <UserIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-muted-foreground">مشتری #{value.slice(0, 6)}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[400px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="جستجوی نام یا تلفن…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>{loading ? "در حال بارگذاری…" : "مشتری یافت نشد"}</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => { onChange(null); setOpen(false) }}
                >
                  <X className="ml-1 size-3.5 text-muted-foreground" />
                  <span className="flex-1 text-sm text-muted-foreground">حذف انتخاب</span>
                </CommandItem>
              )}
              {results.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  onSelect={() => { onChange(c.id); setOpen(false) }}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm">{c.name}</span>
                    <span className="text-xs text-muted-foreground" dir="ltr">{c.phone}</span>
                  </div>
                  {value === c.id && <Check className="size-3.5 shrink-0 text-primary" />}
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
// Project combobox (free field — scoped to customer if one is selected)
// ============================================================
interface ProjectSearchItem {
  id: string
  contractNumber: string
  title: string
  customerName: string
}
function ProjectCombobox({
  value,
  onChange,
  customerId,
  options,
  placeholder = "انتخاب پروژه (اختیاری)",
}: {
  value: string | null
  onChange: (id: string | null) => void
  customerId?: string | null
  options?: KanbanOptions
  placeholder?: string
}) {
  const api = useApi()
  const apiRef = React.useRef(api)
  React.useEffect(() => { apiRef.current = api }, [api])
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<ProjectSearchItem[]>([])
  const [loading, setLoading] = React.useState(false)

  // Resolve name from the kanban options (pre-fetched top 200) — no API call needed.
  const known = React.useMemo(() => {
    const p = options?.projects.find((x) => x.id === value)
    return p
      ? { id: p.id, contractNumber: p.contractNumber, title: p.packageTitle, customerName: p.customerName }
      : null
  }, [options, value])

  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    const url = customerId
      ? `/api/customers/${customerId}/projects`
      : `/api/projects?limit=50`
    apiRef.current
      .get<
        | { items?: Array<{ id: string; contractNumber: string; customer: { name: string }; package: { title: string } }> }
        | { projects?: Array<{ id: string; contractNumber: string; title: string }> }
      >(url)
      .then((d) => {
        if (cancelled) return
        if (customerId && (d as { projects?: unknown }).projects) {
          const list = (d as { projects: Array<{ id: string; contractNumber: string; title: string }> }).projects
          setResults(list.map((p) => ({
            id: p.id,
            contractNumber: p.contractNumber,
            title: p.title,
            customerName: "",
          })))
        } else {
          const list = (d as { items?: Array<{ id: string; contractNumber: string; customer: { name: string }; package: { title: string } }> }).items || []
          setResults(list.map((p) => ({
            id: p.id,
            contractNumber: p.contractNumber,
            title: p.package.title,
            customerName: p.customer.name,
          })))
        }
      })
      .catch(() => { if (!cancelled) setResults([]) })
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [open, customerId])

  // Client-side filter (the customer-scoped endpoint doesn't support server-side search).
  const filtered = React.useMemo(() => {
    if (!query.trim()) return results
    const q = query.trim().toLowerCase()
    return results.filter((p) =>
      (`${p.contractNumber} ${p.title} ${p.customerName}`).toLowerCase().includes(q)
    )
  }, [results, query])

  const selected = filtered.find((p) => p.id === value) || known

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
            <span className="flex min-w-0 items-center gap-2">
              <Briefcase className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">
                {selected.customerName
                  ? `${selected.contractNumber} · ${selected.customerName}`
                  : `${selected.contractNumber} · ${selected.title}`}
              </span>
            </span>
          ) : value ? (
            <span className="flex min-w-0 items-center gap-2">
              <Briefcase className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate text-muted-foreground">پروژه #{value.slice(0, 6)}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[400px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="جستجوی شماره قرارداد یا عنوان…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>{loading ? "در حال بارگذاری…" : "پروژه‌ای یافت نشد"}</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => { onChange(null); setOpen(false) }}
                >
                  <X className="ml-1 size-3.5 text-muted-foreground" />
                  <span className="flex-1 text-sm text-muted-foreground">حذف انتخاب</span>
                </CommandItem>
              )}
              {filtered.slice(0, 50).map((p) => (
                <CommandItem
                  key={p.id}
                  value={p.id}
                  onSelect={() => { onChange(p.id); setOpen(false) }}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm">{p.contractNumber} · {p.title}</span>
                    {p.customerName && (
                      <span className="truncate text-xs text-muted-foreground">{p.customerName}</span>
                    )}
                  </div>
                  {value === p.id && <Check className="size-3.5 shrink-0 text-primary" />}
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
// Notify dialog (when completing a card)
// ============================================================
function NotifyDialog({
  open,
  card,
  options,
  onOpenChange,
  onConfirm,
  onSkipNotify,
  saving,
}: {
  open: boolean
  card: KanbanCardData | null
  options?: KanbanOptions
  onOpenChange: (o: boolean) => void
  onConfirm: (userId: string, userName: string, noteContent?: string) => void
  onSkipNotify: () => void
  saving: boolean
}) {
  const [selectedUserId, setSelectedUserId] = React.useState<string>("")
  const [noteContent, setNoteContent] = React.useState("")
  const [query, setQuery] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setSelectedUserId("")
      setNoteContent(card ? `✅ کارت «${card.title}» تکمیل شد.` : "")
      setQuery("")
    }
  }, [open, card])

  const users = options?.users || []
  const filtered = React.useMemo(() => {
    if (!query.trim()) return users
    const q = query.trim().toLowerCase()
    return users.filter((u) =>
      (u.fullName + " " + u.roleLabel).toLowerCase().includes(q)
    )
  }, [users, query])

  const selectedUser = users.find((u) => u.id === selectedUserId) || null

  function handleConfirm() {
    if (!selectedUser) {
      toast.error("یک گیرنده انتخاب کنید")
      return
    }
    onConfirm(selectedUser.id, selectedUser.fullName, noteContent.trim() || undefined)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="size-4 text-amber-500" />
            به چه کسی اعلان بفرستیم؟
          </DialogTitle>
          <DialogDescription>
            با تکمیل کارت «{card?.title ?? ""}» یک اعلان برای گیرنده انتخاب‌شده ارسال می‌شود
            {card && parseMultiLink(card).projectId
              ? " و یک یادداشت نیز به پروژهٔ پیوندی افزوده می‌شود"
              : "."}
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>گیرنده اعلان</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal">
                  {selectedUser ? (
                    <span className="flex items-center gap-2">
                      <UserIcon className="size-3.5 text-muted-foreground" />
                      <span>{selectedUser.fullName}</span>
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {selectedUser.roleLabel}
                      </Badge>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">انتخاب کاربر…</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[420px] p-0">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="جستجوی نام یا نقش…"
                    value={query}
                    onValueChange={setQuery}
                  />
                  <CommandList>
                    <CommandEmpty>کاربری یافت نشد</CommandEmpty>
                    <CommandGroup>
                      {filtered.slice(0, 50).map((u) => (
                        <CommandItem
                          key={u.id}
                          value={u.id}
                          onSelect={() => {
                            setSelectedUserId(u.id)
                          }}
                        >
                          <div className="flex flex-1 items-center gap-2">
                            <UserIcon className="size-3.5 text-muted-foreground" />
                            <div className="flex flex-1 flex-col">
                              <span className="text-sm">{u.fullName}</span>
                              <span className="text-xs text-muted-foreground">{u.roleLabel}</span>
                            </div>
                            {!u.isAvailable && (
                              <Badge variant="outline" className="border-amber-300/60 text-[10px] text-amber-700">
                                غایب
                              </Badge>
                            )}
                          </div>
                          {selectedUserId === u.id && <Check className="size-3.5 text-primary" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {card && parseMultiLink(card).projectId && (
            <div className="space-y-1.5">
              <Label>متن یادداشت پروژه</Label>
              <Textarea
                rows={2}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="یادداختی که به پروژه افزوده می‌شود…"
              />
              <p className="text-[11px] text-muted-foreground">
                این یادداشت در تب «یادداشت‌ها» پروژهٔ پیوندی ثبت می‌شود.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="ghost" onClick={onSkipNotify} disabled={saving} className="text-muted-foreground">
            بدون اعلان، فقط تکمیل
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              انصراف
            </Button>
            <Button onClick={handleConfirm} disabled={saving || !selectedUser}>
              {saving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Bell className="mr-1.5 size-3.5" />}
              ارسال اعلان و تکمیل
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Sortable card
// ============================================================
function SortableCard({
  card,
  options,
  columns,
  onEdit,
  onDelete,
  onComplete,
  onUncomplete,
  onMoveCard,
}: {
  card: KanbanCardData
  options?: KanbanOptions
  columns: KanbanColumnData[]
  onEdit: () => void
  onDelete: () => void
  onComplete: () => void
  onUncomplete: () => void
  onMoveCard: (card: KanbanCardData, targetColumnId: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { type: "card", card } })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const overdue = isOverdue(card.dueDate, card.completed)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group rounded-lg border bg-card p-2.5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          type="button"
          className="mt-0.5 cursor-grab touch-none rounded p-0.5 text-muted-foreground/50 opacity-0 transition hover:bg-accent hover:text-muted-foreground group-hover:opacity-100"
          aria-label="جابه‌جایی کارت"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>

        {/* Complete checkbox */}
        <Checkbox
          checked={card.completed}
          onCheckedChange={(c) => {
            if (c === true) onComplete()
            else onUncomplete()
          }}
          className="mt-0.5 size-4 shrink-0 rounded-full"
          aria-label="تکمیل کارت"
        />

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "text-sm font-medium leading-snug",
              card.completed && "text-muted-foreground line-through"
            )}
          >
            {card.title}
          </div>
          {card.description && (
            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {card.description}
            </div>
          )}

          {/* Source project/customer info (from workflow assignment) */}
          {(() => {
            const { customerId: cid, projectId: pid } = parseMultiLink(card)
            if (!cid && !pid) return null
            const cust = cid ? options?.customers.find((x) => x.id === cid) : null
            const proj = pid ? options?.projects.find((x) => x.id === pid) : null
            if (!cust && !proj) return null
            return (
              <div className="mt-1 text-[10px] text-muted-foreground">
                {cust && <span>مشتری: {cust.name}</span>}
                {cust && proj && <span> · </span>}
                {proj && <span>پروژه: {proj.contractNumber}</span>}
              </div>
            )
          })()}

          {/* Badges */}
          {(card.priority !== "none" || card.dueDate || card.labels.length > 0 || hasMultiLink(card)) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <PriorityBadge priority={card.priority} />
              {card.dueDate && (
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 gap-0.5 px-1.5 text-[10px]",
                    overdue && "border-rose-300/60 text-rose-600 dark:border-rose-700/50 dark:text-rose-400"
                  )}
                >
                  <CalendarIcon className="size-2.5" />
                  {overdue ? "گذشته · " : ""}
                  {formatDate(card.dueDate)}
                </Badge>
              )}
              {card.labels.map((l) => (
                <Badge key={l} variant="secondary" className="h-5 gap-0.5 px-1.5 text-[10px]">
                  <Tag className="size-2.5" />
                  {l}
                </Badge>
              ))}
              <MultiLinkChips card={card} options={options} />
            </div>
          )}

          {/* Notified indicator */}
          {card.completed && card.notifiedAt && card.notifyUserName && (
            <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
              <CheckCheck className="size-3" />
              <span>اعلان به {card.notifyUserName} ارسال شد</span>
            </div>
          )}

          {/* Actions — always visible on mobile (so move + edit + delete are reachable
              without hover); hover-only on desktop. */}
          <div className="mt-2 flex items-center gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
            <button
              type="button"
              onClick={onEdit}
              className="rounded p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              aria-label="ویرایش"
            >
              <Pencil className="size-3" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded p-1 text-muted-foreground transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
              aria-label="حذف"
            >
              <Trash2 className="size-3" />
            </button>
            {/* Move-to-column dropdown (especially handy on mobile where DnD is hard) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="rounded p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  aria-label="انتقال به ستون"
                  title="انتقال به ستون"
                >
                  <Move className="size-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">انتقال به ستون</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns.map((c) => {
                  const isCurrent = c.id === card.columnId
                  return (
                    <DropdownMenuItem
                      key={c.id}
                      disabled={isCurrent}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!isCurrent) onMoveCard(card, c.id)
                      }}
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: c.color }}
                      />
                      <span className="flex-1 truncate text-sm">{c.title}</span>
                      {isCurrent && <Check className="size-3.5 shrink-0 text-primary" />}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Column (sortable + droppable)
// ============================================================
function SortableColumn({
  column,
  options,
  columns,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onCompleteCard,
  onMoveCard,
  onRenameColumn,
  onColorChange,
  onDeleteColumn,
  onUncompleteCard,
}: {
  column: KanbanColumnData
  options?: KanbanOptions
  columns: KanbanColumnData[]
  onAddCard: (col: KanbanColumnData) => void
  onEditCard: (card: KanbanCardData) => void
  onDeleteCard: (card: KanbanCardData) => void
  onCompleteCard: (card: KanbanCardData) => void
  onUncompleteCard: (card: KanbanCardData) => void
  onMoveCard: (card: KanbanCardData, targetColumnId: string) => void
  onRenameColumn: (col: KanbanColumnData, title: string) => void
  onColorChange: (col: KanbanColumnData, color: string) => void
  onDeleteColumn: (col: KanbanColumnData) => void
}) {
  const {
    attributes: colAttrs,
    listeners: colListeners,
    setNodeRef: setColNodeRef,
    transform: colTransform,
    transition: colTransition,
    isDragging: colDragging,
  } = useSortable({ id: column.id, data: { type: "column", column } })

  const colStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(colTransform),
    transition: colTransition,
    opacity: colDragging ? 0.5 : 1,
  }

  const [editingTitle, setEditingTitle] = React.useState(false)
  const [titleDraft, setTitleDraft] = React.useState(column.title)

  React.useEffect(() => {
    setTitleDraft(column.title)
  }, [column.title])

  function commitTitle() {
    const t = titleDraft.trim()
    if (!t) {
      setTitleDraft(column.title)
      setEditingTitle(false)
      return
    }
    if (t !== column.title) onRenameColumn(column, t)
    setEditingTitle(false)
  }

  const cardIds = column.cards.map((c) => c.id)
  const completedCount = column.cards.filter((c) => c.completed).length

  return (
    <div
      ref={setColNodeRef}
      style={colStyle}
      className="flex w-[280px] shrink-0 flex-col rounded-xl border bg-muted/30"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-1 border-b p-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <button
            type="button"
            className="cursor-grab touch-none rounded p-0.5 text-muted-foreground/60 hover:bg-accent hover:text-muted-foreground"
            aria-label="جابه‌جایی ستون"
            {...colAttrs}
            {...colListeners}
          >
            <GripVertical className="size-3.5" />
          </button>
          <ColorPickerPopover
            color={column.color}
            onChange={(c) => onColorChange(column, c)}
            align="start"
          >
            <button
              type="button"
              className="size-3 shrink-0 rounded-full ring-2 ring-background"
              style={{ background: column.color }}
              aria-label="تغییر رنگ ستون"
            />
          </ColorPickerPopover>
          {editingTitle ? (
            <Input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle()
                if (e.key === "Escape") {
                  setTitleDraft(column.title)
                  setEditingTitle(false)
                }
              }}
              className="h-6 flex-1 px-1.5 text-sm"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="min-w-0 flex-1 truncate text-right text-sm font-semibold hover:bg-accent/50 rounded px-1 py-0.5"
              title="برای ویرایش، کلیک کنید"
            >
              {column.title}
            </button>
          )}
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {toPersianDigits(column.cards.length)}
            {completedCount > 0 && (
              <span className="mr-1 text-emerald-600">·{toPersianDigits(completedCount)}✓</span>
            )}
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              aria-label="منوی ستون"
            >
              <MoreVertical className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuLabel className="text-xs">{column.title}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setEditingTitle(true)}>
              <Pencil className="ml-2 size-3.5" />
              تغییر نام
            </DropdownMenuItem>
            <ColorPickerMenuItem
              color={column.color}
              onChange={(c) => onColorChange(column, c)}
            />
            <DropdownMenuItem onClick={() => onAddCard(column)}>
              <Plus className="ml-2 size-3.5" />
              افزودن کارت
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDeleteColumn(column)}
              className="text-rose-600 focus:text-rose-600"
            >
              <Trash2 className="ml-2 size-3.5" />
              حذف ستون
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2" style={{ maxHeight: "calc(100vh - 280px)" }}>
        <DroppableColumnArea columnId={column.id}>
          <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {column.cards.length === 0 ? (
                <div className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
                  کارتی وجود ندارد
                </div>
              ) : (
                column.cards.map((card) => (
                  <SortableCard
                    key={card.id}
                    card={card}
                    options={options}
                    columns={columns}
                    onEdit={() => onEditCard(card)}
                    onDelete={() => onDeleteCard(card)}
                    onComplete={() => onCompleteCard(card)}
                    onUncomplete={() => onUncompleteCard(card)}
                    onMoveCard={onMoveCard}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DroppableColumnArea>
      </div>

      {/* Add card footer */}
      <div className="border-t p-2">
        <button
          type="button"
          onClick={() => onAddCard(column)}
          className="flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <Plus className="size-3.5" />
          افزودن کارت
        </button>
      </div>
    </div>
  )
}

// Wraps a column's card list in a droppable area (so cards can be dropped on empty columns).
function DroppableColumnArea({
  columnId,
  children,
}: {
  columnId: string
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `drop:${columnId}`, data: { type: "column-drop", columnId } })
  return (
    <div
      ref={setNodeRef}
      className={cn("min-h-[60px] rounded-lg transition", isOver && "bg-primary/5")}
    >
      {children}
    </div>
  )
}

// Color picker as a dropdown menu item (opens a nested popover).
function ColorPickerMenuItem({
  color,
  onChange,
}: {
  color: string
  onChange: (c: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full cursor-default items-center px-2 py-1.5 text-sm outline-none hover:bg-accent"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="ml-2 size-3 rounded-full" style={{ background: color }} />
          تغییر رنگ
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <div className="grid grid-cols-5 gap-2">
          {COLUMN_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onChange(c)
                setOpen(false)
              }}
              className={cn(
                "size-7 rounded-full ring-offset-2 ring-offset-background transition hover:scale-110",
                color === c && "ring-2 ring-primary"
              )}
              style={{ background: c }}
              aria-label={`رنگ ${c}`}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Add column (inline form)
// ============================================================
function AddColumnButton({
  onAdd,
  adding,
}: {
  onAdd: (title: string, color: string) => void
  adding: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [color, setColor] = React.useState<string>(COLUMN_COLORS[0])

  function submit() {
    const t = title.trim()
    if (!t) {
      toast.error("عنوان ستون الزامی است")
      return
    }
    onAdd(t, color)
    setTitle("")
    setColor(COLUMN_COLORS[0])
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-[240px] shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-muted-foreground transition hover:border-primary/40 hover:bg-accent/30"
      >
        <Plus className="size-5" />
        <span className="text-sm font-medium">افزودن ستون</span>
      </button>
    )
  }

  return (
    <div className="flex w-[280px] shrink-0 flex-col gap-2 rounded-xl border bg-card p-3">
      <div className="flex items-center gap-1.5">
        <ColorPickerPopover color={color} onChange={setColor} align="start">
          <button
            type="button"
            className="size-4 shrink-0 rounded-full ring-2 ring-background"
            style={{ background: color }}
            aria-label="رنگ ستون"
          />
        </ColorPickerPopover>
        <Input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان ستون…"
          onKeyDown={(e) => {
            if (e.key === "Enter") submit()
            if (e.key === "Escape") setOpen(false)
          }}
          className="h-8 text-sm"
        />
      </div>
      <div className="flex gap-1.5">
        <Button type="button" size="sm" onClick={submit} disabled={adding} className="flex-1">
          {adding ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <Plus className="mr-1 size-3.5" />}
          افزودن
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)} disabled={adding}>
          انصراف
        </Button>
      </div>
    </div>
  )
}

// ============================================================
// Mobile: column tabs (single column visible)
// ============================================================
function MobileColumnView({
  columns,
  options,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onCompleteCard,
  onUncompleteCard,
  onMoveCard,
  onRenameColumn,
  onColorChange,
  onDeleteColumn,
}: {
  columns: KanbanColumnData[]
  options?: KanbanOptions
  onAddCard: (col: KanbanColumnData) => void
  onEditCard: (card: KanbanCardData) => void
  onDeleteCard: (card: KanbanCardData) => void
  onCompleteCard: (card: KanbanCardData) => void
  onUncompleteCard: (card: KanbanCardData) => void
  onMoveCard: (card: KanbanCardData, targetColumnId: string) => void
  onRenameColumn: (col: KanbanColumnData, title: string) => void
  onColorChange: (col: KanbanColumnData, color: string) => void
  onDeleteColumn: (col: KanbanColumnData) => void
}) {
  const [activeIdx, setActiveIdx] = React.useState(0)
  React.useEffect(() => {
    if (activeIdx >= columns.length) setActiveIdx(Math.max(0, columns.length - 1))
  }, [columns.length, activeIdx])

  const col = columns[activeIdx]

  return (
    <div>
      <Tabs value={String(activeIdx)} onValueChange={(v) => setActiveIdx(Number(v))}>
        <TabsList className="flex h-auto w-full flex-col gap-1 bg-muted/40 p-1" dir="rtl">
          {columns.map((c, i) => (
            <TabsTrigger
              key={c.id}
              value={String(i)}
              className="flex w-full items-center justify-start gap-1.5 data-[state=active]:bg-background"
            >
              <span className="size-2 rounded-full" style={{ background: c.color }} />
              <span className="truncate text-xs">{c.title}</span>
              <span className="rounded-full bg-foreground/10 px-1 text-[10px]">{toPersianDigits(c.cards.length)}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {col && (
        <div className="mt-3">
          <SortableColumn
            column={col}
            options={options}
            columns={columns}
            onAddCard={onAddCard}
            onEditCard={onEditCard}
            onDeleteCard={onDeleteCard}
            onCompleteCard={onCompleteCard}
            onUncompleteCard={onUncompleteCard}
            onMoveCard={onMoveCard}
            onRenameColumn={onRenameColumn}
            onColorChange={onColorChange}
            onDeleteColumn={onDeleteColumn}
          />
        </div>
      )}
    </div>
  )
}

// ============================================================
// Legacy: project task card (assigned to me from projects)
// ============================================================
function ProjectTaskRow({ task }: { task: MyTask }) {
  const openProject = useWorkspace((s) => s.openProject)
  const overdue = isOverdue(task.deadline, task.status === "done")
  return (
    <button
      type="button"
      onClick={() => openProject(task.project.id)}
      className="group flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-right transition hover:border-primary/30 hover:shadow-sm"
    >
      {task.status === "done" ? (
        <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
      ) : task.status === "in_progress" ? (
        <Loader2 className="size-4 shrink-0 text-amber-500" />
      ) : (
        <Circle className="size-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{task.title}</div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {task.project.customerName} · {task.project.contractNumber}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Badge
          variant="outline"
          className={cn("text-[10px]", overdue && "border-rose-300/60 text-rose-600")}
        >
          {overdue ? "گذشته · " : ""}
          {formatDate(task.deadline)}
        </Badge>
        <ChevronRight className="size-3 text-muted-foreground transition group-hover:translate-x-0.5" />
      </div>
    </button>
  )
}

function MyProjectCard({ project }: { project: MyProject }) {
  const openProject = useWorkspace((s) => s.openProject)
  const color = (STATUS_COLORS as Record<string, string>)[project.status] || "#64748b"
  const label = (STATUS_LABELS as Record<string, string>)[project.status] || project.status
  return (
    <button
      type="button"
      onClick={() => openProject(project.id)}
      className="group flex flex-col gap-2 rounded-lg border bg-card p-3 text-right transition hover:border-primary/30 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{project.customerName}</div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {project.contractNumber} · {project.packageTitle}
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" style={{ color, borderColor: color + "60", backgroundColor: color + "14" }} className="text-[10px]">
          {label}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {(CATEGORY_LABELS as Record<string, string>)[project.category] || project.category}
        </Badge>
      </div>
    </button>
  )
}

// ============================================================
// Main view
// ============================================================
export function MyTasksView() {
  const api = useApi()
  const qc = useQueryClient()
  const mutate = useMutate()
  const role = useWorkspace((s) => s.role) as Role
  const openProject = useWorkspace((s) => s.openProject)
  const openCustomer = useWorkspace((s) => s.openCustomer)

  // ---- Queries ----
  const kanbanQ = useQuery<KanbanResponse>({
    queryKey: ["kanban", role],
    queryFn: () => api.get("/api/kanban/columns"),
  })
  const optionsQ = useQuery<KanbanOptions>({
    queryKey: ["kanban-options", role],
    queryFn: () => api.get("/api/kanban/options"),
    staleTime: 60_000,
  })
  const myTasksQ = useQuery<MyTasksResponse>({
    queryKey: ["my-tasks", role],
    queryFn: () => api.get("/api/my-tasks"),
    staleTime: 30_000,
  })

  const columns = kanbanQ.data?.columns ?? []
  const options = optionsQ.data
  const myUser = myTasksQ.data?.user ?? null
  const myTasks = myTasksQ.data?.tasks ?? []
  const myProjects = myTasksQ.data?.projects ?? []

  // ---- Local state for optimistic reorder ----
  // We keep a local copy of columns so DnD feels instant; server is patched in the background.
  const [localColumns, setLocalColumns] = React.useState<KanbanColumnData[] | null>(null)
  React.useEffect(() => {
    // Reset local copy whenever server data changes (e.g. after invalidation).
    setLocalColumns(columns.length > 0 ? columns : null)
  }, [kanbanQ.dataUpdatedAt])  

  const displayColumns = localColumns ?? columns

  // ---- DnD state ----
  const [activeCard, setActiveCard] = React.useState<KanbanCardData | null>(null)
  const [activeColumn, setActiveColumn] = React.useState<KanbanColumnData | null>(null)

  // Activation: 6px movement to distinguish from click; Touch sensor with delay.
  const activationConstraint: PointerActivationConstraint = { distance: 6 }
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Collision detection: prefer pointerWithin (so the card under cursor wins), fall back to rectIntersection, then closestCorners.
  const collisionDetection: CollisionDetection = React.useCallback((args) => {
    const pointer = pointerWithin(args)
    if (pointer.length > 0) return pointer
    const rect = rectIntersection(args)
    if (rect.length > 0) return rect
    return closestCorners(args)
  }, [])

  function findColumnByCardId(cardId: string): KanbanColumnData | undefined {
    return displayColumns.find((c) => c.cards.some((card) => card.id === cardId))
  }
  function findColumnById(colId: string): KanbanColumnData | undefined {
    return displayColumns.find((c) => c.id === colId)
  }

  function onDragStart(e: DragStartEvent) {
    const t = e.active.data.current?.type
    if (t === "card") setActiveCard(e.active.data.current?.card ?? null)
    if (t === "column") setActiveColumn(e.active.data.current?.column ?? null)
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over) return
    const activeType = active.data.current?.type
    if (activeType !== "card") return

    const activeId = String(active.id)
    const overId = String(over.id)
    // Resolve the target column.
    let targetColumnId: string | null = null
    if (overId.startsWith("drop:")) {
      targetColumnId = overId.slice(5)
    } else {
      const overCol = findColumnByCardId(overId)
      if (overCol) targetColumnId = overCol.id
    }
    if (!targetColumnId) return

    const sourceCol = findColumnByCardId(activeId)
    if (!sourceCol || sourceCol.id === targetColumnId) return

    // Cross-column move: pull the card from source, append to target (visually) so the user sees the move.
    setLocalColumns((prev) => {
      const base = prev ?? columns
      const card = sourceCol.cards.find((c) => c.id === activeId)
      if (!card) return prev
      return base.map((c) => {
        if (c.id === sourceCol.id) {
          return { ...c, cards: c.cards.filter((x) => x.id !== activeId) }
        }
        if (c.id === targetColumnId) {
          return { ...c, cards: [...c.cards, { ...card, columnId: targetColumnId }] }
        }
        return c
      })
    })
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    setActiveCard(null)
    setActiveColumn(null)
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)
    const activeType = active.data.current?.type

    // ---- Column reorder ----
    if (activeType === "column") {
      if (activeId === overId) return
      const base = localColumns ?? columns
      const fromIdx = base.findIndex((c) => c.id === activeId)
      const toIdx = base.findIndex((c) => c.id === overId)
      if (fromIdx === -1 || toIdx === -1) return
      const next = arrayMove(base, fromIdx, toIdx)
      setLocalColumns(next)
      // Persist new orders.
      void persistColumnOrder(next)
      return
    }

    // ---- Card reorder/move ----
    if (activeType !== "card") return

    // Resolve target column + index.
    let targetColumnId: string | null = null
    let targetIndex = -1
    if (overId.startsWith("drop:")) {
      targetColumnId = overId.slice(5)
      targetIndex = -1 // append to end
    } else {
      const overCol = findColumnByCardId(overId)
      if (overCol) {
        targetColumnId = overCol.id
        targetIndex = overCol.cards.findIndex((c) => c.id === overId)
      }
    }
    if (!targetColumnId) return

    const base = localColumns ?? columns
    const sourceCol = base.find((c) => c.cards.some((card) => card.id === activeId))
    if (!sourceCol) return
    const card = sourceCol.cards.find((c) => c.id === activeId)
    if (!card) return

    // Build the next state.
    let next: KanbanColumnData[]
    if (sourceCol.id === targetColumnId) {
      // Same-column reorder.
      const cards = sourceCol.cards.slice()
      const fromIdx = cards.findIndex((c) => c.id === activeId)
      const toIdx = targetIndex === -1 ? cards.length - 1 : targetIndex
      if (fromIdx === toIdx) return // no-op
      const reordered = arrayMove(cards, fromIdx, toIdx)
      next = base.map((c) => (c.id === sourceCol.id ? { ...c, cards: reordered } : c))
    } else {
      // Cross-column move (already partially applied in onDragOver; finalize position).
      const targetCol = base.find((c) => c.id === targetColumnId)
      if (!targetCol) return
      const sourceCards = sourceCol.cards.filter((c) => c.id !== activeId)
      const targetCards = targetCol.cards.filter((c) => c.id !== activeId) // remove if duplicated
      const newCard = { ...card, columnId: targetColumnId }
      const insertAt = targetIndex === -1 ? targetCards.length : targetIndex
      targetCards.splice(insertAt, 0, newCard)
      next = base.map((c) => {
        if (c.id === sourceCol.id) return { ...c, cards: sourceCards }
        if (c.id === targetColumnId) return { ...c, cards: targetCards }
        return c
      })
    }

    setLocalColumns(next)
    void persistCardOrder(next, sourceCol.id, targetColumnId)
  }

  async function persistColumnOrder(next: KanbanColumnData[]) {
    try {
      await Promise.all(
        next.map((c, i) =>
          mutate(`/api/kanban/columns/${c.id}`, "PATCH", { order: i })
        )
      )
      qc.invalidateQueries({ queryKey: ["kanban", role] })
    } catch (e) {
      toast.error("ذخیره ترتیب ستون‌ها ناموفق بود", {
        description: e instanceof Error ? e.message : undefined,
      })
      qc.invalidateQueries({ queryKey: ["kanban", role] })
    }
  }

  async function persistCardOrder(next: KanbanColumnData[], sourceColId: string, targetColId: string) {
    try {
      const affected = next.filter((c) => c.id === sourceColId || c.id === targetColId)
      await Promise.all(
        affected.map((c) =>
          Promise.all(
            c.cards.map((card, i) =>
              mutate(`/api/kanban/cards/${card.id}`, "PATCH", {
                columnId: c.id,
                order: i,
              })
            )
          )
        )
      )
      qc.invalidateQueries({ queryKey: ["kanban", role] })
    } catch (e) {
      toast.error("ذخیره ترتیب کارت‌ها ناموفق بود", {
        description: e instanceof Error ? e.message : undefined,
      })
      qc.invalidateQueries({ queryKey: ["kanban", role] })
    }
  }

  // ---- Column CRUD ----
  const [addingColumn, setAddingColumn] = React.useState(false)
  async function handleAddColumn(title: string, color: string) {
    setAddingColumn(true)
    try {
      const created = await mutate<{ id: string; title: string; color: string; order: number; cards: [] }>(
        "/api/kanban/columns",
        "POST",
        { title, color }
      )
      toast.success(`ستون «${created.title}» افزوده شد`)
      qc.invalidateQueries({ queryKey: ["kanban", role] })
    } catch (e) {
      toast.error("افزودن ستون ناموفق بود", { description: e instanceof Error ? e.message : undefined })
    } finally {
      setAddingColumn(false)
    }
  }
  async function handleRenameColumn(col: KanbanColumnData, title: string) {
    try {
      await mutate(`/api/kanban/columns/${col.id}`, "PATCH", { title })
      setLocalColumns((prev) =>
        (prev ?? columns).map((c) => (c.id === col.id ? { ...c, title } : c))
      )
      qc.invalidateQueries({ queryKey: ["kanban", role] })
      toast.success("نام ستون به‌روزرسانی شد")
    } catch (e) {
      toast.error("تغییر نام ناموفق بود", { description: e instanceof Error ? e.message : undefined })
    }
  }
  async function handleColorChange(col: KanbanColumnData, color: string) {
    setLocalColumns((prev) =>
      (prev ?? columns).map((c) => (c.id === col.id ? { ...c, color } : c))
    )
    try {
      await mutate(`/api/kanban/columns/${col.id}`, "PATCH", { color })
      qc.invalidateQueries({ queryKey: ["kanban", role] })
    } catch (e) {
      toast.error("تغییر رنگ ناموفق بود", { description: e instanceof Error ? e.message : undefined })
      qc.invalidateQueries({ queryKey: ["kanban", role] })
    }
  }

  // Column delete confirmation
  const [deleteCol, setDeleteCol] = React.useState<KanbanColumnData | null>(null)
  async function handleDeleteColumn(col: KanbanColumnData) {
    try {
      await mutate(`/api/kanban/columns/${col.id}`, "DELETE")
      toast.success(`ستون «${col.title}» حذف شد`)
      setDeleteCol(null)
      qc.invalidateQueries({ queryKey: ["kanban", role] })
    } catch (e) {
      toast.error("حذف ستون ناموفق بود", { description: e instanceof Error ? e.message : undefined })
    }
  }

  // ---- Card CRUD ----
  const [editorOpen, setEditorOpen] = React.useState(false)
  const [editorMode, setEditorMode] = React.useState<"create" | "edit">("create")
  const [editorInitial, setEditorInitial] = React.useState<CardEditorState | null>(null)
  const [editorColumnId, setEditorColumnId] = React.useState<string | null>(null)
  const [editorCardId, setEditorCardId] = React.useState<string | null>(null)
  const [editorSaving, setEditorSaving] = React.useState(false)

  function openCreateCard(col: KanbanColumnData) {
    setEditorMode("create")
    setEditorInitial(EMPTY_CARD)
    setEditorColumnId(col.id)
    setEditorCardId(null)
    setEditorOpen(true)
  }
  function openEditCard(card: KanbanCardData) {
    setEditorMode("edit")
    const link = parseMultiLink(card)
    setEditorInitial({
      title: card.title,
      description: card.description ?? "",
      priority: card.priority || "none",
      dueDate: card.dueDate,
      labels: card.labels,
      customerId: link.customerId,
      projectId: link.projectId,
    })
    setEditorColumnId(card.columnId)
    setEditorCardId(card.id)
    setEditorOpen(true)
  }
  async function handleSaveCard(state: CardEditorState) {
    if (!editorColumnId) return
    setEditorSaving(true)
    try {
      const link = serializeMultiLink({ customerId: state.customerId, projectId: state.projectId })
      const payload = {
        title: state.title,
        description: state.description || null,
        priority: state.priority,
        dueDate: state.dueDate,
        labels: state.labels,
        linkType: link.linkType,
        linkId: link.linkId,
      }
      if (editorMode === "create") {
        await mutate(`/api/kanban/columns/${editorColumnId}/cards`, "POST", payload)
        toast.success("کارت افزوده شد")
      } else if (editorCardId) {
        await mutate(`/api/kanban/cards/${editorCardId}`, "PATCH", payload)
        toast.success("کارت به‌روزرسانی شد")
      }
      setEditorOpen(false)
      qc.invalidateQueries({ queryKey: ["kanban", role] })
    } catch (e) {
      toast.error("ذخیره کارت ناموفق بود", { description: e instanceof Error ? e.message : undefined })
    } finally {
      setEditorSaving(false)
    }
  }

  // Card delete confirmation
  const [deleteCard, setDeleteCard] = React.useState<KanbanCardData | null>(null)
  async function handleDeleteCard(card: KanbanCardData) {
    try {
      await mutate(`/api/kanban/cards/${card.id}`, "DELETE")
      toast.success("کارت حذف شد")
      setDeleteCard(null)
      qc.invalidateQueries({ queryKey: ["kanban", role] })
    } catch (e) {
      toast.error("حذف کارت ناموفق بود", { description: e instanceof Error ? e.message : undefined })
    }
  }

  // ---- Complete + notify flow ----
  const [notifyCard, setNotifyCard] = React.useState<KanbanCardData | null>(null)
  const [notifySaving, setNotifySaving] = React.useState(false)

  function handleCompleteCard(card: KanbanCardData) {
    // Only called when the user checks an incomplete card. Open the notify dialog
    // so they can pick who to notify (or skip notification entirely).
    if (card.completed) return // safety: already complete
    setNotifyCard(card)
  }

  async function handleUncompleteCard(card: KanbanCardData) {
    try {
      await mutate(`/api/kanban/cards/${card.id}`, "PATCH", {
        completed: false,
        notifyUserId: null,
        notifyUserName: null,
      })
      qc.invalidateQueries({ queryKey: ["kanban", role] })
      toast.success("کارت به‌حالت انجام‌نشده بازگردانده شد")
    } catch (e) {
      toast.error("به‌روزرسانی ناموفق بود", { description: e instanceof Error ? e.message : undefined })
    }
  }

  async function handleNotifyConfirm(userId: string, userName: string, noteContent?: string) {
    if (!notifyCard) return
    setNotifySaving(true)
    try {
      await mutate(`/api/kanban/cards/${notifyCard.id}/notify`, "POST", {
        notifyUserId: userId,
        notifyUserName: userName,
        projectNoteContent: noteContent,
      })
      toast.success(`اعلان به «${userName}» ارسال شد و کارت تکمیل شد`)
      setNotifyCard(null)
      qc.invalidateQueries({ queryKey: ["kanban", role] })
      qc.invalidateQueries({ queryKey: ["notifications"] })
    } catch (e) {
      toast.error("ارسال اعلان ناموفق بود", { description: e instanceof Error ? e.message : undefined })
    } finally {
      setNotifySaving(false)
    }
  }

  async function handleSkipNotify() {
    if (!notifyCard) return
    setNotifySaving(true)
    try {
      await mutate(`/api/kanban/cards/${notifyCard.id}`, "PATCH", { completed: true })
      toast.success("کارت تکمیل شد (بدون اعلان)")
      setNotifyCard(null)
      qc.invalidateQueries({ queryKey: ["kanban", role] })
    } catch (e) {
      toast.error("به‌روزرسانی ناموفق بود", { description: e instanceof Error ? e.message : undefined })
    } finally {
      setNotifySaving(false)
    }
  }

  // ---- Move card to another column (mobile-friendly alternative to DnD) ----
  async function handleMoveCard(card: KanbanCardData, targetColumnId: string) {
    if (targetColumnId === card.columnId) return
    // Optimistic local update so the user sees the move instantly.
    setLocalColumns((prev) => {
      const base = prev ?? columns
      const sourceCol = base.find((c) => c.id === card.columnId)
      const targetCol = base.find((c) => c.id === targetColumnId)
      if (!sourceCol || !targetCol) return prev
      return base.map((c) => {
        if (c.id === sourceCol.id) {
          return { ...c, cards: c.cards.filter((x) => x.id !== card.id) }
        }
        if (c.id === targetCol.id) {
          return { ...c, cards: [...c.cards, { ...card, columnId: targetColumnId }] }
        }
        return c
      })
    })
    try {
      const targetCol = (localColumns ?? columns).find((c) => c.id === targetColumnId)
      const newOrder = targetCol?.cards.length ?? 0
      await mutate(`/api/kanban/cards/${card.id}`, "PATCH", {
        columnId: targetColumnId,
        order: newOrder,
      })
      qc.invalidateQueries({ queryKey: ["kanban", role] })
      toast.success("کارت منتقل شد")
    } catch (e) {
      toast.error("انتقال کارت ناموفق بود", { description: e instanceof Error ? e.message : undefined })
      qc.invalidateQueries({ queryKey: ["kanban", role] })
    }
  }

  // ---- Stats ----
  const totalCards = displayColumns.reduce((acc, c) => acc + c.cards.length, 0)
  const completedCards = displayColumns.reduce(
    (acc, c) => acc + c.cards.filter((card) => card.completed).length,
    0
  )
  const overdueCards = displayColumns.reduce(
    (acc, c) => acc + c.cards.filter((card) => isOverdue(card.dueDate, card.completed)).length,
    0
  )
  const highPriorityCards = displayColumns.reduce(
    (acc, c) => acc + c.cards.filter((card) => card.priority === "high" && !card.completed).length,
    0
  )

  const isKanbanLoading = kanbanQ.isLoading && !kanbanQ.data

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="کارهای من"
        icon="✅"
        description="تخته شخصی کانبان — ستون‌ها و کارت‌های خود را بسازید و مدیریت کنید"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => kanbanQ.refetch()}
              disabled={kanbanQ.isFetching}
            >
              <Loader2 className={cn("mr-1.5 size-3.5", kanbanQ.isFetching && "animate-spin")} />
              بازخوانی
            </Button>
          </div>
        }
      />

      {/* User banner */}
      {myUser && (
        <div className="rounded-xl border bg-muted/30 px-4 py-2.5 text-sm">
          <span className="text-muted-foreground">وارد شده به عنوان </span>
          <span className="font-semibold">{myUser.fullName}</span>
          <span className="text-muted-foreground"> · </span>
          <span>{ROLE_LABELS[role] || role}</span>
          {!myUser.isAvailable && (
            <Badge variant="outline" className="mr-2 border-amber-300/60 text-amber-700 dark:border-amber-700/50 dark:text-amber-300">
              غایب
            </Badge>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="کل کارت‌ها" value={totalCards} icon={<FolderKanban className="size-4" />} accent="#64748b" />
        <StatCard label="انجام شده" value={completedCards} icon={<CheckCircle2 className="size-4" />} accent="#22c55e" />
        <StatCard label="عقب‌افتاده" value={overdueCards} icon={<AlertTriangle className="size-4" />} accent="#ef4444" sub={overdueCards > 0 ? "نیاز به توجه" : undefined} />
        <StatCard label="اولویت بالا" value={highPriorityCards} icon={<Flag className="size-4" />} accent="#f59e0b" sub={highPriorityCards > 0 ? "باز" : undefined} />
      </div>

      {/* Kanban board */}
      {isKanbanLoading ? (
        <SectionCard title="تخته کانبان">
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 3 }).map((_, c) => (
              <div key={c} className="w-[280px] shrink-0 space-y-3">
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
              </div>
            ))}
          </div>
        </SectionCard>
      ) : displayColumns.length === 0 ? (
        <SectionCard title="تخته کانبان">
          <EmptyState
            icon="📋"
            title="هنوز ستونی نساخته‌اید"
            description="برای شروع، روی «افزودن ستون» بزنید. ستون‌های پیش‌فرض به‌صورت خودکار ساخته می‌شوند؛ اگر نبودند، یک بار صفحه را بازخوانی کنید."
          />
        </SectionCard>
      ) : (
        <SectionCard
          title="تخته کانبان"
          description={`${displayColumns.length} ستون · ${toPersianDigits(totalCards)} کارت`}
          actions={null}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
          >
            {/* Desktop: horizontal scroll of columns */}
            <div className="hidden md:block">
              <div className="flex gap-4 overflow-x-auto pb-3" style={{ minHeight: 420 }}>
                <SortableContext items={displayColumns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
                  <div className="flex gap-4">
                    {displayColumns.map((col) => (
                      <SortableColumn
                        key={col.id}
                        column={col}
                        options={options}
                        columns={displayColumns}
                        onAddCard={openCreateCard}
                        onEditCard={openEditCard}
                        onDeleteCard={(c) => setDeleteCard(c)}
                        onCompleteCard={handleCompleteCard}
                        onUncompleteCard={handleUncompleteCard}
                        onMoveCard={handleMoveCard}
                        onRenameColumn={handleRenameColumn}
                        onColorChange={handleColorChange}
                        onDeleteColumn={(c) => setDeleteCol(c)}
                      />
                    ))}
                    <AddColumnButton onAdd={handleAddColumn} adding={addingColumn} />
                  </div>
                </SortableContext>
              </div>
            </div>

            {/* Mobile: column tabs (single column at a time) */}
            <div className="md:hidden">
              <MobileColumnView
                columns={displayColumns}
                options={options}
                onAddCard={openCreateCard}
                onEditCard={openEditCard}
                onDeleteCard={(c) => setDeleteCard(c)}
                onCompleteCard={handleCompleteCard}
                onUncompleteCard={handleUncompleteCard}
                onMoveCard={handleMoveCard}
                onRenameColumn={handleRenameColumn}
                onColorChange={handleColorChange}
                onDeleteColumn={(c) => setDeleteCol(c)}
              />
              <div className="mt-3">
                <AddColumnButton onAdd={handleAddColumn} adding={addingColumn} />
              </div>
            </div>

            <DragOverlay>
              {activeCard ? (
                <div className="w-[260px] rounded-lg border bg-card p-2.5 shadow-lg">
                  <div className="text-sm font-medium">{activeCard.title}</div>
                  {activeCard.description && (
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{activeCard.description}</div>
                  )}
                </div>
              ) : activeColumn ? (
                <div className="w-[280px] rounded-xl border bg-muted/40 p-2.5 shadow-lg">
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 rounded-full" style={{ background: activeColumn.color }} />
                    <span className="text-sm font-semibold">{activeColumn.title}</span>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </SectionCard>
      )}

      {/* Secondary: project tasks assigned to me */}
      {myTasks.length > 0 && (
        <SectionCard
          title="تسک‌های محول‌شده"
          description={`${myTasks.length} تسک از پروژه‌ها به شما محول شده — برای تغییر وضعیت، وارد پروژه شوید`}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {myTasks.map((t) => (
              <ProjectTaskRow key={t.id} task={t} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Secondary: projects I'm on team for */}
      {myProjects.length > 0 && (
        <SectionCard
          title="پروژه‌های من"
          description={`${myProjects.length} پروژه که در تیم آن‌ها هستید`}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myProjects.map((p) => (
              <MyProjectCard key={p.id} project={p} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Dialogs */}
      <CardEditorDialog
        open={editorOpen}
        mode={editorMode}
        initial={editorInitial}
        options={options}
        onOpenChange={setEditorOpen}
        onSave={handleSaveCard}
        saving={editorSaving}
      />
      <NotifyDialog
        open={notifyCard !== null}
        card={notifyCard}
        options={options}
        onOpenChange={(o) => !o && setNotifyCard(null)}
        onConfirm={handleNotifyConfirm}
        onSkipNotify={handleSkipNotify}
        saving={notifySaving}
      />

      {/* Delete confirmations */}
      <AlertDialog open={deleteCol !== null} onOpenChange={(o) => !o && setDeleteCol(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف ستون «{deleteCol?.title}»؟</AlertDialogTitle>
            <AlertDialogDescription>
              این عمل قابل بازگشت نیست. تمام کارت‌های داخل این ستون (#{deleteCol?.cards.length ?? 0}) نیز حذف می‌شوند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCol && handleDeleteColumn(deleteCol)}
              className="bg-rose-600 hover:bg-rose-700"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={deleteCard !== null} onOpenChange={(o) => !o && setDeleteCard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف کارت «{deleteCard?.title}»؟</AlertDialogTitle>
            <AlertDialogDescription>این عمل قابل بازگشت نیست.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCard && handleDeleteCard(deleteCard)}
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

