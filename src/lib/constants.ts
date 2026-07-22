// Domain constants & types (enums are stored as String in SQLite)
// NOTE: ROLES, Role, ROLE_LABELS are defined further down in the
// "New Role & Permission System" section. The 8-role system is the
// canonical one — the old 7-role system (admin/manager/sales/photographer/
// editor/qc/logistics) has been fully retired.

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

// ===================== NEW ROLE & PERMISSION SYSTEM =====================
// 8 canonical roles with a granular, extensible permission system.
// Each role has a default permission set defined in DEFAULT_ROLE_PERMISSIONS.
// Per-user overrides are stored in the User.permissions JSON column
// (added in the schema migration). Studio managers can also override
// role-level defaults via the RolePermission table.
//
// To add a NEW role:
//   1. Add the role key to ROLES
//   2. Add a Persian label to ROLE_LABELS
//   3. Add an entry to DEFAULT_ROLE_PERMISSIONS
//   4. Optionally add to STAGE_ASSIGNEE_ROLES
//
// To add a NEW permission:
//   1. Add the key to PERMISSION_KEYS
//   2. Add a Persian label to PERMISSION_LABELS
//   3. Grant it to whichever roles should have it by default in DEFAULT_ROLE_PERMISSIONS
//   4. Use hasPermission(role, "new_perm") in UI/API to check

export const ROLES = [
  "admin",        // مدیر کل — full access
  "manager",      // مدیر — most access except system config
  "sales",        // فروش — customers + projects (no financial details)
  "photographer", // عکاس — own projects only
  "videographer", // تصویربردار — own projects only
  "pro_crew",     // کادر حرفه‌ای — own projects only (multi-role field crew)
  "editor",       // ادیتور — own projects only
  "film_editor",  // تدوین‌کار — own projects only
] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  admin: "مدیر کل",
  manager: "مدیر",
  sales: "فروش",
  photographer: "عکاس",
  videographer: "تصویربردار",
  pro_crew: "کادر حرفه‌ای",
  editor: "ادیتور",
  film_editor: "تدوین‌کار",
}

// Group roles by their team for display in the UI
export const ROLE_TEAMS: Record<Role, "management" | "sales" | "field" | "edit"> = {
  admin: "management",
  manager: "management",
  sales: "sales",
  photographer: "field",
  videographer: "field",
  pro_crew: "field",
  editor: "edit",
  film_editor: "edit",
}

export const ROLE_TEAM_LABELS: Record<"management" | "sales" | "field" | "edit", string> = {
  management: "مدیریت",
  sales: "فروش",
  field: "تیم میدانی",
  edit: "تیم ادیت",
}

// Color badge per role for visual identification
export const ROLE_BADGE_COLORS: Record<Role, string> = {
  admin: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  manager: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  sales: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  photographer: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  videographer: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  pro_crew: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300",
  editor: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  film_editor: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
}

// Legacy role migration: map old role names to the new system
export const LEGACY_ROLE_MIGRATION: Record<string, Role> = {
  qc: "editor",        // qc → editor (both do quality checks)
  logistics: "pro_crew", // logistics → pro_crew (general field crew)
}

/** Migrate any legacy role string to the new 8-role system. */
export function migrateRole(role: string): Role {
  if ((ROLES as readonly string[]).includes(role)) return role as Role
  return LEGACY_ROLE_MIGRATION[role] ?? "pro_crew"
}

// ---- Extensible Permission System ----
// Each permission is a feature/module that can be granted to a role.
// To add a new permission: add it to PermissionKey, DEFAULT_ROLE_PERMISSIONS, and use it in the UI/API.
export const PERMISSION_KEYS = [
  "dashboard",
  "calendar",
  "reports",
  "customers",
  "customers_create",
  "customers_edit",
  "projects",
  "projects_create",
  "projects_edit",
  "projects_workflow",
  "projects_financials",
  "my_tasks",
  "messages",
  "finances",
  "finances_full",
  "qr_factory",
  "scanner",
  "packages",
  "packages_manage",
  "tags",
  "print_photo_prices",
  "employees",
  "employees_manage",
  "salary_rules",
  "sms_templates",
  "custom_fields",
  "system",
  "storage",
] as const
export type PermissionKey = (typeof PERMISSION_KEYS)[number]

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  dashboard: "داشبورد",
  calendar: "تقویم",
  reports: "گزارش‌ها",
  customers: "مشاهده مشتریان",
  customers_create: "ایجاد مشتری",
  customers_edit: "ویرایش مشتری",
  projects: "مشاهده پروژه‌ها",
  projects_create: "ایجاد پروژه",
  projects_edit: "ویرایش پروژه",
  projects_workflow: "گردش کار پروژه",
  projects_financials: "مالی پروژه",
  my_tasks: "کارهای من",
  messages: "پیام‌رسان",
  finances: "بخش مالی",
  finances_full: "مالی کامل (هزینه‌ها)",
  qr_factory: "کارخانه QR",
  scanner: "اسکنر",
  packages: "مشاهده پکیج‌ها",
  packages_manage: "مدیریت پکیج‌ها",
  tags: "تگ‌ها",
  print_photo_prices: "قیمت عکس چاپی",
  employees: "مشاهده کارمندان",
  employees_manage: "مدیریت کارمندان",
  salary_rules: "قوانین حقوق",
  sms_templates: "قالب پیامک",
  custom_fields: "فیلدهای سفارشی",
  system: "تنظیمات سیستم",
  storage: "فضای ذخیره‌سازی",
}

