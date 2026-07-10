import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import type { Role } from "@/lib/constants"
import { PrismaClient } from "@prisma/client"

export const dynamic = "force-dynamic"

const VALID_LINK_TYPES = ["project", "customer", "user", "task", "multi", "none"]

async function getCurrentUserId(db: PrismaClient, role: Role): Promise<string | null> {
  const u = await db.user.findFirst({ where: { role }, select: { id: true } })
  return u?.id ?? null
}

type Ctx = { params: Promise<{ id: string }> }

interface MultiLink {
  customerId?: string | null
  projectId?: string | null
  userId?: string | null
}

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

function keyForSlot(slot: "customerId" | "projectId" | "userId"): LinkKey {
  if (slot === "customerId") return "customer"
  if (slot === "projectId") return "project"
  return "user"
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
  customerId?: string | null
  projectId?: string | null
  userId?: string | null
}

function shape(r: ReminderShapeInput) {
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
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

// PATCH: update reminder fields.
// - done toggle, title/note/dueAt edit
// - acknowledged (used by the overdue blocking modal: "فهمیدم" sets it to true)
// - link: accept either multi-link (customerId/projectId/userId) or legacy
//   (linkType/linkId)
// - linkCheckmarks: accept an object { customer?: ISO|null, project?: ISO|null, user?: ISO|null }
//   to set tick-state per link. Setting a slot to null un-ticks it.
// - removeLink: accept a string ("customer" | "project" | "user") to remove
//   that link immediately (manual X button). Clears the slot in both
//   linkType/linkId AND linkCheckmarks.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const userId = await getCurrentUserId(db, role)
  if (!userId) {
    return NextResponse.json({ error: "کاربر فعال یافت نشد" }, { status: 400 })
  }

  const { id } = await params
  const existing = await db.reminder.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "یادآور یافت نشد" }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const data: {
    done?: boolean
    acknowledged?: boolean
    title?: string
    note?: string | null
    dueAt?: Date
    order?: number
    linkType?: string | null
    linkId?: string | null
    linkCheckmarks?: string
  } = {}

  if (typeof body.done === "boolean") data.done = body.done
  if (typeof body.acknowledged === "boolean") data.acknowledged = body.acknowledged
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim()
  if (body.note !== undefined) data.note = body.note ? String(body.note) : null
  if (typeof body.dueAt === "string" && body.dueAt.trim()) {
    const d = new Date(body.dueAt)
    if (!Number.isNaN(d.getTime())) {
      data.dueAt = d
      // If the user reschedules a previously-acknowledged reminder, clear the
      // acknowledged flag so the overdue modal can re-fire for the new time.
      data.acknowledged = false
    }
  }
  if (typeof body.order === "number" && Number.isFinite(body.order)) {
    data.order = Math.floor(body.order)
  }

  // Link handling — three modes:
  // 1) Explicit multi-link fields present (customerId/projectId/userId):
  //    rebuild as multi-link JSON. A field set to null or "" clears that slot.
  // 2) Legacy linkType/linkId: keep as-is if provided.
  // 3) Neither: leave the existing link untouched (unless removeLink is set).
  if (
    body.customerId !== undefined ||
    body.projectId !== undefined ||
    body.userId !== undefined
  ) {
    const existingM = parseMultiLink(existing.linkType, existing.linkId)
    const m: MultiLink = {
      customerId:
        body.customerId === undefined
          ? existingM.customerId ?? null
          : typeof body.customerId === "string" && body.customerId
          ? body.customerId
          : null,
      projectId:
        body.projectId === undefined
          ? existingM.projectId ?? null
          : typeof body.projectId === "string" && body.projectId
          ? body.projectId
          : null,
      userId:
        body.userId === undefined
          ? existingM.userId ?? null
          : typeof body.userId === "string" && body.userId
          ? body.userId
          : null,
    }
    const s = serializeMultiLink(m)
    data.linkType = s.linkType
    data.linkId = s.linkId
  } else if (typeof body.linkType === "string") {
    if (body.linkType === "none") {
      data.linkType = null
      data.linkId = null
    } else if (VALID_LINK_TYPES.includes(body.linkType)) {
      // Legacy single-link update
      if (body.linkId !== undefined && body.linkId) {
        data.linkType = body.linkType
        data.linkId = String(body.linkId)
      } else {
        data.linkType = body.linkType
        data.linkId = null
      }
    }
  }

  // removeLink: manually remove one link via the X button.
  // Must be applied AFTER any link updates above (we operate on the merged state).
  if (typeof body.removeLink === "string") {
    const mergedLinkType = data.linkType !== undefined ? data.linkType : existing.linkType
    const mergedLinkId = data.linkId !== undefined ? data.linkId : existing.linkId
    const m = parseMultiLink(mergedLinkType, mergedLinkId)
    const slot =
      body.removeLink === "customer"
        ? "customerId"
        : body.removeLink === "project"
        ? "projectId"
        : body.removeLink === "user"
        ? "userId"
        : null
    if (slot) {
      m[slot] = null
      const s = serializeMultiLink(m)
      data.linkType = s.linkType
      data.linkId = s.linkId
      // Also clear the corresponding linkCheckmarks entry.
      const existingCm = parseLinkCheckmarks(existing.linkCheckmarks)
      delete existingCm[keyForSlot(slot)]
      data.linkCheckmarks = serializeLinkCheckmarks(existingCm)
    }
  }

  // linkCheckmarks: accept an object that fully replaces the current map.
  // Use this for the tick/untick action.
  if (body.linkCheckmarks && typeof body.linkCheckmarks === "object") {
    const incoming = body.linkCheckmarks as Record<string, unknown>
    const existingCm = parseLinkCheckmarks(existing.linkCheckmarks)
    const merged: LinkCheckmarks = { ...existingCm }
    ;(["customer", "project", "user"] as LinkKey[]).forEach((k) => {
      const v = incoming[k]
      if (v === null) {
        merged[k] = null
      } else if (typeof v === "string") {
        // Validate ISO datetime; accept as-is otherwise.
        const t = new Date(v).getTime()
        if (!Number.isNaN(t)) merged[k] = v
      } else if (v === undefined) {
        // Leave untouched.
      } else {
        merged[k] = null
      }
    })
    data.linkCheckmarks = serializeLinkCheckmarks(merged)
  }

  const updated = await db.reminder.update({ where: { id }, data })
  return NextResponse.json(shape(updated))
}

// DELETE: remove a reminder owned by the current user.
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const userId = await getCurrentUserId(db, role)
  if (!userId) {
    return NextResponse.json({ error: "کاربر فعال یافت نشد" }, { status: 400 })
  }

  const { id } = await params
  const existing = await db.reminder.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "یادآور یافت نشد" }, { status: 404 })
  }

  await db.reminder.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
