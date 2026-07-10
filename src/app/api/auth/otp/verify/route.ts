import { NextResponse } from "next/server"
import { verifyOtp, createSession, setSessionCookie } from "@/lib/auth"
import { masterDb } from "@/lib/master-db"

export async function POST(req: Request) {
  const { phone, code, remember } = await req.json().catch(() => ({}))
  if (!phone || !code) return NextResponse.json({ error: "شماره تلفن و کد الزامی است" }, { status: 400 })
  const result = await verifyOtp(phone, code)
  if (!result.ok || !result.userId) return NextResponse.json({ error: result.error }, { status: 401 })
  const token = await createSession(result.userId, !!remember)
  await setSessionCookie(token, !!remember)
  const user = await masterDb.masterUser.findUnique({ where: { id: result.userId } })
  const memberships = await masterDb.studioMembership.findMany({ where: { userId: result.userId, isActive: true }, include: { studio: true } })
  let currentStudioId: string | null = null
  let currentRole: string | null = null
  if (memberships.length === 1) {
    currentStudioId = memberships[0].studioId
    currentRole = memberships[0].role
    await masterDb.session.update({ where: { token }, data: { studioId: currentStudioId, role: currentRole } })
  }
  return NextResponse.json({
    ok: true, sessionToken: token,
    user: user ? { id: user.id, phone: user.phone, name: user.name } : null,
    studios: memberships.map((m) => ({ id: m.studio.id, name: m.studio.name, nameEn: m.studio.nameEn, role: m.role, isActive: m.studio.isActive })),
    currentStudioId, currentRole,
  })
}
