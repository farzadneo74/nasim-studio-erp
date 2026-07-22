# NASIM Studio ERP — سند کامل انتقال پروژه

> این فایل برای انتقال کامل دانش پروژه به یک چت جدید نوشته شده است. هر آنچه برای ادامه توسعه نیاز دارید در این فایل آمده است.

---

## ۱. معرفی کلی پروژه

**NASIM Studio ERP** یک سامانه مدیریت استودیو عکاسی و فیلم‌برداری است. این نرم‌افزار یک SaaS چند مستاجره (multi-tenant) است که به چندین استودیو اجازه می‌دهد در یک نصب، به صورت ایزوله کار کنند.

### مشخصات اصلی
- **نام پروژه**: NASIM Studio ERP (نسیم استودیو)
- **نوع**: Multi-tenant SaaS برای استودیوهای عکاسی
- **زبان UI**: فارسی (RTL)
- **تقویم**: شمسی (Jalali)
- **کاربران هدف**: استودیوهای عکاسی عروس، آتلیه‌ها، شرکت‌های فیلم‌برداری

---

## ۲. تکنولوژی‌ها و استک

### Backend
- **Framework**: Next.js 16.1.1 با App Router
- **Language**: TypeScript 5 (strict)
- **Runtime**: Bun (به جای Node.js)
- **Database ORM**: Prisma 6.11
- **Database**: SQLite (هر استودیو یک فایل `.db` جداگانه)
- **Authentication**: OTP + Password (bcrypt) + Session Token
- **Real-time**: Socket.io (mini-service جداگانه روی پورت 3003)
- **AI SDK**: z-ai-web-dev-sdk (فقط در backend)

### Frontend
- **Framework**: React 19
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (New York style) با Lucide icons
- **State Management**:
  - Zustand (client state)
  - TanStack Query v5 (server state)
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Date**: react-multi-date-picker + jalaali-js (تقویم شمسی)
- **Theme**: next-themes (dark/light mode)

### ساختار دیتابیس (Multi-Tenant)
- **Master DB** (`db/master.db`): کنترل پلن SaaS — کاربران مرکزی، استودیوها، عضویت‌ها، نشست‌ها، OTP
- **Studio DB** (`db/studio-{name}.db`): دیتابیس اختصاصی هر استودیو — تمام داده‌های کسب‌وکار

### پکیج‌های کلیدی
```
next@16.1.1, react@19, prisma@6.11, @prisma/client@6.11
zustand@5, @tanstack/react-query@5
tailwindcss@4, tailwind-merge, class-variance-authority
framer-motion, recharts, react-multi-date-picker, jalaali-js
bcryptjs, socket.io-client, lucide-react
sonner (toast), cmdk (command palette), vaul (drawer)
z-ai-web-dev-sdk (AI skills: LLM, VLM, TTS, ASR, image-gen)
```

---

## ۳. ساختار پوشه‌ها

