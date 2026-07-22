import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentRole } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

// GET /api/custom-fields/values?customerId=<id>
// Returns all CustomFieldValues for a customer, joined with field label/type.
export async function GET(req: NextRequest) {
  await getCurrentRole()
  const db = await getCurrentStudioDb()
  if (!db) {
    return NextResponse.json(
      { error: "No studio selected" },
      { status: 400 }
    )
  }

  const url = new URL(req.url)
  const customerId = url.searchParams.get("customerId")
  if (!customerId) {
    return NextResponse.json(
      { error: "customerId query param is required" },
      { status: 400 }
    )
  }

  const values = await db.customFieldValue.findMany({
    where: { customerId },
    include: { field: true },
  })

  return NextResponse.json(
    values.map((v) => ({
      id: v.id,
      fieldId: v.fieldId,
      customerId: v.customerId,
      value: v.value,
      label: v.field.label,
      name: v.field.name,
      type: v.field.type,
      options: safeParseOptions(v.field.options),
      required: v.field.required,
      isActive: v.field.isActive,
      order: v.field.order,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    }))
  )
}

// PUT /api/custom-fields/values
// Body: { customerId, values: [{ fieldId, value }] }
// Upserts values for a customer. value is the JSON-encoded string.
export async function PUT(req: NextRequest) {
  const role = await getCurrentRole()
  // Allow any authenticated user (sales/admin/manager) to set values; this matches
  // the customer-form permission flow (anyone who can edit a customer can set CFs).
  if (!role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const db = await getCurrentStudioDb()
  if (!db) {
    return NextResponse.json(
      { error: "No studio selected" },
      { status: 400 }
    )
  }

  let body: {
    customerId?: string
    values?: { fieldId: string; value: string }[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const customerId = String(body.customerId || "").trim()
  if (!customerId) {
    return NextResponse.json(
      { error: "customerId is required" },
      { status: 400 }
    )
  }

  const incoming = Array.isArray(body.values) ? body.values : []
  if (incoming.length === 0) {
    return NextResponse.json({ ok: true, updated: 0 })
  }

  // Verify the customer exists.
  const customer = await db.customer.findUnique({ where: { id: customerId } })
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 })
  }

  // Verify all fieldIds exist (avoid orphan values).
  const fieldIds = incoming.map((v) => v.fieldId).filter(Boolean)
  if (fieldIds.length === 0) {
    return NextResponse.json({ ok: true, updated: 0 })
  }

  const fields = await db.customField.findMany({
    where: { id: { in: fieldIds } },
    select: { id: true },
  })
  const validFieldIds = new Set(fields.map((f) => f.id))

  let updated = 0
  for (const v of incoming) {
    if (!validFieldIds.has(v.fieldId)) continue
    const valueStr = typeof v.value === "string" ? v.value : JSON.stringify(v.value ?? "")
    try {
      await db.customFieldValue.upsert({
        where: {
          customerId_fieldId: { customerId, fieldId: v.fieldId },
        },
        create: { customerId, fieldId: v.fieldId, value: valueStr },
        update: { value: valueStr },
      })
      updated++
    } catch {
      // ignore individual failures (likely just no-op)
    }
  }

  return NextResponse.json({ ok: true, updated })
}

function safeParseOptions(s: string): string[] {
  try {
    const parsed = JSON.parse(s)
    if (Array.isArray(parsed)) return parsed.map((x) => String(x))
  } catch {
    /* ignore */
  }
  return []
}

