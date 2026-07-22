import { NextRequest, NextResponse } from "next/server"
import {
  getCurrentStudioDb,
  getCurrentRole,
  currentUserHasPermission,
} from "@/lib/auth-helpers"
import {
  ROLES,
  PERMISSION_KEYS,
  migrateRole,
  type Role,
  type PermissionKey,
} from "@/lib/constants"

export const dynamic = "force-dynamic"

// ============================================================
// GET /api/role-permissions
// Returns all studio-level role permission overrides in the studio.
// Permission gate: caller must have employees_manage OR be admin.
// ============================================================
export async function GET() {
  const callerRole = await getCurrentRole()
  const isAdmin = migrateRole(callerRole) === "admin"
  if (!isAdmin) {
    const hasEmpManage = await currentUserHasPermission("employees_manage")
    if (!hasEmpManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  let rows: Array<{
    id: string
    role: string
    permission: string
    granted: boolean
    createdAt: Date
    updatedAt: Date
  }> = []
  try {
    rows = await db.rolePermission.findMany({
      orderBy: [{ role: "asc" }, { permission: "asc" }],
    })
  } catch {
    // RolePermission table may not exist yet (pre-migration). Return [].
    return NextResponse.json([])
  }

  return NextResponse.json(rows)
}

// ============================================================
// PUT /api/role-permissions
// Body: { role, permission, granted }
// Upserts a RolePermission row.
// Permission gate: ADMIN ONLY (managers can't change role-level defaults —
// only per-user overrides via /api/users/[id]/permissions).
// Validation:
//   - role must be in ROLES.
//   - permission must be in PERMISSION_KEYS.
//   - granted must be a boolean.
// ============================================================
export async function PUT(req: NextRequest) {
  const callerRole = await getCurrentRole()
  if (migrateRole(callerRole) !== "admin") {
    return NextResponse.json(
      { error: "Forbidden: admin only" },
      { status: 403 }
    )
  }

  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const roleRaw = typeof body.role === "string" ? body.role : ""
  const permRaw = typeof body.permission === "string" ? body.permission : ""
  const grantedRaw = body.granted

  if (!ROLES.includes(roleRaw as Role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  }
  if (!PERMISSION_KEYS.includes(permRaw as PermissionKey)) {
    return NextResponse.json({ error: "Invalid permission" }, { status: 400 })
  }
  if (typeof grantedRaw !== "boolean") {
    return NextResponse.json({ error: "granted must be a boolean" }, { status: 400 })
  }

  const role = migrateRole(roleRaw) as Role
  const permission = permRaw as PermissionKey
  const granted = grantedRaw

  // Upsert by the compound unique key [role, permission] — the Prisma
  // compound key name is "role_permission" (the two field names joined
  // by an underscore, as declared by @@unique([role, permission])).
  let upserted: {
    id: string
    role: string
    permission: string
    granted: boolean
    createdAt: Date
    updatedAt: Date
  }
  try {
    upserted = await db.rolePermission.upsert({
      where: { role_permission: { role, permission } },
      create: { role, permission, granted },
      update: { granted },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upsert failed" },
      { status: 500 }
    )
  }

  return NextResponse.json(upserted)
}
