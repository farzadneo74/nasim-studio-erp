// Comprehensive seed for NASIM Studio ERP (studio DB).
//
// Targets the DB pointed to by DATABASE_URL (default file:../db/custom.db per .env).
// For demo: run with `DATABASE_URL=file:/home/z/my-project/db/studio-demo.db bun prisma/seed.ts`.
//
// Idempotency: this script wipes and recreates all studio tables except `Holiday`
// (which is seeded separately by seed-holidays.ts) and `User` (uses upsert so a
// random Test User from previous runs isn't deleted, but the 8 canonical demo
// users always get the right data).
//
// All entity IDs are deterministic strings (u-admin, c-1, pr-1, conv-1, ...) so
// foreign-key references between sections remain stable across re-runs.

import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

// ---------- helpers ----------
function rid(prefix: string, i: number) {
  return `${prefix}-${i + 1}`
}
function genCode(seed: string) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  let s = "STD-"
  for (let i = 0; i < 8; i++) {
    s += chars[h % chars.length]
    h = Math.floor(h / chars.length) + i * 7919
  }
  return s
}
const now = new Date()
function days(n: number) { return new Date(now.getTime() + n * 86400000) }
function hrs(n: number) { return new Date(now.getTime() + n * 3600000) }

async function wipeStudio() {
  // Delete children first, then parents. Holidays preserved (large, seeded separately).
  console.log("• Wiping studio tables (except Holiday & User)…")
  await db.messageReaction.deleteMany({})
  await db.message.deleteMany({})
  await db.conversationParticipant.deleteMany({})
  await db.conversation.deleteMany({})
  await db.kanbanCard.deleteMany({})
  await db.kanbanColumn.deleteMany({})
  await db.reminder.deleteMany({})
  await db.notification.deleteMany({})
  await db.userNote.deleteMany({})
  await db.projectSmsAssignment.deleteMany({})
  await db.smsAutomation.deleteMany({})
  await db.sMSTemplate.deleteMany({})
  await db.qrTemplate.deleteMany({})
  await db.systemSetting.deleteMany({})
  await db.customFieldValue.deleteMany({})
  await db.customField.deleteMany({})
  await db.city.deleteMany({})
  await db.expense.deleteMany({})
  await db.invoice.deleteMany({})
  await db.salaryRecord.deleteMany({})
  await db.referralCode.deleteMany({})
  await db.referral.deleteMany({})
  await db.creditTransaction.deleteMany({})
  await db.leaveRequest.deleteMany({})
  await db.task.deleteMany({})
  await db.projectNote.deleteMany({})
  await db.projectPrintPhoto.deleteMany({})
  await db.projectWorkflow.deleteMany({})
  await db.payment.deleteMany({})
  await db.salaryRule.deleteMany({})
  await db.printPhotoPrice.deleteMany({})
  await db.project.deleteMany({})
  await db.contract.deleteMany({})
  await db.customerNote.deleteMany({})
  await db.customer.deleteMany({})
  await db.servicePackage.deleteMany({})
  await db.tag.deleteMany({})
  console.log("• Wipe done.")
}

