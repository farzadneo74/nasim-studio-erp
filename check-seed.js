/**
 * Check if the database needs seeding.
 * Exits with code 2 if seeding is needed, 0 if already seeded.
 *
 * Checks THREE things:
 * 1. Does master DB have any studios?
 * 2. Does db/studio-demo.db file exist (in project root, NOT prisma/db)?
 * 3. Does studio-demo.db have the User table with actual records?
 *
 * If ANY is false, exit with code 2 (needs seed).
 */
const { PrismaClient } = require("./src/generated/master-client")
const { PrismaClient: StudioPrismaClient } = require("@prisma/client")
const { existsSync } = require("fs")
const { join } = require("path")

async function main() {
  // Check 1: master DB has studios
  const master = new PrismaClient()
  let studioCount = 0
  try {
    studioCount = await master.studio.count()
    if (studioCount === 0) {
      console.log("NEEDS_SEED: no studios in master DB")
      process.exit(2)
    }
  } catch (e) {
    console.log("NEEDS_SEED: master DB error:", e.message)
    process.exit(2)
  } finally {
    await master.$disconnect()
  }

  // Check 2: db/studio-demo.db exists in PROJECT ROOT (not prisma/db/)
  const dbPath = join(process.cwd(), "db", "studio-demo.db")
  if (!existsSync(dbPath)) {
    console.log("NEEDS_SEED: db/studio-demo.db does not exist")
    process.exit(2)
  }

  // Check 3: studio-demo.db has User table with records
  const studioDb = new StudioPrismaClient({
    datasources: { db: { url: `file:${dbPath}` } },
  })
  try {
    const userCount = await studioDb.user.count()
    if (userCount === 0) {
      console.log("NEEDS_SEED: studio-demo.db has no users")
      process.exit(2)
    }
    console.log("ALREADY_SEEDED:", studioCount, "studios,", userCount, "users")
    process.exit(0)
  } catch (e) {
    console.log("NEEDS_SEED: studio-demo.db error:", e.message)
    process.exit(2)
  } finally {
    await studioDb.$disconnect()
  }
}

main()
