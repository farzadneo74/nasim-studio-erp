import { NextResponse } from "next/server"
import { clearSessionCookie, getCurrentUser } from "@/lib/auth"
import { masterDb } from "@/lib/master-db"

export async function POST() {
  const user = await getCurrentUser()
  if (user) { await masterDb.session.deleteMany({ where: { userId: user.userId } }).catch(() => {}) }
  await clearSessionCookie()
  return NextResponse.json({ ok: true })
}
