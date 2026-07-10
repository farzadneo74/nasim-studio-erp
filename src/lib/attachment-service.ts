 
/**
 * AttachmentService
 * =================
 * Central business-logic layer for all attachment operations. Uses IStorageDriver
 * (so we can swap Local → S3/MinIO later) and maintains:
 *  - Attachment records (DB)
 *  - StorageUsage cache (per category)
 *  - AttachmentAuditLog
 *  - Quota enforcement
 *  - Soft-delete / restore
 *  - Retention suggestions
 *  - Backup (DB + files + manifest)
 */

import { randomUUID, createHash } from "crypto"
import { promises as fs, createReadStream, existsSync } from "fs"
import path from "path"
import sharp from "sharp"
import type { PrismaClient } from "@prisma/client"
import { masterDb } from "./master-db"
import type { FileType } from "./attachments"

// ---------- Inlined Local Filesystem Driver (no external dependency) ----------
const STORAGE_ROOT = path.resolve(process.cwd(), "storage")

function studioRoot(studioId: string): string {
  return path.join(STORAGE_ROOT, "studios", studioId)
}
function resolveSafe(studioId: string, storageKey: string): string {
  const root = studioRoot(studioId)
  const resolved = path.normalize(path.join(root, storageKey))
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error("Path traversal detected")
  }
  return resolved
}

const driver = {
  async put(studioId: string, _category: string, storageKey: string, buffer: Buffer): Promise<void> {
    const abs = resolveSafe(studioId, storageKey)
    const dir = path.dirname(abs)
    if (!existsSync(dir)) await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(abs, buffer)
  },
  async get(studioId: string, storageKey: string): Promise<Buffer> {
    return fs.readFile(resolveSafe(studioId, storageKey))
  },
  async exists(studioId: string, storageKey: string): Promise<boolean> {
    return existsSync(resolveSafe(studioId, storageKey))
  },
  async delete(studioId: string, storageKey: string): Promise<boolean> {
    const abs = resolveSafe(studioId, storageKey)
    if (!existsSync(abs)) return false
    await fs.unlink(abs)
    return true
  },
  async getDiskFreeBytes(): Promise<number> {
    try {
      const stats = await fs.statfs(STORAGE_ROOT)
      return stats.bavail * stats.bsize
    } catch {
      return 0
    }
  },
}

function computeChecksum(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex")
}

// ---------- Types ----------
export type Category = "image" | "audio" | "video" | "document"
export type OwnerType =
  | "user_note"
  | "customer_note"
  | "project_note"
  | "message"
  | "custom_field"
  | "expense_receipt"
  | "qr_logo"
  | string

export interface UploadInput {
  studioId: string // studio dbName
  ownerType: OwnerType
  ownerId: string
  uploadedById?: string
  uploadedByName?: string
  file: { name: string; type: string; buffer: Buffer }
  generateThumb?: boolean
}

export interface UploadedAttachment {
  id: string
  url: string
  thumbUrl: string | null
  fileName: string
  mimeType: string
  category: Category
  sizeBytes: number
  storageKey: string
  thumbStorageKey: string | null
  width: number | null
  height: number | null
}

// ---------- Validation ----------
const ALLOWED_MIME: Record<Category, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/tiff"],
  audio: ["audio/mpeg", "audio/mp3", "audio/m4a", "audio/x-m4a", "audio/wav", "audio/ogg", "audio/aac", "audio/flac", "audio/opus", "audio/amr", "audio/3gpp", "audio/x-wav"],
  video: ["video/mp4", "video/quicktime", "video/x-matroska", "video/webm", "video/x-msvideo", "video/x-m4v", "video/3gpp", "video/x-ms-wmv", "video/x-flv"],
  document: [
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain", "text/csv", "application/zip", "application/vnd.rar", "application/x-rar-compressed",
    "application/json",
  ],
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB per file

