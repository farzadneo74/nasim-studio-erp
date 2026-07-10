import { NextResponse } from "next/server"
import { getCurrentUser, setPassword } from "@/lib/auth"

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "نشست نامعتبر" }, { status: 401 })
  const { password } = await req.json().catch(() => ({}))
  if (!password || password.length < 6) return NextResponse.json({ error: "رمز حداقل ۶ کاراکتر" }, { status: 400 })
  await setPassword(user.userId, password)
  return NextResponse.json({ ok: true })
}
