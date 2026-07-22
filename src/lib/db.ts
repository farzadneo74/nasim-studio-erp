/* eslint-disable @typescript-eslint/no-require-imports */
// Workaround for Next.js + Turbopack dev mode: after `prisma generate` rewrites
// node_modules/@prisma/client, the dev server's module cache still holds the
// OLD PrismaClient class. We bust the cache here so the freshly-generated
// runtime (with the new schema's inlineSchema) is loaded.
let PrismaClientCtor: typeof import('@prisma/client').PrismaClient
try {
  // Resolve and delete from require cache, then re-require.
  const prismaPkgPath = require.resolve('@prisma/client')
  const prismaClientModule = require.cache[prismaPkgPath]
  if (prismaClientModule) {
    // Remove the cached module so the next require reloads from disk.
    delete require.cache[prismaPkgPath]
    // Also remove the underlying .prisma/client module that @prisma/client
    // re-exports from.
    try {
      const innerPath = require.resolve('.prisma/client/default')
      if (require.cache[innerPath]) delete require.cache[innerPath]
      const innerIndexPath = require.resolve('.prisma/client/index')
      if (require.cache[innerIndexPath]) delete require.cache[innerIndexPath]
    } catch { /* ignore */ }
  }
  PrismaClientCtor = require('@prisma/client').PrismaClient
} catch {
  // Fallback for environments without require (edge runtime).
  PrismaClientCtor = (require('@prisma/client') as { PrismaClient: typeof import('@prisma/client').PrismaClient }).PrismaClient
}

// Bumping this version forces re-instantiation of the cached PrismaClient
// after a schema change. Without this, the dev server keeps using the old
// client instance (cached on globalThis.prisma) even after `prisma generate`
// has rewritten the types/runtime.
const PRISMA_SCHEMA_VERSION = 'v-acknowledged-2026-07-php-printphoto-pkg-quality'

const globalForPrisma = globalThis as unknown as {
  prisma: import('@prisma/client').PrismaClient | undefined
  __prismaSchemaVersion?: string
}

if (globalForPrisma.__prismaSchemaVersion !== PRISMA_SCHEMA_VERSION) {
  // Schema changed (or first load): dispose of any cached client so the next
  // `new PrismaClient()` picks up the freshly-generated types/runtime.
  try {
    void globalForPrisma.prisma?.$disconnect?.()
  } catch {
    /* ignore */
  }
  globalForPrisma.prisma = undefined
  globalForPrisma.__prismaSchemaVersion = PRISMA_SCHEMA_VERSION
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClientCtor({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db// cache-bust 1783509137248833480

