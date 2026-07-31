import { NextResponse } from "next/server"
import { sendOtp } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const { phone } = await req.json().catch(() => ({}))
  if (!phone || !/^09\d{9}$/.test(phone)) {
    return NextResponse.json({ error: "شماره تلفن معتبر نیست" }, { status: 400 })
  }
  const result = await sendOtp(phone)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 429 })

  // ⚠️ SECURITY: کد OTP فقط در development mode برگردانده می‌شود.
  // در production، کد فقط از طریق SMS واقعی به کاربر می‌رسد.
  // فلگ NEXT_PUBLIC_DEV_OTP=true برای نمایش کد در محیط dev استفاده می‌شود.
  const showDemoCode = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEV_OTP === "true"

  return NextResponse.json({
    ok: true,
    ...(showDemoCode ? { demoCode: result.demoCode } : {}),
    message: showDemoCode
      ? "کد تایید ارسال شد (محیط توسعه — کد نمایش داده شد)"
      : "کد تایید از طریق پیامک ارسال شد",
  })
}
