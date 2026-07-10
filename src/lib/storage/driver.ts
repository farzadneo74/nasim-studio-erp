/**
 * Storage Driver Interface (Abstraction Layer)
 * ============================================
 * No part of the application touches the filesystem directly. All file
 * operations go through an IStorageDriver implementation. Today we use
 * LocalFilesystemDriver; tomorrow we can swap in S3Driver / MinIODriver
 * without touching any business logic.
 */

export interface UploadResult {
  storageKey: string // relative path within the studio's storage root
  sizeBytes: number
  checksum: string
}

export interface StreamResult {
  stream: NodeJS.ReadableStream
  sizeBytes: number
  mimeType: string
}

export interface StorageDriver {
  /** Save a buffer to storage under <studioId>/<category>/<uuid>.<ext>. Returns the storageKey. */
  put(studioId: string, category: string, storageKey: string, buffer: Buffer): Promise<void>

  /** Read a file as a Buffer. */
  get(studioId: string, storageKey: string): Promise<Buffer>

  /** Stream a file (for large files / video). */
  stream(studioId: string, storageKey: string): Promise<StreamResult | null>

  /** Check if a file exists. */
  exists(studioId: string, storageKey: string): Promise<boolean>

  /** Delete a file permanently. Returns true if deleted, false if not found. */
  delete(studioId: string, storageKey: string): Promise<boolean>

  /** Get the size of a file in bytes (without reading it). */
  size(studioId: string, storageKey: string): Promise<number>

  /** List all files for a studio (for backup). Returns storageKeys relative to studio root. */
  listAll(studioId: string): Promise<string[]>

  /** Copy a file (used during backup). */
  copy(studioId: string, srcKey: string, destKey: string): Promise<void>

  /** Recursively delete an entire studio's storage (used during account deletion). */
  deleteStudio(studioId: string): Promise<void>

  /** Get disk free space in bytes (for monitoring). Local driver only. */
  getDiskFreeBytes?(): Promise<number>
}
