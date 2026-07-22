import { NextRequest, NextResponse } from "next/server"
import {
  getCurrentStudioDb,
  getCurrentRole,
  canManageUser,
  currentUserHasPermission,
} from "@/lib/auth-helpers"
import {
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  DEFAULT_ROLE_PERMISSIONS,
  parseUserPermissions,
  migrateRole,
  type PermissionKey,
  type Role,
} from "@/lib/constants"

export const dynamic = "force-dynamic"

// ============================================================
// GET /api/users/[id]/permissions
// Returns the user's full permission profile:
//   { userId, role, roleDefaults, userOverrides, effective }
// Permission gate: caller must have employees_manage OR be admin.
// ============================================================
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Gate: caller must have employees_manage OR be admin.
  const callerRole = await getCurrentRole()
  const isAdmin = migrateRole(callerRole) === "admin"
  if (!isAdmin) {
    const hasEmpManage = await currentUserHasPermission("employees_manage")
    if (!hasEmpManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }
  // Even admins/managers must pass canManageUser (which additionally blocks
  // managers from touching admin users). canManageUser returns true for admins.
  const canManage = await canManageUser(id)
  if (!canManage) {
    return NextResponse.json({ error: "Forbidden: cannot manage this user" }, { status: 403 })
  }

  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, role: true, permissions: true },
  })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const role = migrateRole(user.role) as Role
  const { overrides: userOverrides = {} } = parseUserPermissions(user.permissions)
  const defaults = DEFAULT_ROLE_PERMISSIONS[role] ?? new Set<PermissionKey>()

  // Studio-level role overrides (from RolePermission table) — these sit
  // between role defaults and per-user overrides in the resolution order.
  let roleOverrides: Record<string, boolean> = {}
  try {
    const rows = await db.rolePermission.findMany({ where: { role } })
    roleOverrides = Object.fromEntries(rows.map((r) => [r.permission, r.granted]))
  } catch {
    // RolePermission table may not exist yet (pre-migration). Ignore.
  }

  // Compute the effective permission map across ALL permission keys.
  const effective: Record<string, boolean> = {}
  for (const key of PERMISSION_KEYS) {
    let val = defaults.has(key)
    if (key in roleOverrides) val = roleOverrides[key] === true
    if (key in userOverrides) val = userOverrides[key] === true
    effective[key] = val
  }

  // roleDefaults: a plain boolean map of the role's DEFAULT_ROLE_PERMISSIONS.
  const roleDefaults: Record<string, boolean> = {}
  for (const key of PERMISSION_KEYS) {
    roleDefaults[key] = defaults.has(key)
  }

  return NextResponse.json({
    userId: user.id,
    role,
    roleDefaults,
    userOverrides,
    effective,
  })
}

// ============================================================
// PUT /api/users/[id]/permissions
// Body: { overrides: { customers_create: true, finances_full: false, ... } }
// Validation:
//   - Each key MUST be a valid PermissionKey.
//   - Each value MUST be a boolean.
//   - Non-admin callers CANNOT grant a permission they don't themselves have.
// Saves the overrides to User.permissions as JSON.stringify({ overrides }).
// Returns the updated effective map.
// ============================================================
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Gate: caller must have employees_manage permission.
  const callerRole = await getCurrentRole()
  const isAdmin = migrateRole(callerRole) === "admin"
  if (!isAdmin) {
    const hasEmpManage = await currentUserHasPermission("employees_manage")
    if (!hasEmpManage) {
      return NextResponse.json({ error: "Forbidden: missing employees_manage" }, { status: 403 })
    }
  }
  // Even with employees_manage, the caller must pass canManageUser(id) —
  // which blocks managers from touching admin users.
  const canManage = await canManageUser(id)
  if (!canManage) {
    return NextResponse.json({ error: "Forbidden: cannot manage this user" }, { status: 403 })
  }

  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const overridesRaw = body.overrides
  if (overridesRaw === null || typeof overridesRaw !== "object" || Array.isArray(overridesRaw)) {
    return NextResponse.json({ error: "Invalid overrides: must be an object" }, { status: 400 })
  }

  // Validate every key/value pair.
  const overrides: Record<string, boolean> = {}
  for (const [key, value] of Object.entries(overridesRaw as Record<string, unknown>)) {
    if (!PERMISSION_KEYS.includes(key as PermissionKey)) {
      return NextResponse.json(
        { error: `Invalid permission key: ${key}` },
        { status: 400 }
      )
    }
    if (typeof value !== "boolean") {
      return NextResponse.json(
        { error: `Invalid value for ${key}: must be boolean` },
        { status: 400 }
      )
    }
    overrides[key] = value
  }

  // Managers (non-admins) CANNOT grant a permission they don't have.
  if (!isAdmin) {
    for (const [key, value] of Object.entries(overrides)) {
      if (value === true) {
        const allowed = await currentUserHasPermission(key as PermissionKey)
        if (!allowed) {
          const label = PERMISSION_LABELS[key as PermissionKey] ?? key
          return NextResponse.json(
            { error: `شما اجازه اعطای این دسترسی را ندارید: ${label}` },
            { status: 403 }
          )
        }
      }
    }
  }

  // Fetch the user's current record to resolve effective map after update.
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, role: true, permissions: true },
  })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // Persist the new overrides (completely replace the previous override set).
  const payload = JSON.stringify({ overrides })
  await db.user.update({
    where: { id },
    data: { permissions: payload },
  })

  // Recompute the effective map to return to the caller.
  const role = migrateRole(user.role) as Role
  const defaults = DEFAULT_ROLE_PERMISSIONS[role] ?? new Set<PermissionKey>()

  let roleOverrides: Record<string, boolean> = {}
  try {
    const rows = await db.rolePermission.findMany({ where: { role } })
    roleOverrides = Object.fromEntries(rows.map((r) => [r.permission, r.granted]))
  } catch {
    // ignore
  }

  const effective: Record<string, boolean> = {}
  for (const key of PERMISSION_KEYS) {
    let val = defaults.has(key)
    if (key in roleOverrides) val = roleOverrides[key] === true
    if (key in overrides) val = overrides[key] === true
    effective[key] = val
  }

  return NextResponse.json({
    userId: user.id,
    role,
    userOverrides: overrides,
    effective,
  })
}
