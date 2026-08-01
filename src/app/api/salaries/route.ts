import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb, getCurrentStudioUserId } from "@/lib/auth-helpers"
import { db as defaultDb } from "@/lib/db"
import { toJalali } from "@/lib/jalali"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

// GET /api/salaries
// ✅ FIXES-10 #4: Salary system overhaul — returns a unified, per-user list of
// ALL salary entries (ProjectSalary + SalaryRecord) merged. Includes employees
// with zero entries so the UI can list everyone. Old SalaryRule/commission
// logic is removed from this response.
//
// Query params:
//   ?userId=<id>     filter to one user
//   ?onlyUnsettled=1 return only entries with isSettled=false
//
// Response shape:
//   {
//     users: [
//       {
//         user: { id, firstName, lastName, role, name },
//         entries: [
//           {
//             id, source: "project_salary" | "salary_record",
//             userId, amount (Rials, can be negative),
//             description?, note?, tags[], date (ISO),
//             isSettled, settledAt?, manualType?, isPaid?,
//             project: { id, title } | null,
//             sourceLabel: string,
//           }
//         ],
//         totalUnsettled, totalAll, unsettledCount, settledCount,
//       }
//     ],
//     totalUnsettled: number,
//   }
export async function GET(req: Request) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return forbidden()
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const url = new URL(req.url)
  const userIdFilter = url.searchParams.get("userId")
  const onlyUnsettled = url.searchParams.get("onlyUnsettled") === "1"

  // --- Fetch all employees (every user with an employee-type role) -------------
  // We include EVERY user (not just those with entries) so the UI can list
  // employees with zero salary too.
  const employeeRoles = [
    "admin",
    "manager",
    "sales",
    "photographer",
    "videographer",
    "pro_crew",
    "editor",
    "film_editor",
  ]
  const users = await db.user.findMany({
    where: {
      ...(userIdFilter ? { id: userIdFilter } : {}),
      role: { in: employeeRoles },
    },
    select: { id: true, firstName: true, lastName: true, role: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  })

  // --- Fetch SalaryRecord entries (manual bonus/penalty/manual_salary) --------
  const salaryRecordWhere: Record<string, unknown> = {}
  if (userIdFilter) salaryRecordWhere.userId = userIdFilter
  if (onlyUnsettled) salaryRecordWhere.isSettled = false

  const salaryRecords = await db.salaryRecord.findMany({
    where: salaryRecordWhere,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, role: true } },
      project: {
        select: {
          id: true,
          contract: { select: { customer: { select: { name: true } } } },
          servicePackage: { select: { title: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // --- Fetch ProjectSalary entries (per-project salary) -----------------------
  const projectSalaryWhere: Record<string, unknown> = {}
  if (userIdFilter) projectSalaryWhere.userId = userIdFilter
  if (onlyUnsettled) projectSalaryWhere.isSettled = false

  let projectSalaries: any[] = []
  try {
    projectSalaries = await db.projectSalary.findMany({
      where: projectSalaryWhere,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
        project: {
          select: {
            id: true,
            contract: { select: { customer: { select: { name: true } } } },
            servicePackage: { select: { title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  } catch {
    // Runtime Prisma client may not yet know about ProjectSalary (dev-server
    // holds the old client). Fall back to raw SQL.
    try {
      projectSalaries = (await db.$queryRawUnsafe(
        `SELECT ps.id, ps.projectId, ps.userId, ps.amount, ps.description, ps.tags,
                ps.isSettled, ps.settledAt, ps.createdAt,
                u.firstName, u.lastName, u.role,
                p.id AS projId,
                sp.title AS servicePackageTitle,
                cust.name AS customerName
         FROM ProjectSalary ps
         LEFT JOIN User u ON ps.userId = u.id
         LEFT JOIN Project p ON ps.projectId = p.id
         LEFT JOIN ServicePackage sp ON p.servicePackageId = sp.id
         LEFT JOIN Contract c ON p.contractId = c.id
         LEFT JOIN Customer cust ON c.customerId = cust.id
         ${userIdFilter ? "WHERE ps.userId = ?" : ""}${userIdFilter && onlyUnsettled ? " AND ps.isSettled = 0" : ""}${!userIdFilter && onlyUnsettled ? "WHERE ps.isSettled = 0" : ""}
         ORDER BY ps.createdAt DESC`,
        ...(userIdFilter ? [userIdFilter] : [])
      )) as any[]
    } catch {
      projectSalaries = []
    }
  }

  // --- Build a unified entry list per user -----------------------------------
  type UnifiedEntry = {
    id: string
    source: "project_salary" | "salary_record"
    userId: string
    amount: number
    description: string | null
    note: string | null
    tags: string[]
    date: string
    isSettled: boolean
    settledAt: string | null
    manualType: string | null
    isPaid: boolean
    project: { id: string; title: string } | null
    sourceLabel: string
  }

  function parseTags(raw: unknown): string[] {
    if (!raw) return []
    if (typeof raw !== "string") return []
    try {
      const v = JSON.parse(raw)
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
    } catch {
      return []
    }
  }

  function projectTitleFromRow(p: any): { id: string; title: string } | null {
    if (!p) return null
    const title =
      p.servicePackage?.title ||
      p.contract?.customer?.name ||
      "—"
    return { id: p.id, title }
  }

  const entriesByUser = new Map<string, UnifiedEntry[]>()

  for (const r of salaryRecords) {
    const userId = (r as any).userId as string
    const list = entriesByUser.get(userId) ?? []
    const tags = parseTags((r as any).tags)
    const project = projectTitleFromRow((r as any).project)
    list.push({
      id: (r as any).id,
      source: "salary_record",
      userId,
      amount: Number((r as any).amount),
      description: null,
      note: (r as any).note ?? null,
      tags,
      date: new Date((r as any).createdAt).toISOString(),
      isSettled: (r as any).isSettled ?? false,
      settledAt: (r as any).settledAt ? new Date((r as any).settledAt).toISOString() : null,
      manualType: (r as any).manualType ?? "manual_salary",
      isPaid: (r as any).isPaid ?? false,
      project,
      sourceLabel: "دستی",
    })
    entriesByUser.set(userId, list)
  }

  for (const ps of projectSalaries) {
    const userId = (ps as any).userId as string
    const list = entriesByUser.get(userId) ?? []
    const tags = parseTags((ps as any).tags)
    let project: { id: string; title: string } | null = null
    if ((ps as any).project) {
      project = projectTitleFromRow((ps as any).project)
    } else if ((ps as any).projId) {
      // Raw SQL fallback row
      project = {
        id: (ps as any).projId,
        title: (ps as any).servicePackageTitle || (ps as any).customerName || "—",
      }
    }
    list.push({
      id: (ps as any).id,
      source: "project_salary",
      userId,
      amount: Number((ps as any).amount),
      description: (ps as any).description ?? null,
      note: null,
      tags,
      date: new Date((ps as any).createdAt).toISOString(),
      isSettled: (ps as any).isSettled ?? false,
      settledAt: (ps as any).settledAt ? new Date((ps as any).settledAt).toISOString() : null,
      manualType: null,
      isPaid: false,
      project,
      sourceLabel: project?.title ?? "پروژه",
    })
    entriesByUser.set(userId, list)
  }

  // --- Assemble per-user summary, including employees with zero entries -------
  const usersOut = users.map((u) => {
    const entries = (entriesByUser.get(u.id) ?? []).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    const unsettled = entries.filter((e) => !e.isSettled)
    const settled = entries.filter((e) => e.isSettled)
    return {
      user: {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        name: `${u.firstName} ${u.lastName}`,
      },
      entries,
      totalUnsettled: unsettled.reduce((s, e) => s + e.amount, 0),
      totalAll: entries.reduce((s, e) => s + e.amount, 0),
      unsettledCount: unsettled.length,
      settledCount: settled.length,
    }
  })

  const totalUnsettled = usersOut.reduce((s, u) => s + u.totalUnsettled, 0)

  return NextResponse.json({ users: usersOut, totalUnsettled })
}

/**
 * POST /api/salaries
 * Body: { userId, amount (Rials), note?, type?: "bonus" | "penalty" | "manual_salary", tags?: string[] }
 *
 * Creates a manual SalaryRecord (isManual=true). Sends an in-app notification to the employee.
 * - type "bonus"     → amount stored as positive
 * - type "penalty"   → amount stored as NEGATIVE (deduction)
 * - type "manual_salary" (default) → amount stored as positive
 */
export async function POST(req: Request) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return forbidden()
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const { userId, amount, note, type = "manual_salary", tags, projectId } = body as {
    userId?: string
    amount?: number
    note?: string
    type?: "bonus" | "penalty" | "manual_salary"
    tags?: string[]
    projectId?: string
  }

  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 })
  const amt = Number(amount)
  if (!Number.isFinite(amt) || amt <= 0) {
    return NextResponse.json({ error: "amount must be a positive number (Rials)" }, { status: 400 })
  }

  // Validate type
  const validTypes = ["bonus", "penalty", "manual_salary"]
  const manualType = validTypes.includes(type as string) ? (type as string) : "manual_salary"
  // Penalty → negative amount (deduction)
  const signedAmount = manualType === "penalty" ? -Math.abs(amt) : Math.abs(amt)

  // Resolve current user (the admin/manager creating the entry)
  const createdById = await getCurrentStudioUserId()

  // Current Jalali period (YYYY-MM)
  const now = new Date()
  const j = toJalali(now)
  const period = `${j.jy}-${String(j.jm).padStart(2, "0")}`

  // If projectId is missing, we can't create a SalaryRecord (projectId is required).
  // Solution: fall back to the studio's first project; if none exists, error out.
  let resolvedProjectId = projectId
  if (!resolvedProjectId) {
    const anyProject = await db.project.findFirst({ select: { id: true } })
    if (!anyProject) {
      return NextResponse.json(
        { error: "No project exists in this studio. Create a project first." },
        { status: 400 }
      )
    }
    resolvedProjectId = anyProject.id
  }

  const tagArr = Array.isArray(tags)
    ? tags.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim())
    : []

  const data: Record<string, unknown> = {
    userId,
    projectId: resolvedProjectId,
    amount: signedAmount,
    note: note?.trim() || null,
    isManual: true,
    manualType,
    isPaid: false,
    period,
    tags: JSON.stringify(tagArr),
  }

  let created: any
  try {
    created = await db.salaryRecord.create({ data: data as any })
  } catch (e) {
    // Fallback: try without the new columns (in case the runtime client is stale)
    const { tags: _t, manualType: _mt, ...rest } = data
    created = await db.salaryRecord.create({ data: rest as any })
  }

  // Send in-app notification to the employee — best-effort.
  try {
    const amountToman = Math.round(Math.abs(signedAmount) / 10)
    const amountDisplay = new Intl.NumberFormat("en-US").format(amountToman)
    const isPenalty = manualType === "penalty"
    const title = isPenalty ? "جریمه ثبت شد" : manualType === "bonus" ? "پاداش ثبت شد" : "حقوق دستی ثبت شد"
    const message = isPenalty
      ? `جریمه ${amountDisplay} تومان برای شما ثبت شد${note ? ` — ${note.trim()}` : ""}`
      : manualType === "bonus"
        ? `پاداش ${amountDisplay} تومان برای شما ثبت شد${note ? ` — ${note.trim()}` : ""}`
        : `حقوق ${amountDisplay} تومان برای شما ثبت شد${note ? ` — ${note.trim()}` : ""}`
    await defaultDb.notification.create({
      data: {
        userId,
        type: "info",
        title,
        message,
        link: "settings-employees",
        refId: created.id,
      },
    })
  } catch { /* best-effort */ }

  return NextResponse.json({
    id: created.id,
    userId: created.userId,
    amount: Number(created.amount),
    note: created.note,
    isPaid: created.isPaid,
    manualType,
    createdAt: created.createdAt,
  }, { status: 201 })
}

