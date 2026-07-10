// Domain constants & types (enums are stored as String in SQLite)

export const ROLES = [
  "admin",
  "manager",
  "sales",
  "photographer",
  "editor",
  "qc",
  "logistics",
] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  admin: "مدیر سیستم",
  manager: "مدیر",
  sales: "فروش",
  photographer: "عکاس",
  editor: "ادیتور",
  qc: "کنترل کیفیت",
  logistics: "تدارکات",
}

export const CUSTOMER_TYPES = ["individual", "company"] as const
export type CustomerType = (typeof CUSTOMER_TYPES)[number]

export const PACKAGE_CATEGORIES = ["photo", "video", "mix", "other"] as const
export type PackageCategory = (typeof PACKAGE_CATEGORIES)[number]

export const PACKAGE_QUALITIES = ["fullhd", "4k"] as const
export type PackageQuality = (typeof PACKAGE_QUALITIES)[number]

export const PRICING_STRATEGIES = ["variable", "delayed"] as const
export type PricingStrategy = (typeof PRICING_STRATEGIES)[number]

export const PROJECT_STATUSES = [
  "scheduled",
  "running",
  "managing",
  "editing",
  "qc",
  "render",
  "ready",
  "delivered",
] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const STATUS_FLOW: ProjectStatus[] = [
  "scheduled",
  "running",
  "managing",
  "editing",
  "qc",
  "render",
  "ready",
  "delivered",
]

// Backward-compat aliases: old DB rows / seed values map onto the new flow.
// (shooting → running, culling → managing)
export const STATUS_ALIASES: Record<string, ProjectStatus> = {
  shooting: "running",
  culling: "managing",
}

/** Normalize any status string (incl. legacy aliases) to a canonical ProjectStatus. */
export function normalizeStatus(s: string): ProjectStatus {
  if ((PROJECT_STATUSES as readonly string[]).includes(s)) return s as ProjectStatus
  return STATUS_ALIASES[s] ?? "scheduled"
}

// Labels include legacy aliases so older DB rows still render with the right Persian text.
export const STATUS_LABELS: Record<string, string> = {
  scheduled: "زمان‌بندی شده",
  running: "در حال اجرا",
  managing: "در حال مدیریت",
  editing: "در حال ادیت و تدوین",
  qc: "کنترل کیفیت",
  render: "چاپ و رندر",
  ready: "آماده تحویل",
  delivered: "تحویل داده شد",
  // legacy aliases
  shooting: "در حال اجرا",
  culling: "در حال مدیریت",
}

// Palette: slate → sky → amber → purple → pink → teal → emerald → green
// (readable in both light & dark mode; aliases reuse the canonical color)
export const STATUS_COLORS: Record<string, string> = {
  scheduled: "#64748b",
  running: "#0ea5e9",
  managing: "#f59e0b",
  editing: "#a855f7",
  qc: "#ec4899",
  render: "#14b8a6",
  ready: "#10b981",
  delivered: "#22c55e",
  // legacy aliases
  shooting: "#0ea5e9",
  culling: "#f59e0b",
}

export const CATEGORY_COLORS: Record<PackageCategory, string> = {
  photo: "#0ea5e9",
  video: "#ef4444",
  mix: "#a855f7",
  other: "#64748b",
}

export const CATEGORY_LABELS: Record<PackageCategory, string> = {
  photo: "عکس",
  video: "فیلم",
  mix: "عکس و فیلم",
  other: "سایر",
}

export const QUALITY_LABELS: Record<PackageQuality, string> = {
  fullhd: "FullHD",
  "4k": "4K",
}

export const PRICING_STRATEGY_LABELS: Record<PricingStrategy, string> = {
  variable: "متغیر",
  delayed: "مهلت‌دار",
}

// Print photo location labels
export const PHOTO_LOCATION_LABELS: Record<string, string> = {
  studio: "آتلیه",
  outdoor: "فضای بیرون",
  customer: "مشتری",
}

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  deposit: "بیعانه",
  installment: "قسط",
  settlement: "تسویه",
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "نقد",
  card: "کارت به کارت",
  pos: "POS",
  cheque: "چک",
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  office: "اداری",
  project_direct: "مستقیم پروژه",
  salary_fixed: "حقوق ثابت",
  tax: "مالیات",
  other: "سایر",
}

