import { NextResponse } from "next/server"
import { clearSessionCookie, getSessionToken } from "@/lib/auth"
import { masterDb } from "@/lib/master-db"
import crypto from "crypto"

export const dynamic = "force-dynamic"

/**
 * POST /api/auth/logout
 * ✅ SECURITY: حذف رکورد session از دیتابیس (نه فقط cookie)
 */
export async function POST() {
  const token = await getSessionToken()
  if (token) {
    // ✅ SECURITY: هش توکن و حذف از دیتابیس
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
    await masterDb.session.deleteMany({ where: { token: tokenHash } }).catch(() => {})
  }
  await clearSessionCookie()
  return NextResponse.json({ ok: true })
}