// Magic-number signatures (first bytes) for top formats
const MAGIC_SIGNATURES: { ext: string; sig: number[]; mime: string; category: Category }[] = [
  { ext: "jpg", sig: [0xff, 0xd8, 0xff], mime: "image/jpeg", category: "image" },
  { ext: "png", sig: [0x89, 0x50, 0x4e, 0x47], mime: "image/png", category: "image" },
  { ext: "gif", sig: [0x47, 0x49, 0x46, 0x38], mime: "image/gif", category: "image" },
  { ext: "webp", sig: [0x52, 0x49, 0x46, 0x46], mime: "image/webp", category: "image" }, // RIFF
  { ext: "bmp", sig: [0x42, 0x4d], mime: "image/bmp", category: "image" },
  { ext: "pdf", sig: [0x25, 0x50, 0x44, 0x46], mime: "application/pdf", category: "document" },
  { ext: "mp3", sig: [0x49, 0x44, 0x33], mime: "audio/mpeg", category: "audio" }, // ID3
  { ext: "mp4", sig: [0x66, 0x74, 0x79, 0x70], mime: "video/mp4", category: "video" }, // "ftyp" at offset 4
  { ext: "zip", sig: [0x50, 0x4b, 0x03, 0x04], mime: "application/zip", category: "document" },
]

function detectByMagic(buf: Buffer): { ext: string; mime: string; category: Category } | null {
  for (const s of MAGIC_SIGNATURES) {
    if (buf.length < s.sig.length) continue
    // For mp4/webp, "ftyp" appears at offset 4
    if (s.ext === "mp4" || s.ext === "webp") {
      if (buf.length >= 12 && buf.slice(4, 8).toString("ascii") === "ftyp") {
        return s
      }
      continue
    }
    let match = true
    for (let i = 0; i < s.sig.length; i++) {
      if (buf[i] !== s.sig[i]) { match = false; break }
    }
    if (match) return s
  }
  return null
}

function categoryForMime(mime: string): Category {
  if (mime.startsWith("image/")) return "image"
  if (mime.startsWith("audio/")) return "audio"
  if (mime.startsWith("video/")) return "video"
  return "document"
}

function extForMime(mime: string, fileName: string): string {
  const fromName = path.extname(fileName).slice(1).toLowerCase()
  if (fromName) return fromName
  // fallback
  if (mime === "image/jpeg") return "jpg"
  if (mime === "audio/mpeg") return "mp3"
  if (mime === "video/mp4") return "mp4"
  return "bin"
}

// ---------- Audit log helper ----------
async function audit(
  db: PrismaClient,
  studioId: string,
  action: string,
  attachmentId: string | null,
  actorId: string | null,
  actorName: string | null,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    await db.attachmentAuditLog.create({
      data: {
        studioId,
        attachmentId,
        action,
        actorId,
        actorName,
        details: JSON.stringify(details),
      },
    })
  } catch { /* non-fatal */ }
}

// ---------- StorageUsage cache helpers ----------
async function incUsage(
  db: PrismaClient,
  studioId: string,
  category: string,
  sizeBytes: number
): Promise<void> {
  await db.storageUsage.upsert({
    where: { studioId_category: { studioId, category } },
    create: { studioId, category, usedBytes: BigInt(sizeBytes), fileCount: 1 },
    update: { usedBytes: { increment: BigInt(sizeBytes) }, fileCount: { increment: 1 } },
  })
  // also update master cached total
  try {
    await masterDb.studio.update({
      where: { dbName: studioId },
      data: { storageUsedBytes: { increment: BigInt(sizeBytes) } },
    })
  } catch { /* non-fatal */ }
}

async function decUsage(
  db: PrismaClient,
  studioId: string,
  category: string,
  sizeBytes: number
): Promise<void> {
  await db.storageUsage.upsert({
    where: { studioId_category: { studioId, category } },
    create: { studioId, category, usedBytes: BigInt(0), fileCount: 0 },
    update: { usedBytes: { decrement: BigInt(sizeBytes) }, fileCount: { decrement: 1 } },
  })
  try {
    await masterDb.studio.update({
      where: { dbName: studioId },
      data: { storageUsedBytes: { decrement: BigInt(sizeBytes) } },
    })
  } catch { /* non-fatal */ }
}

// ---------- Public API ----------

