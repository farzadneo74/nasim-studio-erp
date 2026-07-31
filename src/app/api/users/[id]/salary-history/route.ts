import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

/**
 * GET /api/users/[id]/salary-history
 * Returns a unified timeline of salary-related entries for the employee:
 *  - ProjectSalary entries (per-project salaries set from the project's Team tab)
 *  - Manual SalaryRecord entries (bonuses, penalties, manual salaries)
 *
 * Each entry has the same shape:
 *  { id, source: "project_salary" | "salary_record", projectName, amount (Rials),
 *    description, note, tags[], date, isSettled, settledAt, manualType? }
 */
export async function GET(_req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return forbidden()
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params

  // Verify user exists
  const user = await db.user.findUnique({ where: { id }, select: { id: true } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // 1) ProjectSalary entries for this user (with project info).
  const projectSalaries = await db.projectSalary.findMany({
    where: { userId: id },
    include: {
      project: {
        select: {
          id: true,
          servicePackage: { select: { title: true } },
          contract: { select: { contractNumber: true } },
        },
      },
      settledBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // 2) Manual SalaryRecord entries (isManual=true) for this user.
  //    Also include rule-based ones that are still in the user's ledger.
  const salaryRecords = await db.salaryRecord.findMany({
    where: { userId: id },
    include: {
      project: {
        select: {
          id: true,
          servicePackage: { select: { title: true } },
          contract: { select: { contractNumber: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  type Unified = {
    id: string
    source: "project_salary" | "salary_record"
    projectName: string
    amount: number // Rials (can be negative for penalties)
    description: string | null
    note: string | null
    tags: string[]
    date: string
    isSettled: boolean
    settledAt: string | null
    manualType?: string
    isPaid?: boolean
  }

  const items: Unified[] = []

  for (const ps of projectSalaries) {
    let tags: string[] = []
    try { tags = JSON.parse(ps.tags) } catch { tags = [] }
    const projName = ps.project?.servicePackage?.title
      || ps.project?.contract?.contractNumber
      || "پروژه"
    items.push({
      id: ps.id,
      source: "project_salary",
      projectName: projName,
      amount: Number(ps.amount),
      description: ps.description,
      note: null,
      tags,
      date: ps.createdAt.toISOString(),
      isSettled: ps.isSettled,
      settledAt: ps.settledAt ? ps.settledAt.toISOString() : null,
    })
  }

  for (const sr of salaryRecords) {
    let tags: string[] = []
    try { tags = JSON.parse((sr as any).tags ?? "[]") } catch { tags = [] }
    const projName = sr.project?.servicePackage?.title
      || sr.project?.contract?.contractNumber
      || "—"
    items.push({
      id: sr.id,
      source: "salary_record",
      projectName: projName,
      amount: Number(sr.amount),
      description: null,
      note: sr.note,
      tags,
      date: sr.createdAt.toISOString(),
      isSettled: (sr as any).isSettled ?? false,
      settledAt: (sr as any).settledAt ? new Date((sr as any).settledAt).toISOString() : null,
      manualType: (sr as any).manualType ?? "manual_salary",
      isPaid: sr.isPaid,
    })
  }

  // Sort by date desc (combining both sources)
  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return NextResponse.json({ items })
}
