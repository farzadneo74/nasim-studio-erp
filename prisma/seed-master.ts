// Master DB seed — multi-tenant control plane.
//
// Targets the master DB at `db/master.db` (per schema-master.prisma datasource).
// Run with: `DATABASE_URL="file:/home/z/my-project/db/master.db" bun prisma/seed-master.ts`
//
// Idempotent: uses upsert everywhere. Wipes Session, OtpCode, and StudioMembership
// for stray users so demo MasterUser IDs are stable across re-runs.

import { PrismaClient } from "../src/generated/master-client"
import bcrypt from "bcryptjs"
import { existsSync, copyFileSync } from "fs"
import { join } from "path"

const master = new PrismaClient({ log: ["error"] })

async function main() {
  console.log("Seeding master DB...")

  // ---------- Studio 1: NASIM STUDIO (studio-demo.db) ----------
  const studio1 = await master.studio.upsert({
    where: { dbName: "studio-demo.db" },
    update: { name: "عکاسی نسیم", nameEn: "NASIM STUDIO", plan: "pro", isActive: true },
    create: {
      id: "studio-1",
      name: "عکاسی نسیم",
      nameEn: "NASIM STUDIO",
      dbName: "studio-demo.db",
      isActive: true,
      plan: "pro",
    },
  })
  console.log("Studio 1:", studio1.name, `(${studio1.dbName})`)

  // Make sure studio-demo.db file exists; if not, copy from custom.db (already-pushed empty schema)
  const dbPath = join(process.cwd(), "db", "studio-demo.db")
  if (!existsSync(dbPath)) {
    const existingPath = join(process.cwd(), "db", "custom.db")
    if (existsSync(existingPath)) {
      try {
        copyFileSync(existingPath, dbPath)
        console.log("Copied custom.db -> studio-demo.db")
      } catch (e) {
        console.log("Could not copy custom.db to studio-demo.db:", (e as Error).message)
      }
    }
  }

  // ---------- Studio 2: AVAZ STUDIO (studio-2.db) ----------
  const studio2 = await master.studio.upsert({
    where: { dbName: "studio-2.db" },
    update: { name: "استودیو آواز", nameEn: "AVAZ STUDIO", plan: "basic", isActive: true },
    create: {
      id: "studio-2",
      name: "استودیو آواز",
      nameEn: "AVAZ STUDIO",
      dbName: "studio-2.db",
      isActive: true,
      plan: "basic",
    },
  })
  console.log("Studio 2:", studio2.name, `(${studio2.dbName})`)
  const s2Path = join(process.cwd(), "db", "studio-2.db")
  if (!existsSync(s2Path) && existsSync(dbPath)) {
    try {
      copyFileSync(dbPath, s2Path)
      console.log("Copied studio-demo.db -> studio-2.db")
    } catch (e) {
      console.log("Could not copy studio-demo.db to studio-2.db:", (e as Error).message)
    }
  }

  // ---------- MasterUsers (8 canonical users with stable IDs) ----------
  // These IDs MUST match the studio User IDs in prisma/seed.ts so the
  // conversation API (which filters by MasterUser.id) finds participants.
  const passwordHash = await bcrypt.hash("123456", 10)
  const demoUsers = [
    { id: "user-admin",     phone: "09120000001", name: "آریا صادقی",     role: "admin",        passwordHash },
    { id: "user-manager",   phone: "09120000002", name: "دارا کریمی",     role: "manager",      passwordHash },
    { id: "user-sales",     phone: "09120000003", name: "پارسا محبی",     role: "sales",        passwordHash },
    { id: "user-photo",     phone: "09120000004", name: "کیان رضایی",     role: "photographer", passwordHash },
    { id: "user-photo2",    phone: "09120000005", name: "مهسا فراهانی",   role: "photographer", passwordHash },
    { id: "user-editor",    phone: "09120000006", name: "سینا اخوندی",    role: "editor",       passwordHash },
    { id: "user-qc",        phone: "09120000007", name: "رکسانا جمشیدی",  role: "qc",           passwordHash },
    { id: "user-logistics", phone: "09120000008", name: "بابک نیک‌نژاد",  role: "logistics",    passwordHash },
  ]
  // Wipe stray MasterUsers (and dependents) that don't match the canonical IDs.
  // This ensures idempotency across re-runs.
  await master.session.deleteMany({})
  await master.otpCode.deleteMany({})
  await master.studioMembership.deleteMany({})
  await master.masterUser.deleteMany({ where: { id: { notIn: demoUsers.map((u) => u.id) } } })
  // Note: we don't delete canonical users — they may have sessions tied to them.
  // But we did delete all sessions above, so they will be logged out.

  for (const u of demoUsers) {
    await master.masterUser.upsert({
      where: { id: u.id },
      update: { phone: u.phone, name: u.name, passwordHash: u.passwordHash },
      create: { id: u.id, phone: u.phone, name: u.name, passwordHash: u.passwordHash },
    })
    // Add membership in studio-1
    await master.studioMembership.upsert({
      where: { userId_studioId: { userId: u.id, studioId: studio1.id } },
      update: { role: u.role, isActive: true },
      create: { userId: u.id, studioId: studio1.id, role: u.role, isActive: true },
    })
  }
  // Add admin to studio-2 as well (so user can switch studios in demo)
  await master.studioMembership.upsert({
    where: { userId_studioId: { userId: "user-admin", studioId: studio2.id } },
    update: { role: "admin", isActive: true },
    create: { userId: "user-admin", studioId: studio2.id, role: "admin", isActive: true },
  })

  console.log("✅ Master seed complete.")
  console.log("   Demo login: 09120000001 / 123456")
  console.log(`   Studios: ${studio1.nameEn} (${studio1.dbName}), ${studio2.nameEn} (${studio2.dbName})`)
  console.log(`   Users: ${demoUsers.length} (admin, manager, sales, 2 photographers, editor, qc, logistics)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await master.$disconnect()
  })

