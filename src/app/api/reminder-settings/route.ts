import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

const SETTING_KEY = "reminder_settings"

export interface ReminderSettings {
  /** "notification_only" | "notification_and_alarm" */
  alertMode: string
  /** sound file URL or preset name; e.g. "/sounds/alarm-1.wav" */
  soundUrl: string
  /** 0..100 */
  volume: number
  /** whether the alarm should loop until dismissed (only used when alertMode = "notification_and_alarm") */
  loop: boolean
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  alertMode: "notification_and_alarm",
  soundUrl: "/sounds/alarm-1.wav",
  volume: 70,
  loop: true,
}

function parseSettings(value: string | null | undefined): ReminderSettings {
  if (!value) return { ...DEFAULT_REMINDER_SETTINGS }
  try {
    const parsed = JSON.parse(value) as Partial<ReminderSettings>
    return {
      alertMode:
        parsed.alertMode === "notification_only" || parsed.alertMode === "notification_and_alarm"
          ? parsed.alertMode
          : DEFAULT_REMINDER_SETTINGS.alertMode,
      soundUrl:
        typeof parsed.soundUrl === "string" && parsed.soundUrl
          ? parsed.soundUrl
          : DEFAULT_REMINDER_SETTINGS.soundUrl,
      volume:
        typeof parsed.volume === "number" && Number.isFinite(parsed.volume)
          ? Math.max(0, Math.min(100, Math.round(parsed.volume)))
          : DEFAULT_REMINDER_SETTINGS.volume,
      loop:
        typeof parsed.loop === "boolean" ? parsed.loop : DEFAULT_REMINDER_SETTINGS.loop,
    }
  } catch {
    return { ...DEFAULT_REMINDER_SETTINGS }
  }
}

// GET: any logged-in user can read the reminder settings (needed by the
// client-side notifier to know the alarm sound + volume). Falls back to
// defaults if no setting row exists.
export async function GET() {
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const row = await db.systemSetting.findUnique({ where: { key: SETTING_KEY } })
  const settings = parseSettings(row?.value)
  return NextResponse.json(settings)
}

// PATCH: admin only. Body: partial ReminderSettings. Stored as JSON in SystemSetting.
export async function PATCH(req: NextRequest) {
  const role = await getCurrentRole()
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const existing = await db.systemSetting.findUnique({ where: { key: SETTING_KEY } })
  const current = parseSettings(existing?.value)

  const next: ReminderSettings = {
    alertMode:
      body.alertMode === "notification_only" || body.alertMode === "notification_and_alarm"
        ? (body.alertMode as string)
        : current.alertMode,
    soundUrl:
      typeof body.soundUrl === "string" && body.soundUrl
        ? (body.soundUrl as string)
        : current.soundUrl,
    volume:
      typeof body.volume === "number" && Number.isFinite(body.volume)
        ? Math.max(0, Math.min(100, Math.round(body.volume)))
        : current.volume,
    loop:
      typeof body.loop === "boolean" ? body.loop : current.loop,
  }

  const upserted = await db.systemSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(next) },
    create: { key: SETTING_KEY, value: JSON.stringify(next) },
  })

  return NextResponse.json({
    id: upserted.id,
    key: upserted.key,
    value: upserted.value,
    settings: next,
  })
}

