import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { EXPENSE_CATEGORIES } from "@/lib/constants"

type Ctx = { params: Promise<{ id: string }> }

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export async function PATCH(req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return forbidden()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { title, amount, category, description, date, receiptImage } = body as {
    title?: string
    amount?: number
    category?: string
    description?: string | null
    date?: string
    receiptImage?: string | null
  }

  const existing = await db.expense.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 })
  }

  if (category !== undefined && !EXPENSE_CATEGORIES.includes(category as never)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 })
  }
  if (amount !== undefined && Number(amount) <= 0) {
    return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 })
  }

  const updated = await db.expense.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(amount !== undefined ? { amount: Number(amount) } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(description !== undefined
        ? {
            description:
              typeof description === "string" && description.trim()
                ? description.trim()
                : null,
          }
        : {}),
      ...(date !== undefined ? { date: new Date(date) } : {}),
      ...(receiptImage !== undefined ? { receiptImage: receiptImage || null } : {}),
    },
  })

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    amount: Number(updated.amount),
    category: updated.category,
    description: updated.description,
    date: updated.date,
    receiptImage: updated.receiptImage,
    createdAt: updated.createdAt,
  })
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return forbidden()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const { id } = await params

  const existing = await db.expense.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 })
  }

  await db.expense.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
