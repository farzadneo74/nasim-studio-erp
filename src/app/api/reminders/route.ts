import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb, getCurrentStudioUserId } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

const VALID_LINK_TYPES = ["project", "customer", "user", "task", "multi", "none"]
// Links ticked via the UI auto-delete after this many days (lazy on GET).
const LINK_AUTO_DELETE_MS = 3 * 24 * 60 * 60 * 1000

// ⚠️ SECURITY: قبلاً از findFirst({role}) استفاده می‌شد که وقتی دو کاربر نقش یکسان داشتن،
// اشتباه پیدا می‌کرد. حالا از getCurrentStudioUserId استفاده می‌کنیم که با phone matching
// کاربر واقعی رو پیدا می‌کنه.

interface MultiLink {
  customerId?: string | null
  projectId?: string | null
  userId?: string | null
}

// Parse linkType/linkId into a normalized {customerId, projectId, userId} shape.
// Supports both legacy single-link (project/customer/user/task) and new multi-link.
function parseMultiLink(
  linkType: string | null,
  linkId: string | null
): MultiLink {
  if (!linkType || linkType === "none" || !linkId) return {}
  if (linkType === "multi") {
    try {
      const v = JSON.parse(linkId)
      if (v && typeof v === "object") {
        return {
          customerId: typeof v.customerId === "string" ? v.customerId : null,
          projectId: typeof v.projectId === "string" ? v.projectId : null,
          userId: typeof v.userId === "string" ? v.userId : null,
        }
      }
    } catch {
      return {}
    }
    return {}
  }
  // Legacy single-link
  if (linkType === "customer") return { customerId: linkId }
  if (linkType === "project") return { projectId: linkId }
  if (linkType === "user") return { userId: linkId }
  return {}
}

function serializeMultiLink(m: MultiLink): { linkType: string; linkId: string | null } {
  const hasAny = m.customerId || m.projectId || m.userId
  if (!hasAny) return { linkType: null, linkId: null }
  return {
    linkType: "multi",
    linkId: JSON.stringify({
      customerId: m.customerId ?? null,
      projectId: m.projectId ?? null,
      userId: m.userId ?? null,
    }),
  }
}

// linkCheckmarks stored as JSON: { customer: ISO|null, project: ISO|null, user: ISO|null }
type LinkKey = "customer" | "project" | "user"
type LinkCheckmarks = Partial<Record<LinkKey, string | null>>

function parseLinkCheckmarks(raw: string | null | undefined): LinkCheckmarks {
  if (!raw) return {}
  try {
    const v = JSON.parse(raw)
    if (v && typeof v === "object") {
      const out: LinkCheckmarks = {}
      if (typeof v.customer === "string") out.customer = v.customer
      if (typeof v.project === "string") out.project = v.project
      if (typeof v.user === "string") out.user = v.user
      return out
    }
  } catch {
    /* ignore */
  }
  return {}
}

function serializeLinkCheckmarks(m: LinkCheckmarks): string {
  return JSON.stringify({
    customer: m.customer ?? null,
    project: m.project ?? null,
    user: m.user ?? null,
  })
}

// Pick the linkCheckmarks key that corresponds to a given MultiLink slot.
function keyForSlot(slot: "customerId" | "projectId" | "userId"): LinkKey {
  if (slot === "customerId") return "customer"
  if (slot === "projectId") return "project"
  return "user"
}

// Lazy link auto-delete: inspect each reminder; for any link slot whose
// checkedAt is older than 3 days, drop that link from linkType/linkId AND from
// linkCheckmarks. Mutates the DB and the in-memory row.
async function lazyAutoDeleteLinks(
  db: PrismaClient,
  reminders: Array<{
    id: string
    linkType: string | null
    linkId: string | null
    linkCheckmarks: string
  }>
): Promise<void> {
  const now = Date.now()
  for (const r of reminders) {
    const m = parseMultiLink(r.linkType, r.linkId)
    const cm = parseLinkCheckmarks(r.linkCheckmarks)
    let changed = false
    ;(["customerId", "projectId", "userId"] as const).forEach((slot) => {
      const id = m[slot]
      if (!id) return
      const key = keyForSlot(slot)
      const checkedAt = cm[key]
      if (checkedAt) {
        const t = new Date(checkedAt).getTime()
        if (!Number.isNaN(t) && now - t > LINK_AUTO_DELETE_MS) {
          // Delete this link.
          m[slot] = null
          delete cm[key]
          changed = true
        }
      }
    })
    if (changed) {
      const s = serializeMultiLink(m)
      try {
        await db.reminder.update({
          where: { id: r.id },
          data: {
            linkType: s.linkType,
            linkId: s.linkId,
            linkCheckmarks: serializeLinkCheckmarks(cm),
          },
        })
      } catch {
        /* best-effort */
      }
    }
  }
}

