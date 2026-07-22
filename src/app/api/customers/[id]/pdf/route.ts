import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { CAN_SEE_BALANCE, STATUS_LABELS, STATUS_COLORS, type ProjectStatus } from "@/lib/constants"
import { getEffectivePrice } from "@/lib/pricing"
import { formatRials, toPersianDigits, formatJalaliDate, formatDate } from "@/lib/format"
import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"

type Ctx = { params: Promise<{ id: string }> }

const DEFAULT_STUDIO_FA = "عکاسی نسیم"
const DEFAULT_STUDIO_EN = "NASIM STUDIO"

async function getStudioName(db: PrismaClient): Promise<{ fa: string; en: string }> {
  const row = await db.systemSetting.findUnique({ where: { key: "studio_name" } })
  if (!row) return { fa: DEFAULT_STUDIO_FA, en: DEFAULT_STUDIO_EN }
  try {
    const parsed = JSON.parse(row.value) as { fa?: string; en?: string }
    return {
      fa: parsed.fa || DEFAULT_STUDIO_FA,
      en: parsed.en || DEFAULT_STUDIO_EN,
    }
  } catch {
    return { fa: DEFAULT_STUDIO_FA, en: DEFAULT_STUDIO_EN }
  }
}

// Fetch the studio-wide default contract text (terms & conditions) from SystemSetting.
async function getContractDefaultText(db: PrismaClient): Promise<string> {
  const row = await db.systemSetting.findUnique({ where: { key: "contract_default_text" } })
  if (!row) return ""
  // Value may be stored as a plain string or as JSON. Try JSON first, fall back to plain.
  try {
    const parsed = JSON.parse(row.value)
    if (typeof parsed === "string") return parsed
    if (parsed && typeof parsed.text === "string") return parsed.text
  } catch {
    // not JSON — treat as plain text
  }
  return row.value || ""
}

