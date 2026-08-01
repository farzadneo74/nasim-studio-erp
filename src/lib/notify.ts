import { db } from "@/lib/db"

export async function notifyPaymentApproval(paymentId: string, amount: number, customerName?: string) {
  try {
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

export async function notifyBroadcast(title: string, message: string, link?: string) {
  try { await db.notification.create({ data: { type: "info", title, message, link, userId: null } }) } catch { /* best-effort */ }
}

