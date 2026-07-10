import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentStudioDbName, getCurrentRole, getCurrentUser } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

// GET /api/attachments — list attachments for the current studio with filters.
export async function GET(req: NextRequest) {
  try {
    const role = await getCurrentRole()
    if (!["admin", "manager"].includes(role)) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 })
    }
    const db = await getCurrentStudioDb()
    if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
    const studioId = await getCurrentStudioDbName()
    if (!studioId) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

    const url = new URL(req.url)
    const ownerType = url.searchParams.get("ownerType") || undefined
    const category = url.searchParams.get("category") || undefined
    const search = url.searchParams.get("search") || undefined
    const sort = url.searchParams.get("sort") || "newest"
    const includeDeleted = url.searchParams.get("includeDeleted") === "true"
    const onlyTrash = url.searchParams.get("trash") === "true"
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200)
    const offset = parseInt(url.searchParams.get("offset") || "0", 10)

    const where: Record<string, unknown> = { studioId }
    if (onlyTrash) {
      where.isDeleted = true
    } else if (includeDeleted) {
      // both
    } else {
      where.isDeleted = false
    }
    if (ownerType) where.ownerType = ownerType
    if (category) where.category = category
    if (search) where.originalFilename = { contains: search }

    const orderBy: Record<string, string> =
      sort === "oldest" ? { createdAt: "asc" }
      : sort === "largest" ? { sizeBytes: "desc" }
      : sort === "smallest" ? { sizeBytes: "asc" }
      : sort === "least-accessed" ? { lastAccessAt: "asc" }
      : sort === "most-downloaded" ? { downloadCount: "desc" }
      : { createdAt: "desc" }

    const [items, total] = await Promise.all([
      db.attachment.findMany({ where, orderBy, take: limit, skip: offset }),
      db.attachment.count({ where }),
    ])

    return NextResponse.json({
      items: items.map((a) => ({
        id: a.id,
        ownerType: a.ownerType,
        ownerId: a.ownerId,
        uploadedByName: a.uploadedByName,
        originalFilename: a.originalFilename,
        mimeType: a.mimeType,
        category: a.category,
        sizeBytes: a.sizeBytes,
        width: a.width,
        height: a.height,
        downloadCount: a.downloadCount,
        url: `/api/attachments/${a.id}/content`,
        thumbUrl: a.thumbnailKey ? `/api/attachments/${a.id}/thumb` : null,
        lastAccessAt: a.lastAccessAt.toISOString(),
        createdAt: a.createdAt.toISOString(),
        deletedAt: a.deletedAt?.toISOString() ?? null,
        isDeleted: a.isDeleted,
      })),
      total,
      limit,
      offset,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
