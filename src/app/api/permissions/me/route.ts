import { NextResponse } from "next/server"
import {
  resolveCurrentUserPermissions,
  getCurrentRole,
} from "@/lib/auth-helpers"
import {
  PERMISSION_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  migrateRole,
  type PermissionKey,
  type Role,
} from "@/lib/constants"

export const dynamic = "force-dynamic"

// ============================================================
// GET /api/permissions/me
// Returns the CURRENT user's effective permission map.
//   { role, effective, userOverrides }
// Used by the frontend to do client-side permission gating (via the
// usePermissions() / useHasPermission() hooks).
//
// If the user can't be resolved (e.g. all-studios mode), the response
// falls back to role defaults only (no per-user overrides applied).
// ============================================================
export async function GET() {
  // بررسی احراز هویت — اگر کاربر لاگین نکرده، 401 بده
  const role = await getCurrentRole()
  if (!role) {
    return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
  }

  const resolved = await resolveCurrentUserPermissions()
  if (resolved) {
    return NextResponse.json({
      role: resolved.role,
      effective: resolved.effective,
      userOverrides: resolved.userOverrides,
    })
  }

  // Fallback: all-studios mode — return role defaults only (no per-user overrides).
  const migratedRole = migrateRole(role) as Role
  const defaults = DEFAULT_ROLE_PERMISSIONS[migratedRole] ?? new Set<PermissionKey>()

  const effective: Record<string, boolean> = {}
  for (const key of PERMISSION_KEYS) {
    effective[key] = defaults.has(key)
  }

  return NextResponse.json({
    role: migratedRole,
    effective,
    userOverrides: {},
  })
}