// Default permissions per role — can be overridden per-user in the future
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Set<PermissionKey>> = {
  admin: new Set(PERMISSION_KEYS as readonly string[] as PermissionKey[]),
  manager: new Set([
    "dashboard", "calendar", "reports", "customers", "customers_create", "customers_edit",
    "projects", "projects_create", "projects_edit", "projects_workflow", "projects_financials",
    "my_tasks", "messages", "finances", "finances_full", "qr_factory", "scanner",
    "packages", "packages_manage", "tags", "print_photo_prices",
    "employees", "employees_manage", "salary_rules", "sms_templates", "custom_fields",
    "storage",
  ] as PermissionKey[]),
  sales: new Set([
    "dashboard", "calendar", "customers", "customers_create", "customers_edit",
    "projects", "projects_create", "projects_financials", "my_tasks", "messages",
    "qr_factory", "scanner", "packages",
  ] as PermissionKey[]),
  photographer: new Set([
    "dashboard", "calendar", "my_tasks", "messages", "projects",
  ] as PermissionKey[]),
  videographer: new Set([
    "dashboard", "calendar", "my_tasks", "messages", "projects",
  ] as PermissionKey[]),
  pro_crew: new Set([
    "dashboard", "calendar", "my_tasks", "messages", "projects",
  ] as PermissionKey[]),
  editor: new Set([
    "dashboard", "calendar", "my_tasks", "messages", "projects",
  ] as PermissionKey[]),
  film_editor: new Set([
    "dashboard", "calendar", "my_tasks", "messages", "projects",
  ] as PermissionKey[]),
}

// Check if a role has a permission (defaults only — does NOT consult per-user overrides).
// Use `hasUserPermission()` from auth-helpers for the full per-user check.
export function hasPermission(role: string, perm: PermissionKey): boolean {
  const r = migrateRole(role) as Role
  if (!(r in DEFAULT_ROLE_PERMISSIONS)) return false
  return DEFAULT_ROLE_PERMISSIONS[r].has(perm)
}

// ---- Per-user permission overrides ----
// Stored in User.permissions JSON column as:
//   { "overrides": { "customers_create": false, "finances_full": true, ... } }
// A `false` value REVOKES a permission the role would otherwise have.
// A `true` value GRANTS a permission the role wouldn't have by default.
// (Managers can only GRANT permissions they themselves hold — enforced in API.)
export type UserPermissionOverrides = Partial<Record<PermissionKey, boolean>>

export interface UserPermissionsPayload {
  overrides?: UserPermissionOverrides
}

export function parseUserPermissions(raw: string | null | undefined): UserPermissionsPayload {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null) return {}
    return parsed as UserPermissionsPayload
  } catch {
    return {}
  }
}

/** Effective permission for a specific user, accounting for role defaults + overrides. */
export function hasUserPermission(
  role: string,
  perm: PermissionKey,
  userPermissionsJson?: string | null
): boolean {
  const r = migrateRole(role) as Role
  const defaults = DEFAULT_ROLE_PERMISSIONS[r] ?? new Set<PermissionKey>()
  const payload = parseUserPermissions(userPermissionsJson)
  const override = payload.overrides?.[perm]
  if (override === true) return true
  if (override === false) return false
  return defaults.has(perm)
}

// ---- Backward-compatibility shim: ROLE_PERMISSIONS[role].xxx ----
// Many existing call sites use the old `ROLE_PERMISSIONS[role]?.xxx` object shape.
// This shim maps the old property names onto the new permission keys so those
// call sites continue to work without requiring a sweeping refactor. New code
// should use `hasPermission()` / `hasUserPermission()` directly.
type LegacyPermissionShape = {
  dashboard?: boolean
  calendar?: boolean
  reports?: boolean
  customers?: boolean
  customersCreate?: boolean
  customersEdit?: boolean
  projects?: boolean
  projectsCreate?: boolean
  projectsEdit?: boolean
  projectsWorkflow?: boolean
  projectsFinancials?: boolean
  myTasks?: boolean
  messages?: boolean
  finances?: boolean
  financesFull?: boolean
  qr?: boolean
  qrFactory?: boolean
  scanner?: boolean
  packages?: boolean
  packagesManage?: boolean
  tags?: boolean
  printPhotoPrices?: boolean
  employees?: boolean
  employeesManage?: boolean
  users?: boolean
  salaryRules?: boolean
  smsTemplates?: boolean
  customFields?: boolean
  system?: boolean
  storage?: boolean
}

