import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { CAN_MANAGE_SYSTEM } from "@/lib/constants"

const DEFAULT_FA = "عکاسی نسیم"
const DEFAULT_EN = "NASIM STUDIO"

export async function GET() {
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  let setting = await db.systemSetting.findUnique({ where: { key: "studio_name" } })
  if (!setting) {
    setting = await db.systemSetting.create({
      data: { key: "studio_name", value: JSON.stringify({ fa: DEFAULT_FA, en: DEFAULT_EN }) },
    })
  }
  const parsed = JSON.parse(setting.value) as { fa: string; en: string }
  return NextResponse.json({ fa: parsed.fa || DEFAULT_FA, en: parsed.en || DEFAULT_EN })
}

export async function PATCH(req: Request) {
  const role = await getCurrentRole()
  if (!CAN_MANAGE_SYSTEM.includes(role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  const fa = String(body.fa ?? "").trim() || DEFAULT_FA
  const en = String(body.en ?? "").trim() || DEFAULT_EN
  await db.systemSetting.upsert({
    where: { key: "studio_name" },
    update: { value: JSON.stringify({ fa, en }) },
    create: { key: "studio_name", value: JSON.stringify({ fa, en }) },
  })
  return NextResponse.json({ fa, en })
}