/**
 * Upload a file. Validates MIME + magic number, enforces quota, generates
 * thumbnail (images), saves to storage, creates Attachment record, updates
 * StorageUsage cache, writes audit log.
 */
export async function uploadAttachment(
  db: PrismaClient,
  input: UploadInput
): Promise<UploadedAttachment> {
  // driver is the module-level inlined storage driver
  const { studioId, ownerType, ownerId } = input
  const { name, type, buffer } = input.file

  // 1. Size check
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(`حجم فایل بیش از ${MAX_FILE_SIZE / 1024 / 1024} مگابایت است`)
  }

  // 2. MIME validation (must be in allow-list)
  let mime = type || "application/octet-stream"
  let category = categoryForMime(mime)
  const allowed = ALLOWED_MIME[category]
  if (!allowed || !allowed.includes(mime)) {
    // Try magic-number detection as fallback (some clients send wrong MIME)
    const detected = detectByMagic(buffer)
    if (detected && ALLOWED_MIME[detected.category].includes(detected.mime)) {
      mime = detected.mime
      category = detected.category
    } else {
      throw new Error(`نوع فایل مجاز نیست: ${mime}`)
    }
  }

  // 3. Magic-number validation (security: confirm content matches claimed type)
  const magicOk = (() => {
    const detected = detectByMagic(buffer)
    if (!detected) return true // some formats (txt, docx) don't have reliable magic — allow with MIME check
    return detected.category === category
  })()
  if (!magicOk) {
    throw new Error("محتوای فایل با نوع اعلام‌شده مطابقت ندارد")
  }

  // 4. Quota check
  const quotaCheck = await checkQuota(db, studioId, buffer.length)
  if (!quotaCheck.ok) {
    await audit(db, studioId, "quota_exceeded", null, input.uploadedById ?? null, input.uploadedByName ?? null, {
      requestedBytes: buffer.length,
      remainingBytes: quotaCheck.remainingBytes,
    })
    throw new Error(`فضای ذخیره‌سازی کافی نیست. باقی‌مانده: ${Math.floor(quotaCheck.remainingBytes / 1024 / 1024)} مگابایت`)
  }

  // 5. Generate UUID-based storage key
  const uuid = randomUUID()
  const ext = extForMime(mime, name)
  const storageKey = `${category}/${uuid}.${ext}`
  const checksum = computeChecksum(buffer)

  // 6. Generate thumbnail for images (resize main to 1080 max, thumbnail 200×200)
  let thumbStorageKey: string | null = null
  let width: number | null = null
  let height: number | null = null
  let finalBuffer = buffer
  let finalMime = mime

  if (category === "image" && input.generateThumb !== false) {
    try {
      const meta = await sharp(buffer).metadata()
      width = meta.width ?? null
      height = meta.height ?? null
      const resized = await sharp(buffer)
        .resize(1080, 1080, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer()
      finalBuffer = resized
      finalMime = "image/jpeg"
      const thumb = await sharp(buffer)
        .resize(200, 200, { fit: "cover" })
        .jpeg({ quality: 70 })
        .toBuffer()
      thumbStorageKey = `thumbnails/${uuid}.jpg`
      await driver.put(studioId, "thumbnails", thumbStorageKey, thumb)
    } catch {
      // sharp failed (e.g. HEIC) — keep original
    }
  }

  // 7. Save the main file via driver
  await driver.put(studioId, category, storageKey, finalBuffer)

  // 8. Create Attachment record
  const att = await db.attachment.create({
    data: {
      studioId,
      ownerType,
      ownerId,
      uploadedById: input.uploadedById ?? null,
      uploadedByName: input.uploadedByName ?? null,
      originalFilename: name,
      storageKey,
      mimeType: finalMime,
      extension: ext,
      category,
      sizeBytes: finalBuffer.length,
      checksum,
      thumbnailKey: thumbStorageKey,
      width,
      height,
      isDeleted: false,
      virusStatus: "skipped", // no scanner yet
    },
  })

  // 9. Update usage cache + audit
  await incUsage(db, studioId, category, finalBuffer.length)
  if (thumbStorageKey) {
    const thumb = await driver.get(studioId, thumbStorageKey)
    await incUsage(db, studioId, "thumbnail", thumb.length)
  }
  await audit(db, studioId, "upload", att.id, input.uploadedById ?? null, input.uploadedByName ?? null, {
    fileName: name,
    sizeBytes: finalBuffer.length,
    category,
    ownerType,
    ownerId,
  })

  return {
    id: att.id,
    url: `/api/attachments/${att.id}/content`,
    thumbUrl: thumbStorageKey ? `/api/attachments/${att.id}/thumb` : null,
    fileName: name,
    mimeType: finalMime,
    category,
    sizeBytes: finalBuffer.length,
    storageKey,
    thumbStorageKey,
    width,
    height,
  }
}