```
my-project/
├── src/
│   ├── app/
│   │   ├── api/                    # API routes (36 endpoint)
│   │   │   ├── auth/               # OTP, login, logout, session
│   │   │   ├── users/              # CRUD + permissions
│   │   │   ├── customers/          # CRUD + notes + projects
│   │   │   ├── projects/           # CRUD + tasks + notes + workflow + status
│   │   │   ├── packages/           # ServicePackage CRUD
│   │   │   ├── payments/           # Payment recording
│   │   │   ├── salaries/           # Salary calculation + records
│   │   │   ├── messages/           # Chat conversations
│   │   │   ├── permissions/        # /me endpoint
│   │   │   ├── role-permissions/   # Studio-level role overrides
│   │   │   ├── attachments/        # File upload/management
│   │   │   ├── calendar/           # Calendar events
│   │   │   ├── dashboard/          # Dashboard stats
│   │   │   ├── reports/            # Reports data
│   │   │   ├── reminders/          # User reminders
│   │   │   ├── notifications/      # In-app notifications
│   │   │   ├── kanban/             # Personal kanban board
│   │   │   ├── custom-fields/      # Dynamic customer fields
│   │   │   ├── print-photo-prices/ # Print photo pricing
│   │   │   ├── salary-rules/       # Salary commission rules
│   │   │   ├── sms-automations/    # SMS automation rules
│   │   │   ├── sms-templates/      # SMS templates
│   │   │   ├── expenses/           # Studio expenses
│   │   │   ├── holidays/           # Iranian holidays
│   │   │   ├── cities/             # City presets
│   │   │   ├── tags/               # Customer tags
│   │   │   ├── referral-codes/     # QR referral codes
│   │   │   ├── qr-templates/       # QR template presets
│   │   │   ├── leaves/             # Leave requests
│   │   │   ├── my-tasks/           # Tasks assigned to me
│   │   │   ├── studio-name/        # Studio settings
│   │   │   ├── system/             # System settings (logo, SMS config, contracts)
│   │   │   ├── user-notes/         # Dashboard notes (iPhone Notes-like)
│   │   │   ├── credit-transactions/ # Customer credit transactions
│   │   │   └── reminder-settings/  # Reminder config
│   │   ├── layout.tsx              # Root layout (RTL, fonts, ThemeProvider)
│   │   └── page.tsx                # Main app entry (login + workspace)
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn/ui (30+ components)
│   │   ├── views/                  # Main views (29 view file)
│   │   │   ├── dashboard-view.tsx          # داشبورد اصلی
│   │   │   ├── customers-view.tsx          # مدیریت مشتریان (~4000 lines)
│   │   │   ├── projects-view.tsx           # مدیریت پروژه‌ها (~5500 lines)
│   │   │   ├── calendar-view.tsx           # تقویم
│   │   │   ├── messages-view.tsx           # پیام‌رسان داخلی
│   │   │   ├── finances-view.tsx           # بخش مالی
│   │   │   ├── reports-view.tsx            # گزارش‌ها
│   │   │   ├── my-tasks-view.tsx           # کارهای من
│   │   │   ├── qr-factory-view.tsx         # کارخانه QR
│   │   │   ├── scanner-view.tsx            # اسکنر کد
│   │   │   ├── login-view.tsx              # صفحه ورود
│   │   │   ├── settings-employees-view.tsx # کارمندان + حقوق + دسترسی
│   │   │   ├── settings-packages-view.tsx  # پکیج‌ها
│   │   │   ├── settings-system-view.tsx    # تنظیمات سیستم
│   │   │   ├── settings-users-view.tsx     # (legacy - employees جایگزین)
│   │   │   ├── settings-salary-rules-view.tsx
│   │   │   ├── settings-leaves-view.tsx
│   │   │   ├── settings-tags-view.tsx
│   │   │   ├── settings-print-photo-prices-view.tsx
│   │   │   ├── settings-sms-templates-view.tsx
│   │   │   ├── settings-custom-fields-view.tsx
│   │   │   ├── storage-management-view.tsx
│   │   │   ├── _custom-fields/             # Dynamic field components
│   │   │   ├── _jalali-date-picker/        # Persian date picker
│   │   │   ├── _time-wheel-picker/         # Time picker
│   │   │   ├── _toman-input.tsx            # Currency input (Toman)
│   │   │   ├── _dashboard-widgets.tsx      # Dashboard widget components
│   │   │   ├── _dashboard-reorder.tsx      # Drag-drop dashboard reorder
│   │   │   └── _shared.tsx                 # Shared view helpers
│   │   └── workspace/
│   │       ├── sidebar.tsx                 # Main sidebar with permission filtering
│   │       ├── topbar.tsx                  # Top bar (role switcher, theme, notifications)
│   │       ├── view-router.tsx             # View registry + router
│   │       ├── notifications-panel.tsx     # Notifications slide-over
│   │       └── command-palette.tsx         # Cmd+K search
│   │
│   ├── lib/
│   │   ├── constants.ts            # نقش‌ها، دسترسی‌ها، enum‌ها، workflow
│   │   ├── auth.ts                 # OTP, session, login
│   │   ├── auth-helpers.ts         # Permission helpers, studio DB resolver
│   │   ├── auth-context.tsx        # Client-side auth context
│   │   ├── db.ts                   # Default studio DB (singleton)
│   │   ├── master-db.ts            # Master DB client
│   │   ├── studio-db.ts            # Studio DB resolver (by dbName)
│   │   ├── pricing.ts              # Price calculation logic
│   │   ├── jalali.ts               # Persian calendar utilities
│   │   ├── format.ts               # Persian number formatting
│   │   ├── utils.ts                # cn(), formatters
│   │   ├── notify.ts               # In-app notification creator
│   │   ├── chat-ws.ts              # Socket.io client
│   │   ├── upload-handler.ts       # File upload utility
│   │   ├── attachment-service.ts   # Attachment management
│   │   ├── attachments.ts          # Attachment helpers
│   │   ├── hooks/                  # React hooks (use-permissions, etc.)
│   │   ├── api/                    # API client
│   │   │   └── client.ts           # useApi() hook (auto auth headers)
│   │   ├── holidays/               # Iranian holidays data
│   │   └── reminders/              # Reminder utilities
│   │
│   ├── stores/
│   │   └── workspace.ts            # Zustand store (activePage, role, sidebar)
│   │
│   └── generated/
│       └── master-client/          # Prisma client for master DB (generated)
│
├── prisma/
│   ├── schema.prisma               # Studio DB schema (45 models)
│   ├── schema-master.prisma        # Master DB schema (5 models)
│   ├── seed.ts                     # Studio seed data
│   └── seed-master.ts              # Master seed data
│
├── mini-services/
│   └── chat-ws/                    # Socket.io chat service (port 3003)
│       ├── index.ts                # Entry point
│       ├── package.json
│       └── tsconfig.json
│
├── db/                             # SQLite database files (NOT in ZIP)
│   ├── master.db                   # Master DB
│   ├── studio-demo.db              # Demo studio
│   ├── studio-2.db                 # Second studio
│   └── custom.db                   # Active studio (symlink/copy)
│
├── storage/                        # File uploads (NOT in ZIP)
│   └── studios/{studioId}/{category}/
│
├── download/                       # ZIP files for delivery
│   ├── clean-start.bat             # Cache cleaner script
│   └── FARZAD_YYYY-MM-DD_HH-MM.zip # Delivered ZIPs
│
├── public/                         # Static assets
├── Caddyfile                       # Gateway config (port routing)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── eslint.config.mjs
└── .env                            # DATABASE_URL
```

