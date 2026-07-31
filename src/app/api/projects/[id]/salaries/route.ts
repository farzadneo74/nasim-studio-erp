import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb, getCurrentStudioUserId } from "@/lib/auth-helpers"
import { db as defaultDb } from "@/lib/db"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

/**
 * GET /api/projects/[id]/salaries
 * Returns all ProjectSalary rows for a project, with user info included.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return forbidden()
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params

  // Verify project exists
  const project = await db.project.findUnique({
    where: { id },
    select: { id: true, servicePackage: { select: { title: true } }, contract: { select: { contractNumber: true } } },
  })
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  const rows = await db.projectSalary.findMany({
    where: { projectId: id },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, role: true } },
      settledBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({
    items: rows.map((r) => {
      let tags: string[] = []
      try { tags = JSON.parse(r.tags) } catch { tags = [] }
      return {
        id: r.id,
        projectId: r.projectId,
        userId: r.userId,
        user: {
          id: r.user.id,
          firstName: r.user.firstName,
          lastName: r.user.lastName,
          role: r.user.role,
          name: `${r.user.firstName} ${r.user.lastName}`.trim(),
        },
        amount: Number(r.amount),
        description: r.description,
        tags,
        isSettled: r.isSettled,
        settledAt: r.settledAt,
        settledBy: r.settledBy
          ? { id: r.settledBy.id, name: `${r.settledBy.firstName} ${r.settledBy.lastName}`.trim() }
          : null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }
    }),
  })
}

/**
 * POST /api/projects/[id]/salaries
 * Body: { userId, amount (Rials), description?, tags?: string[] }
 * Creates a ProjectSalary + sends an in-app notification to the employee:
 *   "حقوق {amount} تومان برای پروژه {projectTitle} به شما تعلق گرفت"
 */
export async function POST(req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return forbidden()
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { userId, amount, description, tags } = body as {
    userId?: string
    amount?: number
    description?: string
    tags?: string[]
  }

  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 })
  const amountRials = Number(amount)
  if (!Number.isFinite(amountRials) || amountRials <= 0) {
    return NextResponse.json({ error: "amount must be a positive number (Rials)" }, { status: 400 })
  }

  // Verify project + user
  const project = await db.project.findUnique({
    where: { id },
    select: { id: true, servicePackage: { select: { title: true } }, contract: { select: { contractNumber: true } } },
  })
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, firstName: true, lastName: true } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const tagArr = Array.isArray(tags) ? tags.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim()) : []

  const created = await db.projectSalary.create({
    data: {
      projectId: id,
      userId,
      amount: amountRials,
      description: description?.trim() || null,
      tags: JSON.stringify(tagArr),
    },
  })

  // Build the project title for the notification
  const projectTitle = project.servicePackage?.title
    || project.contract?.contractNumber
    || "پروژه"

  // Notify the employee — best-effort, never fail the request over a notification error.
  try {
    const amountToman = Math.round(amountRials / 10)
    const amountDisplay = new Intl.NumberFormat("en-US").format(amountToman)
    const message = `حقوق ${amountDisplay} تومان برای پروژه ${projectTitle} به شما تعلق گرفت`
    await defaultDb.notification.create({
      data: {
        userId,
        type: "info",
        title: "حقوق پروژه جدید",
        message,
        link: "my-tasks",
        refId: created.id,
      },
    })
  } catch { /* best-effort */ }

  return NextResponse.json({
    id: created.id,
    projectId: created.projectId,
    userId: created.userId,
    amount: Number(created.amount),
    description: created.description,
    tags: tagArr,
    isSettled: created.isSettled,
    createdAt: created.createdAt,
  }, { status: 201 })
}
