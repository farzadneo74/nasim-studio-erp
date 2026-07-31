import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

/**
 * GET /api/contract-templates
 * لیست تمام قالب‌های قرارداد
 */
export async function GET() {
  const role = await getCurrentRole()
  if (!role) return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })

  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  try {
    const templates = await (db as any).contractTemplate.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    })
    return NextResponse.json({ items: templates })
  } catch {
    return NextResponse.json({ items: [], error: "Table not found" })
  }
}

/**
 * POST /api/contract-templates
 * ایجاد قالب جدید (admin/manager)
 */
export async function POST(req: NextRequest) {
  const role = await getCurrentRole()
  if (!role) return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
  if (!["admin", "manager"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const body = await req.json()
  const { name, htmlContent, cssContent, isDefault } = body

  if (!name || !htmlContent) {
    return NextResponse.json({ error: "نام و محتوای HTML الزامی است" }, { status: 400 })
  }

  // اگه این قالب پیش‌فرض است، بقیه رو غیرپیش‌فرض کن
  if (isDefault) {
    try {
      await (db as any).contractTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      })
    } catch { /* ignore */ }
  }

  try {
    const template = await (db as any).contractTemplate.create({
      data: {
        name,
        htmlContent,
        cssContent: cssContent || "",
        isDefault: Boolean(isDefault),
        isActive: true,
      },
    })
    return NextResponse.json(template, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