---

## ۴. سیستم نقش‌ها و دسترسی‌ها (مهم)

### ۸ نقش اصلی
```typescript
// src/lib/constants.ts
export const ROLES = [
  "admin",        // مدیر کل — دسترسی کامل
  "manager",      // مدیر — همه‌چیز به جز تنظیمات سیستم
  "sales",        // فروش — مشتریان + پروژه‌ها (بدون جزئیات مالی)
  "photographer", // عکاس — فقط پروژه‌های خودش
  "videographer", // تصویربردار — فقط پروژه‌های خودش
  "pro_crew",     // کادر حرفه‌ای — فقط پروژه‌های خودش (چند نقشه‌ای)
  "editor",       // ادیتور — فقط پروژه‌های خودش
  "film_editor",  // تدوین‌کار — فقط پروژه‌های خودش
] as const
```

### مهاجرت نقش‌های قدیمی
```typescript
export const LEGACY_ROLE_MIGRATION = {
  qc: "editor",         // qc → editor
  logistics: "pro_crew", // logistics → pro_crew
}
export function migrateRole(role: string): Role { ... }
```

### سیستم دسترسی قابل توسعه
```typescript
// 28 کلید دسترسی
export const PERMISSION_KEYS = [
  "dashboard", "calendar", "reports",
  "customers", "customers_create", "customers_edit",
  "projects", "projects_create", "projects_edit", "projects_workflow", "projects_financials",
  "my_tasks", "messages",
  "finances", "finances_full",
  "qr_factory", "scanner",
  "packages", "packages_manage",
  "tags", "print_photo_prices",
  "employees", "employees_manage", "salary_rules",
  "sms_templates", "custom_fields",
  "system", "storage",
] as const

// دسترسی پیش‌فرض هر نقش
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Set<PermissionKey>> = { ... }

// بررسی دسترسی (فقط پیش‌فرض نقش)
export function hasPermission(role: string, perm: PermissionKey): boolean

// بررسی دسترسی (با override کاربر)
export function hasUserPermission(role, perm, userPermissionsJson): boolean
```

### ۳ لایه دسترسی
1. **DEFAULT_ROLE_PERMISSIONS** — پیش‌فرض هر نقش (در `constants.ts`)
2. **RolePermission table** — override سطح استودیو (مدیر استودیو تعیین می‌کند)
3. **User.permissions JSON** — override هر کاربر (`{ overrides: { permKey: bool } }`)

اولویت: per-user > studio-role > default

### API endpoints دسترسی
- `GET /api/permissions/me` — دسترسی‌های کاربر فعلی
- `GET /api/role-permissions` — همه overrideهای استودیو
- `PUT /api/role-permissions` — upsert override (admin only)
- `GET /api/users/[id]/permissions` — پروفایل دسترسی کاربر
- `PUT /api/users/[id]/permissions` — آپدیت override کاربر (manager can't grant perms they don't have)

### helpers مهم
```typescript
// src/lib/auth-helpers.ts
- getCurrentRole()
- getCurrentStudioDb()
- getCurrentStudioUserId()  // تطبیق با phone، fallback با role
- resolveCurrentUserPermissions()  // { role, effective, userOverrides }
- currentUserHasPermission(perm)
- currentUserHasAnyPermission(perms[])
- currentUserHasAllPermissions(perms[])
- requirePermission(perm)  // throw if missing
- canManageUser(targetUserId)  // admin یا manager با employees_manage
- isTechnicalRole(role)  // 5 نقش فنی
- isManagementRole(role)  // admin یا manager
```

---

## ۵. احراز هویت (Authentication)

### روش ورود
1. **OTP**: شماره موبایل → ارسال کد ۶ رقمی → تایید → ایجاد نشست
2. **Password**: شماره + رمز عبور (bcrypt)
3. **Session**: token در cookie + localStorage (`nasim-session-token`)

### جریان
```
POST /api/auth/otp/send → { phone } → returns demoCode (در dev)
POST /api/auth/otp/verify → { phone, code, remember } → returns { sessionToken, user, studios, currentStudioId, currentRole }
POST /api/auth/login → { phone, password } → same as above
POST /api/auth/select-studio → { studioId } → sets session.studioId
POST /api/auth/logout → clears session
GET /api/auth/me → { user, currentRole, currentStudioId }
```

### نکات مهم
- در محیط preview iframe، cookieها کار نمی‌کنند → باید `Authorization: Bearer <token>` header ارسال شود
- `useApi()` hook در `src/lib/api/client.ts` به طور خودکار این header را اضافه می‌کند
- demo mode: header `x-demo-role: <role>` برای تست نقش‌های مختلف

---

## ۶. مدل‌های داده Prisma (45 مدل)

