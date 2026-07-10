import { PrismaClient } from ".prisma/master-client"
import bcrypt from "bcryptjs"
import { execSync } from "child_process"
import { existsSync } from "fs"
import { join } from "path"

const master = new PrismaClient({ log: ["error"] })

async function main() {
  console.log("Seeding master DB...")
  const dbName = "studio-demo.db"
  const studio = await master.studio.upsert({
    where: { dbName },
    update: {},
    create: { id: "studio-1", name: "عکاسی نسیم", nameEn: "NASIM STUDIO", dbName, isActive: true, plan: "pro" },
  })
  console.log("Studio:", studio.name)

  const adminPhone = "09120000001"
  const passwordHash = await bcrypt.hash("123456", 10)
  const admin = await master.masterUser.upsert({
    where: { phone: adminPhone },
    update: {},
    create: { id: "user-admin", phone: adminPhone, name: "مدیر سیستم", passwordHash },
  })
  console.log("Admin:", admin.phone)

  await master.studioMembership.upsert({
    where: { userId_studioId: { userId: admin.id, studioId: studio.id } },
    update: {},
    create: { userId: admin.id, studioId: studio.id, role: "admin", isActive: true },
  })

  const dbPath = join(process.cwd(), "db", dbName)
  if (!existsSync(dbPath)) {
    const existingPath = join(process.cwd(), "db", "custom.db")
    if (existsSync(existingPath)) { execSync(`cp "${existingPath}" "${dbPath}"`); console.log("Copied DB") }
  }

  const demoUsers = [
    { phone: "09120000002", name: "مدیر استودیو", role: "manager" },
    { phone: "09120000003", name: "کارشناس فروش", role: "sales" },
    { phone: "09120000004", name: "عکاس", role: "photographer" },
  ]
  for (const du of demoUsers) {
    const u = await master.masterUser.upsert({ where: { phone: du.phone }, update: {}, create: { phone: du.phone, name: du.name } })
    await master.studioMembership.upsert({ where: { userId_studioId: { userId: u.id, studioId: studio.id } }, update: {}, create: { userId: u.id, studioId: studio.id, role: du.role, isActive: true } })
  }

  // Second studio
  const s2 = await master.studio.upsert({ where: { dbName: "studio-2.db" }, update: {}, create: { id: "studio-2", name: "استودیو آواز", nameEn: "AVAZ STUDIO", dbName: "studio-2.db", isActive: true, plan: "basic" } })
  const s2Path = join(process.cwd(), "db", "studio-2.db")
  if (!existsSync(s2Path)) { execSync(`cp "${dbPath}" "${s2Path}"`) }
  await master.studioMembership.upsert({ where: { userId_studioId: { userId: admin.id, studioId: s2.id } }, update: {}, create: { userId: admin.id, studioId: s2.id, role: "admin", isActive: true } })

  console.log("✅ Master seed complete. Login: 09120000001 / 123456")
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await master.$disconnect() })
