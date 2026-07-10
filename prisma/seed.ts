import { PrismaClient } from "@prisma/client"
import { randomUUID } from "crypto"

const db = new PrismaClient()

function rid() {
  return Math.random().toString(36).slice(2, 12)
}

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let s = "STD-"
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

async function main() {
  console.log("Seeding Studio ERP…")

  // ---------- USERS (one per role) ----------
  const users = [
    { id: "u-admin", phone: "09100000001", firstName: "Aria", lastName: "Sadeghi", role: "admin", email: "aria@lumen.studio" },
    { id: "u-manager", phone: "09100000002", firstName: "Darya", lastName: "Karami", role: "manager", email: "darya@lumen.studio" },
    { id: "u-sales", phone: "09100000003", firstName: "Parsa", lastName: "Mohebi", role: "sales", email: "parsa@lumen.studio" },
    { id: "u-photo", phone: "09100000004", firstName: "Kian", lastName: "Rezaei", role: "photographer", email: "kian@lumen.studio" },
    { id: "u-photo2", phone: "09100000005", firstName: "Mahsa", lastName: "Farahi", role: "photographer", email: "mahsa@lumen.studio" },
    { id: "u-editor", phone: "09100000006", firstName: "Sina", lastName: "Akhondi", role: "editor", email: "sina@lumen.studio" },
    { id: "u-qc", phone: "09100000007", firstName: "Roxana", lastName: "Jamshidi", role: "qc", email: "roxana@lumen.studio" },
    { id: "u-logistics", phone: "09100000008", firstName: "Babak", lastName: "Niknejad", role: "logistics", email: "babak@lumen.studio" },
  ]
  for (const u of users) {
    await db.user.upsert({
      where: { id: u.id },
      update: u,
      create: { ...u, isAvailable: true, personalMeta: "{}", address: "Tehran, Iran" },
    })
  }

  // ---------- TAGS ----------
  const tags = [
    { id: "t-vip", name: "VIP", color: "#ef4444" },
    { id: "t-wedding", name: "Wedding", color: "#ec4899" },
    { id: "t-corporate", name: "Corporate", color: "#0ea5e9" },
    { id: "t-family", name: "Family", color: "#10b981" },
    { id: "t-portrait", name: "Portrait", color: "#a855f7" },
    { id: "t-repeat", name: "Repeat Client", color: "#f59e0b" },
  ]
  for (const t of tags) await db.tag.upsert({ where: { id: t.id }, update: t, create: t })

  // ---------- CUSTOMERS ----------
  const customers = [
    { id: "c-1", name: "Sahar & Reza", phone: "09120000001", customerType: "individual", tags: ["t-vip", "t-wedding"] },
    { id: "c-2", name: "Negar Mohseni", phone: "09120000002", customerType: "individual", tags: ["t-portrait"] },
    { id: "c-3", name: "Arsham Industries", phone: "09120000003", customerType: "company", tags: ["t-corporate"] },
    { id: "c-4", name: "Leila & Houman", phone: "09120000004", customerType: "individual", tags: ["t-wedding", "t-repeat"] },
    { id: "c-5", name: "Doran Cafe", phone: "09120000005", customerType: "company", tags: ["t-corporate", "t-repeat"] },
    { id: "c-6", name: "Mani Kiani", phone: "09120000006", customerType: "individual", tags: ["t-family"] },
    { id: "c-7", name: "Sogol Ebrahimi", phone: "09120000007", customerType: "individual", tags: ["t-portrait", "t-repeat"] },
    { id: "c-8", name: "Tara & Farzan", phone: "09120000008", customerType: "individual", tags: ["t-wedding", "t-vip"] },
    { id: "c-9", name: "Setareh Dental Clinic", phone: "09120000009", customerType: "company", tags: ["t-corporate"] },
    { id: "c-10", name: "Arya Ghaziani", phone: "09120000010", customerType: "individual", tags: ["t-family", "t-portrait"] },
  ]
  // referrer chain: c-4 referred by c-1, c-8 referred by c-1, c-7 referred by c-2
  const refMap: Record<string, string> = { "c-4": "c-1", "c-8": "c-1", "c-7": "c-2", "c-10": "c-6" }
  for (const c of customers) {
    const referrerId = refMap[c.id] ?? null
    await db.customer.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        name: c.name,
        phone: c.phone,
        customerType: c.customerType,
        referrerId,
        familyMeta: JSON.stringify({ spouse: { name: "", birth: "" }, children: [] }),
        creditBalance: 0,
        totalRevenue: 0,
        totalProjects: 0,
      },
    })
    // connect tags
    await db.customer.update({
      where: { id: c.id },
      data: { tags: { connect: c.tags.map((id) => ({ id })) } },
    })
  }

  // ---------- PACKAGES ----------
  const packages = [
    { id: "p-wed-pre", title: "Wedding Premium (Photo+Video)", category: "mix", basePrice: 850000000, currentPrice: 920000000, pricingStrategy: "variable", desc: "Full-day wedding coverage with two photographers, two videographers, cinematic highlight film, and 600 edited photos.", tasks: ["Pre-wedding consultation", "Gear prep", "Ceremony coverage", "Reception coverage", "Cull & select", "Color grade film", "Retouch photos", "Deliver gallery"] },
    { id: "p-wed-dlx", title: "Wedding Deluxe (Photo)", category: "photo", basePrice: 420000000, currentPrice: 460000000, pricingStrategy: "fixed", desc: "Premium wedding photography with one lead and one second shooter, 400 edited photos, and an online gallery.", tasks: ["Pre-wedding consult", "Ceremony coverage", "Reception coverage", "Cull", "Retouch", "Gallery delivery"] },
    { id: "p-portrait", title: "Portrait Session", category: "photo", basePrice: 45000000, currentPrice: 48000000, pricingStrategy: "fixed", desc: "1-hour studio or outdoor portrait session with 25 edited images.", tasks: ["Setup lighting", "Shoot session", "Cull", "Retouch", "Deliver"] },
    { id: "p-corporate", title: "Corporate Brand Film", category: "video", basePrice: 680000000, currentPrice: 720000000, pricingStrategy: "delayed", desc: "2-3 minute corporate brand film with interview, b-roll, and motion graphics.", tasks: ["Brief & script", "Shoot interviews", "B-roll day", "Edit draft", "Color & sound", "Motion graphics", "Final delivery"] },
    { id: "p-event", title: "Event Coverage (Half Day)", category: "mix", basePrice: 180000000, currentPrice: 195000000, pricingStrategy: "variable", desc: "Half-day event coverage with photo and short video recap.", tasks: ["Brief", "Coverage", "Cull", "Edit recap", "Deliver gallery"] },
    { id: "p-family", title: "Family Studio Session", category: "photo", basePrice: 38000000, currentPrice: 38000000, pricingStrategy: "fixed", desc: "Family studio session, 1 hour, 20 edited images.", tasks: ["Setup", "Shoot", "Cull", "Retouch", "Deliver"] },
  ]
  for (const p of packages) {
    await db.servicePackage.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        title: p.title,
        category: p.category,
        basePrice: p.basePrice,
        currentPrice: p.currentPrice,
        pricingStrategy: p.pricingStrategy,
        defaultDescription: p.desc,
        defaultTasks: JSON.stringify(p.tasks),
        isActive: true,
      },
    })
  }

  // ---------- CONTRACTS + PROJECTS ----------
  const now = new Date()
  function days(n: number) { return new Date(now.getTime() + n * 86400000) }
  function hrs(n: number) { return new Date(now.getTime() + n * 3600000) }

  const projectsSeed = [
    { id: "pr-1", custId: "c-1", pkgId: "p-wed-pre", status: "delivered", start: days(-40), end: days(-40), deadline: days(-15), strategy: "variable", paid: 920000000, fieldTeam: ["u-photo", "u-photo2"], studioTeam: ["u-editor"], deliveryTeam: ["u-logistics"], readyDays: -25, desc: "Grand wedding at Espinas Palace. Drone + 4 cameras.", tasksDone: true },
    { id: "pr-2", custId: "c-4", pkgId: "p-wed-dlx", status: "ready", start: days(-20), end: days(-20), deadline: days(5), strategy: "fixed", paid: 460000000, fieldTeam: ["u-photo"], studioTeam: ["u-editor"], deliveryTeam: ["u-logistics"], readyDays: -8, desc: "Wedding at Vahdat Hall. Photographic only.", tasksDone: true },
    { id: "pr-3", custId: "c-3", pkgId: "p-corporate", status: "editing", start: days(-12), end: days(-11), deadline: days(10), strategy: "delayed", paid: 360000000, fieldTeam: ["u-photo2"], studioTeam: ["u-editor"], deliveryTeam: ["u-logistics"], readyDays: null, desc: "Arsham Industries brand film. Factory + HQ.", tasksDone: false },
    { id: "pr-4", custId: "c-8", pkgId: "p-wed-pre", status: "shooting", start: days(-1), end: days(-1), deadline: days(20), strategy: "variable", paid: 400000000, fieldTeam: ["u-photo", "u-photo2"], studioTeam: ["u-editor"], deliveryTeam: ["u-logistics"], readyDays: null, desc: "Tara & Farzan wedding, Parsian Azadi.", tasksDone: false },
    { id: "pr-5", custId: "c-5", pkgId: "p-event", status: "scheduled", start: days(3), end: days(3), deadline: days(18), strategy: "variable", paid: 90000000, fieldTeam: ["u-photo2"], studioTeam: ["u-editor"], deliveryTeam: ["u-logistics"], readyDays: null, desc: "Doran Cafe anniversary event.", tasksDone: false },
    { id: "pr-6", custId: "c-6", pkgId: "p-family", status: "qc", start: days(-3), end: days(-3), deadline: days(2), strategy: "fixed", paid: 38000000, fieldTeam: ["u-photo"], studioTeam: ["u-editor"], deliveryTeam: ["u-logistics"], readyDays: null, desc: "Kiani family studio session.", tasksDone: false },
    { id: "pr-7", custId: "c-2", pkgId: "p-portrait", status: "delivered", start: days(-60), end: days(-60), deadline: days(-45), strategy: "fixed", paid: 48000000, fieldTeam: ["u-photo"], studioTeam: ["u-editor"], deliveryTeam: ["u-logistics"], readyDays: -52, desc: "Negar personal brand portrait.", tasksDone: true },
    { id: "pr-8", custId: "c-9", pkgId: "p-corporate", status: "culling", start: days(-5), end: days(-5), deadline: days(15), strategy: "delayed", paid: 300000000, fieldTeam: ["u-photo2"], studioTeam: ["u-editor"], deliveryTeam: ["u-logistics"], readyDays: null, desc: "Setareh Dental clinic promo.", tasksDone: false },
    { id: "pr-9", custId: "c-7", pkgId: "p-portrait", status: "scheduled", start: days(7), end: days(7), deadline: days(21), strategy: "fixed", paid: 0, fieldTeam: ["u-photo"], studioTeam: ["u-editor"], deliveryTeam: ["u-logistics"], readyDays: null, desc: "Sogol portrait refresh.", tasksDone: false },
    { id: "pr-10", custId: "c-10", pkgId: "p-family", status: "scheduled", start: days(10), end: days(10), deadline: days(24), strategy: "fixed", paid: 0, fieldTeam: ["u-photo2"], studioTeam: ["u-editor"], deliveryTeam: ["u-logistics"], readyDays: null, desc: "Ghaziani family session.", tasksDone: false },
  ]

  for (const ps of projectsSeed) {
    const pkg = packages.find((p) => p.id === ps.pkgId)!
    const contractNum = "CT-" + ps.id.replace("pr-", "").toUpperCase() + "-2024"
    const contract = await db.contract.upsert({
      where: { contractNumber: contractNum },
      update: {},
      create: {
        id: "ct-" + ps.id.replace("pr-", ""),
        contractNumber: contractNum,
        customerId: ps.custId,
        dateCreated: days(-45),
        printedTerms: pkg.desc,
        isClosed: ps.status === "delivered",
      },
    })

    const readyDate = ps.readyDays != null ? days(ps.readyDays) : null
    const isReady = ps.status === "ready" || ps.status === "delivered"
    const actualEnd = ps.status === "delivered" ? days(ps.readyDays! + 3) : null
    const actualStart = ["shooting", "culling", "editing", "qc", "ready", "delivered"].includes(ps.status) ? ps.start : null

    const proj = await db.project.upsert({
      where: { id: ps.id },
      update: {},
      create: {
        id: ps.id,
        contractId: contract.id,
        servicePackageId: ps.pkgId,
        pricingStrategy: ps.strategy,
        calculatedPrice: pkg.currentPrice,
        lockedPrice: ps.status === "delivered" ? pkg.currentPrice : null,
        isPriceFrozen: ps.paid >= pkg.currentPrice * 0.7,
        startDatetime: ps.start,
        endDatetime: ps.end,
        deliveryDeadline: ps.deadline,
        status: ps.status,
        printedDescription: ps.desc,
        isReadyForDelivery: isReady,
        readyDate,
        priceAtReadyTime: readyDate ? pkg.currentPrice : null,
        actualStartDatetime: actualStart,
        actualEndDatetime: actualEnd,
        fieldTeam: { connect: ps.fieldTeam.map((id) => ({ id })) },
        studioTeam: { connect: ps.studioTeam.map((id) => ({ id })) },
        deliveryTeam: { connect: ps.deliveryTeam.map((id) => ({ id })) },
      },
    })

    // payments (split into deposit + installment)
    if (ps.paid > 0) {
      const deposit = Math.round(ps.paid * 0.5)
      const rest = ps.paid - deposit
      await db.payment.create({
        data: { projectId: proj.id, amount: deposit, paymentType: "deposit", method: "pos", datePaid: days(-50), isConfirmed: true, note: "Booking deposit" },
      })
      if (rest > 0) {
        await db.payment.create({
          data: { projectId: proj.id, amount: rest, paymentType: "installment", method: "card", datePaid: days(-20), isConfirmed: ps.status !== "scheduled", note: "Second payment" },
        })
      }
    }

    // tasks
    const tasks = pkg.tasks as string[]
    tasks.forEach(async (title, i) => {
      const done = ps.tasksDone || (ps.status === "delivered" || ps.status === "ready")
      const inProgress = !done && i === 0
      await db.task.create({
        data: {
          projectId: proj.id,
          title,
          assignedToId: ps.fieldTeam[0],
          status: done ? "done" : inProgress ? "in_progress" : "todo",
          deadline: ps.deadline,
          order: i,
        },
      })
    })

    // notes
    await db.projectNote.create({
      data: {
        projectId: proj.id,
        authorId: "u-manager",
        noteType: "text",
        content: "Project created. Pre-shoot briefing scheduled with client.",
        createdAt: days(-48),
      },
    })
    if (["shooting", "culling", "editing", "qc", "ready", "delivered"].includes(ps.status)) {
      await db.projectNote.create({
        data: {
          projectId: proj.id,
          authorId: ps.fieldTeam[0],
          noteType: "text",
          content: "Shoot completed. Backing up footage and starting cull.",
          createdAt: ps.end,
        },
      })
    }
    if (isReady) {
      await db.projectNote.create({
        data: {
          projectId: proj.id,
          authorId: "u-qc",
          noteType: "text",
          content: "✅ QC passed. Marked ready for delivery. Price captured.",
          createdAt: readyDate!,
        },
      })
    }

    // salary records for delivered projects
    if (ps.status === "delivered") {
      const rules = await db.salaryRule.findMany({ where: { isActive: true } })
      for (const uid of ps.fieldTeam) {
        const rule = rules.find((r) => r.role === "photographer" && r.applyOn === "field_work")
        if (rule) {
          const amt = rule.commissionType === "percent"
            ? Math.round(pkg.currentPrice * Number(rule.commissionValue) / 100)
            : Number(rule.commissionValue)
          await db.salaryRecord.create({
            data: { userId: uid, projectId: proj.id, amount: amt, ruleUsedId: rule.id, isPaid: Math.random() > 0.5 },
          })
        }
      }
      for (const uid of ps.studioTeam) {
        const rule = rules.find((r) => r.role === "editor" && r.applyOn === "studio_work")
        if (rule) {
          const amt = rule.commissionType === "percent"
            ? Math.round(pkg.currentPrice * Number(rule.commissionValue) / 100)
            : Number(rule.commissionValue)
          await db.salaryRecord.create({
            data: { userId: uid, projectId: proj.id, amount: amt, ruleUsedId: rule.id, isPaid: Math.random() > 0.5 },
          })
        }
      }
      const rule = rules.find((r) => r.role === "logistics" && r.applyOn === "delivery")
      if (rule) {
        const amt = rule.commissionType === "percent"
          ? Math.round(pkg.currentPrice * Number(rule.commissionValue) / 100)
          : Number(rule.commissionValue)
        await db.salaryRecord.create({
          data: { userId: ps.deliveryTeam[0], projectId: proj.id, amount: amt, ruleUsedId: rule.id, isPaid: true },
        })
      }
    }

    // update customer cache
    await db.customer.update({
      where: { id: ps.custId },
      data: {
        totalProjects: { increment: 1 },
        totalRevenue: { increment: ps.paid },
        lastInteraction: ps.start,
      },
    })

    // referral credit for referred customers on project creation
    const cust = await db.customer.findUnique({ where: { id: ps.custId } })
    if (cust?.referrerId) {
      const reward = Math.round(pkg.currentPrice * 0.1)
      await db.creditTransaction.create({
        data: {
          customerId: cust.referrerId,
          amount: reward,
          transactionType: "reward_referral",
          relatedContractId: contract.id,
          note: `10% referral reward from ${cust.name}`,
          createdAt: days(-47),
        },
      })
      await db.customer.update({
        where: { id: cust.referrerId },
        data: { creditBalance: { increment: reward } },
      })
    }
  }

  // ---------- REFERRAL CODES ----------
  const codeOwners = ["c-1", "c-1", "c-2", "c-6", "c-3"]
  for (let i = 0; i < codeOwners.length; i++) {
    await db.referralCode.create({
      data: {
        ownerId: codeOwners[i],
        code: genCode(),
        discountPercent: 10,
        maxUses: 1,
        usedCount: i < 2 ? 1 : 0,
        validFrom: days(-60),
        relatedProjectId: i < 2 ? ["pr-1", "pr-4"][i] : null,
      },
    })
  }
  // a few unused
  for (let i = 0; i < 8; i++) {
    await db.referralCode.create({
      data: { ownerId: codeOwners[i % codeOwners.length], code: genCode(), discountPercent: 10, maxUses: 1, usedCount: 0, validFrom: days(-30) },
    })
  }

  // ---------- SALARY RULES ----------
  const salaryRules = [
    { id: "sr-pf", role: "photographer", commissionType: "percent", commissionValue: 6, applyOn: "field_work" },
    { id: "sr-ed", role: "editor", commissionType: "percent", commissionValue: 4, applyOn: "studio_work" },
    { id: "sr-lg", role: "logistics", commissionType: "fixed_per_project", commissionValue: 2500000, applyOn: "delivery" },
  ]
  for (const r of salaryRules) {
    await db.salaryRule.upsert({
      where: { id: r.id },
      update: {},
      create: { ...r, isActive: true },
    })
  }

  // ---------- EXPENSES ----------
  const expenses = [
    { title: "Studio rent (monthly)", amount: 180000000, category: "office", date: days(-30) },
    { title: "New softbox lights x2", amount: 32000000, category: "office", date: days(-15) },
    { title: "External drive (8TB)", amount: 12000000, category: "project_direct", date: days(-12) },
    { title: "Tax Q3", amount: 95000000, category: "tax", date: days(-20) },
    { title: "Drone repair", amount: 8500000, category: "office", date: days(-8) },
    { title: "Subscription Adobe CC", amount: 6800000, category: "office", date: days(-5) },
  ]
  for (const e of expenses) {
    await db.expense.create({ data: e })
  }

  // ---------- SMS TEMPLATES ----------
  const sms = [
    { name: "Ready for delivery", templateText: "Dear {customer_name}, your {event_date} project is ready for delivery! Please contact us to arrange pickup. — Lumen Studio", isActive: true },
    { name: "30-day deadline warning", templateText: "Dear {customer_name}, your delivery grace period ends in {remaining_days} days. Finalize pickup to lock in your price. — Lumen Studio", isActive: true },
    { name: "Booking confirmation", templateText: "Hi {customer_name}, your session on {event_date} is confirmed. We can't wait! — Lumen Studio", isActive: true },
    { name: "Payment reminder", templateText: "Dear {customer_name}, a payment of {amount} is due for your project. — Lumen Studio", isActive: false },
  ]
  for (const s of sms) await db.sMSTemplate.create({ data: s })

  // ---------- SYSTEM SETTINGS ----------
  await db.systemSetting.upsert({
    where: { key: "image_compression" },
    update: {},
    create: { key: "image_compression", value: JSON.stringify({ maxWidth: 1920, maxHeight: 1080, quality: 82 }) },
  })
  await db.systemSetting.upsert({
    where: { key: "sms_provider" },
    update: {},
    create: { key: "sms_provider", value: JSON.stringify({ active: true, provider: "kavenegar" }) },
  })

  // ---------- LEAVE REQUESTS ----------
  await db.leaveRequest.create({
    data: { userId: "u-photo2", startDate: days(5), endDate: days(8), reason: "Family trip", status: "pending" },
  })
  await db.leaveRequest.create({
    data: { userId: "u-editor", startDate: days(-2), endDate: days(1), reason: "Medical", status: "approved", approverId: "u-admin" },
  })

  // ---------- NOTIFICATIONS ----------
  await db.notification.create({ data: { title: "Project ready", message: "Wedding Deluxe (Leila & Houman) is ready for delivery.", read: false, link: "projects" } })
  await db.notification.create({ data: { title: "Leave request", message: "Mahsa Farahi requested leave (4 days).", read: false, link: "settings-leaves" } })
  await db.notification.create({ data: { title: "Payment confirmed", message: "Tara & Farzan — 400M IRT deposit confirmed.", read: true } })

  console.log("✅ Seed complete.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