### مدل‌های اصلی
- **User** — کارمند استودیو (نقش، حقوق، دسترسی، اطلاعات بانکی)
- **RolePermission** — override دسترسی سطح استودیو
- **Customer** — مشتری (نوع حقیقی/حقوقی، تلفن، اینستاگرام، اعتبار)
- **CustomerNote** — یادداشت مشتری با ضمیمه
- **Tag** — تگ مشتری
- **ReferralCode** — کد معرفی QR
- **Referral** — رابطه معرفی
- **CreditTransaction** — تراکنش اعتبار مشتری
- **ServicePackage** — پکیج خدمات (عکس/فیلم/میکس)
- **PrintPhotoPrice** — قیمت عکس چاپی (سایز، کاغذ، لمینیت)
- **ProjectPrintPhoto** — عکس‌های چاپی پروژه
- **Contract** — قرارداد
- **Project** — پروژه (مالی، وضعیت، تیم)
- **Task** — تسک پروژه
- **ProjectNote** — یادداشت پروژه
- **Payment** — پرداخت
- **Expense** — هزینه
- **ProjectWorkflow** — گردش کار دو‌مسیره (photo/video)
- **RolePrice** — قیمت نقش‌ها (تیم، نقش، سطح)
- **SalaryRule** — قانون حقوق
- **SalaryRecord** — رکورد حقوق
- **Invoice** — فاکتور

### سیستم
- **SMSTemplate**, **SmsAutomation**, **ProjectSmsAssignment** — پیامک خودکار
- **SystemSetting** — تنظیمات key-value
- **Notification** — اعلان درون‌برنامه‌ای
- **Reminder** — یادآور کاربر
- **UserNote** — یادداشت داشبورد (مثل Apple Notes)
- **City** — شهرهای پیش‌فرض
- **QrTemplate** — قالب QR
- **Holiday** — تعطیلات ایرانی
- **KanbanColumn**, **KanbanCard** — کانبان شخصی

### پیام‌رسان
- **Conversation**, **ConversationParticipant**, **Message**, **MessageReaction**

### فیلدهای پویا
- **CustomField**, **CustomFieldValue**

### مدیریت فایل
- **Attachment** — فایل مرکزی (با soft-delete)
- **StorageUsage** — کش مصرف فضا
- **RetentionPolicy** — سیاست نگهداری
- **AttachmentAuditLog** — لاگ ممیزی

### نکات اسکما
- همه enum‌ها به صورت String ذخیره می‌شوند (SQLite محدودیت)
- فیلدهای JSON به صورت String با default `"{}"` یا `"[]"`
- Decimal برای مبالغ مالی (Rials)
- relations با `onDelete: Cascade` برای پاک کردن آبشاری

---

## ۷. گردش کار پروژه (Workflow)

### ۸ وضعیت پروژه
```
scheduled → running → managing → editing → qc → render → ready → delivered
زمان‌بندی    اجرا      مدیریت     ادیت       کنترل   رندر   آماده   تحویل
```

### سیستم دو‌مسیره (Dual-Track)
بر اساس دسته‌بندی پکیج:
- `photo` → فقط مسیر عکس
- `video` → فقط مسیر فیلم
- `mix` → هر دو مسیر مستقل

هر مسیر به طور مستقل پیش می‌رود. وضعیت کلی پروژه = مسیر عقب‌مانده.

### مراحل خودکار vs دستی
- `scheduled → running`: خودکار (وقتی startDatetime نزدیک است)
- `running → managing`: خودکار (وقتی endDatetime گذشت)
- بقیه: دستی (assignee تیک می‌زند → auto-advance)
- استثنا: `qc → editing` (rework) — خودکار نیست

### نقش‌های قابل اختصاص به هر مرحله
```typescript
export const STAGE_ASSIGNEE_ROLES = {
  managing:  ["manager", "admin", "sales"],
  editing:   ["editor", "film_editor", "admin", "manager"],
  qc:        ["editor", "film_editor", "admin", "manager"],
  render:    ["film_editor", "editor", "admin", "manager"],
  ready:     ["manager", "admin", "sales"],
  delivered: ["manager", "admin", "sales"],
}
```

---

## ۸. امکانات اصلی سایت

### ۸.۱ داشبورد
- ویجت‌های قابل جابجایی (drag-drop با @dnd-kit)
- نمودار جریان وضعیت پروژه‌ها (Recharts)
- یادآورهای امروز + گذشته
- اعلان‌ها
- یادداشت‌های سریع (مثل Apple Notes با todo، ضمیمه)
- کانبان شخصی
- پخش‌کننده صوتی/تصویری حرفه‌ای (seek bar، speed، skip ±10s)

### ۸.۲ مدیریت مشتریان
- لیست کارت‌محور با فیلتر (تگ، نوع، شهر، بدهی، اعتبار، آخرین تعامل)
- انتخاب ستون‌ها (6 ستون)
- خروجی Excel
- پروفایل مشتری:
  - اطلاعات شخصی + خانوادگی (همسر، فرزندان)
  - اینستاگرام، تلفن‌های اضافی (نام آزاد)
  - شهر و نشانی
  - شهرهای قابل مدیریت
  - تاریخچه فعالیت (timeline)
  - یادداشت با ضمیمه
  - پروژه‌ها
  - اعتبار (add/deduct)
  - کدهای معرفی
  - "جمع پرداخت‌ها" + معادل USD
  - دکمه "پروژه جدید"