async function main() {
  console.log("Seeding Studio ERP…")
  await wipeStudio()

  // ---------- USERS (8 canonical; upsert to preserve stray Test users) ----------
  console.log("• Users…")
  const users = [
    { id: "u-admin",     phone: "09100000001", firstName: "آریا",     lastName: "صادقی",    role: "admin",        email: "aria@nasim.studio" },
    { id: "u-manager",   phone: "09100000002", firstName: "دارا",     lastName: "کریمی",    role: "manager",      email: "darya@nasim.studio" },
    { id: "u-sales",     phone: "09100000003", firstName: "پارسا",    lastName: "محبی",     role: "sales",        email: "parsa@nasim.studio" },
    { id: "u-photo",     phone: "09100000004", firstName: "کیان",     lastName: "رضایی",    role: "photographer", email: "kian@nasim.studio" },
    { id: "u-photo2",    phone: "09100000005", firstName: "مهسا",     lastName: "فراهانی",  role: "photographer", email: "mahsa@nasim.studio" },
    { id: "u-editor",    phone: "09100000006", firstName: "سینا",     lastName: "اخوندی",   role: "editor",       email: "sina@nasim.studio" },
    { id: "u-qc",        phone: "09100000007", firstName: "رکسانا",   lastName: "جمشیدی",   role: "qc",           email: "roxana@nasim.studio" },
    { id: "u-logistics", phone: "09100000008", firstName: "بابک",     lastName: "نیک‌نژاد", role: "logistics",    email: "babak@nasim.studio" },
  ]
  for (const u of users) {
    await db.user.upsert({
      where: { id: u.id },
      update: { ...u, isAvailable: true, personalMeta: "{}", address: "تهران، ایران" },
      create: { ...u, isAvailable: true, personalMeta: "{}", address: "تهران، ایران" },
    })
  }
  // Remove stale test users (anything not in canonical 8) to keep the demo clean
  const allUsers = await db.user.findMany({ select: { id: true } })
  const keep = new Set(users.map((u) => u.id))
  for (const u of allUsers) if (!keep.has(u.id)) await db.user.delete({ where: { id: u.id } }).catch(() => {})

  // ---------- TAGS ----------
  console.log("• Tags…")
  const tags = [
    { id: "t-vip",        name: "VIP",         color: "#ef4444" },
    { id: "t-wedding",    name: "عروس",        color: "#ec4899" },
    { id: "t-corporate",  name: "شرکتی",       color: "#0ea5e9" },
    { id: "t-family",     name: "خانواده",     color: "#10b981" },
    { id: "t-portrait",   name: "پورتره",      color: "#a855f7" },
    { id: "t-repeat",     name: "مشتری دائمی", color: "#f59e0b" },
    { id: "t-aparat",     name: "آپارات",      color: "#06b6d4" },
    { id: "t-outdoor",    name: "خارجی",       color: "#84cc16" },
    { id: "t-studio",     name: "استودیویی",   color: "#6366f1" },
    { id: "t-debt",       name: "بدهکار",      color: "#dc2626" },
    { id: "t-credit",     name: "بستانکار",    color: "#16a34a" },
  ]
  for (const t of tags) await db.tag.upsert({ where: { id: t.id }, update: t, create: t })

  // ---------- CITIES (major Iranian cities) ----------
  console.log("• Cities…")
  const cities = [
    { id: "city-tehran",    name: "تهران",     province: "تهران" },
    { id: "city-mashhad",   name: "مشهد",      province: "خراسان رضوی" },
    { id: "city-isfahan",   name: "اصفهان",    province: "اصفهان" },
    { id: "city-shiraz",    name: "شیراز",     province: "فارس" },
    { id: "city-tabriz",    name: "تبریز",     province: "آذربایجان شرقی" },
    { id: "city-karaj",     name: "کرج",       province: "البرز" },
    { id: "city-ahvaz",     name: "اهواز",     province: "خوزستان" },
    { id: "city-kermanshah",name: "کرمانشاه",  province: "کرمانشاه" },
    { id: "city-rasht",     name: "رشت",       province: "گیلان" },
    { id: "city-yazd",      name: "یزد",       province: "یزد" },
    { id: "city-qom",       name: "قم",        province: "قم" },
    { id: "city-kerman",    name: "کرمان",     province: "کرمان" },
  ]
  for (const c of cities) await db.city.upsert({ where: { id: c.id }, update: c, create: c })

  // ---------- CUSTOM FIELDS ----------
  console.log("• Custom fields…")
  const customFields = [
    { id: "cf-wed-date", name: "wedding_date",      label: "تاریخ عروسی",            type: "date",    options: "[]",       required: false, order: 0 },
    { id: "cf-photo-pref",name: "photographer_pref", label: "ترجیح عکاس",             type: "select",  options: '["کیان","مهسا","فرقی ندارد"]', required: false, order: 1 },
    { id: "cf-album",    name: "album_type",         label: "نوع آلبوم",              type: "select",  options: '["مهرماند","کلاسیک","مینی‌آلبوم","بدون آلبوم"]', required: false, order: 2 },
    { id: "cf-guests",   name: "guest_count",        label: "تعداد مهمان",            type: "number",  options: "[]",       required: false, order: 3 },
  ]
  for (const f of customFields) {
    await db.customField.upsert({
      where: { id: f.id },
      update: f,
      create: { ...f, isActive: true },
    })
  }

  // ---------- CUSTOMERS (18 customers, mix of individual/company, varied tags/cities/credit) ----------
  console.log("• Customers…")
  type CustSeed = {
    id: string; name: string; phone: string; type: "individual" | "company";
    city?: string; tags: string[]; referrer?: string; credit?: number; debt?: number;
    weddingDaysAgo?: number; engagementDaysAgo?: number; birthDaysAgo?: number;
    address?: string;
  }
  const customers: CustSeed[] = [
    { id: "c-1",  name: "سحر و رضا",            phone: "09120000001", type: "individual", city: "city-tehran",  tags: ["t-vip", "t-wedding", "t-studio"],   weddingDaysAgo: 35,  engagementDaysAgo: 90 },
    { id: "c-2",  name: "نگار محسنی",            phone: "09120000002", type: "individual", city: "city-tehran",  tags: ["t-portrait", "t-studio"],           birthDaysAgo: 30 },
    { id: "c-3",  name: "شرکت آرشام",            phone: "09120000003", type: "company",    city: "city-karaj",   tags: ["t-corporate", "t-repeat"],          address: "شهرک صنعتی آرشام، کرج" },
    { id: "c-4",  name: "لیلا و هومن",           phone: "09120000004", type: "individual", city: "city-isfahan", tags: ["t-wedding", "t-repeat"],            weddingDaysAgo: 22, referrer: "c-1" },
    { id: "c-5",  name: "کافه دوران",            phone: "09120000005", type: "company",    city: "city-tehran",  tags: ["t-corporate", "t-repeat"],          address: "ولنجک، تهران" },
    { id: "c-6",  name: "مانی کیانی",            phone: "09120000006", type: "individual", city: "city-mashhad", tags: ["t-family"],                         birthDaysAgo: 10 },
    { id: "c-7",  name: "سوگل ابراهیمی",          phone: "09120000007", type: "individual", city: "city-shiraz",  tags: ["t-portrait", "t-repeat"],           referrer: "c-2" },
    { id: "c-8",  name: "تارا و فرزان",          phone: "09120000008", type: "individual", city: "city-tehran",  tags: ["t-wedding", "t-vip", "t-aparat"],   weddingDaysAgo: 1,  referrer: "c-1" },
    { id: "c-9",  name: "کلینیک دندان‌پزشکی ستاره", phone: "09120000009", type: "company",    city: "city-isfahan", tags: ["t-corporate"] },
    { id: "c-10", name: "آرین غزینی",             phone: "09120000010", type: "individual", city: "city-tabriz",  tags: ["t-family", "t-portrait"],           referrer: "c-6" },
    { id: "c-11", name: "نازنین و سپهر",         phone: "09120000011", type: "individual", city: "city-rasht",   tags: ["t-wedding"],                        weddingDaysAgo: 60 },
    { id: "c-12", name: "هتل اسپیناس",            phone: "09120000012", type: "company",    city: "city-tehran",  tags: ["t-corporate", "t-vip"],             address: "ولیعصر، تهران" },
    { id: "c-13", name: "پریسا نوری",             phone: "09120000013", type: "individual", city: "city-yazd",    tags: ["t-portrait", "t-outdoor"] },
    { id: "c-14", name: "مهدی عابدی",             phone: "09120000014", type: "individual", city: "city-ahvaz",   tags: ["t-family"],                         credit: 5000000 },
    { id: "c-15", name: "مرکز خرید کوروش",        phone: "09120000015", type: "company",    city: "city-tehran",  tags: ["t-corporate", "t-outdoor"],         address: "همت، تهران" },
    { id: "c-16", name: "فرزانه و امیر",          phone: "09120000016", type: "individual", city: "city-kermanshah", tags: ["t-wedding", "t-debt"],           weddingDaysAgo: 15 },
    { id: "c-17", name: "سپهر موحد",              phone: "09120000017", type: "individual", city: "city-mashhad", tags: ["t-portrait", "t-credit"],           credit: 12000000 },
    { id: "c-18", name: "آژانس مسافرتی پرشین",     phone: "09120000018", type: "company",    city: "city-shiraz",  tags: ["t-corporate"] },
  ]
  for (const c of customers) {
    await db.customer.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        name: c.name,
        phone: c.phone,
        customerType: c.type,
        referrerId: c.referrer ?? null,
        city: c.city ? cities.find((x) => x.id === c.city)!.name : null,
        address: c.address ?? null,
        weddingDate: c.weddingDaysAgo != null ? days(-c.weddingDaysAgo) : null,
        engagementDate: c.engagementDaysAgo != null ? days(-c.engagementDaysAgo) : null,
        birthDate: c.birthDaysAgo != null ? days(-c.birthDaysAgo) : null,
        familyMeta: JSON.stringify({ spouse: { name: "", birth: "" }, children: [] }),
        creditBalance: (c.credit ?? 0) - (c.debt ?? 0),
        totalRevenue: 0,
        totalProjects: 0,
      },
    })
    // connect tags (set() replaces list — idempotent)
    await db.customer.update({
      where: { id: c.id },
      data: { tags: { set: c.tags.map((id) => ({ id })) } },
    })
  }

  // ---------- CUSTOM FIELD VALUES (for some customers) ----------
  console.log("• Custom field values…")
  const cfv = [
    { customerId: "c-1",  fieldId: "cf-wed-date",  value: days(-35).toISOString() },
    { customerId: "c-1",  fieldId: "cf-photo-pref",value: "کیان" },
    { customerId: "c-1",  fieldId: "cf-album",     value: "مهرماند" },
    { customerId: "c-1",  fieldId: "cf-guests",    value: "350" },
    { customerId: "c-4",  fieldId: "cf-wed-date",  value: days(-22).toISOString() },
    { customerId: "c-4",  fieldId: "cf-album",     value: "کلاسیک" },
    { customerId: "c-8",  fieldId: "cf-wed-date",  value: days(-1).toISOString() },
    { customerId: "c-8",  fieldId: "cf-photo-pref",value: "مهسا" },
    { customerId: "c-8",  fieldId: "cf-guests",    value: "200" },
    { customerId: "c-11", fieldId: "cf-wed-date",  value: days(-60).toISOString() },
    { customerId: "c-16", fieldId: "cf-wed-date",  value: days(-15).toISOString() },
  ]
  for (const v of cfv) {
    await db.customFieldValue.upsert({
      where: { customerId_fieldId: { customerId: v.customerId, fieldId: v.fieldId } },
      update: { value: v.value },
      create: v,
    })
  }

  // ---------- CUSTOMER NOTES (a few per customer, mix of text + attachments) ----------
  console.log("• Customer notes…")
  const cnSeeds: Array<{ custId: string; authorId: string; authorName: string; content: string; daysAgo: number; attachments?: any[] }> = [
    { custId: "c-1",  authorId: "u-manager", authorName: "دارا کریمی",   content: "مشتری VIP. حساسیت بالایی روی تایم‌بند دارد. حتماً یک ساعت قبل از شروع تماس بگیرید.", daysAgo: 5 },
    { custId: "c-1",  authorId: "u-sales",   authorName: "پارسا محبی",   content: "قرارداد امضا شد. ۵۰٪ پیش‌پرداخت دریافت شد.", daysAgo: 10, attachments: [{ type: "file", url: "/storage/customer-notes/contract-c1.pdf", name: "contract.pdf", mime: "application/pdf", size: 245000 }] },
    { custId: "c-3",  authorId: "u-sales",   authorName: "پارسا محبی",   content: "تماس با آقای رحیمی (مدیرعامل). درخواست فیلم پربود از خط تولید.", daysAgo: 3 },
    { custId: "c-5",  authorId: "u-manager", authorName: "دارا کریمی",   content: "مشتری دائمی. هر سال یک رویداد سالگرد کافه داره.", daysAgo: 8 },
    { custId: "c-8",  authorId: "u-manager", authorName: "دارا کریمی",   content: "عروسی پرشلوغ. تارا آپارات گرفتن برای دوستشون.", daysAgo: 2, attachments: [{ type: "image", url: "/storage/customer-notes/mood-board-c8.jpg", name: "mood-board.jpg", mime: "image/jpeg", size: 870000, thumbUrl: "/storage/customer-notes/mood-board-c8-thumb.jpg" }] },
    { custId: "c-12", authorId: "u-admin",   authorName: "آریا صادقی",   content: "قرارداد استراتژیک با هتل اسپیناس. تمام رویدادهای سالانه به ما سپرده شد.", daysAgo: 15 },
    { custId: "c-16", authorId: "u-sales",   authorName: "پارسا محبی",   content: "باقی‌مانده ۸۰ میلیون تومان باید تا دو هفته دیگر تسویه شود.", daysAgo: 4 },
    { custId: "c-17", authorId: "u-manager", authorName: "دارا کریمی",   content: "اعتبار ۱۲ میلیون تومانی از پورسانت معرفی دو مشتری.", daysAgo: 7 },
  ]
  for (const n of cnSeeds) {
    await db.customerNote.create({
      data: {
        customerId: n.custId,
        authorId: n.authorId,
        authorName: n.authorName,
        content: n.content,
        attachments: JSON.stringify(n.attachments ?? []),
        createdAt: days(-n.daysAgo),
      },
    })
  }

  // ---------- SERVICE PACKAGES (10 packages) ----------
  console.log("• Service packages…")
  type PkgSeed = {
    id: string; title: string; category: "photo" | "video" | "mix" | "other";
    quality?: "fullhd" | "4k"; basePrice: number; currentPrice: number;
    strategy: "fixed" | "variable" | "delayed"; desc: string;
    tasks: string[]; equipment?: string[];
  }
  const packages: PkgSeed[] = [
    { id: "p-wed-pre", title: "عروسی پریمیوم (عکس + ویدیو)", category: "mix", quality: "4k", basePrice: 850000000, currentPrice: 920000000, strategy: "variable",
      desc: "پوشش کامل عروسی با دو عکاس، دو فیلم‌بردار، فیلم سینمایی هایلایت و ۶۰۰ عکس ادیت‌شده.",
      tasks: ["مشاوره پیش از عروسی", "آماده‌سازی تجهیزات", "پوشش مراسم", "پوشش مهمانی", "انتخاب عکس‌ها", "گرید رنگ فیلم", "رتوش عکس", "تحویل گالری"],
      equipment: ["دوربین Canon R5", "دوربین Sony A7IV", "لنز 24-70", "لنز 70-200", "گیمبال", "پهپاد", "نورپردازی"] },
    { id: "p-wed-dlx", title: "عروسی دلاکس (عکس)", category: "photo", quality: "fullhd", basePrice: 420000000, currentPrice: 460000000, strategy: "fixed",
      desc: "عکاسی پریمیوم عروسی با یک عکاس اصلی و یک دستیار، ۴۰۰ عکس ادیت‌شده و گالری آنلاین.",
      tasks: ["مشاوره پیش از عروسی", "پوشش مراسم", "پوشش مهمانی", "انتخاب عکس‌ها", "رتوش", "تحویل گالری"],
      equipment: ["دوربین Canon R5", "لنز 24-70", "فلاش"] },
    { id: "p-portrait", title: "جلسه پورتره", category: "photo", basePrice: 45000000, currentPrice: 48000000, strategy: "fixed",
      desc: "جلسه پورتره یک ساعته در استودیو یا طبیعت با ۲۵ عکس ادیت‌شده.",
      tasks: ["راه‌اندازی نور", "جلسه عکاسی", "انتخاب", "رتوش", "تحویل"] },
    { id: "p-corporate", title: "فیلم برند شرکتی", category: "video", quality: "4k", basePrice: 680000000, currentPrice: 720000000, strategy: "delayed",
      desc: "فیلم برند ۲-۳ دقیقه‌ای با مصاحبه، ب‌رول و موشن گرافیک.",
      tasks: ["بریف و سناریو", "مصاحبه", "ب‌رول", "تدوین پیش‌نویس", "گرید و صدا", "موشن گرافیک", "تحویل نهایی"] },
    { id: "p-event", title: "پوشش رویداد (نصف روز)", category: "mix", quality: "fullhd", basePrice: 180000000, currentPrice: 195000000, strategy: "variable",
      desc: "پوشش نیم‌روزه رویداد با عکس و ویدیوی کوتاه.",
      tasks: ["بریف", "پوشش رویداد", "انتخاب", "تدوین کوتاه", "تحویل گالری"] },
    { id: "p-family", title: "جلسه خانواده در استودیو", category: "photo", basePrice: 38000000, currentPrice: 38000000, strategy: "fixed",
      desc: "جلسه خانواده در استودیو، یک ساعت، ۲۰ عکس ادیت‌شده.",
      tasks: ["راه‌اندازی", "عکاسی", "انتخاب", "رتوش", "تحویل"] },
    { id: "p-wed-cinema", title: "عروسی سینمایی ۴K", category: "video", quality: "4k", basePrice: 950000000, currentPrice: 1100000000, strategy: "delayed",
      desc: "فیلم سینمایی کامل عروسی با کرین، گیمبال و سه دوربین.",
      tasks: ["مشاوره", "آماده‌سازی تجهیزات", "پوشش مراسم", "پوشش مهمانی", "انتخاب سکانس", "تدوین", "گرید سینمایی", "طراحی صدا", "تحویل"] },
    { id: "p-product", title: "عکاسی محصول", category: "photo", basePrice: 55000000, currentPrice: 60000000, strategy: "fixed",
      desc: "عکاسی تخصصی محصول با نورپردازی استودیویی، ۳۰ عکس.",
      tasks: ["راه‌اندازی ست", "عکاسی", "انتخاب", "رتوش", "تحویل"] },
    { id: "p-music-video", title: "موزیک ویدیو", category: "video", quality: "4k", basePrice: 580000000, currentPrice: 620000000, strategy: "variable",
      desc: "موزیک ویدیو حرفه‌ای با لوکیشن多变.",
      tasks: ["بریف", "پیش‌تولید", "ضبط", "تدوین", "گرید", "تحویل"] },
    { id: "p-conference", title: "کنفرانس شرکتی", category: "mix", quality: "fullhd", basePrice: 280000000, currentPrice: 310000000, strategy: "delayed",
      desc: "پوشش کامل کنفرانس با عکس و فیلم خلاصه.",
      tasks: ["بریف", "پوشش", "مصاحبه", "تدوین", "تحویل"] },
  ]
  for (const p of packages) {
    await db.servicePackage.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        title: p.title,
        category: p.category,
        quality: p.quality ?? "fullhd",
        basePrice: p.basePrice,
        currentPrice: p.currentPrice,
        pricingStrategy: p.strategy === "fixed" ? "variable" : p.strategy,
        defaultDescription: p.desc,
        defaultTasks: JSON.stringify(p.tasks),
        defaultEquipment: JSON.stringify(p.equipment ?? []),
        isActive: true,
      },
    })
  }

  // ---------- PRINT PHOTO PRICES (CRITICAL — 12 records covering sizes/papers/laminates/locations) ----------
  // Schema: price is in Rials (DB stores Rials; API returns Rials; frontend converts /10 to Toman for display)
  // Sizes used: 10×15, 13×18, 15×21, 20×30, 30×40, 40×50, A4, A3
  // Paper: مات / براق
  // Laminate: none / مات / براق / سوپربراق / مخمل
  // Location: studio / outdoor / customer
  console.log("• Print photo prices (CRITICAL)…")
  const printPrices: Array<{ id: string; size: string; paper: string; laminate: string; location: string; price: number; active?: boolean }> = [
    { id: "pp-1",  size: "10×15", paper: "مات",  laminate: "none",       location: "studio",  price:  600000 },  // 60,000 T
    { id: "pp-2",  size: "10×15", paper: "براق", laminate: "none",       location: "studio",  price:  700000 },  // 70,000 T
    { id: "pp-3",  size: "13×18", paper: "مات",  laminate: "none",       location: "studio",  price: 1000000 },  // 100,000 T
    { id: "pp-4",  size: "13×18", paper: "براق", laminate: "مات",        location: "studio",  price: 1300000 },  // 130,000 T
    { id: "pp-5",  size: "15×21", paper: "مات",  laminate: "براق",       location: "studio",  price: 1500000 },  // 150,000 T
    { id: "pp-6",  size: "20×30", paper: "براق", laminate: "سوپربراق",   location: "studio",  price: 2400000 },  // 240,000 T
    { id: "pp-7",  size: "20×30", paper: "مات",  laminate: "مخمل",       location: "studio",  price: 2800000 },  // 280,000 T
    { id: "pp-8",  size: "30×40", paper: "براق", laminate: "none",       location: "outdoor", price: 3800000 },  // 380,000 T
    { id: "pp-9",  size: "30×40", paper: "مات",  laminate: "سوپربراق",   location: "outdoor", price: 4500000 },  // 450,000 T
    { id: "pp-10", size: "40×50", paper: "براق", laminate: "مخمل",       location: "outdoor", price: 6800000 },  // 680,000 T
    { id: "pp-11", size: "A4",    paper: "مات",  laminate: "none",       location: "customer",price: 3000000 },  // 300,000 T
    { id: "pp-12", size: "A3",    paper: "براق", laminate: "براق",       location: "customer",price: 5800000 },  // 580,000 T
    { id: "pp-13", size: "10×15", paper: "مات",  laminate: "none",       location: "outdoor", price:  800000, active: false }, // inactive sample
  ]
  for (const p of printPrices) {
    await db.printPhotoPrice.upsert({
      where: { id: p.id },
      update: {
        size: p.size, paperType: p.paper, laminateType: p.laminate, photoLocation: p.location,
        price: p.price, isActive: p.active ?? true,
      },
      create: {
        id: p.id, size: p.size, paperType: p.paper, laminateType: p.laminate, photoLocation: p.location,
        price: p.price, isActive: p.active ?? true,
      },
    })
  }

  // ---------- SALARY RULES ----------
  console.log("• Salary rules…")
  const salaryRules = [
    { id: "sr-pf",    role: "photographer", commissionType: "percent",          commissionValue: 6,       applyOn: "field_work" },
    { id: "sr-pf-fix",role: "photographer", commissionType: "fixed_per_project",commissionValue: 5000000, applyOn: "field_work" },
    { id: "sr-ed",    role: "editor",       commissionType: "percent",          commissionValue: 4,       applyOn: "studio_work" },
    { id: "sr-qc",    role: "qc",           commissionType: "fixed_per_project",commissionValue: 1500000, applyOn: "studio_work" },
    { id: "sr-lg",    role: "logistics",    commissionType: "fixed_per_project",commissionValue: 2500000, applyOn: "delivery" },
    { id: "sr-sl",    role: "sales",        commissionType: "percent",          commissionValue: 2,       applyOn: "field_work" },
  ]
  for (const r of salaryRules) {
    await db.salaryRule.upsert({
      where: { id: r.id },
      update: {},
      create: { ...r, isActive: true },
    })
  }

  // ---------- CONTRACTS + PROJECTS ----------
  // 18 projects covering all 8 workflow stages, both photo and video tracks.
  console.log("• Projects + contracts…")
  type ProjSeed = {
    id: string; custId: string; pkgId: string;
    status: "scheduled" | "running" | "managing" | "editing" | "qc" | "render" | "ready" | "delivered";
    startDays: number; endDays: number; deadlineDays: number; readyDays: number | null;
    strategy: "fixed" | "variable" | "delayed";
    paid: number; fieldTeam: string[]; studioTeam: string[];
    desc: string; tasksDone: boolean;
    photoStatus?: string; videoStatus?: string;
  }
  const projects: ProjSeed[] = [
    { id: "pr-1",  custId: "c-1",  pkgId: "p-wed-pre",   status: "delivered", startDays: -40, endDays: -40, deadlineDays: -15, readyDays: -25, strategy: "variable", paid: 920000000, fieldTeam: ["u-photo", "u-photo2"], studioTeam: ["u-editor"], desc: "عروسی بزرگ در هتل اسپیناس. پهپاد + ۴ دوربین.", tasksDone: true },
    { id: "pr-2",  custId: "c-4",  pkgId: "p-wed-dlx",   status: "ready",     startDays: -20, endDays: -20, deadlineDays: 5,   readyDays: -8,  strategy: "fixed",    paid: 460000000, fieldTeam: ["u-photo"], studioTeam: ["u-editor"], desc: "عروسی در تالار وحدت. فقط عکاسی.", tasksDone: true },
    { id: "pr-3",  custId: "c-3",  pkgId: "p-corporate", status: "editing",   startDays: -12, endDays: -11, deadlineDays: 10,  readyDays: null, strategy: "delayed",  paid: 360000000, fieldTeam: ["u-photo2"], studioTeam: ["u-editor"], desc: "فیلم برند آرشام. کارخانه + دفتر مرکزی.", tasksDone: false },
    { id: "pr-4",  custId: "c-8",  pkgId: "p-wed-pre",   status: "running",   startDays: -1,  endDays: -1,  deadlineDays: 20,  readyDays: null, strategy: "variable", paid: 400000000, fieldTeam: ["u-photo", "u-photo2"], studioTeam: ["u-editor"], desc: "عروسی تارا و فرزان، هتل پارسیان آزادی.", tasksDone: false },
    { id: "pr-5",  custId: "c-5",  pkgId: "p-event",     status: "scheduled", startDays: 3,   endDays: 3,   deadlineDays: 18,  readyDays: null, strategy: "variable", paid: 90000000,  fieldTeam: ["u-photo2"], studioTeam: ["u-editor"], desc: "رویداد سالگرد کافه دوران.", tasksDone: false },
    { id: "pr-6",  custId: "c-6",  pkgId: "p-family",    status: "qc",        startDays: -3,  endDays: -3,  deadlineDays: 2,   readyDays: null, strategy: "fixed",    paid: 38000000,  fieldTeam: ["u-photo"], studioTeam: ["u-editor"], desc: "جلسه خانواده کیانی در استودیو.", tasksDone: false },
    { id: "pr-7",  custId: "c-2",  pkgId: "p-portrait",  status: "delivered", startDays: -60, endDays: -60, deadlineDays: -45, readyDays: -52, strategy: "fixed",    paid: 48000000,  fieldTeam: ["u-photo"], studioTeam: ["u-editor"], desc: "پورتره برند شخصی نگار.", tasksDone: true },
    { id: "pr-8",  custId: "c-9",  pkgId: "p-corporate", status: "managing",  startDays: -5,  endDays: -5,  deadlineDays: 15,  readyDays: null, strategy: "delayed",  paid: 300000000, fieldTeam: ["u-photo2"], studioTeam: ["u-editor"], desc: "فیلم پروموشن کلینیک ستاره.", tasksDone: false },
    { id: "pr-9",  custId: "c-7",  pkgId: "p-portrait",  status: "scheduled", startDays: 7,   endDays: 7,   deadlineDays: 21,  readyDays: null, strategy: "fixed",    paid: 0,         fieldTeam: ["u-photo"], studioTeam: ["u-editor"], desc: "بازسازی پورتره سوگل.", tasksDone: false },
    { id: "pr-10", custId: "c-10", pkgId: "p-family",    status: "scheduled", startDays: 10,  endDays: 10,  deadlineDays: 24,  readyDays: null, strategy: "fixed",    paid: 0,         fieldTeam: ["u-photo2"], studioTeam: ["u-editor"], desc: "جلسه خانواده غزینی.", tasksDone: false },
    { id: "pr-11", custId: "c-11", pkgId: "p-wed-cinema",status: "render",    startDays: -25, endDays: -25, deadlineDays: -5,  readyDays: null, strategy: "delayed",  paid: 1100000000,fieldTeam: ["u-photo", "u-photo2"], studioTeam: ["u-editor"], desc: "فیلم سینمایی ۴K عروسی نازنین و سپهر.", tasksDone: false },
    { id: "pr-12", custId: "c-12", pkgId: "p-conference",status: "delivered", startDays: -50, endDays: -50, deadlineDays: -30, readyDays: -32, strategy: "delayed",  paid: 310000000, fieldTeam: ["u-photo2"], studioTeam: ["u-editor"], desc: "کنفرانس سالانه هتل اسپیناس.", tasksDone: true },
    { id: "pr-13", custId: "c-13", pkgId: "p-portrait",  status: "editing",   startDays: -8,  endDays: -8,  deadlineDays: 7,   readyDays: null, strategy: "fixed",    paid: 30000000,  fieldTeam: ["u-photo"], studioTeam: ["u-editor"], desc: "پورتره فضای باز یزد.", tasksDone: false },
    { id: "pr-14", custId: "c-15", pkgId: "p-product",   status: "ready",     startDays: -15, endDays: -15, deadlineDays: -1,  readyDays: -3,  strategy: "fixed",    paid: 60000000,  fieldTeam: ["u-photo"], studioTeam: ["u-editor"], desc: "عکاسی محصول مرکز خرید کوروش.", tasksDone: true },
    { id: "pr-15", custId: "c-16", pkgId: "p-wed-dlx",   status: "running",   startDays: -2,  endDays: -2,  deadlineDays: 18,  readyDays: null, strategy: "fixed",    paid: 200000000, fieldTeam: ["u-photo2"], studioTeam: ["u-editor"], desc: "عروسی فرزانه و امیر، کرمانشاه.", tasksDone: false },
    { id: "pr-16", custId: "c-14", pkgId: "p-family",    status: "delivered", startDays: -45, endDays: -45, deadlineDays: -30, readyDays: -35, strategy: "fixed",    paid: 38000000,  fieldTeam: ["u-photo"], studioTeam: ["u-editor"], desc: "جلسه خانواده مهدی.", tasksDone: true },
    { id: "pr-17", custId: "c-17", pkgId: "p-music-video",status: "scheduled",startDays: 14,  endDays: 14,  deadlineDays: 35,  readyDays: null, strategy: "variable", paid: 100000000, fieldTeam: ["u-photo", "u-photo2"], studioTeam: ["u-editor"], desc: "موزیک ویدیو سپهر موحد.", tasksDone: false },
    { id: "pr-18", custId: "c-18", pkgId: "p-corporate", status: "qc",        startDays: -6,  endDays: -6,  deadlineDays: 9,   readyDays: null, strategy: "delayed",  paid: 600000000, fieldTeam: ["u-photo2"], studioTeam: ["u-editor"], desc: "فیلم برند آژانس پرشین.", tasksDone: false },
  ]

  for (const ps of projects) {
    const pkg = packages.find((p) => p.id === ps.pkgId)!
    const contractNum = "CT-" + ps.id.replace("pr-", "").toUpperCase() + "-1403"
    const contract = await db.contract.upsert({
      where: { contractNumber: contractNum },
      update: {},
      create: {
        id: "ct-" + ps.id.replace("pr-", ""),
        contractNumber: contractNum,
        customerId: ps.custId,
        dateCreated: days(ps.startDays - 5),
        printedTerms: pkg.desc,
        isClosed: ps.status === "delivered",
      },
    })

    const readyDate = ps.readyDays != null ? days(ps.readyDays) : null
    const isReady = ps.status === "ready" || ps.status === "delivered"
    const actualEnd = ps.status === "delivered" ? days(ps.readyDays! + 3) : null
    const actualStart = ["running", "managing", "editing", "qc", "render", "ready", "delivered"].includes(ps.status) ? days(ps.startDays) : null
    const isPhoto = pkg.category === "photo" || pkg.category === "mix"
    const isVideo = pkg.category === "video" || pkg.category === "mix"

    await db.project.upsert({
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
        startDatetime: days(ps.startDays),
        endDatetime: days(ps.endDays),
        deliveryDeadline: days(ps.deadlineDays),
        status: ps.status,
        photoStatus: isPhoto ? ps.status : "scheduled",
        videoStatus: isVideo ? ps.status : "scheduled",
        printedDescription: ps.desc,
        isReadyForDelivery: isReady,
        readyDate,
        priceAtReadyTime: readyDate ? pkg.currentPrice : null,
        actualStartDatetime: actualStart,
        actualEndDatetime: actualEnd,
        fieldTeam: { connect: ps.fieldTeam.map((id) => ({ id })) },
        studioTeam: { connect: ps.studioTeam.map((id) => ({ id })) },
      },
    })

    // ---------- ProjectWorkflow (assignees for stages that need them) ----------
    // Stages: scheduled | running | managing | editing | qc | render | ready | delivered
    // For each stage up to current status, assign appropriate person.
    const stages = ["scheduled", "running", "managing", "editing", "qc", "render", "ready", "delivered"]
    const stageIdx = stages.indexOf(ps.status)
    if (isPhoto) {
      for (let i = 0; i <= stageIdx; i++) {
        const stage = stages[i]
        let assigneeId: string | null = null
        let startedAt: Date | null = null
        let completedAt: Date | null = null
        if (stage === "scheduled") { assigneeId = "u-manager" }
        else if (stage === "running") { assigneeId = ps.fieldTeam[0]; startedAt = days(ps.startDays); completedAt = days(ps.endDays) }
        else if (stage === "managing") { assigneeId = ps.fieldTeam[0]; startedAt = days(ps.endDays); completedAt = days(ps.endDays + 1) }
        else if (stage === "editing") { assigneeId = ps.studioTeam[0]; startedAt = days(ps.endDays + 1); completedAt = i < stageIdx ? days(ps.endDays + 3) : null }
        else if (stage === "qc") { assigneeId = "u-qc"; startedAt = days(ps.endDays + 3); completedAt = i < stageIdx ? days(ps.endDays + 4) : null }
        else if (stage === "render") { assigneeId = ps.studioTeam[0]; startedAt = days(ps.endDays + 4); completedAt = i < stageIdx ? days(ps.endDays + 5) : null }
        else if (stage === "ready") { assigneeId = "u-qc"; startedAt = readyDate; completedAt = i < stageIdx ? days(ps.readyDays! + 1) : null }
        else if (stage === "delivered") { assigneeId = "u-sales"; startedAt = actualEnd; completedAt = actualEnd }
        if (assigneeId) {
          await db.projectWorkflow.upsert({
            where: { projectId_track_stage: { projectId: ps.id, track: "photo", stage } },
            update: { assigneeId, startedAt, completedAt },
            create: { projectId: ps.id, track: "photo", stage, assigneeId, startedAt, completedAt, isAuto: stage === "scheduled" },
          })
        }
      }
    }
    if (isVideo) {
      for (let i = 0; i <= stageIdx; i++) {
        const stage = stages[i]
        let assigneeId: string | null = null
        let startedAt: Date | null = null
        let completedAt: Date | null = null
        if (stage === "scheduled") { assigneeId = "u-manager" }
        else if (stage === "running") { assigneeId = ps.fieldTeam[0]; startedAt = days(ps.startDays); completedAt = days(ps.endDays) }
        else if (stage === "managing") { assigneeId = ps.fieldTeam[0]; startedAt = days(ps.endDays); completedAt = days(ps.endDays + 1) }
        else if (stage === "editing") { assigneeId = ps.studioTeam[0]; startedAt = days(ps.endDays + 1); completedAt = i < stageIdx ? days(ps.endDays + 3) : null }
        else if (stage === "qc") { assigneeId = "u-qc"; startedAt = days(ps.endDays + 3); completedAt = i < stageIdx ? days(ps.endDays + 4) : null }
        else if (stage === "render") { assigneeId = ps.studioTeam[0]; startedAt = days(ps.endDays + 4); completedAt = i < stageIdx ? days(ps.endDays + 5) : null }
        else if (stage === "ready") { assigneeId = "u-qc"; startedAt = readyDate; completedAt = i < stageIdx ? days(ps.readyDays! + 1) : null }
        else if (stage === "delivered") { assigneeId = "u-sales"; startedAt = actualEnd; completedAt = actualEnd }
        if (assigneeId) {
          await db.projectWorkflow.upsert({
            where: { projectId_track_stage: { projectId: ps.id, track: "video", stage } },
            update: { assigneeId, startedAt, completedAt },
            create: { projectId: ps.id, track: "video", stage, assigneeId, startedAt, completedAt, isAuto: stage === "scheduled" },
          })
        }
      }
    }

    // ---------- ProjectPrintPhoto (for photo/mix projects that are at or past running) ----------
    if (isPhoto && ["running", "managing", "editing", "qc", "render", "ready", "delivered"].includes(ps.status)) {
      // Pick 2-3 random print prices, with varied quantities
      const picks = [
        { ppId: "pp-3", qty: 30 + (Math.abs(ps.id.charCodeAt(3)) % 20) },
        { ppId: "pp-5", qty: 10 + (Math.abs(ps.id.charCodeAt(3)) % 10) },
        { ppId: "pp-7", qty: 5 + (Math.abs(ps.id.charCodeAt(3)) % 5) },
      ]
      for (let i = 0; i < picks.length; i++) {
        const p = picks[i]
        await db.projectPrintPhoto.upsert({
          where: { id: `ppp-${ps.id}-${i + 1}` },
          update: { quantity: p.qty },
          create: {
            id: `ppp-${ps.id}-${i + 1}`,
            projectId: ps.id,
            printPhotoPriceId: p.ppId,
            quantity: p.qty,
            exemptFromPriceUpdate: false,
          },
        })
      }
    }

    // ---------- Payments (split into deposit + installment + settlement for delivered) ----------
    if (ps.paid > 0) {
      const deposit = Math.round(ps.paid * 0.4)
      const mid = Math.round(ps.paid * 0.3)
      const rest = ps.paid - deposit - mid
      const methods = ["cash", "card", "pos", "cheque"] as const
      await db.payment.create({
        data: { id: `pay-${ps.id}-1`, projectId: ps.id, amount: deposit, paymentType: "deposit", method: methods[ps.id.charCodeAt(3) % 4], datePaid: days(ps.startDays - 5), isConfirmed: true, recordedById: "u-sales", note: "پیش‌پرداخت رزرو" },
      })
      if (mid > 0) {
        await db.payment.create({
          data: { id: `pay-${ps.id}-2`, projectId: ps.id, amount: mid, paymentType: "installment", method: methods[(ps.id.charCodeAt(3) + 1) % 4], datePaid: days(ps.startDays - 1), isConfirmed: true, recordedById: "u-sales", note: "پرداخت دوم" },
        })
      }
      if (rest > 0 && ["ready", "delivered"].includes(ps.status)) {
        await db.payment.create({
          data: { id: `pay-${ps.id}-3`, projectId: ps.id, amount: rest, paymentType: "settlement", method: methods[(ps.id.charCodeAt(3) + 2) % 4], datePaid: days(ps.readyDays! + 1), isConfirmed: ps.status === "delivered", recordedById: "u-sales", note: "تسویه نهایی" },
        })
      } else if (rest > 0 && ps.status !== "scheduled") {
        // pending payment (not yet confirmed)
        await db.payment.create({
          data: { id: `pay-${ps.id}-3`, projectId: ps.id, amount: rest, paymentType: "installment", method: "card", datePaid: days(2), isConfirmed: false, recordedById: "u-sales", note: "در انتظار تایید" },
        })
      }
    }

    // ---------- Tasks ----------
    const tasks = pkg.tasks
    for (let i = 0; i < tasks.length; i++) {
      const title = tasks[i]
      const done = ps.tasksDone || (ps.status === "delivered" || ps.status === "ready")
      const isCurrent = !done && i === Math.min(i, tasks.length - 1) && ps.status !== "scheduled"
      await db.task.create({
        data: {
          id: `task-${ps.id}-${i + 1}`,
          projectId: ps.id,
          title,
          assignedToId: i < 3 ? ps.fieldTeam[0] : i < tasks.length - 1 ? ps.studioTeam[0] : "u-sales",
          status: done ? "done" : isCurrent ? "in_progress" : "todo",
          deadline: days(ps.deadlineDays),
          order: i,
        },
      })
    }

    // ---------- Project notes (varied per stage) ----------
    await db.projectNote.create({
      data: { projectId: ps.id, authorId: "u-manager", noteType: "text", content: "پروژه ایجاد شد. جلسه بریفینگ با مشتری زمان‌بندی شد.", createdAt: days(ps.startDays - 6) },
    })
    if (["running", "managing", "editing", "qc", "render", "ready", "delivered"].includes(ps.status)) {
      await db.projectNote.create({
        data: { projectId: ps.id, authorId: ps.fieldTeam[0], noteType: "text", content: "عکاسی/فیلم‌برداری کامل شد. در حال بک‌آپ گرفتن و شروع انتخاب عکس.", createdAt: days(ps.endDays) },
      })
    }
    if (["editing", "qc", "render", "ready", "delivered"].includes(ps.status)) {
      await db.projectNote.create({
        data: { projectId: ps.id, authorId: ps.studioTeam[0], noteType: "text", content: "ادیت اولیه انجام شد. در حال گرید رنگ و رتوش نهایی.", createdAt: days(ps.endDays + 2) },
      })
    }
    if (["ready", "delivered"].includes(ps.status)) {
      await db.projectNote.create({
        data: { projectId: ps.id, authorId: "u-qc", noteType: "text", content: "✅ کنترل کیفیت انجام شد. آماده تحویل. قیمت نهایی ثبت شد.", createdAt: readyDate! },
      })
    }
    if (ps.status === "delivered") {
      await db.projectNote.create({
        data: { projectId: ps.id, authorId: "u-logistics", noteType: "text", content: "📦 تحویل انجام شد. مشتری رضایت کامل داشت.", createdAt: actualEnd! },
      })
    }

    // ---------- Salary records (for delivered projects) ----------
    if (ps.status === "delivered") {
      for (const uid of ps.fieldTeam) {
        const rule = salaryRules.find((r) => r.role === "photographer" && r.applyOn === "field_work")!
        const amt = rule.commissionType === "percent"
          ? Math.round(pkg.currentPrice * Number(rule.commissionValue) / 100)
          : Number(rule.commissionValue)
        await db.salaryRecord.create({
          data: { id: `sr-${ps.id}-${uid}`, userId: uid, projectId: ps.id, amount: amt, ruleUsedId: rule.id, isPaid: Math.random() > 0.4, period: "1403-04" },
        })
      }
      for (const uid of ps.studioTeam) {
        const rule = salaryRules.find((r) => r.role === "editor" && r.applyOn === "studio_work")!
        const amt = rule.commissionType === "percent"
          ? Math.round(pkg.currentPrice * Number(rule.commissionValue) / 100)
          : Number(rule.commissionValue)
        await db.salaryRecord.create({
          data: { id: `sr-${ps.id}-${uid}`, userId: uid, projectId: ps.id, amount: amt, ruleUsedId: rule.id, isPaid: true, period: "1403-04" },
        })
      }
      const rule = salaryRules.find((r) => r.role === "logistics" && r.applyOn === "delivery")!
      const amt = Number(rule.commissionValue)
      await db.salaryRecord.create({
        data: { id: `sr-${ps.id}-log`, userId: "u-logistics", projectId: ps.id, amount: amt, ruleUsedId: rule.id, isPaid: true, period: "1403-04" },
      })
    }

    // ---------- Invoices (for delivered/ready projects) ----------
    if (["ready", "delivered"].includes(ps.status)) {
      await db.invoice.upsert({
        where: { contractId: contract.id },
        update: { totalAmount: pkg.currentPrice },
        create: {
          id: `inv-${ps.id}`,
          contractId: contract.id,
          invoiceNumber: `INV-${ps.id.replace("pr-", "").toUpperCase()}-1403`,
          totalAmount: pkg.currentPrice,
          generatedAt: days(ps.readyDays!),
        },
      })
    }

    // ---------- Update customer cache ----------
    await db.customer.update({
      where: { id: ps.custId },
      data: {
        totalProjects: { increment: 1 },
        totalRevenue: { increment: ps.paid },
        lastInteraction: days(ps.startDays),
      },
    })

    // ---------- Referral credit for referred customers ----------
    const cust = await db.customer.findUnique({ where: { id: ps.custId } })
    if (cust?.referrerId) {
      const reward = Math.round(pkg.currentPrice * 0.1)
      await db.creditTransaction.create({
        data: {
          id: `cr-${ps.id}-ref`,
          customerId: cust.referrerId,
          amount: reward,
          transactionType: "reward_referral",
          relatedContractId: contract.id,
          createdById: "u-admin",
          note: `پاداش ۱۰٪ معرفی از ${cust.name}`,
          createdAt: days(ps.startDays - 4),
        },
      })
      await db.customer.update({
        where: { id: cust.referrerId },
        data: { creditBalance: { increment: reward } },
      })
    }
  }

  // ---------- Manual credit transactions (for customers with explicit credit/debt) ----------
  console.log("• Credit transactions…")
  for (const c of customers) {
    if (c.credit && c.credit > 0) {
      await db.creditTransaction.create({
        data: {
          id: `cr-${c.id}-manual`,
          customerId: c.id,
          amount: c.credit,
          transactionType: "manual_adjustment",
          createdById: "u-admin",
          note: "اعتبار دستی اضافه‌شده توسط مدیر",
          createdAt: days(-7),
        },
      })
    }
  }

  // ---------- REFERRAL CODES ----------
  console.log("• Referral codes…")
  const codeOwners = ["c-1", "c-2", "c-6", "c-3", "c-7", "c-12", "c-17"]
  let codeIdx = 0
  for (const ownerId of codeOwners) {
    const code = genCode(`owner-${ownerId}-0`)
    await db.referralCode.create({
      data: {
        id: `rc-${++codeIdx}`,
        ownerId,
        code,
        discountPercent: 10,
        maxUses: 1,
        usedCount: codeIdx <= 2 ? 1 : 0,
        validFrom: days(-60),
        relatedProjectId: codeIdx <= 2 ? (codeIdx === 1 ? "pr-1" : "pr-4") : null,
      },
    })
  }
  // A few more unused codes
  for (let i = 0; i < 5; i++) {
    const ownerId = codeOwners[i % codeOwners.length]
    const code = genCode(`extra-${i}-${ownerId}`)
    await db.referralCode.create({
      data: {
        id: `rc-extra-${i + 1}`,
        ownerId,
        code,
        discountPercent: 10,
        maxUses: 1,
        usedCount: 0,
        validFrom: days(-30),
      },
    })
  }

  // ---------- EXPENSES (varied categories) ----------
  console.log("• Expenses…")
  const expenses = [
    { id: "exp-1",  title: "اجاره استودیو (ماهانه)",       amount: 180000000, category: "office",           date: days(-30), description: "اجاره ماهانه فضای استودیو" },
    { id: "exp-2",  title: "خرید سافت‌باکس x2",            amount: 32000000,  category: "office",           date: days(-15), description: "دو عدد سافت‌باکس ۸۰ سانت" },
    { id: "exp-3",  title: "هارد اکسترنال ۸ ترابایت",      amount: 12000000,  category: "project_direct",   date: days(-12), description: "برای بک‌آپ پروژه عروسی" },
    { id: "exp-4",  title: "مالیات سه‌ماهه سوم",           amount: 95000000,  category: "tax",              date: days(-20), description: "مالیات بر ارزش افزوده" },
    { id: "exp-5",  title: "تعمیر پهپاد",                  amount: 8500000,   category: "office",           date: days(-8),  description: "تعمیر gimbal پهپاد DJI" },
    { id: "exp-6",  title: "اشتراک Adobe CC",              amount: 6800000,   category: "office",           date: days(-5),  description: "اشتراک ماهانه" },
    { id: "exp-7",  title: "حقوق ثابت پارسا (فروش)",       amount: 25000000,  category: "salary_fixed",     date: days(-3),  description: "حقوق ثابت ماه" },
    { id: "exp-8",  title: "تبلیغات اینستاگرام",            amount: 45000000,  category: "office",           date: days(-10), description: "کمپین تبلیغاتی ۱۰ روزه" },
    { id: "exp-9",  title: "خرید کارت حافظه SD 256GB x3", amount: 18000000,  category: "office",           date: days(-2),  description: "تعمیرات و تجهیزات" },
    { id: "exp-10", title: "هزینه پیک تحویل آلبوم",        amount: 1200000,   category: "project_direct",   date: days(-1),  description: "پیک برای تحویل آلبوم pr-1" },
    { id: "exp-11", title: "قبض برق استودیو",              amount: 3500000,   category: "office",           date: days(-7),  description: "قبض برق ماه" },
    { id: "exp-12", title: "نوشیدنی و پذیرایی مشتریان",    amount: 2200000,   category: "office",           date: days(-4),  description: "پذیرایی هفتگی" },
  ]
  for (const e of expenses) {
    await db.expense.create({ data: e })
  }

  // ---------- SMS TEMPLATES ----------
  console.log("• SMS templates…")
  const smsTemplates = [
    { id: "sms-tpl-1", name: "خوش‌آمدگویی",                    templateText: "{customer_name} عزیز، به استودیو نسیم خوش آمدید. ما در کنار شما هستیم تا لحظاتتان را ماندگار کنیم. 📸", isActive: true },
    { id: "sms-tpl-2", name: "تایید رزرو",                     templateText: "{customer_name} گرامی، جلسه شما در تاریخ {event_date} تایید شد. منتظر دیدار شما هستیم. — استودیو نسیم", isActive: true },
    { id: "sms-tpl-3", name: "یادآوری جلسه",                    templateText: "یادآوری: جلسه شما فردا ({event_date}) در استودیو نسیم برگزار می‌شود.", isActive: true },
    { id: "sms-tpl-4", name: "آماده تحویل",                     templateText: "{customer_name} عزیز، پروژه تاریخ {event_date} شما آماده تحویل است! لطفاً برای هماهنگی تحویل تماس بگیرید. — استودیو نسیم", isActive: true },
    { id: "sms-tpl-5", name: "هشدار ۳۰ روزه",                   templateText: "{customer_name} عزیز، مهلت تحویل پروژه شما {remaining_days} روز دیگر به پایان می‌رسد. لطفاً برای تثبیت قیمت تحویل بگیرید.", isActive: true },
    { id: "sms-tpl-6", name: "یادآوری پرداخت",                  templateText: "{customer_name} عزیز، پرداخت {amount} برای پروژه شما سررسید شده است. — استودیو نسیم", isActive: false },
    { id: "sms-tpl-7", name: "تشکر پس از تحویل",                templateText: "{customer_name} عزیز، از اعتماد شما به استودیو نسیم سپاسگزاریم. منتظر دیدار دوباره شما هستیم. 🌹", isActive: true },
  ]
  for (const s of smsTemplates) {
    await db.sMSTemplate.upsert({
      where: { id: s.id },
      update: { name: s.name, templateText: s.templateText, isActive: s.isActive },
      create: s,
    })
  }

  // ---------- SMS AUTOMATIONS ----------
  console.log("• SMS automations…")
  const automations = [
    { id: "sms-auto-1", name: "پیام تایید رزرو",     templateId: "sms-tpl-2", triggerEvent: "after_event",     offsetDays: -3, isActive: true },
    { id: "sms-auto-2", name: "یادآوری جلسه",        templateId: "sms-tpl-3", triggerEvent: "before_event",    offsetDays: -1, isActive: true },
    { id: "sms-auto-3", name: "اطلاع‌رسانی آماده تحویل",templateId: "sms-tpl-4", triggerEvent: "after_ready",     offsetDays: 0,  isActive: true },
    { id: "sms-auto-4", name: "هشدار ۳۰ روزه",        templateId: "sms-tpl-5", triggerEvent: "after_ready",     offsetDays: 25, isActive: true },
    { id: "sms-auto-5", name: "تشکر پس از تحویل",     templateId: "sms-tpl-7", triggerEvent: "after_ready",     offsetDays: 5,  isActive: true },
  ]
  for (const a of automations) {
    await db.smsAutomation.upsert({
      where: { id: a.id },
      update: a,
      create: a,
    })
  }
  // Assign some automations to active projects
  for (const ps of projects) {
    await db.projectSmsAssignment.create({
      data: { id: `psa-${ps.id}-1`, projectId: ps.id, automationId: "sms-auto-2", enabled: true },
    }).catch(() => {})
    if (["ready", "delivered"].includes(ps.status)) {
      await db.projectSmsAssignment.create({
        data: { id: `psa-${ps.id}-2`, projectId: ps.id, automationId: "sms-auto-3", enabled: true },
      }).catch(() => {})
    }
  }

  // ---------- SYSTEM SETTINGS ----------
  console.log("• System settings…")
  const settings = [
    { key: "image_compression",      value: JSON.stringify({ maxWidth: 1920, maxHeight: 1080, quality: 82 }) },
    { key: "sms_provider",           value: JSON.stringify({ active: true, provider: "kavenegar", apiKey: "" }) },
    { key: "studio_name",            value: JSON.stringify({ fa: "عکاسی نسیم", en: "NASIM STUDIO" }) },
    { key: "default_currency",       value: JSON.stringify({ code: "IRR", name: "ریال", symbol: "ریال" }) },
    { key: "working_hours",          value: JSON.stringify({ start: "09:00", end: "20:00", friOff: true }) },
    { key: "delayed_pricing_days",   value: JSON.stringify({ days: 30 }) },
    { key: "print_photo_expiry_days",value: JSON.stringify({ days: 30 }) },
    { key: "deposit_default_percent",value: JSON.stringify({ percent: 40 }) },
  ]
  for (const s of settings) {
    await db.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    })
  }

  // ---------- QR TEMPLATES ----------
  console.log("• QR templates…")
  const qrTemplates = [
    { id: "qr-1", name: "تخفیف ۱۰٪ عروسی",     discountPercent: 10, maxUses: 1, pixelSize: 300, dpi: 150, layoutConfig: JSON.stringify({ primary: "#ec4899", accent: "#fbcfe8" }), description: "تخفیف یکبار مصرف برای عروسی", isActive: true },
    { id: "qr-2", name: "تخفیف ۱۵٪ پورتره",    discountPercent: 15, maxUses: 1, pixelSize: 400, dpi: 200, layoutConfig: JSON.stringify({ primary: "#a855f7", accent: "#e9d5ff" }), description: "تخفیف جلسه پورتره", isActive: true },
    { id: "qr-3", name: "تخفیف ۵٪ مشتری دائمی", discountPercent: 5,  maxUses: 5, pixelSize: 300, dpi: 150, layoutConfig: JSON.stringify({ primary: "#0ea5e9", accent: "#bae6fd" }), description: "تخفیف ویژه مشتریان دائمی", isActive: true },
  ]
  for (const q of qrTemplates) {
    await db.qrTemplate.upsert({
      where: { id: q.id },
      update: q,
      create: q,
    })
  }

  // ---------- LEAVE REQUESTS ----------
  console.log("• Leave requests…")
  const leaves = [
    { id: "lv-1", userId: "u-photo2",  startDate: days(5),  endDate: days(8),  reason: "سفر خانوادگی",      status: "pending" },
    { id: "lv-2", userId: "u-editor",  startDate: days(-2), endDate: days(1),  reason: "مرخصی پزشکی",        status: "approved", approverId: "u-admin" },
    { id: "lv-3", userId: "u-photo",   startDate: days(15), endDate: days(17), reason: "کارت حساب شخصی",    status: "pending" },
    { id: "lv-4", userId: "u-qc",      startDate: days(-10),endDate: days(-9), reason: "مرخصی استحقاقی",     status: "approved", approverId: "u-manager" },
    { id: "lv-5", userId: "u-sales",   startDate: days(3),  endDate: days(3),  reason: "پیگیری شخصی",        status: "rejected", approverId: "u-manager" },
  ]
  for (const l of leaves) {
    await db.leaveRequest.create({ data: l })
  }

  // ---------- CONVERSATIONS (3 direct + 2 group) ----------
  // IMPORTANT: ConversationParticipant.userId and Message.senderId MUST be
  // MasterUser IDs (not studio User IDs), because the conversations API
  // filters by `getCurrentUser().userId` which is the MasterUser ID.
  // The MasterUser IDs are: user-admin, user-manager, user-sales, user-photo,
  // user-photo2, user-editor, user-qc, user-logistics (see prisma/seed-master.ts).
  console.log("• Conversations, participants, messages, reactions…")
  function muId(studioId: string): string { return "user-" + studioId.replace(/^u-/, "") }
  function userName(studioId: string) { const u = users.find((x) => x.id === studioId); return u ? `${u.firstName} ${u.lastName}` : studioId }
  const convs = [
    { id: "conv-1", type: "direct", title: null, participants: ["u-admin", "u-photo"] },
    { id: "conv-2", type: "direct", title: null, participants: ["u-manager", "u-editor"] },
    { id: "conv-3", type: "group",  title: "تیم آتلیه نسیم", participants: ["u-admin", "u-manager", "u-photo", "u-editor", "u-qc", "u-logistics"] },
    { id: "conv-4", type: "group",  title: "پروژه عروسی تارا و فرزان", participants: ["u-manager", "u-photo", "u-photo2", "u-editor"] },
    { id: "conv-5", type: "direct", title: null, participants: ["u-admin", "u-sales"] },
  ]
  for (const c of convs) {
    await db.conversation.create({ data: { id: c.id, type: c.type, title: c.title, createdAt: days(-15) } })
    for (const uid of c.participants) {
      await db.conversationParticipant.create({
        data: { id: `cp-${c.id}-${uid}`, conversationId: c.id, userId: muId(uid), userName: userName(uid), joinedAt: days(-15) },
      })
    }
  }

  // ---------- MESSAGES (35+ messages with replies + reactions) ----------
  type MsgSeed = { id: string; convId: string; senderId: string; body: string; minsAgo: number; replyToId?: string; attachments?: any[] }
  const messages: MsgSeed[] = [
    // conv-1: admin ↔ photographer (Kian)
    { id: "msg-1",  convId: "conv-1", senderId: "u-admin",  body: "سلام کian، برای عروسی تارا فردا ساعت ۸ صبح آماده باش.", minsAgo: 60 * 24 * 2 },
    { id: "msg-2",  convId: "conv-1", senderId: "u-photo",  body: "سلام آریا جان. حتماً. تجهیزات آماده‌ست؟", minsAgo: 60 * 24 * 2 - 5 },
    { id: "msg-3",  convId: "conv-1", senderId: "u-admin",  body: "بله، همه چی رو هومن چک کرده. فقط پهپاد رو خودت تست بزن.", minsAgo: 60 * 24 * 2 - 8 },
    { id: "msg-4",  convId: "conv-1", senderId: "u-photo",  body: "👍 اوکی.", minsAgo: 60 * 24 * 2 - 10, replyToId: "msg-3" },
    { id: "msg-5",  convId: "conv-1", senderId: "u-admin",  body: "عالی. موفق باشی 🌹", minsAgo: 60 * 24 * 2 - 12 },
    { id: "msg-6",  convId: "conv-1", senderId: "u-photo",  body: "تشکر. گزارش رو شب می‌فرستم.", minsAgo: 60 * 12 },

    // conv-2: manager ↔ editor (Sina)
    { id: "msg-7",  convId: "conv-2", senderId: "u-manager",body: "سینا، تدوین پروژه آرشام کجاست؟ مشتری منتظره.", minsAgo: 60 * 30 },
    { id: "msg-8",  convId: "conv-2", senderId: "u-editor", body: "سلام دارا خانم. پیش‌نویس آماده‌ست، گرید نهایی موند.", minsAgo: 60 * 28 },
    { id: "msg-9",  convId: "conv-2", senderId: "u-manager",body: "تا کی تحویل می‌دی؟", minsAgo: 60 * 27 },
    { id: "msg-10", convId: "conv-2", senderId: "u-editor", body: "فردا ظهر آماده میشه.", minsAgo: 60 * 26, replyToId: "msg-9" },
    { id: "msg-11", convId: "conv-2", senderId: "u-manager",body: "👍 ممنون.", minsAgo: 60 * 25 },

    // conv-3: group "تیم آتلیه نسیم"
    { id: "msg-12", convId: "conv-3", senderId: "u-admin",  body: "سلام تیم. جلسه هفتگی شنبه ساعت ۱۰ صبح.", minsAgo: 60 * 50 },
    { id: "msg-13", convId: "conv-3", senderId: "u-photo",  body: "حاضر میام.", minsAgo: 60 * 49 },
    { id: "msg-14", convId: "conv-3", senderId: "u-photo2", body: "من هم میام. 🌹", minsAgo: 60 * 49 },
    { id: "msg-15", convId: "conv-3", senderId: "u-editor", body: "موضوع جلسه چیه؟", minsAgo: 60 * 48 },
    { id: "msg-16", convId: "conv-3", senderId: "u-manager",body: "بررسی پروژه‌های هفته و وضعیت پرداخت‌ها.", minsAgo: 60 * 47, replyToId: "msg-15" },
    { id: "msg-17", convId: "conv-3", senderId: "u-qc",     body: "پروژه pr-6 آماده QC شد.", minsAgo: 60 * 20 },
    { id: "msg-18", convId: "conv-3", senderId: "u-admin",  body: "عالی رکسانا. فردا چک می‌کنیم.", minsAgo: 60 * 19 },
    { id: "msg-19", convId: "conv-3", senderId: "u-logistics",body: "آلبوم pr-1 تحویل داده شد. ✅", minsAgo: 60 * 18 },
    { id: "msg-20", convId: "conv-3", senderId: "u-photo",  body: "🔥🔥🔥", minsAgo: 60 * 17 },
    { id: "msg-21", convId: "conv-3", senderId: "u-photo2", body: "آیا کسی تجهیزات رو برگردونده؟", minsAgo: 60 * 5 },
    { id: "msg-22", convId: "conv-3", senderId: "u-photo",  body: "بله، من برگردوندم.", minsAgo: 60 * 4 },
    { id: "msg-23", convId: "conv-3", senderId: "u-manager",body: "ممنون کیان. 👏", minsAgo: 60 * 3 },
    { id: "msg-24", convId: "conv-3", senderId: "u-editor", body: "کسی فایل‌های پروژه آرشام رو می‌بینه؟ ساختم مشکل داره.", minsAgo: 60 * 2 },
    { id: "msg-25", convId: "conv-3", senderId: "u-admin",  body: "من چک می‌کنم. صبر کن.", minsAgo: 60 * 1 },

    // conv-4: group "پروژه عروسی تارا و فرزان"
    { id: "msg-26", convId: "conv-4", senderId: "u-manager",body: "تیم، عروسی تارا و فرzan امروز شروع شد. هماهنگی‌ها رو نگه دارید.", minsAgo: 60 * 36 },
    { id: "msg-27", convId: "conv-4", senderId: "u-photo",  body: "من عکاسی مراسم رو برعهده‌ام.", minsAgo: 60 * 35 },
    { id: "msg-28", convId: "conv-4", senderId: "u-photo2", body: "من فیلم‌برداری با گیمبال.", minsAgo: 60 * 35 },
    { id: "msg-29", convId: "conv-4", senderId: "u-editor", body: "فایل‌ها رو همون شب آپلود کنید.", minsAgo: 60 * 34 },
    { id: "msg-30", convId: "conv-4", senderId: "u-photo",  body: "اوکی. 📸", minsAgo: 60 * 33 },
    { id: "msg-31", convId: "conv-4", senderId: "u-photo2", body: "تغییر لوکیشن داریم؟", minsAgo: 60 * 12 },
    { id: "msg-32", convId: "conv-4", senderId: "u-manager",body: "نه، تالار همون هتل پارسیانه.", minsAgo: 60 * 11 },
    { id: "msg-33", convId: "conv-4", senderId: "u-photo",  body: "عالی. ✅", minsAgo: 60 * 10 },

    // conv-5: admin ↔ sales (Parsa)
    { id: "msg-34", convId: "conv-5", senderId: "u-sales",  body: "آریا، مشتری جدید تماس گرفت برای پورتره.", minsAgo: 60 * 8 },
    { id: "msg-35", convId: "conv-5", senderId: "u-admin",  body: "خوبه. مشخصات رو بفرست.", minsAgo: 60 * 7 },
    { id: "msg-36", convId: "conv-5", senderId: "u-sales",  body: "اسم: سپهر موحد. تلفن: 09120000017. از یزد تماس گرفته.", minsAgo: 60 * 6 },
    { id: "msg-37", convId: "conv-5", senderId: "u-admin",  body: "ممنون پارسا. ثبتش کن.", minsAgo: 60 * 5 },
    { id: "msg-38", convId: "conv-5", senderId: "u-sales",  body: "👍", minsAgo: 60 * 4 },
  ]
  for (const m of messages) {
    await db.message.create({
      data: {
        id: m.id,
        conversationId: m.convId,
        senderId: muId(m.senderId),
        senderName: userName(m.senderId),
        body: m.body,
        mentions: "[]",
        attachments: JSON.stringify(m.attachments ?? []),
        replyToId: m.replyToId ?? null,
        createdAt: new Date(now.getTime() - m.minsAgo * 60000),
      },
    })
  }

  // ---------- Message Reactions ----------
  const reactions = [
    { id: "mr-1", messageId: "msg-3",  userId: "u-photo",  emoji: "👍" },
    { id: "mr-2", messageId: "msg-4",  userId: "u-admin",  emoji: "❤️" },
    { id: "mr-3", messageId: "msg-19", userId: "u-admin",  emoji: "🔥" },
    { id: "mr-4", messageId: "msg-19", userId: "u-photo",  emoji: "🎉" },
    { id: "mr-5", messageId: "msg-19", userId: "u-photo2", emoji: "👍" },
    { id: "mr-6", messageId: "msg-22", userId: "u-manager",emoji: "👍" },
    { id: "mr-7", messageId: "msg-23", userId: "u-photo",  emoji: "❤️" },
    { id: "mr-8", messageId: "msg-30", userId: "u-editor", emoji: "🔥" },
    { id: "mr-9", messageId: "msg-33", userId: "u-manager",emoji: "👍" },
  ]
  for (const r of reactions) {
    await db.messageReaction.create({
      data: { ...r, userId: muId(r.userId), userName: userName(r.userId), createdAt: new Date(now.getTime() - 60 * 60000) },
    })
  }

  // ---------- USER NOTES (mix of note + todo, per user) ----------
  console.log("• User notes…")
  const userNotes = [
    { id: "un-1", userId: "u-admin",   title: "کارهای امروز",         kind: "todo", body: "", items: JSON.stringify([{ text: "تماس با مشتری pr-4", done: true }, { text: "بررسی گزارش فروش", done: false }, { text: "جلسه با تیم ۱۰ صبح", done: false }]), pinned: true, color: "#ef4444" },
    { id: "un-2", userId: "u-admin",   title: "ایده‌های تبلیغاتی",     kind: "note", body: "۱. کمپین اینستاگرام با هشتگ عروسی\n۲. همکاری با وندینگ‌های هتل\n۳. معرفی دوستان با تخفیف" },
    { id: "un-3", userId: "u-manager", title: "پیگیری پرداخت‌ها",     kind: "todo", body: "", items: JSON.stringify([{ text: "pr-3 - ۳۶۰ میلیون", done: false }, { text: "pr-8 - ۳۰۰ میلیون", done: false }]) },
    { id: "un-4", userId: "u-manager", title: "یادداشت جلسه شنبه",    kind: "note", body: "موضوع: بررسی پروژه‌های هفته\nحضور: همه اعضا\nتصمیمات: ۱. کنترل کیفیت باید سریع‌تر بشه\n۲. تجهیزات جدید نیاز داریم" },
    { id: "un-5", userId: "u-photo",   title: "چک‌لیست قبل از عروسی", kind: "todo", body: "", items: JSON.stringify([{ text: "شارژ باتری‌ها", done: true }, { text: "فرمت کارت حافظه", done: true }, { text: "تست لنزها", done: false }, { text: "بک‌آپ تنظیمات دوربین", done: false }]), pinned: true },
    { id: "un-6", userId: "u-photo",   title: "ایده‌های پوزیشن عکاسی", kind: "note", body: "۱. عکس از بالا با پهپاد\n۲. عکس‌های کاندید در مهمانی\n۳. پورتره زوج در غروب" },
    { id: "un-7", userId: "u-editor",  title: "پروژه‌های در دست تدوین",kind: "todo", body: "", items: JSON.stringify([{ text: "pr-3 - آرشام (ادیت نهایی)", done: false }, { text: "pr-11 - موزیک ویدیو (گرید)", done: false }, { text: "pr-13 - پورتره یزد", done: false }]) },
    { id: "un-8", userId: "u-sales",   title: "مشتریان جدید هفته",   kind: "todo", body: "", items: JSON.stringify([{ text: "سپهر موحد - پورتره", done: false }, { text: "آژانس پرشین - شرکتی", done: true }]) },
    { id: "un-9", userId: "u-qc",      title: "موارد کنترل کیفیت",    kind: "note", body: "مواردی که باید چک بشه:\n۱. تطبیق رنگ عکس‌ها\n۲. کیفیت صدای فیلم\n۳. رزولوشن خروجی\n۴. تایید مشتری" },
  ]
  for (const n of userNotes) {
    await db.userNote.create({
      data: {
        id: n.id,
        userId: n.userId,
        title: n.title,
        body: n.body ?? "",
        kind: n.kind,
        items: n.items ?? "[]",
        attachments: "[]",
        color: n.color ?? "",
        pinned: n.pinned ?? false,
        createdAt: days(-3),
        updatedAt: days(-1),
      },
    })
  }

  // ---------- REMINDERS (mix of upcoming, past, done) ----------
  console.log("• Reminders…")
  const reminders = [
    { id: "rm-1", userId: "u-admin",   title: "تماس با مشتری pr-4",        note: "تارا و فرzan - تسویه حساب", dueAt: hrs(2),  done: false, linkType: "project", linkId: "pr-4" },
    { id: "rm-2", userId: "u-admin",   title: "جلسه با تیم",                note: "شنبه ساعت ۱۰",                dueAt: days(2),  done: false },
    { id: "rm-3", userId: "u-manager", title: "پیگیری پرداخت pr-3",        note: "آرشام - ۳۶۰ میلیون",          dueAt: days(-1), done: false, linkType: "project", linkId: "pr-3" },
    { id: "rm-4", userId: "u-manager", title: "تماس با کافه دوران",         note: "برای رویداد سالگرد",          dueAt: days(5),  done: false, linkType: "customer", linkId: "c-5" },
    { id: "rm-5", userId: "u-photo",   title: "آماده‌سازی تجهیزات عروسی",   note: "pr-5 فردا",                  dueAt: hrs(-3), done: true,  linkType: "project", linkId: "pr-5" },
    { id: "rm-6", userId: "u-editor",  title: "تحویل تدوین pr-3",          note: "فردا ظهر",                    dueAt: days(1),  done: false, linkType: "project", linkId: "pr-3" },
    { id: "rm-7", userId: "u-qc",      title: "کنترل کیفیت pr-18",         note: "آژانس پرشین",                 dueAt: days(3),  done: false, linkType: "project", linkId: "pr-18" },
    { id: "rm-8", userId: "u-sales",   title: "پیگیری مشتری جدید",         note: "سپهر موحد - یزد",             dueAt: hrs(24), done: false, linkType: "customer", linkId: "c-17" },
    { id: "rm-9", userId: "u-admin",   title: "بازگشت آلبوم pr-1",         note: "تحویل داده شد ✅",            dueAt: days(-2), done: true,  linkType: "project", linkId: "pr-1" },
  ]
  for (const r of reminders) {
    await db.reminder.create({
      data: {
        id: r.id, userId: r.userId, title: r.title, note: r.note,
        dueAt: r.dueAt, done: r.done, acknowledged: r.done,
        linkType: r.linkType ?? null, linkId: r.linkId ?? null, linkCheckmarks: "{}",
      },
    })
  }

  // ---------- NOTIFICATIONS (per user, mix of read/unread) ----------
  console.log("• Notifications…")
  const notifs = [
    { id: "n-1",  userId: "u-admin",   type: "info",              title: "پروژه آماده تحویل",      message: "عروسی دلاکس (لیلا و هومن) آماده تحویل است.",        read: false, link: "projects",     createdAt: hrs(-2) },
    { id: "n-2",  userId: "u-admin",   type: "payment_approval",  title: "تایید پرداخت",          message: "پرداخت ۴۰۰ میلیون از تارا و فرzan.",                read: false, link: "finance",     requiresAction: true, actionLabel: "تایید/رد", refId: "pr-4", createdAt: hrs(-1) },
    { id: "n-3",  userId: "u-admin",   type: "reminder",          title: "درخواست مرخصی",         message: "مهسا فراهانی درخواست مرخصی ۴ روزه داده.",            read: false, link: "settings-leaves", createdAt: hrs(-5) },
    { id: "n-4",  userId: "u-admin",   type: "info",              title: "پرداخت تایید شد",       message: "تسویه ۹۲۰ میلیون پروژه pr-1 تایید شد.",             read: true,  link: "finance",     createdAt: days(-1) },
    { id: "n-5",  userId: "u-manager", type: "info",              title: "پروژه جدید",            message: "پروژه pr-5 (کافه دوران) ایجاد شد.",                 read: false, link: "projects",    createdAt: days(-2) },
    { id: "n-6",  userId: "u-manager", type: "reminder",          title: "یادآوری جلسه",          message: "جلسه هفتگی شنبه ساعت ۱۰.",                            read: false, link: "calendar",    createdAt: hrs(-3) },
    { id: "n-7",  userId: "u-photo",   type: "info",              title: "تسک جدید",              message: "شما به عنوان عکاس به pr-4 اختصاص داده شدید.",         read: false, link: "projects",    refId: "pr-4", createdAt: hrs(-8) },
    { id: "n-8",  userId: "u-photo",   type: "sms",               title: "پیامک ارسال شد",        message: "یادآوری جلسه به مشتری ارسال شد.",                    read: true,  createdAt: days(-1) },
    { id: "n-9",  userId: "u-editor",  type: "info",              title: "فایل‌های جدید",         message: "فایل‌های pr-3 آپلود شدند. آماده ادیت.",              read: false, link: "projects",    refId: "pr-3", createdAt: hrs(-12) },
    { id: "n-10", userId: "u-qc",      type: "info",              title: "آماده QC",              message: "پروژه pr-6 آماده کنترل کیفیت است.",                  read: false, link: "projects",    refId: "pr-6", createdAt: hrs(-4) },
    { id: "n-11", userId: "u-logistics",type: "info",             title: "تحویل برنامه‌ریزی شده", message: "pr-1 برای فردا تحویل برنامه‌ریزی شده.",              read: false, link: "projects",    refId: "pr-1", createdAt: hrs(-6) },
    { id: "n-12", userId: "u-sales",   type: "info",              title: "مشتری جدید",            message: "سپهر موحد ثبت شد.",                                  read: false, link: "customers",   createdAt: days(-2) },
  ]
  for (const n of notifs) {
    await db.notification.create({ data: n })
  }

  // ---------- KANBAN COLUMNS + CARDS (for each user) ----------
  console.log("• Kanban columns + cards…")
  const kanbanColumns = [
    { id: "kc-admin-1", userId: "u-admin",   title: "در صف",      color: "#64748b", order: 0 },
    { id: "kc-admin-2", userId: "u-admin",   title: "در حال انجام",color: "#3b82f6", order: 1 },
    { id: "kc-admin-3", userId: "u-admin",   title: "انجام شد",    color: "#22c55e", order: 2 },
    { id: "kc-mgr-1",  userId: "u-manager", title: "در صف",      color: "#64748b", order: 0 },
    { id: "kc-mgr-2",  userId: "u-manager", title: "در حال انجام",color: "#3b82f6", order: 1 },
    { id: "kc-mgr-3",  userId: "u-manager", title: "انجام شد",    color: "#22c55e", order: 2 },
    { id: "kc-ph-1",   userId: "u-photo",   title: "در صف",      color: "#64748b", order: 0 },
    { id: "kc-ph-2",   userId: "u-photo",   title: "در حال انجام",color: "#3b82f6", order: 1 },
    { id: "kc-ph-3",   userId: "u-photo",   title: "انجام شد",    color: "#22c55e", order: 2 },
    { id: "kc-ed-1",   userId: "u-editor",  title: "در صف",      color: "#64748b", order: 0 },
    { id: "kc-ed-2",   userId: "u-editor",  title: "در حال انجام",color: "#3b82f6", order: 1 },
    { id: "kc-ed-3",   userId: "u-editor",  title: "انجام شد",    color: "#22c55e", order: 2 },
  ]
  for (const c of kanbanColumns) {
    await db.kanbanColumn.create({ data: c })
  }
  const kanbanCards = [
    { id: "kcard-1",  userId: "u-admin",   columnId: "kc-admin-2", title: "تماس با تارا و فرzan",     description: "برای تسویه حساب",           order: 0, priority: "high",   dueDate: hrs(2),   linkType: "project", linkId: "pr-4", sourceProjectId: "pr-4" },
    { id: "kcard-2",  userId: "u-admin",   columnId: "kc-admin-1", title: "بازبینی گزارش مالی",        description: "بررسی پرداخت‌های هفته",      order: 0, priority: "medium", dueDate: days(1) },
    { id: "kcard-3",  userId: "u-admin",   columnId: "kc-admin-3", title: "تایید پرداخت pr-1",         description: "",                         order: 0, priority: "low",    completed: true,  sourceProjectId: "pr-1" },
    { id: "kcard-4",  userId: "u-manager", columnId: "kc-mgr-2",   title: "پیگیری pr-3",                description: "آرشام - ۳۶۰ میلیون",        order: 0, priority: "high",   dueDate: days(-1), linkType: "project", linkId: "pr-3", sourceProjectId: "pr-3" },
    { id: "kcard-5",  userId: "u-manager", columnId: "kc-mgr-1",   title: "برنامه‌ریزی رویداد کافه دوران",description: "pr-5",                       order: 0, priority: "medium", dueDate: days(3),  linkType: "project", linkId: "pr-5", sourceProjectId: "pr-5" },
    { id: "kcard-6",  userId: "u-photo",   columnId: "kc-ph-2",    title: "عکاسی pr-4 امروز",          description: "عروسی تارا و فرzan",        order: 0, priority: "high",   dueDate: hrs(2),   linkType: "project", linkId: "pr-4", sourceProjectId: "pr-4" },
    { id: "kcard-7",  userId: "u-photo",   columnId: "kc-ph-1",    title: "آماده‌سازی تجهیزات pr-5",   description: "",                         order: 0, priority: "medium", dueDate: days(2),  linkType: "project", linkId: "pr-5", sourceProjectId: "pr-5" },
    { id: "kcard-8",  userId: "u-photo",   columnId: "kc-ph-3",    title: "عکاسی pr-1 انجام شد",       description: "",                         order: 0, priority: "low",    completed: true,  sourceProjectId: "pr-1" },
    { id: "kcard-9",  userId: "u-editor",  columnId: "kc-ed-2",    title: "تدوین pr-3",                 description: "آرشام - ادیت نهایی",        order: 0, priority: "high",   dueDate: days(1),  linkType: "project", linkId: "pr-3", sourceProjectId: "pr-3" },
    { id: "kcard-10", userId: "u-editor",  columnId: "kc-ed-1",    title: "گرید رنگ pr-11",             description: "موزیک ویدیو",               order: 0, priority: "medium", dueDate: days(4),  linkType: "project", linkId: "pr-11", sourceProjectId: "pr-11" },
    { id: "kcard-11", userId: "u-editor",  columnId: "kc-ed-3",    title: "ادیت pr-7 تحویل شد",         description: "",                         order: 0, priority: "low",    completed: true,  sourceProjectId: "pr-7" },
  ]
  for (const c of kanbanCards) {
    await db.kanbanCard.create({ data: c })
  }

  console.log("✅ Studio seed complete.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })

