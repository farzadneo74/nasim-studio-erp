import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

export async function GET() {
  const role = await getCurrentRole()
  if (role !== "admin" && role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  const rows = await db.sMSTemplate.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  })

  return NextResponse.json(
    rows.map((t) => ({
      id: t.id,
      name: t.name,
      templateText: t.templateText,
      isActive: t.isActive,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }))
  )
}

export async function POST(req: NextRequest) {
  const role = await getCurrentRole()
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden: admin only" }, { status: 403 })
  }
  // دریافت دیتابیس استودیوی فعال
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const name = String(body.name || "").trim()
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })

  const templateText = String(body.templateText || "").trim()
  if (!templateText) {
    return NextResponse.json({ error: "Template text is required" }, { status: 400 })
  }

  const isActive = body.isActive === undefined ? true : Boolean(body.isActive)

  const created = await db.sMSTemplate.create({
    data: { name, templateText, isActive },
  })

  return NextResponse.json(
    {
      id: created.id,
      name: created.name,
      templateText: created.templateText,
      isActive: created.isActive,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    },
    { status: 201 }
  )
}