### ۸.۳ مدیریت پروژه‌ها
- لیست پروژه‌ها با فیلتر وضعیت
- ویزاراد ایجاد پروژه (mobile-friendly)
- تب‌های پروژه:
  - **Overview**: توضیحات، تسک‌ها، تجهیزات، زمان‌بندی
  - **Workflow**: گردش کار دو‌مسیره با assignee
  - **Team**: تیم میدانی + استودیو (Select dropdown)
  - **Photos**: عکس‌های چاپی با قیمت زنده
  - **SMS**: اتوماسیون پیامک (add/toggle/remove)
  - **Notes**: یادداشت با ضمیمه (صوتی، تصویری، فایل)
  - **Financial**: پرداخت‌ها با number separator + mandatory note
- تنظیمات مالی:
  - قیمت پایه + adjustment با +/- buttons
  - Price freeze (جا‌به‌جا با استراتژی)
  - استراتژی: variable (فوری) / delayed (30 روز بعد از آماده)

### ۸.۴ تقویم
- نمای ماه/هفته/روز
- رویدادهای پروژه + مرخصی
- تعطیلات ایرانی (رسمی + قمری)
- drag-drop برای جابجایی

### ۸.۵ پیام‌رسان داخلی
- گفتگوی مستقیم + گروهی
- پیام با ضمیمه (عکس، صوتی، تصویری، فایل)
- پاسخ به پیام (reply)
- forward
- reactions (emoji)
- pin message
- mention (@user)
- read receipts
- muted/pinned conversations
- real-time با Socket.io

### ۸.۶ بخش مالی
- پرداخت‌های همه پروژه‌ها
- هزینه‌های استودیو
- گزارش درآمد vs هزینه
- فقط admin/manager دسترسی کامل دارند

### ۸.۷ گزارش‌ها
- آمار پروژه‌ها بر اساس وضعیت
- درآمد ماهانه
- عملکرد کارمندان
- نمودارها (pie, bar, line)

### ۸.۸ کارخانه QR
- قالب‌های آماده QR (مثل پکیج‌ها)
- تولید کد تخفیف با QR
- خروجی عکس / چاپ همه
- اسکنر کد معرفی

### ۸.۹ تنظیمات
- **پکیج‌ها**: کارت‌محور، موبایل‌فرندلی، کپی، فیلتر (کیفیت/دسته/استراتژی)، قیمت تسک/تجهیزات
- **تگ‌ها**: CRUD با رنگ
- **قیمت عکس چاپی**: با isFormal, printOrder, laminate (glossy/matte/none)
- **کارمندان** (4 تب):
  1. لیست کارمندان (multi-role، bank info، availability، autoCalcSalary)
  2. قوانین حقوق (نقش، کمیسیون، applyOn)
  3. حقوق دستی + پاداش (number separator، mandatory note)
  4. **سطوح دسترسی**: ماتریس 28×8 با toggle سه‌حالته + دیالوگ per-user
- **قالب پیامک**: CRUD
- **فیلدهای سفارشی**: dynamic fields برای مشتریان (text, number, select, multiselect, date)
- **سیستم**: logo upload, Kavenegar SMS config, rich text editor for contracts
- **فضای ذخیره‌سازی**: مدیریت فایل‌ها با soft-delete، retention policy

### ۸.۱۰ سایر
- جستجوی سریع (Cmd+K)
- dark/light mode
- mobile responsive
- sticky footer
- Jalali date picker (dark mode compatible)

---

## ۹. نحوه آپدیت کدها (ZIP Workflow)

### فرمت نام ZIP
```
FARZAD_YYYY-MM-DD_HH-MM.zip
```
مثال: `FARZAD_2026-07-22_15-30.zip`

### محتویات ZIP
ZIP شامل این پوشه‌ها است (داده‌های کاربر شامل نمی‌شود):
```
FARZAD_YYYY-MM-DD_HH-MM.zip
├── src/                    # کل سورس کد
├── prisma/                 # schema + seed
├── public/                 # assets
├── mini-services/          # chat-ws service
├── package.json            # (اختیاری - فقط اگر dependency اضافه شده)
└── components.json         # shadcn config (اختیاری)
```

### این پوشه‌ها هرگز در ZIP نیستند
- `db/` — فایل‌های دیتابیس (داده کاربر)
- `storage/` — فایل‌های آپلود شده
- `node_modules/`
- `.next/` — کش build
- `download/` — ZIP‌های قبلی

### نحوه آپدیت در ویندوز (کاربر)
1. ZIP را extract کنید
2. پوشه `src` را با پوشه جدید جایگزین کنید (overwrite)
3. اگر `prisma/schema.prisma` تغییر کرده:
   - فایل را کپی کنید
   - `bun run db:push` اجرا کنید (داده حفظ می‌شود)
