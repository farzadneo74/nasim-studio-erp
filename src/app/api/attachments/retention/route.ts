import { NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentStudioDbName, getCurrentRole } from "@/lib/auth-helpers"
import { getRetentionSuggestions, getRetentionPolicies, setRetentionPolicy } from "@/lib/attachment-service"

export const dynamic = "force-dynamic"

const OWNER_TYPE_LABELS: Record<string, string> = {
  user_note: "یادداشت شخصی",
  customer_note: "یادداشت مشتری",
  project_note: "یادداشت پروژه",
  message: "پیام‌ها",
  custom_field: "فیلد سفارشی",
  expense_receipt: "رسید هزینه",
  qr_logo: "لوگوی استودیو",
}

// GET /api/attachments/retention — list policies + suggestions.
export async function GET() {
  try {
    const role = await getCurrentRole()
    if (!["admin", "manager"].includes(role)) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 })
    }
    const db = await getCurrentStudioDb()
    if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
    const studioId = await getCurrentStudioDbName()
    if (!studioId) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

    const [policies, suggestions] = await Promise.all([
      getRetentionPolicies(db, studioId),
      getRetentionSuggestions(db, studioId),
    ])

    return NextResponse.json({
      policies: policies.map((p) => ({
        ownerType: p.ownerType,
        ownerTypeLabel: OWNER_TYPE_LABELS[p.ownerType] || p.ownerType,
        retentionDays: p.retentionDays,
        enabled: p.enabled,
      })),
      ownerTypeLabels: OWNER_TYPE_LABELS,
      suggestions: suggestions.map((s) => ({
        ...s,
        ownerTypeLabel: OWNER_TYPE_LABELS[s.ownerType] || s.ownerType,
      })),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PUT /api/attachments/retention — set a policy.
// Body: { ownerType, retentionDays (number|null), enabled }
export async function PUT(req: Request) {
  try {
    const role = await getCurrentRole()
    if (!["admin", "manager"].includes(role)) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 })
    }
    const db = await getCurrentStudioDb()
    if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
    const studioId = await getCurrentStudioDbName()
    if (!studioId) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const { ownerType, retentionDays, enabled } = body
    if (!ownerType) return NextResponse.json({ error: "ownerType الزامی است" }, { status: 400 })

    const policy = await setRetentionPolicy(db, studioId, ownerType, retentionDays ?? null, !!enabled)
    return NextResponse.json({ ok: true, policy })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

