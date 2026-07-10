import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  if (!["admin", "manager"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params
  const body = (await req.json().catch(() => ({}))) as { isPriceFrozen?: boolean }

  const project = await db.project.findUnique({ where: { id } })
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await db.project.update({
    where: { id },
    data: { isPriceFrozen: Boolean(body.isPriceFrozen) },
  })

  return NextResponse.json({
    id: updated.id,
    isPriceFrozen: updated.isPriceFrozen,
  })
}