4. اگر `mini-services` تغییر کرده:
   - پوشه را جایگزین کنید
   - `cd mini-services/chat-ws && bun install`
5. `clean-start.bat` را اجرا کنید (حذف `.next` cache + restart)
6. سپس `start.bat`

### clean-start.bat
```batch
@echo off
title NASIM Studio ERP - Clean Cache & Start
cd /d "%~dp0nasim-studio-ERP"

echo [1] Stopping old processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3003" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [2] Deleting .next cache...
if exist ".next" rmdir /s /q ".next"

echo [3] Starting dev server...
start "NASIM Dev" cmd /c "bun run dev"
start "NASIM Chat" cmd /c "cd mini-services\chat-ws && bun --hot index.ts"
```

### start.bat
مشابه clean-start ولی بدون حذف `.next`

---

## ۱۰. نحوه ساخت ZIP (برای AI)

### اسکریپت ساخت ZIP
```bash
cd /home/z/my-project
ZIP_NAME="FARZAD_$(date +%Y-%m-%d_%H-%M).zip"
zip -r "download/$ZIP_NAME" \
  src/ \
  prisma/ \
  public/ \
  mini-services/ \
  package.json \
  components.json \
  tsconfig.json \
  tailwind.config.ts \
  next.config.ts \
  postcss.config.mjs \
  eslint.config.mjs \
  -x "*/node_modules/*" "*/.next/*" "*/dist/*" \
  -x "*.log"
echo "Created: download/$ZIP_NAME"
```

### قبل از ساخت ZIP
1. `bun run lint` اجرا کنید — ارورهای source را بررسی کنید (warning‌های generated/ نادیده بگیرید)
2. همه views در مرورگر تست شوند
3. `worklog.md` را آپدیت کنید

---

## ۱۱. سیستم Gateway و Port

### محدودیت
فقط یک پورت (3000) به بیرون expose می‌شود. Caddy به عنوان gateway عمل می‌کند.

### Caddyfile
```
:81 {
    # Next.js on port 3000
    reverse_proxy /api/* localhost:3000
    
    # Socket.io on port 3003 — via query param
    reverse_proxy /socket.io/* {
        to localhost:3003
    }
    
    # WebSocket upgrade
    @websockets header Connection *Upgrade*
    reverse_proxy @websockets localhost:3003
}
```

### نکات مهم
- **API requests**: همیشه relative path (`/api/...`)
- **Cross-port requests**: از query param `?XTransformPort=PORT` استفاده کنید
  - مثال: `fetch('/api/test?XTransformPort=3030')`
- **WebSocket (Socket.io)**: `io("/?XTransformPort=3003")` — path همیشه `/`
- **ممنوع**: `fetch('http://localhost:3003/...')` یا `io('http://localhost:3003')`

---

## ۱۲. Mini-Service: Chat WebSocket

### ساختار
```
mini-services/chat-ws/
├── index.ts           # Socket.io server (port 3003)
├── package.json       # socket.io, @prisma/client
└── tsconfig.json
```

### نحوه اجرا
```bash
cd mini-services/chat-ws
bun install
bun --hot index.ts   # auto-restart on file change
```

### اتصال از frontend
```typescript
// src/lib/chat-ws.ts
import { io } from "socket.io-client"
const socket = io("/?XTransformPort=3003", {
  auth: { token: localStorage.getItem("nasim-session-token") }
})
```

---

## ۱۳. نکات برنامه‌نویسی مهم

### ۱۳.۱ useApi Hook
```typescript
// src/lib/api/client.ts
const api = useApi()  // returns stable function

// به طور خودکار اضافه می‌کند:
// - credentials: "include"
// - Authorization: Bearer <token> (از localStorage)
// - x-demo-role: <role> (از workspace store)

// نکته: useApi در هر render یک object جدید برمی‌گرداند
// در useEffect dep ها قرار ندهید — از apiRef pattern استفاده کنید
```

### ۱۳.۲ Infinite Loop Prevention
```typescript
// ❌ BAD — causes infinite loop
const api = useApi()
useEffect(() => {
  api.get("/api/data").then(setData)
}, [api])  // api changes every render!

// ✅ GOOD
const api = useApi()
const apiRef = useRef(api)
apiRef.current = api
useEffect(() => {
  apiRef.current.get("/api/data").then(setData)
}, [])
```

### ۱۳.۳ Persian Number Formatting
```typescript
// src/lib/format.ts
export const toPersianDigits = (s: string | number) =>
  String(s).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[+d])

export const formatToman = (n: number) =>
  toPersianDigits(Number(n).toLocaleString("en-US")) + " تومان"
```

### ۱۳.۴ Jalali Date
```typescript
// src/lib/jalali.ts
import jalaali from "jalaali-js"

export function toJalali(date: Date) {
  const { jy, jm, jd } = jalaali.toJalaali(date)
  return { year: jy, month: jm, day: jd }
}

export function formatJalali(date: Date) {
  const { jy, jm, jd } = toJalali(date)
  return `${toPersianDigits(jy)}/${toPersianDigits(jm).padStart(2,"۰")}/${toPersianDigits(jd).padStart(2,"۰")}`
}
```

