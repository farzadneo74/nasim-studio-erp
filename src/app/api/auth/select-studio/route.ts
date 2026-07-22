import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { masterDb } from "@/lib/master-db"

export async function POST(req: Request) {
  let token: string | null = null
  const authHeader = req.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) token = authHeader.slice(7)
  if (!token) { const c = await cookies(); token = c.get("nasim-session")?.value ?? null }
  if (!token) return NextResponse.json({ error: "نشست یافت نشد" }, { status: 401 })
  const session = await masterDb.session.findUnique({ where: { token }, include: { user: true } })
  if (!session || session.expiresAt < new Date()) { const c = await cookies(); c.delete("nasim-session"); return NextResponse.json({ error: "نشست منقضی" }, { status: 401 }) }
  const { studioId } = await req.json().catch(() => ({}))
  if (!studioId) return NextResponse.json({ error: "انتخاب استودیو الزامی است" }, { status: 400 })
  if (studioId === "all") {
    await masterDb.session.update({ where: { token }, data: { studioId: "all", role: "all" } })
    return NextResponse.json({ ok: true, studio: { id: "all", name: "تمام استودیوها", dbName: "all" }, role: "all" })
  }
  const membership = await masterDb.studioMembership.findUnique({ where: { userId_studioId: { userId: session.userId, studioId } }, include: { studio: true } })
  if (!membership || !membership.isActive) return NextResponse.json({ error: "دسترسی ندارید" }, { status: 403 })
  await masterDb.session.update({ where: { token }, data: { studioId, role: membership.role } })
  return NextResponse.json({ ok: true, studio: { id: membership.studio.id, name: membership.studio.name, dbName: membership.studio.dbName }, role: membership.role })
}

