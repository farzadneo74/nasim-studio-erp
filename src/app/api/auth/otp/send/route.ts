import { NextResponse } from "next/server"
import { sendOtp } from "@/lib/auth"

export const dynamic = "force-dynamic"

/**
 * POST /api/auth/otp/send
 * ✅ SECURITY: demoCode فقط در development محلی برمی‌گردد
 */
export async function POST(req: Request) {
  const { phone } = await req.json().catch(() => ({}))
  if (!phone || !/^09\d{9}$/.test(phone)) {
    return NextResponse.json({ error: "شماره تلفن معتبر نیست" }, { status: 400 })
  }

  const result = await sendOtp(phone)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 429 })

  // ✅ SECURITY: demoCode فقط در development (sendOtp خودش این رو کنترل می‌کنه)
  const isDev = process.env.NODE_ENV === "development"
  return NextResponse.json({
    ok: true,
    ...(isDev && result.demoCode ? { demoCode: result.demoCode } : {}),
    message: isDev && result.demoCode
      ? "کد تایید ارسال شد (محیط توسعه — کد نمایش داده شد)"
      : "کد تایید از طریق پیامک ارسال شد",
  })
}
