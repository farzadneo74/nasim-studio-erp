import { NextResponse } from "next/server"
import { masterDb } from "@/lib/master-db"
import { requireSuperAdmin, getPlatformSettings, setPlatformSettings } from "@/lib/super-admin"

export const dynamic = "force-dynamic"

/**
 * GET /api/super-admin/platform-settings
 * دریافت تمام تنظیمات پلتفرم
 */
export async function GET() {
  try {
    await requireSuperAdmin()
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const settings = await getPlatformSettings()
  return NextResponse.json({ settings })
}

/**
 * PUT /api/super-admin/platform-settings
 * آپدیت تنظیمات پلتفرم (merge)
 * body: { settings: { key: value, ... } }
 */
export async function PUT(req: Request) {
  try {
    await requireSuperAdmin()
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { settings } = body

  if (!settings || typeof settings !== "object") {
    return NextResponse.json({ error: "settings object is required" }, { status: 400 })
  }

  // اعتبارسنجی: فقط key های مجاز رو اجازه بده
  const allowedKeys = [
    "platform.name", "platform.owner_name", "platform.support_phone",
    "kavenegar.master_apikey", "kavenegar.default_sender", "kavenegar.otp_template",
    "kavenegar.reseller_enabled",
    "subscription.default_plan", "subscription.trial_days",
    "subscription.basic_max_employees", "subscription.basic_monthly_price_toman",
    "subscription.pro_max_employees", "subscription.pro_monthly_price_toman",
    "subscription.enterprise_max_employees", "subscription.enterprise_monthly_price_toman",
    "sms.cost_per_message_rial",
  ]
  const filtered: Record<string, string> = {}
  for (const [k, v] of Object.entries(settings)) {
    if (allowedKeys.includes(k)) {
      filtered[k] = String(v)
    }
  }

  await setPlatformSettings(filtered)

  // لاگ در ترمینال (برای دیباگ)
  console.log(`[super-admin] platform settings updated: ${Object.keys(filtered).join(", ")}`)

  return NextResponse.json({ ok: true, updated: Object.keys(filtered) })
}
