import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { masterDb } from "@/lib/master-db"
import { isSuperAdmin } from "@/lib/super-admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ authed: false })

  const memberships = await masterDb.studioMembership.findMany({
    where: { userId: user.userId, isActive: true },
    include: { studio: true },
  })

  // isSuperAdmin رو همیشه برگردون (برای /admin page)
  const superAdminFlag = await isSuperAdmin()

  return NextResponse.json({
    authed: true,
    user: { id: user.userId, phone: user.phone, name: user.name },
    studios: memberships.map((m) => ({
      id: m.studio.id,
      name: m.studio.name,
      nameEn: m.studio.nameEn,
      role: m.role,
      isActive: m.studio.isActive,
    })),
    currentStudioId: user.studioId,
    currentRole: user.role,
    isSuperAdmin: superAdminFlag,
  })
}
