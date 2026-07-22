import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { handleAttachmentUpload } from "@/lib/upload-handler"
import { CAN_MANAGE_CUSTOMERS } from "@/lib/constants"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const role = await getCurrentRole()
  if (!role) return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
  if (!CAN_MANAGE_CUSTOMERS.includes(role)) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 })
  const { id } = await params
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const customer = await db.customer.findUnique({ where: { id }, select: { id: true } })
  if (!customer) return NextResponse.json({ error: "مشتری یافت نشد" }, { status: 404 })
  return handleAttachmentUpload(req, "customer_note", id)
}
