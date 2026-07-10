import { PrismaClient } from "@prisma/client"

const studioClients = new Map<string, PrismaClient>()

const STUDIO_DB_PATH = (dbName: string) => `file:${process.cwd()}/db/${dbName}`

export function getStudioDb(dbName: string): PrismaClient {
  if (!studioClients.has(dbName)) {
    const client = new PrismaClient({ datasources: { db: { url: STUDIO_DB_PATH(dbName) } }, log: ["error", "warn"] })
    studioClients.set(dbName, client)
  }
  return studioClients.get(dbName)!
}

export async function ensureStudioDb(dbName: string): Promise<void> {
  const fs = await import("fs/promises")
  const path = await import("path")
  const dbPath = path.join(process.cwd(), "db", dbName)
  try { await fs.access(dbPath) } catch { await fs.writeFile(dbPath, "") }
}