export const COMMISSION_TYPE_LABELS: Record<CommissionType, string> = {
  percent: "درصدی",
  fixed_per_project: "مقطوع هر پروژه",
}

export const APPLY_ON_LABELS: Record<ApplyOn, string> = {
  field_work: "کار میدانی",
  studio_work: "کار استودیو",
  delivery: "تحویل",
}

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: "در انتظار",
  approved: "تأیید شده",
  rejected: "رد شده",
}

export const CREDIT_TX_TYPE_LABELS: Record<CreditTxType, string> = {
  reward_referral: "پاداش معرفی",
  manual_adjustment: "تنظیم دستی",
  used: "مصرف شده",
}

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  individual: "حقیقی",
  company: "حقوقی",
}

export const TASK_STATUSES = ["todo", "in_progress", "done"] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "در صف",
  in_progress: "در حال انجام",
  done: "انجام شده",
}

export const NOTE_TYPES = ["text", "voice", "image", "file"] as const
export type NoteType = (typeof NOTE_TYPES)[number]

export const TRIGGER_EVENTS = [
  "before_event",
  "after_event",
  "after_ready",
  "after_photo_select",
] as const
export type TriggerEvent = (typeof TRIGGER_EVENTS)[number]

export const TRIGGER_EVENT_LABELS: Record<TriggerEvent, string> = {
  before_event: "قبل از رویداد",
  after_event: "بعد از رویداد",
  after_ready: "بعد از آماده‌شدن",
  after_photo_select: "بعد از انتخاب عکس",
}

export const PAYMENT_TYPES = ["deposit", "installment", "settlement"] as const
export type PaymentType = (typeof PAYMENT_TYPES)[number]

export const PAYMENT_METHODS = ["cash", "card", "pos", "cheque"] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const EXPENSE_CATEGORIES = [
  "office",
  "project_direct",
  "salary_fixed",
  "tax",
  "other",
] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const COMMISSION_TYPES = ["percent", "fixed_per_project"] as const
export type CommissionType = (typeof COMMISSION_TYPES)[number]

export const APPLY_ON = ["field_work", "studio_work", "delivery"] as const
export type ApplyOn = (typeof APPLY_ON)[number]

export const LEAVE_STATUSES = ["pending", "approved", "rejected"] as const
export type LeaveStatus = (typeof LEAVE_STATUSES)[number]

export const CREDIT_TX_TYPES = ["reward_referral", "manual_adjustment", "used"] as const
export type CreditTxType = (typeof CREDIT_TX_TYPES)[number]

// ---- Permissions ----
export const CAN_ACCESS_FULL_FINANCE: Role[] = ["admin", "manager"]
export const CAN_SEE_BALANCE: Role[] = ["admin", "manager", "sales"]
export const CAN_MANAGE_CUSTOMERS: Role[] = ["admin", "manager", "sales"]
export const CAN_MANAGE_PACKAGES: Role[] = ["admin"]
export const CAN_MANAGE_TAGS: Role[] = ["admin"]
export const CAN_MANAGE_SALARY_RULES: Role[] = ["admin"]
export const CAN_MANAGE_USERS: Role[] = ["admin"]
export const CAN_MANAGE_SYSTEM: Role[] = ["admin"]

export function canTransition(
  current: ProjectStatus,
  next: ProjectStatus,
  role: Role
): boolean {
  if (role === "admin" || role === "manager" || role === "sales") return true
  if (role === "photographer") {
    return (
      (current === "scheduled" && next === "running") ||
      (current === "running" && next === "managing")
    )
  }
  if (role === "editor") {
    return (
      (current === "managing" && next === "editing") ||
      (current === "editing" && next === "qc") ||
      (current === "qc" && next === "editing")
    )
  }
  if (role === "qc") {
    return (
      (current === "qc" && next === "render") ||
      (current === "qc" && next === "editing")
    )
  }
  if (role === "logistics") {
    return (
      (current === "render" && next === "ready") ||
      (current === "ready" && next === "delivered")
    )
  }
  return false
}

export const ROLE_PERMISSIONS: Record<
  Role,
  { finance: boolean; balance: boolean; customers: boolean; packages: boolean; tags: boolean; salaryRules: boolean; users: boolean; system: boolean; qr: boolean; scanner: boolean }
