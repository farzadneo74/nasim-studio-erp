import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentRole, assertRole } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

export const CUSTOM_FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "select",
  "radio",
  "checkbox",
  "multiselect",
  "date",
  "datetime",
  "image",
  "audio",
  "file",
  "video",
  "color",
  "tags",
] as const

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number]

const OPTION_TYPES = new Set<CustomFieldType>([
  "select",
  "radio",
  "checkbox",
  "multiselect",
])

export function shapeField(f: {
  id: string
  name: string
  label: string
  type: string
  options: string
  required: boolean
  isActive: boolean
  order: number
  createdAt: Date
  updatedAt: Date
}) {
  let opts: string[] = []
  try {
    const parsed = JSON.parse(f.options)
    if (Array.isArray(parsed)) {
      opts = parsed.map((x) => String(x))
    }
  } catch {
    opts = []
  }
  return {
    id: f.id,
    name: f.name,
    label: f.label,
    type: f.type,
    options: opts,
    required: f.required,
    isActive: f.isActive,
    order: f.order,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  }
}

// GET — any authenticated role. Returns all custom fields (active + inactive).
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
  const onlyActive = url.searchParams.get("active") === "true"

  const fields = await db.customField.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  })

  let result = fields.map(shapeField)
  if (onlyActive) {
    result = result.filter((f) => f.isActive)
  }
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
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

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const label = String(body.label || "").trim()
  if (!label) {
    return NextResponse.json({ error: "Label is required" }, { status: 400 })
  }

  // Auto-derive machine name from label if not provided.
  let name = String(body.name || "").trim()
  if (!name) {
    name = slugify(label)
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
    return NextResponse.json(
      { error: "Name must be English letters/digits/underscore and start with a letter" },
      { status: 400 }
    )
  }

  const type = String(body.type || "").trim()
  if (!CUSTOM_FIELD_TYPES.includes(type as CustomFieldType)) {
    return NextResponse.json(
      { error: "Invalid type. Must be one of: " + CUSTOM_FIELD_TYPES.join(", ") },
      { status: 400 }
    )
  }

  // Options for select/radio/checkbox/multiselect
  let options: string[] = []
  if (OPTION_TYPES.has(type as CustomFieldType)) {
    const raw = body.options
    if (Array.isArray(raw)) {
      options = raw.map((x) => String(x).trim()).filter(Boolean)
    }
  }

  const required = body.required === true
  const isActive = body.isActive !== false // default true
  const order =
    typeof body.order === "number" && Number.isFinite(body.order)
      ? Math.floor(body.order)
      : 0

  // Unique name check
  const dup = await db.customField.findFirst({ where: { name } })
  if (dup) {
    return NextResponse.json(
      { error: "A field with this name already exists" },
      { status: 409 }
    )
  }

  const created = await db.customField.create({
    data: {
      name,
      label,
      type,
      options: JSON.stringify(options),
      required,
      isActive,
      order,
    },
  })

  return NextResponse.json(shapeField(created), { status: 201 })
}

function slugify(s: string): string {
  // Map common Persian characters to English letters; otherwise strip.
  const map: Record<string, string> = {
    ا: "a",
    آ: "a",
    ب: "b",
    پ: "p",
    ت: "t",
    ث: "s",
    ج: "j",
    چ: "ch",
    ح: "h",
    خ: "kh",
    د: "d",
    ذ: "z",
    ر: "r",
    ز: "z",
    ژ: "zh",
    س: "s",
    ش: "sh",
    ص: "s",
    ض: "z",
    ط: "t",
    ظ: "z",
    ع: "a",
    غ: "gh",
    ف: "f",
    ق: "gh",
    ک: "k",
    گ: "g",
    ل: "l",
    م: "m",
    ن: "n",
    و: "v",
    ه: "h",
    ی: "y",
  }
  let out = ""
  for (const ch of s) {
    if (map[ch]) out += map[ch]
    else if (/[a-zA-Z0-9]/.test(ch)) out += ch
    else if (/\s/.test(ch)) out += "_"
  }
  out = out.replace(/_+/g, "_").replace(/^_+|_+$/g, "")
  if (!out) out = "field"
  if (!/^[a-zA-Z]/.test(out)) out = "f_" + out
  return out.toLowerCase()
}

