import { getCurrentStudioDb } from "./auth-helpers"
import type { PrismaClient } from "@prisma/client"

/**
 * ایجاد نوتیفیکیشن در دیتابیس استودیوی فعلی.
 *
 * ⚠️ SECURITY FIX: قبلاً این فایل از `db` (دیتابیس پیش‌فرض ثابت) استفاده می‌کرد که
 * باعث نشت نوتیفیکیشن بین استودیوها می‌شد. حالا از `getCurrentStudioDb()` استفاده
 * می‌کند تا نوتیفیکیشن فقط در دیتابیس استودیوی کاربر فعلی نوشته شود.
 *
 * اگر کاربر لاگین نکرده یا استودیویی انتخاب نکرده باشد، نوتیفیکیشن نادیده گرفته می‌شود.
 */

/**
 * نوتیفیکیشن تأیید پرداخت برای مدیران استودیو
 */
export async function notifyPaymentApproval(paymentId: string, amount: number, customerName?: string) {
  try {
    const db = await getCurrentStudioDb()
    if (!db) return  // ← کاربر ناشناس یا all-studios: skip

    const display = new Intl.NumberFormat("en-US").format(Math.round(amount / 10))
    await db.notification.create({
      data: {
        type: "payment_approval",
        title: "پرداخت جدید برای تأیید",
        message: `پرداخت ${display} تومان از ${customerName ?? "مشتری"}`,
        refId: paymentId,
        link: "finances",
        userId: null,
        requiresAction: true,
        actionLabel: "تایید/رد پرداخت",
      },
    })
  } catch { /* best-effort */ }
}

/**
 * نوتیفیکیشن broadcast (اطلاع‌رسانی عمومی به استودیوی فعلی)
 */
export async function notifyBroadcast(title: string, message: string, link?: string) {
  try {
    const db = await getCurrentStudioDb()
    if (!db) return
    await db.notification.create({
      data: { type: "info", title, message, link, userId: null },
    })
  } catch { /* best-effort */ }
}

/**
 * نوتیفیکیشن برای کاربر خاص در استودیوی فعلی
 */
export async function notifyUser(userId: string, title: string, message: string, link?: string) {
  try {
    const db = await getCurrentStudioDb()
    if (!db) return
    await db.notification.create({
      data: { type: "info", title, message, link, userId },
    })
  } catch { /* best-effort */ }
}