interface ReminderShapeInput {
  id: string
  title: string
  note: string | null
  dueAt: Date
  done: boolean
  acknowledged: boolean
  order: number
  linkType: string | null
  linkId: string | null
  linkCheckmarks: string
  createdAt: Date
  updatedAt: Date
}

interface ReminderShapeExtra {
  customerName?: string | null
  projectTitle?: string | null
  userName?: string | null
}

function shape(r: ReminderShapeInput, extra: ReminderShapeExtra = {}) {
  const m = parseMultiLink(r.linkType, r.linkId)
  const cm = parseLinkCheckmarks(r.linkCheckmarks)
  return {
    id: r.id,
    title: r.title,
    note: r.note,
    dueAt: r.dueAt.toISOString(),
    done: r.done,
    acknowledged: r.acknowledged,
    order: r.order,
    linkType: r.linkType,
    linkId: r.linkId,
    customerId: m.customerId ?? null,
    projectId: m.projectId ?? null,
    userId: m.userId ?? null,
    linkCheckmarks: cm,
    customerName: extra.customerName ?? null,
    projectTitle: extra.projectTitle ?? null,
    userName: extra.userName ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

// Batch-resolve display names for all linked customers/projects/users across
// the given reminders. Returns a map keyed by id.
async function resolveLinkNames(
  db: PrismaClient,
  reminders: Array<{ customerId: string | null; projectId: string | null; userId: string | null }>
): Promise<{
  customers: Record<string, string>
  projects: Record<string, string>
  users: Record<string, string>
}> {
  const customerIds = new Set<string>()
  const projectIds = new Set<string>()
  const userIds = new Set<string>()
  for (const r of reminders) {
    if (r.customerId) customerIds.add(r.customerId)
    if (r.projectId) projectIds.add(r.projectId)
    if (r.userId) userIds.add(r.userId)
  }
  const [customers, projects, users] = await Promise.all([
    customerIds.size
      ? db.customer.findMany({ where: { id: { in: [...customerIds] } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    projectIds.size
      ? db.project.findMany({
          where: { id: { in: [...projectIds] } },
          select: {
            id: true,
            servicePackage: { select: { title: true } },
            contract: { select: { customer: { select: { name: true } } } },
          },
        })
      : Promise.resolve([]),
    userIds.size
      ? db.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, firstName: true, lastName: true } })
      : Promise.resolve([]),
  ])
  return {
    customers: Object.fromEntries(customers.map((c) => [c.id, c.name])),
    projects: Object.fromEntries(
      projects.map((p) => {
        const customerName = p.contract?.customer?.name
        const pkgTitle = p.servicePackage?.title ?? "پروژه"
        return [p.id, customerName ? `${customerName} — ${pkgTitle}` : pkgTitle]
      })
    ),
    users: Object.fromEntries(
      users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()])
    ),
  }
}

