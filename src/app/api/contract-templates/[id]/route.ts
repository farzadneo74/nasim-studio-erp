import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

/**
 * GET /api/contract-templates/[id]
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole()
  if (!role) return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })

  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params
  try {
    const template = await (db as any).contractTemplate.findUnique({ where: { id } })
    if (!template) return NextResponse.json({ error: "قالب یافت نشد" }, { status: 404 })
    return NextResponse.json(template)
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}

/**
 * PATCH /api/contract-templates/[id]
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole()
  if (!role) return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
  if (!["admin", "manager"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params
  const body = await req.json()

  // اگه پیش‌فرض شد، بقیه رو غیرپیش‌فرض کن
  if (body.isDefault) {
    try {
      await (db as any).contractTemplate.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      })
    } catch { /* ignore */ }
  }

  const data: Record<string, unknown> = {}
  if (typeof body.name === "string") data.name = body.name
  if (typeof body.htmlContent === "string") data.htmlContent = body.htmlContent
  if (typeof body.cssContent === "string") data.cssContent = body.cssContent
  if (typeof body.isDefault === "boolean") data.isDefault = body.isDefault
  if (typeof body.isActive === "boolean") data.isActive = body.isActive

  try {
    const updated = await (db as any).contractTemplate.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * DELETE /api/contract-templates/[id]
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole()
  if (!role) return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
  if (!["admin", "manager"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params
  try {
    await (db as any).contractTemplate.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
