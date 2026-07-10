/**
 * Centralized Attachment Management System
 * ==========================================
 *
 * This module provides a standard, professional SaaS file management layer.
 * Every file uploaded in the studio (notes, messages, project notes, custom fields, etc.)
 * goes through `saveAttachment()`, which:
 *
 *  1. Stores the file at: upload/<studioDbName>/<ownerType>/<ownerId>/<attachmentId>-<safeName>
 *  2. Creates an Attachment record in the studio DB with full metadata
 *  3. Updates the studio's cached storageUsedBytes in the master DB
 *  4. Returns a URL that tracks last-accessed time on every view
 *
 * Benefits:
 *  - Per-studio isolation (each studio's files are in their own directory → easy backup)
 *  - Full lifecycle tracking (createdAt, lastAccessedAt, deletedAt)
 *  - Storage quota enforcement (SaaS billing)
 *  - Bulk cleanup by age/size/type/owner
 *  - Soft-delete trash with recovery
 *  - Checksum dedup-ready
 */

import { writeFile, mkdir, readFile, unlink, stat } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import crypto from "crypto"
import sharp from "sharp"
import { masterDb } from "./master-db"
import type { PrismaClient } from "@prisma/client"

const UPLOAD_ROOT = path.resolve(process.cwd(), "upload")

const IMAGE_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/tiff",
]
const AUDIO_TYPES = [
  "audio/mpeg", "audio/mp3", "audio/m4a", "audio/x-m4a", "audio/wav", "audio/ogg",
  "audio/aac", "audio/flac", "audio/opus", "audio/amr", "audio/3gpp", "audio/x-wav",
]
const VIDEO_TYPES = [
  "video/mp4", "video/quicktime", "video/x-matroska", "video/webm", "video/x-msvideo",
  "video/x-m4v", "video/3gpp", "video/x-ms-wmv", "video/x-flv",
]

export type FileType = "image" | "audio" | "video" | "file"
export type OwnerType =
  | "user_note"
  | "customer_note"
  | "project_note"
  | "message"
  | "custom_field"
  | "expense_receipt"
  | "qr_logo"
  | string // allow future types

export function detectFileType(mime: string): FileType {
  if (IMAGE_TYPES.includes(mime)) return "image"
  if (AUDIO_TYPES.includes(mime)) return "audio"
  if (VIDEO_TYPES.includes(mime)) return "video"
  return "file"
}

function sanitizeFilename(name: string): string {
  // Keep it filesystem-safe but readable
  const ext = path.extname(name)
  const base = path.basename(name, ext)
    .replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, "_")
    .slice(0, 60)
  return `${base || "file"}${ext}`.slice(0, 100)
}

function sha256(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex")
}

export interface SaveAttachmentInput {
  studioDbName: string
  ownerType: OwnerType
  ownerId: string
  file: File | Buffer
  fileName?: string
  mimeType?: string
  uploadedById?: string
  uploadedByName?: string
  /** For images: generate a thumbnail? (default true) */
  generateThumb?: boolean
}

export interface SavedAttachment {
  id: string
  url: string
  thumbUrl: string | null
  fileName: string
  mimeType: string
  fileType: FileType
  sizeBytes: number
  storagePath: string
  thumbPath: string | null
}

/**
 * Save a file to disk + create an Attachment record + update studio storage usage.
 * Returns the metadata including a URL that should be used in the frontend.
 */
