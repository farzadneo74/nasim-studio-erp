import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentRole, assertRole } from "@/lib/auth-helpers"
import { CUSTOM_FIELD_TYPES, shapeField, type CustomFieldType } from "../route"

export const dynamic = "force-dynamic"

const OPTION_TYPES = new Set<CustomFieldType>([
  "select",
  "radio",
  "checkbox",
  "multiselect",
])

export async function PATCH(
  req: NextRequest,
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

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const existing = await db.customField.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Field not found" }, { status: 404 })
  }

  const data: Record<string, unknown> = {}

  if (typeof body.label === "string") {
    const label = body.label.trim()
    if (!label) {
      return NextResponse.json({ error: "Label cannot be empty" }, { status: 400 })
    }
    data.label = label
  }

  if (typeof body.name === "string") {
    const name = body.name.trim()
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
      return NextResponse.json(
        { error: "Name must be English letters/digits/underscore and start with a letter" },
        { status: 400 }
      )
    }
    if (name !== existing.name) {
      const dup = await db.customField.findFirst({ where: { name } })
      if (dup) {
        return NextResponse.json(
          { error: "A field with this name already exists" },
          { status: 409 }
        )
      }
    }
    data.name = name
  }

  if (typeof body.type === "string") {
    if (!CUSTOM_FIELD_TYPES.includes(body.type as CustomFieldType)) {
      return NextResponse.json(
        { error: "Invalid type" },
        { status: 400 }
      )
    }
    data.type = body.type
  }

  // Options
  if (Array.isArray(body.options)) {
    const opts = body.options.map((x) => String(x).trim()).filter(Boolean)
    data.options = JSON.stringify(opts)
  } else if (
    typeof body.type === "string" &&
    !OPTION_TYPES.has(body.type as CustomFieldType) &&
    body.type !== existing.type
  ) {
    // Type changed away from option-types — clear options.
    data.options = JSON.stringify([])
  }

  if (typeof body.required === "boolean") data.required = body.required
  if (typeof body.isActive === "boolean") data.isActive = body.isActive
  if (typeof body.order === "number" && Number.isFinite(body.order)) {
    data.order = Math.floor(body.order)
  }

  const updated = await db.customField.update({
    where: { id },
    data,
  })

  return NextResponse.json(shapeField(updated))
}

export async function DELETE(
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

  // Cascade delete will remove CustomFieldValue rows.
  await db.customField.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