### ۱۳.۵ Permission Check در UI
```typescript
// Client-side
import { usePermissions } from "@/lib/hooks/use-permissions"
const { data } = usePermissions()
const canEdit = data?.effective?.customers_edit === true

// یا با role فقط (بدون per-user override)
import { hasPermission } from "@/lib/constants"
const canEdit = hasPermission(role, "customers_edit")
```

```typescript
// Server-side (API route)
import { currentUserHasPermission, requirePermission } from "@/lib/auth-helpers"
await requirePermission("customers_edit")  // throws if missing
// یا
if (!(await currentUserHasPermission("customers_edit"))) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
```

### ۱۳.۶ RTL Styling
- `dir="rtl"` در root layout
- Tailwind logical properties: `ps-4`, `pe-4`, `ms-4`, `me-4`
- `text-right` به طور پیش‌فرض
- برای LTR (مثل اعداد): `dir="ltr"`

### ۱۳.۷ Sticky Footer
```tsx
<div className="min-h-screen flex flex-col">
  <main className="flex-1">{children}</main>
  <footer className="mt-auto">...</footer>
</div>
```

### ۱۳.۸ Dark Mode
```tsx
// با next-themes
import { useTheme } from "next-themes"
const { theme, setTheme } = useTheme()

// CSS variables (tailwind config)
:bg-background .text-foreground
.bg-card .text-card-foreground
.bg-primary .text-primary-foreground
```

---

## ۱۴. Status فعلی پروژه (تاریخ: 2026-07-22)

### کارهای انجام شده در ۲ چت اخیر

#### چت ۱ — معماری سیستم نقش‌ها
1. ✅ حذف تعریف تکراری `ROLES`/`ROLE_LABELS` در `constants.ts`
2. ✅ تعریف ۸ نقش جدید
3. ✅ اضافه کردن `ROLE_BADGE_COLORS`, `ROLE_TEAMS`, `ROLE_TEAM_LABELS`
4. ✅ اضافه کردن `migrateRole()` برای مهاجرت نقش‌های قدیمی
5. ✅ اضافه کردن `TECHNICAL_ROLES`, `isTechnicalRole()`, `isManagementRole()`
6. ✅ اضافه کردن `hasUserPermission()` با per-user overrides
7. ✅ اضافه کردن shim `ROLE_PERMISSIONS` برای backward-compat
8. ✅ اضافه کردن فیلد `permissions` به مدل User
9. ✅ اضافه کردن مدل `RolePermission` برای studio-level overrides
10. ✅ آپدیت `auth-helpers.ts` با permission helpers
11. ✅ آپدیت `getCurrentStudioUserId()` برای تطبیق با phone
12. ✅ آپدیت `STAGE_ASSIGNEE_ROLES`
13. ✅ Push schema + regenerate Prisma client

#### چت ۲ — رفع API routes و UI
14. ✅ رفع ۱۱ فایل API route (referral-codes, calendar, projects, tasks, salary-rules, users, etc.)
15. ✅ رفع ۱۳ فایل view (settings-*, scanner, qr-factory, sidebar, projects-view)
16. ✅ رفع ۵ خطای parse از قبل (delivery team leftovers)
17. ✅ رفع `Minus` import در projects-view
18. ✅ ساخت ۳ API endpoint جدید:
    - `/api/users/[id]/permissions` (GET + PUT)
    - `/api/permissions/me` (GET)
    - `/api/role-permissions` (GET + PUT)
19. ✅ ساخت hook `use-permissions.ts`
20. ✅ اضافه کردن تب ۴ "سطوح دسترسی" به settings-employees-view
21. ✅ آپدیت `publicUser()` برای شامل کردن `permissions`

#### چت ۳ — تست و رفع باگ
22. ✅ رفع باگ critical: `Object.keys(Set)` خالی برمی‌گرداند → `effective: {}` خالی
   - در `resolveCurrentUserPermissions()` حلقه را از `Object.keys(defaults)` به `PERMISSION_KEYS` تغییر دادم
23. ✅ اضافه کردن `employees_manage`, `packages_manage`, `salary_rules`, `storage` به مدیر defaults
24. ✅ تست sidebar filtering: عکاس فقط ۵ آیتم می‌بیند (dashboard, calendar, projects, my-tasks, messages)
25. ✅ تست permission toggle: تغییر اعطا/سلب + ذخیره کار می‌کند
26. ✅ تست per-user override: manager می‌تواند `customers_create` بدهد (دارد) ولی `system` نمی‌تواند (ندارد) — با پیام فارسی
27. ✅ تست همه views اصلی: customers, projects, packages, scanner, qr-factory, employees — همه بدون ارور
28. ✅ تست migrateRole: `u-logistics` (بابک) به‌عنوان `pro_crew` نمایش داده می‌شود
29. ✅ تست `u-qc` (رکسانا) به‌عنوان `editor` نمایش داده می‌شود

### کارهای باقی‌مانده (برای چت جدید)