/**
 * Get a file's content + metadata for serving (download/stream).
 * Increments downloadCount, updates lastAccessAt.
 */
export async function getAttachmentForDownload(
  db: PrismaClient,
  attachmentId: string,
  options?: { thumb?: boolean }
): Promise<{ buffer: Buffer; mimeType: string; fileName: string; sizeBytes: number } | null> {
  const att = await db.attachment.findUnique({ where: { id: attachmentId } })
  if (!att || att.isDeleted) return null

  // driver is the module-level inlined storage driver
  const key = options?.thumb && att.thumbnailKey ? att.thumbnailKey : att.storageKey
  const exists = await driver.exists(att.studioId, key)
  if (!exists) return null

  const buffer = await driver.get(att.studioId, key)

  // Update access tracking (fire-and-forget)
  db.attachment.update({
    where: { id: attachmentId },
    data: {
      lastAccessAt: new Date(),
      downloadCount: { increment: options?.thumb ? 0 : 1 },
    },
  }).catch(() => {})

  return {
    buffer,
    mimeType: options?.thumb && att.thumbnailKey ? "image/jpeg" : att.mimeType,
    fileName: att.originalFilename,
    sizeBytes: att.sizeBytes,
  }
}

/**
 * Soft-delete (move to trash). File stays on disk.
 */
export async function softDelete(
  db: PrismaClient,
  attachmentId: string,
  actorId: string | null,
  actorName: string | null
): Promise<boolean> {
  const att = await db.attachment.findUnique({ where: { id: attachmentId } })
  if (!att || att.isDeleted) return false
  await db.attachment.update({
    where: { id: attachmentId },
    data: { isDeleted: true, deletedAt: new Date() },
  })
  await decUsage(db, att.studioId, att.category, att.sizeBytes)
  await audit(db, att.studioId, "delete", attachmentId, actorId, actorName, { fileName: att.originalFilename })
  return true
}

/**
 * Restore from trash.
 */
export async function restore(
  db: PrismaClient,
  attachmentId: string,
  actorId: string | null,
  actorName: string | null
): Promise<boolean> {
  const att = await db.attachment.findUnique({ where: { id: attachmentId } })
  if (!att || !att.isDeleted) return false
  await db.attachment.update({
    where: { id: attachmentId },
    data: { isDeleted: false, deletedAt: null },
  })
  await incUsage(db, att.studioId, att.category, att.sizeBytes)
  await audit(db, att.studioId, "restore", attachmentId, actorId, actorName, { fileName: att.originalFilename })
  return true
}

/**
 * Hard-delete (permanent): DB record + file on disk.
 */
export async function hardDelete(
  db: PrismaClient,
  attachmentId: string,
  actorId: string | null,
  actorName: string | null
): Promise<boolean> {
  const att = await db.attachment.findUnique({ where: { id: attachmentId } })
  if (!att) return false
  // driver is the module-level inlined storage driver
  await driver.delete(att.studioId, att.storageKey)
  if (att.thumbnailKey) {
    await driver.delete(att.studioId, att.thumbnailKey)
  }
  await db.attachment.delete({ where: { id: attachmentId } })
  await audit(db, att.studioId, "cleanup", attachmentId, actorId, actorName, {
    fileName: att.originalFilename,
    sizeBytes: att.sizeBytes,
  })
  return true
}

export interface QuotaStatus {
  ok: boolean
  usedBytes: number
  quotaBytes: number
  remainingBytes: number
}

export async function checkQuota(
  db: PrismaClient,
  studioId: string,
  incomingBytes: number
): Promise<QuotaStatus> {
  let quotaBytes = 1073741824 // 1 GB default
  let usedBytes = 0
  try {
    const studio = await masterDb.studio.findUnique({
      where: { dbName: studioId },
      select: { storageQuotaBytes: true, storageUsedBytes: true },
    })
    if (studio) {
      quotaBytes = Number(studio.storageQuotaBytes)
      usedBytes = Number(studio.storageUsedBytes)
    }
  } catch { /* use defaults */ }
  const remainingBytes = quotaBytes - usedBytes
  return { ok: remainingBytes >= incomingBytes, usedBytes, quotaBytes, remainingBytes }
}

export interface StorageStats {
  usedBytes: number
  quotaBytes: number
  remainingBytes: number
  fileCount: number
  byCategory: Record<Category, { count: number; sizeBytes: number }>
  byOwnerType: Record<string, { count: number; sizeBytes: number }>
  trashCount: number
  trashBytes: number
  diskFreeBytes: number
}

export async function getStorageStats(db: PrismaClient, studioId: string): Promise<StorageStats> {
  // driver is the module-level inlined storage driver
  const whereActive = { studioId, isDeleted: false }
  const whereTrash = { studioId, isDeleted: true }

  const [activeAgg, trashAgg, byCat, byOwner, diskFree] = await Promise.all([
    db.attachment.aggregate({ _sum: { sizeBytes: true }, _count: true, where: whereActive }),
    db.attachment.aggregate({ _sum: { sizeBytes: true }, _count: true, where: whereTrash }),
    db.attachment.groupBy({ by: ["category"], _sum: { sizeBytes: true }, _count: true, where: whereActive }),
    db.attachment.groupBy({ by: ["ownerType"], _sum: { sizeBytes: true }, _count: true, where: whereActive }),
    driver.getDiskFreeBytes?.() ?? 0,
  ])

  const byCategory: StorageStats["byCategory"] = {
    image: { count: 0, sizeBytes: 0 },
    audio: { count: 0, sizeBytes: 0 },
    video: { count: 0, sizeBytes: 0 },
    document: { count: 0, sizeBytes: 0 },
  }
  for (const r of byCat) {
    const c = r.category as Category
    if (byCategory[c]) {
      byCategory[c].count = r._count
      byCategory[c].sizeBytes = r._sum.sizeBytes ?? 0
    }
  }

  const byOwnerType: StorageStats["byOwnerType"] = {}
  for (const r of byOwner) {
    byOwnerType[r.ownerType] = { count: r._count, sizeBytes: r._sum.sizeBytes ?? 0 }
  }

  const quota = await checkQuota(db, studioId, 0)

  return {
    usedBytes: activeAgg._sum.sizeBytes ?? 0,
    quotaBytes: quota.quotaBytes,
    remainingBytes: quota.remainingBytes,
    fileCount: activeAgg._count,
    byCategory,
    byOwnerType,
    trashCount: trashAgg._count,
    trashBytes: trashAgg._sum.sizeBytes ?? 0,
    diskFreeBytes: diskFree,
  }
}

// ---------- Retention ----------

export interface RetentionSuggestion {
  ownerType: string
  count: number
  totalBytes: number
  oldestDays: number
  sampleFileNames: string[]
}

/**
 * Generate retention suggestions based on policies + actual unused files.
 * NEVER auto-deletes — only returns suggestions for the manager to review.
 */
