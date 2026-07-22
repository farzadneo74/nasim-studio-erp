import { masterDb } from "./master-db"
import { getStudioDb } from "./studio-db"
import { getCurrentUser as getAuthUser } from "./auth"
import { PrismaClient } from "@prisma/client"
import {
  hasPermission,
  hasUserPermission,
  migrateRole,
  parseUserPermissions,
  type PermissionKey,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_KEYS,
  ROLES,
} from "./constants"

export { getAuthUser as getCurrentUser }
export type { AuthUser } from "./auth"

export async function getCurrentRole(): Promise<string> {
  const user = await getAuthUser()
  return user?.role ?? "admin"
}

export async function getCurrentStudioDb(): Promise<PrismaClient | null> {
  const user = await getAuthUser()
  if (user?.studioId && user.studioId !== "all") {
    const studio = await masterDb.studio.findUnique({ where: { id: user.studioId } })
    if (studio) return getStudioDb(studio.dbName)
  }
  if (user?.studioId === "all") return null
  const { db } = await import("./db")
  return db
}

export async function getAllStudioDbs() {
  const user = await getAuthUser()
  if (!user) return []
  const memberships = await masterDb.studioMembership.findMany({ where: { userId: user.userId, isActive: true }, include: { studio: true } })
  return memberships.map((m) => ({ db: getStudioDb(m.studio.dbName), studioName: m.studio.name, studioId: m.studio.id }))
}

export async function isAllStudiosMode(): Promise<boolean> {
  const user = await getAuthUser()
  return user?.studioId === "all"
}

export function assertRole(actual: string, allowed: string[]) {
  if (!allowed.includes(actual)) throw new Error("Forbidden: insufficient role")
}

/**
 * Returns the current studio's dbName (used as studioId in Attachment table +
 * the storage directory name). Returns null if not in a single-studio context.
 */
export async function getCurrentStudioDbName(): Promise<string | null> {
  const user = await getAuthUser()
  if (!user?.studioId || user.studioId === "all") return null
  const studio = await masterDb.studio.findUnique({ where: { id: user.studioId }, select: { dbName: true } })
  return studio?.dbName ?? null
}

/**
 * Returns the current studio's SQLite file path (for backup). Resolves the
 * DATABASE_URL pattern "file:../db/<dbName>" relative to the prisma dir.
 */
export async function getCurrentStudioDbPath(): Promise<string | null> {
  const dbName = await getCurrentStudioDbName()
  if (!dbName) return null
  return `${process.cwd()}/db/${dbName}`
}

/**
 * دریافت شناسه کاربر فعلی در دیتابیس استودیو
 *
 * This resolver prefers the phone number (unique across both DBs) to find the
 * matching studio user. If the phone isn't found, it falls back to matching
 * by role — which assumes one user per role (fine for demo mode).
 */
export async function getCurrentStudioUserId(): Promise<string | null> {
  const authUser = await getAuthUser()
  if (!authUser) return null
  const role = authUser.role ?? "admin"
  const db = await getCurrentStudioDb()
  if (!db) return null

  // 1) Try by phone (most reliable — phone is unique in both DBs)
  if (authUser.phone) {
    const byPhone = await db.user.findFirst({
      where: { phone: authUser.phone },
      select: { id: true },
    })
    if (byPhone) return byPhone.id
  }

  // 2) Fallback: first user with the same role (demo-mode compatibility)
  const user = await db.user.findFirst({
    where: { role },
    select: { id: true },
  })
  return user?.id ?? null
}

/**
 * Get the current studio user record (full row, including permissions JSON).
 * Returns null if not in a single-studio context or the user can't be resolved.
 */
export async function getCurrentStudioUser() {
  const id = await getCurrentStudioUserId()
  if (!id) return null
  const db = await getCurrentStudioDb()
  if (!db) return null
  return db.user.findUnique({ where: { id }, select: { id: true, role: true, permissions: true, firstName: true, lastName: true } })
}

// ===================== PERMISSION HELPERS =====================
//
// Permission resolution order:
//   1. Per-user override (User.permissions JSON: { overrides: { permKey: bool } })
//   2. Studio-level role override (RolePermission table)
//   3. Role default (DEFAULT_ROLE_PERMISSIONS)
//
// A `false` override always wins (defense in depth — managers can't grant
// permissions they don't have; admins can revoke any permission).