const LEGACY_TO_NEW: Record<keyof LegacyPermissionShape, PermissionKey> = {
  dashboard: "dashboard",
  calendar: "calendar",
  reports: "reports",
  customers: "customers",
  customersCreate: "customers_create",
  customersEdit: "customers_edit",
  projects: "projects",
  projectsCreate: "projects_create",
  projectsEdit: "projects_edit",
  projectsWorkflow: "projects_workflow",
  projectsFinancials: "projects_financials",
  myTasks: "my_tasks",
  messages: "messages",
  finances: "finances",
  financesFull: "finances_full",
  qr: "qr_factory",
  qrFactory: "qr_factory",
  scanner: "scanner",
  packages: "packages",
  packagesManage: "packages_manage",
  tags: "tags",
  printPhotoPrices: "print_photo_prices",
  employees: "employees",
  employeesManage: "employees_manage",
  users: "employees_manage",
  salaryRules: "salary_rules",
  smsTemplates: "sms_templates",
  customFields: "custom_fields",
  system: "system",
  storage: "storage",
}

export const ROLE_PERMISSIONS: Record<string, LegacyPermissionShape> = ROLES.reduce(
  (acc, r) => {
    const shape: LegacyPermissionShape = {}
    for (const [legacyKey, permKey] of Object.entries(LEGACY_TO_NEW) as [
      keyof LegacyPermissionShape,
      PermissionKey,
    ][]) {
      ;(shape as Record<string, boolean>)[legacyKey] = hasPermission(r, permKey)
    }
    acc[r] = shape
    return acc
  },
  {} as Record<string, LegacyPermissionShape>
)

// Legacy compatibility — derived from new permission system
export const CAN_ACCESS_FULL_FINANCE: Role[] = ROLES.filter((r) => hasPermission(r, "finances_full"))
export const CAN_SEE_BALANCE: Role[] = ROLES.filter((r) => hasPermission(r, "projects_financials"))
export const CAN_MANAGE_CUSTOMERS: Role[] = ROLES.filter((r) => hasPermission(r, "customers_edit"))
export const CAN_MANAGE_PACKAGES: Role[] = ROLES.filter((r) => hasPermission(r, "packages_manage"))
export const CAN_MANAGE_TAGS: Role[] = ROLES.filter((r) => hasPermission(r, "tags"))
export const CAN_MANAGE_SALARY_RULES: Role[] = ROLES.filter((r) => hasPermission(r, "salary_rules"))
export const CAN_MANAGE_USERS: Role[] = ROLES.filter((r) => hasPermission(r, "employees_manage"))
export const CAN_MANAGE_SYSTEM: Role[] = ROLES.filter((r) => hasPermission(r, "system"))

// Technical roles = anyone who works on projects in the field or edit room.
// (Used for project scoping: technical roles only see projects they're assigned to.)
export const TECHNICAL_ROLES: Role[] = [
  "photographer", "videographer", "pro_crew", "editor", "film_editor",
]
export function isTechnicalRole(role: string): boolean {
  return (TECHNICAL_ROLES as readonly string[]).includes(migrateRole(role))
}
export function isManagementRole(role: string): boolean {
  const r = migrateRole(role)
  return r === "admin" || r === "manager"
}

export function canTransition(
  current: ProjectStatus,
  next: ProjectStatus,
  role: Role
): boolean {
  if (hasPermission(role, "projects_workflow")) return true
  // For assignees: they can complete their assigned stage (current → next)
  const nextStage = NEXT_STAGE[current]
  if (next === nextStage) return true
  if (current === "qc" && next === "editing") return true // rework
  return false
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
  editing: ["editor", "film_editor", "admin", "manager"],
  qc: ["editor", "film_editor", "admin", "manager"],
  render: ["film_editor", "editor", "admin", "manager"],
  ready: ["manager", "admin", "sales"],
  delivered: ["manager", "admin", "sales"],
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
  if (hasPermission(role, "projects_workflow")) return true
  // For assignees: they can complete their assigned stage (current → next)
  // and qc can send back to editing.
  const nextStage = NEXT_STAGE[current]
  if (next === nextStage) return true
  if (current === "qc" && next === "editing") return true // rework
  return false
}

