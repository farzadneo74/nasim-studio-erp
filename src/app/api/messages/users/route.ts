import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { masterDb } from "@/lib/master-db"
import { ROLE_LABELS } from "@/lib/constants"

export const dynamic = "force-dynamic"

// GET /api/messages/users — list studio members available to chat with (exclude self).
// Returns [{ id, name, role, roleLabel, phone?, studioName? }].
// Handles both single-studio and all-studios modes.
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !user.userId) {
      return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
    }

    let studioIds: string[] = []

    if (user.studioId && user.studioId !== "all") {
      // Single studio mode
      studioIds = [user.studioId]
    } else {
      // All-studios mode (or no studio selected): get all studios the user is a member of
      const memberships = await masterDb.studioMembership.findMany({
        where: { userId: user.userId, isActive: true },
        select: { studioId: true },
      })
      studioIds = memberships.map((m) => m.studioId)
    }

    if (studioIds.length === 0) {
      return NextResponse.json({ items: [] })
    }

    // Fetch all members of the relevant studios, excluding the current user.
    const memberships = await masterDb.studioMembership.findMany({
      where: {
        studioId: { in: studioIds },
        isActive: true,
        userId: { not: user.userId },
      },
      include: {
        user: true,
        studio: { select: { name: true } },
      },
    })

    // Deduplicate by userId (a user may be in multiple of the user's studios).
    const seen = new Set<string>()
    const items = memberships
      .filter((m) => {
        if (seen.has(m.userId)) return false
        seen.add(m.userId)
        return true
      })
      .map((m) => ({
        id: m.userId,
        name: m.user.name,
        phone: m.user.phone,
        role: m.role,
        roleLabel: (ROLE_LABELS as Record<string, string>)[m.role] || m.role,
        studioName: m.studio.name,
      }))

    // Sort by name for stable display.
    items.sort((a, b) => a.name.localeCompare(b.name, "fa"))

    return NextResponse.json({ items })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