export async function saveAttachment(
  db: PrismaClient,
  input: SaveAttachmentInput
): Promise<SavedAttachment> {
  const { studioDbName, ownerType, ownerId } = input

  // Normalize the file input
  const originalName = input.fileName || (input.file instanceof File ? input.file.name : `file-${Date.now()}`)
  const mime = input.mimeType || (input.file instanceof File ? input.file.type : "application/octet-stream") || "application/octet-stream"
  const buffer = input.file instanceof File
    ? Buffer.from(await input.file.arrayBuffer())
    : input.file
  const fileType = detectFileType(mime)
  const checksum = sha256(buffer)
  const sizeBytes = buffer.length

  // Create the Attachment record first (we need the ID for the filename)
  const attachment = await db.attachment.create({
    data: {
      studioId: studioDbName,
      ownerType,
      ownerId,
      uploadedById: input.uploadedById ?? null,
      uploadedByName: input.uploadedByName ?? null,
      fileName: originalName,
      storagePath: "", // filled after we know the ID
      mimeType: mime,
      fileType,
      sizeBytes,
      checksum,
      thumbPath: null,
    },
  })

  // Build the storage path: <studioDbName>/<ownerType>/<ownerId>/<id>-<safeName>
  const safeName = sanitizeFilename(originalName)
  const relDir = path.join(studioDbName, ownerType, ownerId)
  const absDir = path.join(UPLOAD_ROOT, relDir)
  if (!existsSync(absDir)) {
    await mkdir(absDir, { recursive: true })
  }

  // For images, we may convert to JPEG; for others, keep original extension
  let finalExt = path.extname(safeName)
  let finalBuffer = buffer
  let finalMime = mime
  let thumbRelPath: string | null = null

  if (fileType === "image" && input.generateThumb !== false) {
    try {
      // Resize main image to max 1080×1080, JPEG
      const resized = await sharp(buffer)
        .resize(1080, 1080, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer()
      finalBuffer = resized
      finalMime = "image/jpeg"
      finalExt = ".jpg"

      // Generate 200×200 thumbnail
      const thumb = await sharp(buffer)
        .resize(200, 200, { fit: "cover" })
        .jpeg({ quality: 70 })
        .toBuffer()
      const thumbName = `${attachment.id}-thumb.jpg`
      const thumbAbsPath = path.join(absDir, thumbName)
      await writeFile(thumbAbsPath, thumb)
      thumbRelPath = path.join(relDir, thumbName)
    } catch {
      // sharp failed (e.g. HEIC) — keep original
    }
  }

  const finalName = `${attachment.id}-${safeName.replace(/\.[^.]+$/, "")}${finalExt}`
  const relPath = path.join(relDir, finalName)
  const absPath = path.join(UPLOAD_ROOT, relPath)
  await writeFile(absPath, finalBuffer)

  // Update the record with the final paths + corrected size/mime
  await db.attachment.update({
    where: { id: attachment.id },
    data: {
      storagePath: relPath,
      thumbPath: thumbRelPath,
      sizeBytes: finalBuffer.length,
      mimeType: finalMime,
    },
  })

  // Update studio storage usage in master DB
  try {
    await masterDb.studio.update({
      where: { dbName: studioDbName },
      data: { storageUsedBytes: { increment: BigInt(finalBuffer.length) } },
    })
  } catch {
    // non-fatal — the cached value will be refreshed on next stats call
  }

  return {
    id: attachment.id,
    url: `/api/attachments/${attachment.id}/content`,
    thumbUrl: thumbRelPath ? `/api/attachments/${attachment.id}/thumb` : null,
    fileName: originalName,
    mimeType: finalMime,
    fileType,
    sizeBytes: finalBuffer.length,
    storagePath: relPath,
    thumbPath: thumbRelPath,
  }
}

/**
 * Read a file from disk by its attachment ID, update lastAccessedAt.
 * Returns { buffer, mimeType, fileName } or null if not found / deleted.
 */
export async function getAttachmentContent(
  db: PrismaClient,
  attachmentId: string,
  options?: { thumb?: boolean }
): Promise<{ buffer: Buffer; mimeType: string; fileName: string; sizeBytes: number } | null> {
  const att = await db.attachment.findUnique({ where: { id: attachmentId } })
  if (!att || att.deletedAt) return null

  const relPath = options?.thumb && att.thumbPath ? att.thumbPath : att.storagePath
  const absPath = path.join(UPLOAD_ROOT, relPath)
  if (!existsSync(absPath)) return null

  const buffer = await readFile(absPath)
  // Update last accessed (fire-and-forget, don't block the response)
  db.attachment.update({
    where: { id: attachmentId },
    data: { lastAccessedAt: new Date() },
  }).catch(() => {})

  return {
    buffer,
    mimeType: options?.thumb && att.thumbPath ? "image/jpeg" : att.mimeType,
    fileName: att.fileName,
    sizeBytes: att.sizeBytes,
  }
}

/**
 * Soft-delete an attachment (move to trash). The file stays on disk until hard-deleted.
 */
export async function softDeleteAttachment(db: PrismaClient, attachmentId: string): Promise<boolean> {
  const att = await db.attachment.findUnique({ where: { id: attachmentId } })
  if (!att || att.deletedAt) return false
  await db.attachment.update({
    where: { id: attachmentId },
    data: { deletedAt: new Date() },
  })
  return true
}

/**
 * Restore a soft-deleted attachment from trash.
 */
export async function restoreAttachment(db: PrismaClient, attachmentId: string): Promise<boolean> {
  const att = await db.attachment.findUnique({ where: { id: attachmentId } })
  if (!att || !att.deletedAt) return false
  await db.attachment.update({
    where: { id: attachmentId },
    data: { deletedAt: null },
  })
  return true
}

/**
 * Permanently delete an attachment (DB record + file on disk). Updates storage usage.
 */
export async function hardDeleteAttachment(db: PrismaClient, attachmentId: string): Promise<boolean> {
  const att = await db.attachment.findUnique({ where: { id: attachmentId } })
  if (!att) return false

  // Delete the main file
  const mainPath = path.join(UPLOAD_ROOT, att.storagePath)
  if (existsSync(mainPath)) {
    try { await unlink(mainPath) } catch { /* ignore */ }
  }
  // Delete the thumbnail if present
  if (att.thumbPath) {
    const thumbPath = path.join(UPLOAD_ROOT, att.thumbPath)
    if (existsSync(thumbPath)) {
      try { await unlink(thumbPath) } catch { /* ignore */ }
    }
  }

  await db.attachment.delete({ where: { id: attachmentId } })

  // Update studio storage usage
  try {
    await masterDb.studio.update({
      where: { dbName: att.studioId },
      data: { storageUsedBytes: { decrement: BigInt(att.sizeBytes) } },
    })
  } catch { /* non-fatal */ }

  return true
}

/**
 * Recalculate the studio's storageUsedBytes from the Attachment table.
 * Call this periodically to fix any drift in the cached value.
 */
export async function recalcStorageUsage(db: PrismaClient, studioDbName: string): Promise<number> {
  const result = await db.attachment.aggregate({
    _sum: { sizeBytes: true },
    where: { studioId: studioDbName, deletedAt: null },
  })
  const used = result._sum.sizeBytes ?? 0
  try {
    await masterDb.studio.update({
      where: { dbName: studioDbName },
      data: { storageUsedBytes: BigInt(used) },
    })
  } catch { /* non-fatal */ }
  return used
}

export interface StorageStats {
  usedBytes: number
  quotaBytes: number
  fileCount: number
  byType: Record<FileType, { count: number; sizeBytes: number }>
  byOwnerType: Record<string, { count: number; sizeBytes: number }>
  oldestFile: Date | null
  leastRecentlyAccessed: Date | null
}

/**
 * Get comprehensive storage statistics for a studio.
 */
export async function getStorageStats(db: PrismaClient, studioDbName: string): Promise<StorageStats> {
  const where = { studioId: studioDbName, deletedAt: null }
  const [total, byTypeRaw, byOwnerRaw, oldest, lra] = await Promise.all([
    db.attachment.aggregate({ _sum: { sizeBytes: true }, _count: true, where }),
    db.attachment.groupBy({ by: ["fileType"], _sum: { sizeBytes: true }, _count: true, where }),
    db.attachment.groupBy({ by: ["ownerType"], _sum: { sizeBytes: true }, _count: true, where }),
    db.attachment.findFirst({ where, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    db.attachment.findFirst({ where, orderBy: { lastAccessedAt: "asc" }, select: { lastAccessedAt: true } }),
  ])

  const byType: StorageStats["byType"] = { image: { count: 0, sizeBytes: 0 }, audio: { count: 0, sizeBytes: 0 }, video: { count: 0, sizeBytes: 0 }, file: { count: 0, sizeBytes: 0 } }
  for (const r of byTypeRaw) {
    const t = r.fileType as FileType
    if (byType[t]) {
      byType[t].count = r._count
      byType[t].sizeBytes = r._sum.sizeBytes ?? 0
    }
  }

  const byOwner: StorageStats["byOwnerType"] = {}
  for (const r of byOwnerRaw) {
    byOwner[r.ownerType] = { count: r._count, sizeBytes: r._sum.sizeBytes ?? 0 }
  }

  // Get quota from master DB
  let quotaBytes = 1073741824 // 1 GB default
  try {
    const studio = await masterDb.studio.findUnique({ where: { dbName: studioDbName }, select: { storageQuotaBytes: true, storageUsedBytes: true } })
    if (studio) {
      quotaBytes = Number(studio.storageQuotaBytes)
    }
  } catch { /* use default */ }

  return {
    usedBytes: total._sum.sizeBytes ?? 0,
    quotaBytes,
    fileCount: total._count,
    byType,
    byOwner,
    oldestFile: oldest?.createdAt ?? null,
    leastRecentlyAccessed: lra?.lastAccessedAt ?? null,
  }
}

export interface AttachmentFilter {
  ownerType?: string
  fileType?: string
  beforeDate?: Date       // createdAt before
  afterDate?: Date        // createdAt after
  minSizeBytes?: number
  maxSizeBytes?: number
  notAccessedSince?: Date // lastAccessedAt before
  search?: string         // fileName contains
  includeDeleted?: boolean
  sort?: "newest" | "oldest" | "largest" | "smallest" | "least-accessed"
  limit?: number
  offset?: number
}

/**
 * List attachments with filters. Returns { items, total }.
 */
export async function listAttachments(
  db: PrismaClient,
  studioDbName: string,
  filter: AttachmentFilter = {}
) {
  const where: Record<string, unknown> = { studioId: studioDbName }
  if (!filter.includeDeleted) where.deletedAt = null
  if (filter.ownerType) where.ownerType = filter.ownerType
  if (filter.fileType) where.fileType = filter.fileType
  if (filter.search) where.fileName = { contains: filter.search }
  if (filter.beforeDate || filter.afterDate) {
    where.createdAt = {}
    if (filter.beforeDate) (where.createdAt as Record<string, unknown>).lt = filter.beforeDate
    if (filter.afterDate) (where.createdAt as Record<string, unknown>).gt = filter.afterDate
  }
  if (filter.notAccessedSince) {
    where.lastAccessedAt = { lt: filter.notAccessedSince }
  }
  if (filter.minSizeBytes || filter.maxSizeBytes) {
    where.sizeBytes = {}
    if (filter.minSizeBytes) (where.sizeBytes as Record<string, unknown>).gte = filter.minSizeBytes
    if (filter.maxSizeBytes) (where.sizeBytes as Record<string, unknown>).lte = filter.maxSizeBytes
  }

  const orderBy: Record<string, string> =
    filter.sort === "oldest" ? { createdAt: "asc" }
    : filter.sort === "largest" ? { sizeBytes: "desc" }
    : filter.sort === "smallest" ? { sizeBytes: "asc" }
    : filter.sort === "least-accessed" ? { lastAccessedAt: "asc" }
    : { createdAt: "desc" } // newest (default)

  const limit = filter.limit ?? 50
  const offset = filter.offset ?? 0

  const [items, total] = await Promise.all([
    db.attachment.findMany({ where, orderBy, take: limit, skip: offset }),
    db.attachment.count({ where }),
  ])

  return { items, total }
}

/**
 * Bulk hard-delete attachments matching a filter (e.g. "not accessed in 90 days").
 * Returns { deletedCount, freedBytes }.
 */
export async function cleanupAttachments(
  db: PrismaClient,
  studioDbName: string,
  filter: AttachmentFilter
): Promise<{ deletedCount: number; freedBytes: number }> {
  // Fetch all matching IDs + sizes
  const { items } = await listAttachments(db, studioDbName, { ...filter, limit: 10000 })
  let deletedCount = 0
  let freedBytes = 0
  for (const att of items) {
    const ok = await hardDeleteAttachment(db, att.id)
    if (ok) {
      deletedCount++
      freedBytes += att.sizeBytes
    }
  }
  return { deletedCount, freedBytes }
}

/**
 * Check if a studio has enough quota for an upcoming upload.
 */
export async function checkQuota(
  db: PrismaClient,
  studioDbName: string,
  incomingBytes: number
): Promise<{ ok: boolean; usedBytes: number; quotaBytes: number; remainingBytes: number }> {
  const stats = await getStorageStats(db, studioDbName)
  const remainingBytes = stats.quotaBytes - stats.usedBytes
  return {
    ok: remainingBytes >= incomingBytes,
    usedBytes: stats.usedBytes,
    quotaBytes: stats.quotaBytes,
    remainingBytes,
  }
}