1. **تست dark mode کامل**: تم تاریک را در همه views چک کنید
2. **تست mobile responsive**: viewport موبایل (375px) را تست کنید
3. **اصلاح نهایی lint**: warning‌های باقی‌مانده را بررسی کنید (generated/ را نادیده بگیرید)
4. **تست نقش‌های دیگر**: sales, videographer, pro_crew, editor, film_editor را تست کنید
5. **تست اتوماسیون SMS**: occasions widget + ارسال پیامک با قالب
6. **Excel import/export برای print photos**
7. **Custom fields redesign** (مثل customers view)
8. **Salary system UI کامل**: RolePrice با levels، 3 salary types، settlement system
9. **Team tab redesign**: ساختار جدید تیم (field team + edit team)
10. **Rich text editor برای contracts** (در settings-system vorhanden، تست شود)
11. **Kavenegar SMS config** (در settings-system vorhanden، تست شود)
12. **Studio logo upload** (در settings-system vorhanden، تست شود)

### باگ‌های شناخته شده
- در dev server، گاهی Turbopack cache خراب می‌شود → `clean-start.bat` اجرا کنید
- در محیط preview iframe، cookieها کار نمی‌کنند → `Authorization` header لازم است
- `useApi()` در هر render object جدید برمی‌گرداند → در useEffect deps قرار ندهید

---

## ۱۵. نحوه اجرای پروژه (Dev)

### در sandbox (Linux)
```bash
cd /home/z/my-project
bun install
bun run db:push          # sync schema
bunx prisma generate     # regenerate client
bun run dev              # Next.js on port 3000

# در terminal جداگانه:
cd mini-services/chat-ws
bun install
bun --hot index.ts       # Socket.io on port 3003
```

### در ویندوز (کاربر)
1. مطمئن شوید Bun نصب است: `irm bun.sh/install.ps1 | iex`
2. پوشه پروژه را extract کنید
3. `install.bat` را اجرا کنید (first time only)
4. `clean-start.bat` را اجرا کنید
5. مرورگر: `http://localhost:3000`

### دیتابیس‌های seed شده
- **master.db**:
  - 8 کاربر با شماره‌های 09120000001 تا 09120000008
  - رمز همه: 123456
  - 2 استودیو: studio-1 (عکاسی نسیم), studio-2 (استودیو آواز)
- **studio-demo.db**: داده کامل (مشتریان، پروژه‌ها، پکیج‌ها، کارمندان)

---

## ۱۶. نکات مهم برای چت جدید

### هنگام شروع کار در چت جدید:
1. این فایل (`PROJECT_HANDOFF.md`) را بخوانید
2. `worklog.md` را بخوانید (تاریخچه کامل کارها)
3. `src/lib/constants.ts` را بخوانید (سیستم نقش‌ها)
4. `src/lib/auth-helpers.ts` را بخوانید (permission helpers)
5. `prisma/schema.prisma` را مرور کنید
6. dev server را اجرا کنید و با agent-browser تست کنید

### قواعد طلایی:
- **هیچ‌وقت کد را بدون تست رها نکنید** — هر تغییر را در مرورگر تست کنید
- **یک todo → تست کامل → completed → بعدی**
- **ZIP را با فرمت `FARZAD_YYYY-MM-DD_HH-MM.zip` بسازید**
- **پوشه `db/` و `storage/` هرگز در ZIP نیستند**
- **بعد از هر تغییر schema، `db:push` اجرا کنید** (داده حفظ می‌شود)
- **اگر Turbopack خراب شد، `.next` را پاک کنید**
- **در API routes، همیشه `Authorization` header را چک کنید** (cookie در preview کار نمی‌کند)

### آدرس‌های تست:
- OTP send: `POST /api/auth/otp/send` `{ phone }` → returns `demoCode`
- OTP verify: `POST /api/auth/otp/verify` `{ phone, code }` → returns `sessionToken`
- شماره تست: `09120000001` (admin), `09120000002` (manager), `09120000004` (photographer)

### cron job پیشنهادی
هر ۱۵ دقیقه یک `webDevReview` task اجرا کنید که:
1. `worklog.md` را می‌خواند
2. با agent-browser تست می‌کند
3. باگ‌ها را اصلاح می‌کند یا قابلیت‌های جدید اضافه می‌کند
4. `worklog.md` را آپدیت می‌کند

---

## ۱۷. خلاصه نهایی

این پروژه یک **ERP کامل برای استودیوهای عکاسی** است با:
- **45 مدل داده** در Prisma
- **36 API endpoint**
- **29 view** کامponent
- **8 نقش** با **28 دسترسی** قابل تنظیم
- **Multi-tenant** architecture (هر استودیو DB جداگانه)
- **Real-time chat** با Socket.io
- **Persian RTL** UI با Jalali calendar
- **Dark mode** support
- **Mobile responsive**

کد در وضعیت پایدار است و سیستم دسترسی جدید کامل پیاده‌سازی شده. باگ‌های شناخته شده در بخش ۱۴ ذکر شده‌اند. برای ادامه توسعه، اول `worklog.md` را بخوانید تا تاریخچه کامل را ببینید.

**موفق باشید! 🎬**