export interface ResolvedPermissions {
  role: string
  /** Map of permission key → effective boolean value (resolved per-user). */
  effective: Record<PermissionKey, boolean>
  /** The raw per-user overrides stored on the User row. */
  userOverrides: Record<string, boolean>
}

/**
 * Resolve the full effective permission map for the current user in the
 * current studio context. Returns null if the user can't be resolved
 * (e.g. all-studios mode or not logged in).
 */
export async function resolveCurrentUserPermissions(): Promise<ResolvedPermissions | null> {
  const studioUser = await getCurrentStudioUser()
  if (!studioUser) return null

  const role = migrateRole(studioUser.role)
  const { overrides: userOverrides = {} } = parseUserPermissions(studioUser.permissions)

  // Default permissions for the user's role
  const defaults = DEFAULT_ROLE_PERMISSIONS[role] ?? new Set<PermissionKey>()

  // Studio-level role overrides (from RolePermission table)
  const db = await getCurrentStudioDb()
  let roleOverrides: Record<string, boolean> = {}
  if (db) {
    try {
      const rows = await db.rolePermission.findMany({ where: { role } })
      roleOverrides = Object.fromEntries(rows.map((r) => [r.permission, r.granted]))
    } catch {
      // RolePermission table may not exist yet (pre-migration). Ignore.
    }
  }

  // Compute effective map across ALL permission keys (iterate the canonical
  // PERMISSION_KEYS list, NOT Object.keys(defaults) — Set.keys returns an
  // iterator, and Object.keys(set) returns an empty array).
  const effective = {} as Record<PermissionKey, boolean>
  for (const key of PERMISSION_KEYS) {
    // Start with role default
    let val = defaults.has(key)
    // Apply studio-level role override
    if (key in roleOverrides) val = roleOverrides[key] === true
    // Apply per-user override (highest priority)
    if (key in userOverrides) val = userOverrides[key] === true
    effective[key] = val
  }

  return {
    role,
    effective,
    userOverrides,
  }
}

/**
 * Check whether the CURRENT user has a given permission.
 * Resolves per-user overrides + studio role overrides + role defaults.
 */
export async function currentUserHasPermission(perm: PermissionKey): Promise<boolean> {
  const resolved = await resolveCurrentUserPermissions()
  if (!resolved) {
    // Fallback to role-only check (e.g. all-studios mode)
    const role = await getCurrentRole()
    return hasPermission(role, perm)
  }
  return resolved.effective[perm] === true
}

/**
 * Check whether the CURRENT user has ANY of the given permissions.
 */
export async function currentUserHasAnyPermission(perms: PermissionKey[]): Promise<boolean> {
  for (const p of perms) {
    if (await currentUserHasPermission(p)) return true
  }
  return false
}

/**
 * Check whether the CURRENT user has ALL of the given permissions.
 */
export async function currentUserHasAllPermissions(perms: PermissionKey[]): Promise<boolean> {
  for (const p of perms) {
    if (!(await currentUserHasPermission(p))) return false
  }
  return true
}

/**
 * Throw a 403-style error if the current user lacks the given permission.
 */
export async function requirePermission(perm: PermissionKey): Promise<void> {
  if (!(await currentUserHasPermission(perm))) {
    throw new Error(`Forbidden: missing permission "${perm}"`)
  }
}

/**
 * Check whether the CURRENT user can manage a specific other user.
 * Managers can manage users whose role is "lower" in the hierarchy.
 * Users can never manage their own role/permissions (only an admin can).
 */
export async function canManageUser(targetUserId: string): Promise<boolean> {
  const studioUser = await getCurrentStudioUser()
  if (!studioUser) return false
  if (migrateRole(studioUser.role) === "admin") return true
  if (!hasUserPermission(studioUser.role, "employees_manage", studioUser.permissions)) return false
  // Managers can't touch admin users
  const db = await getCurrentStudioDb()
  if (!db) return false
  const target = await db.user.findUnique({ where: { id: targetUserId }, select: { role: true } })
  if (!target) return false
  if (migrateRole(target.role) === "admin") return false
  return true
}

export {
  hasPermission,
  hasUserPermission,
  migrateRole,
  ROLES,
}


