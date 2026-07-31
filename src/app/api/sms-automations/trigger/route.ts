import { NextResponse } from "next/server"
import { masterDb } from "@/lib/master-db"
import { sendSms, isSmsAvailable } from "@/lib/kavenegar"
import { getCurrentStudioDb } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

/**
 * POST /api/sms-automations/trigger
 * بررسی و ارسال پیامک‌های خودکار که زمان‌شان رسیده
 *
 * این endpoint باید روزانه (مثلاً با cron job) صدا زده شود.
 *
 * منطق:
 *  - برای هر استودیو، همه automation‌های فعال رو پیدا کن
 *  - برای هر automation، پروژه‌هایی که trigger event‌شان رخ داده رو پیدا کن
 *  - اگر offsetDays از trigger گذشته باشد و هنوز پیامک ارسال نشده، ارسال کن
 *
 * Trigger events:
 *  - before_event: N روز قبل از project.startDatetime
 *  - after_event: N روز بعد از project.endDatetime
 *  - after_ready: N روز بعد از project.readyDate
 *  - after_photo_select: N روز بعد از project.photoSelectDate (اگر وجود داشته باشد)
 */

interface TriggerContext {
  projectId: string
  customerId: string | null
  customerName: string | null
  customerPhone: string | null
  triggerDate: Date
  templateText: string
}

export async function POST() {
  const results: Array<{
    studioId: string
    studioName: string
    sent: number
    failed: number
    errors: string[]
  }> = []

  // همه استودیوهای فعال رو بگیر
  const studios = await masterDb.studio.findMany({
    where: { isActive: true },
    select: { id: true, name: true, dbName: true },
  })

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  for (const studio of studios) {
    const studioResult = {
      studioId: studio.id,
      studioName: studio.name,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    }

    try {
      // دیتابیس استودیو رو باز کن
      const { getStudioDb } = await import("@/lib/studio-db")
      const db = getStudioDb(studio.dbName)

      // بررسی دسترسی به SMS
      const smsStatus = await isSmsAvailable(studio.id)
      if (!smsStatus.available) {
        studioResult.errors.push(`SMS unavailable: ${smsStatus.reason}`)
        results.push(studioResult)
        continue
      }

      // همه automation‌های فعال رو بگیر
      const automations = await db.smsAutomation.findMany({
        where: { isActive: true },
        include: { template: true },
      })

      for (const automation of automations) {
        // همه assignment‌های فعال این automation رو بگیر
        const assignments = await db.projectSmsAssignment.findMany({
          where: { automationId: automation.id, enabled: true },
          include: {
            project: {
              select: {
                id: true,
                startDatetime: true,
                endDatetime: true,
                readyDate: true,
                customerId: true,
                customer: { select: { id: true, name: true, phone: true } },
              },
            },
          },
        })

        for (const assignment of assignments) {
          const project = assignment.project
          if (!project) continue

          // تعیین تاریخ trigger بر اساس نوع رویداد
          let triggerDate: Date | null = null
          const offsetDays = assignment.offsetDaysOverride ?? automation.offsetDays

          switch (automation.triggerEvent) {
            case "before_event":
              if (project.startDatetime) {
                triggerDate = new Date(project.startDatetime)
                triggerDate.setDate(triggerDate.getDate() - offsetDays)
              }
              break
            case "after_event":
              if (project.endDatetime) {
                triggerDate = new Date(project.endDatetime)
                triggerDate.setDate(triggerDate.getDate() + offsetDays)
              }
              break
            case "after_ready":
              if (project.readyDate) {
                triggerDate = new Date(project.readyDate)
                triggerDate.setDate(triggerDate.getDate() + offsetDays)
              }
              break
            case "after_photo_select":
              // فعلاً پشتیبانی نمی‌شود چون فیلد photoSelectDate وجود ندارد
              break
          }

          if (!triggerDate) continue

          // آیا امروز روز trigger است؟
          const triggerDay = new Date(triggerDate.getFullYear(), triggerDate.getMonth(), triggerDate.getDate())
          if (triggerDay.getTime() !== today.getTime()) continue

          // آیا قبلاً ارسال شده؟ (برای جلوگیری از duplicate)
          // SmsTransaction در master DB است، بررسی در آنجا
          const alreadySent = await masterDb.smsTransaction.findFirst({
            where: {
              studioId: studio.id,
              type: "send",
              receptor: project.customer?.phone ?? "",
              description: { contains: `automation:${automation.id}:project:${project.id}` },
              createdAt: { gte: today },
            },
          })
          if (alreadySent) continue

          // شماره مشتری
          if (!project.customer?.phone) {
            studioResult.errors.push(`Project ${project.id}: customer phone missing`)
            continue
          }

          // جایگزینی متغیرها در قالب پیامک
          const message = renderTemplate(automation.template.templateText, {
            customer_name: project.customer.name,
            project_date: project.startDatetime?.toLocaleDateString("fa-IR") ?? "",
            studio_name: studio.name,
          })

          // ارسال پیامک
          const result = await sendSms(
            studio.id,
            project.customer.phone,
            message
          )

          if (result.status === "sent") {
            studioResult.sent++
            // آپدیت تراکنش با description برای جلوگیری از duplicate
            if (result.messageId) {
              await masterDb.smsTransaction.updateMany({
                where: { kavenegarMessageId: result.messageId },
                data: {
                  description: `automation:${automation.id}:project:${project.id}`,
                },
              })
            }
          } else {
            studioResult.failed++
            studioResult.errors.push(`Project ${project.id}: ${result.error}`)
          }
        }
      }
    } catch (e: any) {
      studioResult.errors.push(`Exception: ${e?.message}`)
    }

    results.push(studioResult)
  }

  const totals = results.reduce(
    (acc, r) => ({
      sent: acc.sent + r.sent,
      failed: acc.failed + r.failed,
    }),
    { sent: 0, failed: 0 }
  )

  return NextResponse.json({
    ok: true,
    runAt: now.toISOString(),
    totals,
    studios: results,
  })
}

/**
 * جایگزینی متغیرها در قالب پیامک
 * متغیرها: {customer_name}, {project_date}, {studio_name}
 */
function renderTemplate(template: string, vars: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value)
  }
  return result
}
