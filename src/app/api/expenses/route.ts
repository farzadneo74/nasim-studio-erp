import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { EXPENSE_CATEGORIES } from "@/lib/constants"

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

export async function GET(req: Request) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return forbidden()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const url = new URL(req.url)
  const category = url.searchParams.get("category")
  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")
  const search = url.searchParams.get("search")?.trim()

  const where: Record<string, unknown> = {}
  if (category && EXPENSE_CATEGORIES.includes(category as never)) where.category = category
  if (from || to) {
    where.date = {}
    if (from) (where.date as { gte?: Date }).gte = new Date(from)
    if (to) (where.date as { lte?: Date }).lte = new Date(to)
  }
  if (search) {
    where.title = { contains: search }
  }

  const expenses = await db.expense.findMany({
    where,
    orderBy: { date: "desc" },
  })

  return NextResponse.json(
    expenses.map((e) => ({
      id: e.id,
      title: e.title,
      amount: Number(e.amount),
      category: e.category,
      description: e.description,
      date: e.date,
      receiptImage: e.receiptImage,
      createdAt: e.createdAt,
    }))
  )
}

export async function POST(req: Request) {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") return forbidden()
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const { title, amount, category, description, date, receiptImage } = body as {
    title?: string
    amount?: number
    category?: string
    description?: string
    date?: string
    receiptImage?: string
  }

  if (!title || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }
  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 })
  }
  if (!category || !EXPENSE_CATEGORIES.includes(category as never)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 })
  }

  const expense = await db.expense.create({
    data: {
      title: title.trim(),
      amount: Number(amount),
      category,
      description:
        typeof description === "string" && description.trim() ? description.trim() : null,
      date: date ? new Date(date) : new Date(),
      receiptImage: receiptImage || null,
    },
  })

  return NextResponse.json({
    id: expense.id,
    title: expense.title,
    amount: Number(expense.amount),
    category: expense.category,
    description: expense.description,
    date: expense.date,
    receiptImage: expense.receiptImage,
    createdAt: expense.createdAt,
  })
}
