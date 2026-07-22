import { NextResponse } from "next/server"
import { sendOtp } from "@/lib/auth"

export async function POST(req: Request) {
  const { phone } = await req.json().catch(() => ({}))
  if (!phone || !/^09\d{9}$/.test(phone)) return NextResponse.json({ error: "شماره تلفن معتبر نیست" }, { status: 400 })
  const result = await sendOtp(phone)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 429 })
  return NextResponse.json({ ok: true, demoCode: result.demoCode, message: "کد تایید ارسال شد" })
}

