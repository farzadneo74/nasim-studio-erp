import { NextResponse } from "next/server"
import { masterDb } from "@/lib/master-db"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export const dynamic = "force-dynamic"

/**
 * POST /api/admin/login
 * ورود اختصاصی پنل ادمین — جدا از سیستم OTP/phone
 * body: { username, password }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const username = String(body.username || "").trim()
  const password = String(body.password || "")

  if (!username || !password) {
    return NextResponse.json({ error: "نام کاربری و رمز عبور الزامی است" }, { status: 400 })
  }

  let adminUsername = "nasim-admin"
  let adminPasswordHash: string | null = null

  try {
    const usernameSetting = await masterDb.platformSetting.findUnique({ where: { key: "admin_username" } })
    if (usernameSetting?.value) adminUsername = usernameSetting.value
    const passwordSetting = await masterDb.platformSetting.findUnique({ where: { key: "admin_password" } })
    if (passwordSetting?.value) adminPasswordHash = passwordSetting.value
  } catch {
    // ignore
  }

  if (!adminPasswordHash) {
    adminPasswordHash = await bcrypt.hash("N@sim2025!ERP", 10)
    try {
      await masterDb.platformSetting.upsert({
        where: { key: "admin_username" },
        update: {},
        create: { key: "admin_username", value: adminUsername },
      })
      await masterDb.platformSetting.upsert({
        where: { key: "admin_password" },
        update: {},
        create: { key: "admin_password", value: adminPasswordHash },
      })
    } catch {
      // ignore
    }
  }

  if (username !== adminUsername) {
    return NextResponse.json({ error: "نام کاربری یا رمز عبور نادرست است" }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, adminPasswordHash)
  if (!valid) {
    return NextResponse.json({ error: "نام کاربری یا رمز عبور نادرست است" }, { status: 401 })
  }

  let adminUser = await masterDb.masterUser.findFirst({ where: { isSuperAdmin: true } })
  if (!adminUser) {
    adminUser = await masterDb.masterUser.upsert({
      where: { phone: "09100000001" },
      update: { isSuperAdmin: true },
      create: {
        phone: "09100000001",
        name: "فرزاد (مدیر پلتفرم)",
        isSuperAdmin: true,
        passwordHash: await bcrypt.hash("123456", 10),
      },
    })
  }

  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await masterDb.session.create({
    data: { token, userId: adminUser.id, expiresAt },
  })

  return NextResponse.json({
    ok: true,
    token,
    user: { name: adminUser.name },
  })
}
