import { NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentStudioDbName, getCurrentRole } from "@/lib/auth-helpers"
import { createBackup } from "@/lib/attachment-service"
import { getCurrentStudioDbPath } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

// POST /api/attachments/backup — create a full backup (DB + active attachments + manifest).
export async function POST() {
  try {
    const role = await getCurrentRole()
    if (!["admin"].includes(role)) {
      return NextResponse.json({ error: "فقط مدیر سیستم می‌تواند بکاپ بگیرد" }, { status: 403 })
    }
    const db = await getCurrentStudioDb()
    if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
    const studioId = await getCurrentStudioDbName()
    if (!studioId) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
    const dbPath = await getCurrentStudioDbPath()
    if (!dbPath) return NextResponse.json({ error: "مسیر دیتابیس یافت نشد" }, { status: 400 })

    const result = await createBackup(db, studioId, dbPath)
    return NextResponse.json({
      ok: true,
      studioId,
      dbBytes: result.dbBytes,
      fileCount: result.fileCount,
      filesBytes: result.filesBytes,
      backupPath: result.backupPath,
      createdAt: result.manifest.createdAt,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