> = {
  admin: { finance: true, balance: true, customers: true, packages: true, tags: true, salaryRules: true, users: true, system: true, qr: true, scanner: true },
  manager: { finance: true, balance: true, customers: true, packages: false, tags: true, salaryRules: false, users: false, system: false, qr: true, scanner: true },
  sales: { finance: false, balance: true, customers: true, packages: false, tags: false, salaryRules: false, users: false, system: false, qr: true, scanner: true },
  photographer: { finance: false, balance: false, customers: false, packages: false, tags: false, salaryRules: false, users: false, system: false, qr: false, scanner: false },
  editor: { finance: false, balance: false, customers: false, packages: false, tags: false, salaryRules: false, users: false, system: false, qr: false, scanner: false },
  qc: { finance: false, balance: false, customers: false, packages: false, tags: false, salaryRules: false, users: false, system: false, qr: false, scanner: false },
  logistics: { finance: false, balance: false, customers: false, packages: false, tags: false, salaryRules: false, users: false, system: false, qr: false, scanner: false },
}

// ===================== DUAL-TRACK WORKFLOW =====================
// Each project has one or two tracks depending on its package category:
//   - photo → only "photo" track
//   - video → only "video" track
//   - mix → BOTH "photo" and "video" tracks (independent)
// Each track progresses through the 8 stages independently.
// The overall project status = the furthest-behind track (max of both).

export type WorkflowTrack = "photo" | "video"

// Which stages are AUTO-managed (by date) vs MANUAL (by assignee):
// - scheduled → running: AUTO (when startDatetime is within 7 days or passed)
// - running → managing: AUTO (when endDatetime passes)
// - all others: MANUAL (assignee marks complete → auto-advance to next)
// Exception: qc can go BACK to editing (rework) — no auto-advance on rework.
export const AUTO_STAGES: ProjectStatus[] = ["scheduled", "running"]

// Stages where an assignee is required (manual stages).
export const MANUAL_STAGES: ProjectStatus[] = [
  "managing", "editing", "qc", "render", "ready", "delivered",
]

// Which roles can be assigned to each stage (for the assignee picker).
export const STAGE_ASSIGNEE_ROLES: Record<string, Role[]> = {
  managing: ["manager", "admin", "sales"],
  editing: ["editor", "admin", "manager"],
  qc: ["qc", "admin", "manager"],
  render: ["logistics", "editor", "admin", "manager"],
  ready: ["manager", "admin", "sales", "logistics"],
  delivered: ["logistics", "manager", "admin"],
}

// The next stage in the flow (linear progression).
export const NEXT_STAGE: Record<ProjectStatus, ProjectStatus | null> = {
  scheduled: "running",
  running: "managing",
  managing: "editing",
  editing: "qc",
  qc: "render",
  render: "ready",
  ready: "delivered",
  delivered: null,
}

// Which tracks apply to a package category.
export function tracksForCategory(category: string): WorkflowTrack[] {
  if (category === "photo") return ["photo"]
  if (category === "video") return ["video"]
  return ["photo", "video"] // mix
}

// Compute the overall project status from track statuses.
// The overall = the LEAST-advanced track (min index in STATUS_FLOW).
export function overallStatus(photoStatus: string, videoStatus: string | null): ProjectStatus {
  const photoIdx = STATUS_FLOW.indexOf(normalizeStatus(photoStatus) as ProjectStatus)
  if (videoStatus === null) return normalizeStatus(photoStatus) as ProjectStatus
  const videoIdx = STATUS_FLOW.indexOf(normalizeStatus(videoStatus) as ProjectStatus)
  // The overall status is the one that's furthest behind (lower index)
  const minIdx = Math.min(photoIdx < 0 ? 0 : photoIdx, videoIdx < 0 ? 0 : videoIdx)
  return STATUS_FLOW[minIdx]
}

// Check if a stage transition is valid for a given role (dual-track aware).
export function canTransitionTrack(
  current: ProjectStatus,
  next: ProjectStatus,
  role: Role
): boolean {
  if (role === "admin" || role === "manager") return true
  // For assignees: they can complete their assigned stage (current → next)
  // and qc can send back to editing.
  const nextStage = NEXT_STAGE[current]
  if (next === nextStage) return true
  if (current === "qc" && next === "editing") return true // rework
  return false
}
