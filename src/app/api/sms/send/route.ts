import { NextResponse } from "next/server"
import { getCurrentRole } from "@/lib/auth-helpers"
import { sendSmsToCustomer } from "@/lib/sms"

export const dynamic = "force-dynamic"

/**
 * POST /api/sms/send
 * Body: { phone: string, message: string }
 *
 * Sends an SMS to the given phone using the studio's configured SMS provider.
 * - Admin/manager only.
 * - If SMS is not configured (or disabled), returns 200 with `{ ok: true, skipped: true }`
 *   so the caller can still proceed.
 */
export async function POST(req: Request) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: { phone?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const phone = (body.phone ?? "").trim()
  const message = (body.message ?? "").trim()

  if (!phone || !message) {
    return NextResponse.json(
      { error: "phone and message are required" },
      { status: 400 }
    )
  }

  // Basic Iranian mobile validation: 09xxxxxxxxx or +989xxxxxxxxx
  const normalized = phone.replace(/[\s\-()]/g, "")
  if (!/^(\+?98|0)?9\d{9}$/.test(normalized)) {
    return NextResponse.json(
      { error: "شماره موبایل نامعتبر است" },
      { status: 400 }
    )
  }

  const result = await sendSmsToCustomer({ phone, message })

  if (result.skipped) {
    return NextResponse.json({ ok: true, skipped: true, message: "سرویس پیامک فعال نیست — پیامک ارسال نشد." })
  }
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "ارسال پیامک ناموفق بود" },
      { status: 502 }
    )
  }
  return NextResponse.json({ ok: true })
}