export async function getRetentionSuggestions(
  db: PrismaClient,
  studioId: string
): Promise<RetentionSuggestion[]> {
  const policies = await db.retentionPolicy.findMany({ where: { studioId, enabled: true } })
  const now = new Date()
  const suggestions: RetentionSuggestion[] = []

  for (const p of policies) {
    if (!p.retentionDays) continue
    const cutoff = new Date(now.getTime() - p.retentionDays * 24 * 60 * 60 * 1000)
    const stale = await db.attachment.findMany({
      where: {
        studioId,
        ownerType: p.ownerType,
        isDeleted: false,
        lastAccessAt: { lt: cutoff },
      },
      select: { id: true, originalFilename: true, sizeBytes: true, lastAccessAt: true },
    })
    if (stale.length === 0) continue
    const totalBytes = stale.reduce((s, a) => s + a.sizeBytes, 0)
    const oldestDays = Math.floor((now.getTime() - Math.min(...stale.map((s) => s.lastAccessAt.getTime()))) / (24 * 60 * 60 * 1000))
    suggestions.push({
      ownerType: p.ownerType,
      count: stale.length,
      totalBytes,
      oldestDays,
      sampleFileNames: stale.slice(0, 3).map((s) => s.originalFilename),
    })
  }
  return suggestions
}

/**
 * Get/set the retention policy for an ownerType.
 */
export async function getRetentionPolicies(db: PrismaClient, studioId: string) {
  const policies = await db.retentionPolicy.findMany({ where: { studioId } })
  return policies
}

export async function setRetentionPolicy(
  db: PrismaClient,
  studioId: string,
  ownerType: string,
  retentionDays: number | null,
  enabled: boolean
) {
  return db.retentionPolicy.upsert({
    where: { studioId_ownerType: { studioId, ownerType } },
    create: { studioId, ownerType, retentionDays, enabled },
    update: { retentionDays, enabled },
  })
}

// ---------- Backup ----------

export interface BackupResult {
  ok: boolean
  studioId: string
  backupPath: string
  dbBytes: number
  fileCount: number
  filesBytes: number
  manifest: {
    studioId: string
    createdAt: string
    dbFile: string
    files: { storageKey: string; sizeBytes: number; checksum: string }[]
  }
}

/**
 * Create a full backup for a studio: SQLite DB + active attachments + manifest.
 * Thumbnails excluded (regenerable).
 */
export async function createBackup(
  db: PrismaClient,
  studioId: string,
  dbFilePath: string
): Promise<BackupResult> {
  const { promises: fs } = await import("fs")
  const path = await import("path")
  // driver is the module-level inlined storage driver
  const backupDir = path.resolve(process.cwd(), "storage", "backups", studioId, new Date().toISOString().replace(/[:.]/g, "-"))
  await fs.mkdir(backupDir, { recursive: true })

  // 1. Copy DB
  const dbBackupName = "studio.db"
  const dbBackupPath = path.join(backupDir, dbBackupName)
  await fs.copyFile(dbFilePath, dbBackupPath)
  const dbStat = await fs.stat(dbBackupPath)

  // 2. Copy active attachments (no thumbnails)
  const attachments = await db.attachment.findMany({
    where: { studioId },
    select: { id: true, storageKey: true, sizeBytes: true, checksum: true, thumbnailKey: true, isDeleted: true },
  })
  const filesManifest: { storageKey: string; sizeBytes: number; checksum: string }[] = []
  let filesBytes = 0
  for (const a of attachments) {
    if (a.isDeleted) continue
    const exists = await driver.exists(studioId, a.storageKey)
    if (!exists) continue
    const dest = path.join("files", a.storageKey)
    const destAbs = path.join(backupDir, dest)
    await fs.mkdir(path.dirname(destAbs), { recursive: true })
    const buf = await driver.get(studioId, a.storageKey)
    await fs.writeFile(destAbs, buf)
    filesBytes += a.sizeBytes
    filesManifest.push({ storageKey: a.storageKey, sizeBytes: a.sizeBytes, checksum: a.checksum ?? "" })
  }

  // 3. Manifest
  const manifest = {
    studioId,
    createdAt: new Date().toISOString(),
    dbFile: dbBackupName,
    files: filesManifest,
  }
  await fs.writeFile(path.join(backupDir, "manifest.json"), JSON.stringify(manifest, null, 2))

  await audit(db, studioId, "backup", null, null, null, {
    fileCount: filesManifest.length,
    filesBytes,
    dbBytes: dbStat.size,
  })

  return {
    ok: true,
    studioId,
    backupPath: backupDir,
    dbBytes: dbStat.size,
    fileCount: filesManifest.length,
    filesBytes,
    manifest,
  }
}
