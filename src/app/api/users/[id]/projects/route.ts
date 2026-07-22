import { NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentRole } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

/**
 * GET /api/users/[id]/projects
 * Returns all projects where the user is in fieldTeam, studioTeam.
 * Used by the "booking calendar" in the user profile.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const role = await getCurrentRole()
  if (!role) return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
  const { id } = await params

  const projects = await db.project.findMany({
    where: {
      OR: [
        { fieldTeam: { some: { id } } },
        { studioTeam: { some: { id } } },
      ],
    },
    select: {
      id: true,
      status: true,
      startDatetime: true,
      endDatetime: true,
      contract: {
        select: {
          contractNumber: true,
          customer: { select: { id: true, name: true } },
        },
      },
      servicePackage: { select: { title: true, category: true } },
    },
    orderBy: { startDatetime: "asc" },
  })

  return NextResponse.json({
    items: projects.map((p) => ({
      id: p.id,
      status: p.status,
      startDatetime: p.startDatetime,
      endDatetime: p.endDatetime,
      contractNumber: p.contract?.contractNumber ?? "",
      customerName: p.contract?.customer?.name ?? "",
      packageTitle: p.servicePackage?.title ?? "",
      category: p.servicePackage?.category ?? "",
    })),
  })
}
