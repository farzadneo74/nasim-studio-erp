import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentRole, assertRole } from "@/lib/auth-helpers"
import { shapeField } from "../../route"

export const dynamic = "force-dynamic"

// PATCH /api/custom-fields/[id]/toggle — toggles isActive (admin/manager only).
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole()
  try {
    assertRole(role, ["admin", "manager"])
  } catch {
    return NextResponse.json({ error: "Forbidden: admin/manager only" }, { status: 403 })
  }

  const db = await getCurrentStudioDb()
  if (!db) {
    return NextResponse.json(
      { error: "No studio selected" },
      { status: 400 }
    )
  }

  const { id } = await params

  const existing = await db.customField.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Field not found" }, { status: 404 })
  }

  const updated = await db.customField.update({
    where: { id },
    data: { isActive: !existing.isActive },
  })

  return NextResponse.json(shapeField(updated))
}