// GET: list current user's reminders.
// - Lazy auto-delete: any reminder that is BOTH done AND acknowledged AND older
//   than 24h (updatedAt < now-24h) is deleted before returning. This makes the
//   cleanup happen on the next fetch (lazy).
// - Lazy link auto-delete: any link whose checkedAt is older than 3 days is
//   removed from linkType/linkId and from linkCheckmarks.
// - Default sort: by dueAt ASC (closest deadline first). Overdue reminders
//   naturally appear at the top because their dueAt is in the past.
// - Query filters:
//   * overdue=true → only reminders where dueAt < now AND done=false AND acknowledged=false
//   * dueNow=true  → same as overdue (reminders whose dueAt has passed and not yet
//     acknowledged/done). Used by the client-side notification poller.
export async function GET(req: NextRequest) {
  const role = await getCurrentRole()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const userId = await getCurrentStudioUserId()
  if (!userId) return NextResponse.json({ items: [] })

  // Lazy cleanup: delete done+acknowledged reminders older than 24h.
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  try {
    await db.reminder.deleteMany({
      where: { userId, done: true, acknowledged: true, updatedAt: { lt: cutoff } },
    })
  } catch {
    /* best-effort */
  }

  const url = new URL(req.url)
  const overdueOnly = url.searchParams.get("overdue") === "true"
  const dueNowOnly = url.searchParams.get("dueNow") === "true"

  if (overdueOnly || dueNowOnly) {
    const now = new Date()
    const items = await db.reminder.findMany({
      where: {
        userId,
        done: false,
        acknowledged: false,
        dueAt: { lt: now },
      },
      orderBy: { dueAt: "asc" },
    })
    // Lazy link auto-delete (mutates DB if needed).
    await lazyAutoDeleteLinks(db, items)
    // Re-read after potential link deletion so the response reflects the latest.
    const finalItems = await db.reminder.findMany({
      where: { id: { in: items.map((r) => r.id) } },
      orderBy: { dueAt: "asc" },
    })
    const names = await resolveLinkNames(db, finalItems)
    return NextResponse.json({
      items: finalItems.map((r) =>
        shape(r, {
          customerName: r.customerId ? names.customers[r.customerId] ?? null : null,
          projectTitle: r.projectId ? names.projects[r.projectId] ?? null : null,
          userName: r.userId ? names.users[r.userId] ?? null : null,
        })
      ),
    })
  }

  // Default: all reminders, sorted by dueAt ascending (overdue at top).
  const reminders = await db.reminder.findMany({
    where: { userId },
    orderBy: { dueAt: "asc" },
  })

  // Lazy link auto-delete (mutates DB if needed).
  await lazyAutoDeleteLinks(db, reminders)
  // Re-read after potential link deletion so the response reflects the latest.
  const finalReminders = await db.reminder.findMany({
    where: { id: { in: reminders.map((r) => r.id) } },
    orderBy: { dueAt: "asc" },
  })
  const names = await resolveLinkNames(db, finalReminders)

  return NextResponse.json({
    items: finalReminders.map((r) =>
      shape(r, {
        customerName: r.customerId ? names.customers[r.customerId] ?? null : null,
        projectTitle: r.projectId ? names.projects[r.projectId] ?? null : null,
        userName: r.userId ? names.users[r.userId] ?? null : null,
      })
    ),
  })
}

// POST: create a new reminder for the current user.
export async function POST(req: NextRequest) {
  const role = await getCurrentRole()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const userId = await getCurrentStudioUserId()
  if (!userId) {
    return NextResponse.json({ error: "کاربر فعال یافت نشد" }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const title = String(body.title || "").trim()
  if (!title) {
    return NextResponse.json({ error: "عنوان یادآور الزامی است" }, { status: 400 })
  }

  const dueAtRaw = String(body.dueAt || "").trim()
  if (!dueAtRaw) {
    return NextResponse.json({ error: "زمان سررسید الزامی است" }, { status: 400 })
  }
  const dueAt = new Date(dueAtRaw)
  if (Number.isNaN(dueAt.getTime())) {
    return NextResponse.json({ error: "زمان سررسید نامعتبر است" }, { status: 400 })
  }

  const note = body.note !== undefined && body.note !== null ? String(body.note).trim() || null : null
  const order =
    typeof body.order === "number" && Number.isFinite(body.order)
      ? Math.floor(body.order)
      : 0

  // Resolve link fields. Accept either explicit multi-link fields
  // (customerId/projectId/userId) OR legacy (linkType/linkId).
  let linkType: string | null = null
  let linkId: string | null = null
  let linkCheckmarks = "{}"
  if (
    body.customerId !== undefined ||
    body.projectId !== undefined ||
    body.userId !== undefined
  ) {
    const m: MultiLink = {
      customerId:
        typeof body.customerId === "string" && body.customerId ? body.customerId : null,
      projectId:
        typeof body.projectId === "string" && body.projectId ? body.projectId : null,
      userId:
        typeof body.userId === "string" && body.userId ? body.userId : null,
    }
    const s = serializeMultiLink(m)
    linkType = s.linkType
    linkId = s.linkId
    linkCheckmarks = serializeLinkCheckmarks({})
  } else if (typeof body.linkType === "string" && body.linkType !== "none") {
    const lt = VALID_LINK_TYPES.includes(body.linkType) ? body.linkType : null
    if (lt && body.linkId) {
      linkType = lt
      linkId = String(body.linkId)
    }
  }

  const created = await db.reminder.create({
    data: {
      userId,
      title,
      note,
      dueAt,
      done: false,
      acknowledged: false,
      order,
      linkType,
      linkId,
      linkCheckmarks,
    },
  })

  const names = await resolveLinkNames(db, [created])
  return NextResponse.json(
    shape(created, {
      customerName: created.customerId ? names.customers[created.customerId] ?? null : null,
      projectTitle: created.projectId ? names.projects[created.projectId] ?? null : null,
      userName: created.userId ? names.users[created.userId] ?? null : null,
    }),
    { status: 201 }
  )
}