function esc(s: string | null | undefined): string {
  if (s == null) return ""
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// POST /api/customers/[id]/pdf
// Body: { projectIds: string[] }
// Returns: text/html — a printable, editable Persian (RTL) contract document.
export async function POST(req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  if (!CAN_SEE_BALANCE.includes(role)) {
    return new Response("<html><body dir='rtl'>دسترسی غیرمجاز</body></html>", {
      status: 403,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params
  const body = (await req.json().catch(() => ({}))) as { projectIds?: string[] }
  const ids = Array.isArray(body.projectIds) ? body.projectIds.filter((x) => typeof x === "string" && x) : []

  const customer = await db.customer.findUnique({ where: { id } })
  if (!customer) {
    return new Response("<html><body dir='rtl'>مشتری یافت نشد</body></html>", {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }

  const [studio, defaultText] = await Promise.all([getStudioName(db), getContractDefaultText(db)])

  // Fetch selected projects — sort by CREATION time, newest first.
  const projects = ids.length
    ? await db.project.findMany({
        where: { id: { in: ids }, contract: { customerId: id } },
        include: {
          servicePackage: true,
          contract: true,
          payments: true,
        },
        orderBy: { createdAt: "desc" },
      })
    : []

  type Row = {
    id: string
    contractNumber: string
    title: string
    status: string
    startDatetime: Date | null
    effectivePrice: number
    totalPaid: number
    balance: number
    discountAmount: number
    packageDescription: string | null
  }

  const rows: Row[] = projects.map((p) => {
    const confirmedPaid = p.payments
      .filter((x) => x.isConfirmed)
      .reduce((s, x) => s + Number(x.amount), 0)
    const eff = getEffectivePrice({
      pricingStrategy: p.pricingStrategy as never,
      calculatedPrice: p.calculatedPrice,
      lockedPrice: p.lockedPrice,
      isPriceFrozen: p.isPriceFrozen,
      isReadyForDelivery: p.isReadyForDelivery,
      readyDate: p.readyDate,
      priceAtReadyTime: p.priceAtReadyTime,
      packageCurrentPrice: p.servicePackage.currentPrice,
      totalConfirmedPaid: confirmedPaid,
    })

    return {
      id: p.id,
      contractNumber: p.contract.contractNumber,
      title: p.servicePackage.title,
      status: p.status,
      startDatetime: p.startDatetime,
      effectivePrice: eff,
      totalPaid: confirmedPaid,
      balance: Math.max(0, eff - confirmedPaid),
      discountAmount: Number(p.discountAmount ?? 0),
      packageDescription: p.servicePackage.defaultDescription ?? null,
    }
  })

  const totalEff = rows.reduce((s, r) => s + r.effectivePrice, 0)
  const totalPaid = rows.reduce((s, r) => s + r.totalPaid, 0)
  const totalBalance = rows.reduce((s, r) => s + r.balance, 0)
  const totalDiscount = rows.reduce((s, r) => s + r.discountAmount, 0)

  const now = new Date()
  const issuedAt = formatJalaliDate(now)

  // ---- Per-project compact rows (no project-summary table at top) ----
  const projectsHtml = rows.length
    ? rows
        .map((r, i) => {
          const statusLabel = esc(STATUS_LABELS[r.status as ProjectStatus] ?? r.status)
          const statusColor = STATUS_COLORS[r.status as ProjectStatus] ?? "#64748b"
          const scheduleTxt = r.startDatetime ? formatDate(r.startDatetime) : "—"
          const discountTxt =
            r.discountAmount > 0 ? "− " + formatRials(r.discountAmount) : "—"
          const discountCls = r.discountAmount > 0 ? "v discount" : "v muted-num"
          const balanceCls = r.balance > 0 ? "v balance-due" : "v balance-zero"

          return `
      <div class="proj">
        <div class="proj-head">
          <span class="proj-num">${toPersianDigits(i + 1)}</span>
          <span class="proj-title">${esc(r.title)}</span>
          <span class="proj-contract" dir="ltr">${esc(r.contractNumber)}</span>
          <span class="proj-status" style="color:${statusColor};background:${statusColor}1a;border:1px solid ${statusColor}55">${statusLabel}</span>
        </div>
        ${r.packageDescription ? `<div class="proj-desc">${esc(r.packageDescription)}</div>` : ""}
        <div class="proj-meta">
          <span><span class="k">تاریخ اجرا:</span> <span class="v">${esc(scheduleTxt)}</span></span>
          <span><span class="k">قیمت:</span> <span class="v price" dir="ltr">${formatRials(r.effectivePrice)} تومان</span></span>
          <span><span class="k">تخفیف:</span> <span class="${discountCls}" dir="ltr">${discountTxt}${r.discountAmount > 0 ? " تومان" : ""}</span></span>
          <span><span class="k">پرداخت‌شده:</span> <span class="v paid" dir="ltr">${formatRials(r.totalPaid)} تومان</span></span>
          <span><span class="k">مانده:</span> <span class="${balanceCls}" dir="ltr">${formatRials(r.balance)} تومان</span></span>
        </div>
      </div>
      <hr class="proj-divider" />`
        })
        .join("")
    : `<div class="proj-empty">هیچ پروژه‌ای برای این قرارداد انتخاب نشده است.</div>`

  // Totals section — horizontal cards.
  const totalsHtml = `
    <div class="totals">
      <div class="totals-title">جمع‌بندی مالی</div>
      <div class="totals-cards">
        <div class="total-card total-card-price">
          <div class="tc-label">جمع کل قیمت</div>
          <div class="tc-value" dir="ltr">${formatRials(totalEff)}</div>
          <div class="tc-unit">تومان</div>
        </div>
        <div class="total-card total-card-paid">
          <div class="tc-label">کل دریافتی</div>
          <div class="tc-value" dir="ltr">${formatRials(totalPaid)}</div>
          <div class="tc-unit">تومان</div>
        </div>
        <div class="total-card total-card-discount">
          <div class="tc-label">کل تخفیف</div>
          <div class="tc-value" dir="ltr">${formatRials(totalDiscount)}</div>
          <div class="tc-unit">تومان</div>
        </div>
        <div class="total-card ${totalBalance > 0 ? "total-card-balance-due" : "total-card-balance-zero"}">
          <div class="tc-label">مانده حساب</div>
          <div class="tc-value" dir="ltr">${formatRials(totalBalance)}</div>
          <div class="tc-unit">تومان</div>
        </div>
      </div>
    </div>`

  // Terms & conditions (default contract text from settings, editable).
  const termsInnerHtml = defaultText
    ? esc(defaultText)
    : ""
  const termsHtml = `
    <div class="terms editable">
      <div class="block-label">شروط و شرایط</div>
      <div class="block-body" contenteditable="true" data-placeholder="متن شروط و شرایط قرارداد در تنظیمات سیستم ثبت نشده است. می‌توانید اینجا وارد کنید…">${termsInnerHtml}</div>
    </div>`

  // Description (empty contenteditable area).
  const descHtml = `
    <div class="desc-section editable">
      <div class="block-label">توضیحات</div>
      <div class="block-body" contenteditable="true" data-placeholder="توضیحات اضافی را اینجا بنویسید…"></div>
    </div>`

  // Signature areas.
  const signHtml = `
    <div class="sign-row">
      <div class="sign-box">
        <div class="sign-label">محل امضای مشتری</div>
        <div class="sign-space"></div>
      </div>
      <div class="sign-box">
        <div class="sign-label">محل امضای استودیو</div>
        <div class="sign-space"></div>
      </div>
    </div>`

  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>قرارداد — ${esc(customer.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: "Vazirmatn", "IRANSans", "Tahoma", system-ui, -apple-system, sans-serif;
    color: #1f2937;
    background: #f3f4f6;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 16px auto;
    padding: 14mm 14mm;
    background: #ffffff;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    border-radius: 6px;
  }

  /* ---- Toolbar (non-print) ---- */
  .actions {
    position: fixed;
    top: 12px;
    left: 12px;
    z-index: 50;
    display: flex;
    gap: 8px;
  }
  .actions button {
    font-family: inherit;
    font-size: 12px;
    padding: 8px 14px;
    border-radius: 8px;
    border: 1px solid #d1d5db;
    background: #ffffff;
    color: #111827;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .actions button.primary {
    background: #0f766e;
    color: #ffffff;
    border-color: #0f766e;
  }
  .edit-hint {
    background: #fef3c7;
    border: 1px solid #fde68a;
    color: #92400e;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 11px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* ---- Header ---- */
  header.contract-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    border-bottom: 3px solid #0f766e;
    padding-bottom: 8px;
    margin-bottom: 10px;
  }
  .studio { display: flex; flex-direction: column; gap: 2px; }
  .studio .fa { font-size: 18px; font-weight: 700; color: #0f766e; }
  .studio .en { font-size: 10px; letter-spacing: 2px; color: #6b7280; }
  .contract-meta { text-align: left; font-size: 10px; color: #6b7280; }
  .contract-meta .title {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 2px;
  }

  /* ---- Compact customer row ---- */
  .customer-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 10px;
    padding: 6px 10px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    margin-bottom: 12px;
    font-size: 11px;
    line-height: 1.6;
  }
  .customer-row .name { font-weight: 700; color: #111827; font-size: 12px; }
  .customer-row .k { color: #6b7280; }
  .customer-row .v { color: #111827; font-weight: 600; }
  .customer-row .sep { color: #d1d5db; margin: 0 2px; }

  /* ---- Section title ---- */
  h2.section-title {
    font-size: 12px;
    font-weight: 700;
    color: #111827;
    margin: 0 0 6px 0;
    padding-right: 8px;
    border-right: 3px solid #0f766e;
  }

  /* ---- Per-project blocks (compact, thin dividers) ---- */
  .projects { margin-top: 4px; }
  .proj {
    padding: 5px 0;
    font-size: 11px;
    line-height: 1.55;
    page-break-inside: avoid;
  }
  .proj-head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 3px;
  }
  .proj-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #0f766e;
    color: #ffffff;
    font-size: 10px;
    font-weight: 700;
  }
  .proj-title { font-size: 12px; font-weight: 700; color: #111827; }
  .proj-contract { font-size: 10px; color: #6b7280; }
  .proj-status {
    margin-right: auto;
    font-size: 10px;
    padding: 1px 7px;
    border-radius: 999px;
  }
  .proj-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 14px;
    padding-right: 24px;
    font-size: 11px;
  }
  .proj-meta .k { color: #6b7280; }
  .proj-meta .v { font-weight: 600; color: #111827; }
  .proj-meta .v.price { color: #047857; }
  .proj-meta .v.discount { color: #b45309; font-weight: 700; }
  .proj-meta .v.paid { color: #0f766e; }
  .proj-meta .v.balance-due { color: #b91c1c; font-weight: 700; }
  .proj-meta .v.balance-zero { color: #047857; font-weight: 700; }
  .proj-meta .v.muted-num { color: #9ca3af; }
  .proj-divider { border: 0; border-top: 1px dashed #e5e7eb; margin: 0; }
  .proj-desc {
    font-size: 10px;
    color: #4b5563;
    line-height: 1.5;
    padding: 4px 8px 2px;
    margin-bottom: 2px;
    white-space: pre-wrap;
    border-right: 2px solid #d1d5db;
    margin-right: 8px;
  }
  .proj-empty {
    text-align: center;
    color: #6b7280;
    padding: 14px 8px;
    font-size: 11px;
  }

  /* ---- Totals — horizontal cards ---- */
  .totals {
    margin-top: 10px;
    padding: 8px 12px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    page-break-inside: avoid;
  }
  .totals-title {
    font-size: 12px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 6px;
    padding-bottom: 3px;
    border-bottom: 1px solid #e5e7eb;
  }
  .totals-cards {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .total-card {
    flex: 1;
    min-width: 120px;
    text-align: center;
    padding: 8px 6px;
    border-radius: 6px;
    border: 1px solid #e5e7eb;
    background: #fff;
  }
  .total-card .tc-label {
    font-size: 10px;
    color: #6b7280;
    font-weight: 600;
    margin-bottom: 3px;
  }
  .total-card .tc-value {
    font-size: 14px;
    font-weight: 700;
    line-height: 1.2;
  }
  .total-card .tc-unit {
    font-size: 9px;
    color: #9ca3af;
    margin-top: 2px;
  }
  .total-card-price { border-color: #a7f3d0; background: #ecfdf5; }
  .total-card-price .tc-value { color: #047857; }
  .total-card-paid { border-color: #99f6e4; background: #f0fdfa; }
  .total-card-paid .tc-value { color: #0f766e; }
  .total-card-discount { border-color: #fcd34d; background: #fffbeb; }
  .total-card-discount .tc-value { color: #b45309; }
  .total-card-balance-due { border-color: #fca5a5; background: #fef2f2; }
  .total-card-balance-due .tc-value { color: #b91c1c; }
  .total-card-balance-zero { border-color: #a7f3d0; background: #ecfdf5; }
  .total-card-balance-zero .tc-value { color: #047857; }

  /* ---- Editable blocks (terms / description) ---- */
  .editable { margin-top: 10px; page-break-inside: avoid; }
  .block-label {
    font-size: 11px;
    font-weight: 700;
    color: #0f766e;
    margin-bottom: 3px;
  }
  .block-body {
    font-size: 11px;
    line-height: 1.75;
    color: #1f2937;
    padding: 6px 10px;
    border: 1px dashed #d1d5db;
    border-radius: 6px;
    min-height: 36px;
    white-space: pre-wrap;
    background: #fdfdfd;
  }
  .block-body:empty::before {
    content: attr(data-placeholder);
    color: #9ca3af;
    font-style: italic;
  }
  .block-body:focus {
    outline: 2px solid #0f766e;
    outline-offset: 1px;
    background: #ffffff;
    border-style: solid;
    border-color: #0f766e;
  }

  /* ---- Signature areas ---- */
  .sign-row {
    margin-top: 18px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    page-break-inside: avoid;
  }
  .sign-box { display: flex; flex-direction: column; }
  .sign-label {
    font-size: 11px;
    font-weight: 700;
    color: #374151;
    margin-bottom: 4px;
    text-align: center;
  }
  .sign-space {
    border: 1px solid #9ca3af;
    border-radius: 6px;
    height: 75px;
    background: #fafafa;
  }

  /* ---- Footer ---- */
  footer.contract-foot {
    margin-top: 14px;
    padding-top: 6px;
    border-top: 1px dashed #d1d5db;
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #6b7280;
  }

  /* ---- Print rules ---- */
  @media print {
    body { background: #ffffff; }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0;
      padding: 12mm 12mm;
      box-shadow: none;
      border-radius: 0;
    }
    .actions { display: none !important; }
    .edit-hint { display: none !important; }
    @page { size: A4; margin: 0; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="actions">
    <button class="primary" onclick="window.print()">چاپ / ذخیره PDF</button>
    <button onclick="window.close()">بستن</button>
  </div>
  <div class="page">
    <div class="edit-hint">
      <span>📝</span>
      <span>این قرارداد قابل ویرایش است — قبل از چاپ می‌توانید متن‌ها را ویرایش کنید. دکمه چاپ در بالای صفحه قرار دارد.</span>
    </div>

    <header class="contract-head">
      <div class="studio">
        <div class="fa">${esc(studio.fa)}</div>
        <div class="en">${esc(studio.en)}</div>
      </div>
      <div class="contract-meta">
        <div class="title">قرارداد</div>
        <div>تاریخ صدور: ${esc(issuedAt)}</div>
        <div>شناسه مشتری: ${esc(customer.id.slice(-8).toUpperCase())}</div>
      </div>
    </header>

    <div class="customer-row">
      <span class="name">${esc(customer.name)}</span>
      <span class="sep">|</span>
      <span><span class="k">نوع:</span> <span class="v">${customer.customerType === "company" ? "حقوقی" : "حقیقی"}</span></span>
      <span class="sep">|</span>
      <span><span class="k">تماس:</span> <span class="v" dir="ltr">${esc(customer.phone)}</span></span>
      <span class="sep">|</span>
      <span><span class="k">تعداد پروژه‌ها:</span> <span class="v">${toPersianDigits(rows.length)} مورد</span></span>
    </div>

    <h2 class="section-title">جزئیات پروژه‌ها</h2>
    <div class="projects" contenteditable="true">${projectsHtml}</div>

    ${totalsHtml}

    ${termsHtml}

    ${descHtml}

    ${signHtml}

    <footer class="contract-foot">
      <div>این قرارداد در تاریخ ${esc(issuedAt)} صادر شد.</div>
      <div>${esc(studio.fa)}</div>
    </footer>
  </div>
  <script>
    // Auto-open print dialog once the page is ready.
    window.addEventListener('load', function () {
      setTimeout(function () { try { window.print(); } catch (e) {} }, 300);
    });
  </script>
</body>
</html>`

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  })
}

