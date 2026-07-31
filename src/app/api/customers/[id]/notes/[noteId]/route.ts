import { NextResponse } from "next/server"
import { getCurrentRole, getCurrentStudioDb } from "@/lib/auth-helpers"
import { CAN_MANAGE_CUSTOMERS, type Role } from "@/lib/constants"
import { PrismaClient } from "@prisma/client"

// DELETE /api/customers/[id]/notes/[noteId]
// Removes a single CustomerNote row. Only admin/manager/sales (CAN_MANAGE_CUSTOMERS)
// may delete notes. Uses raw SQL for parity with the POST/GET handlers in the
// parent route (the runtime Prisma client may not know about the `attachments`
// column yet during dev).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const role = await getCurrentRole()
  if (!CAN_MANAGE_CUSTOMERS.includes(role as Role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const { id, noteId } = await params

  // Make sure the note belongs to this customer (defensive — prevents accidental
  // cross-customer deletes if a client ever sends a mismatched pair).
  const rows = (await db.$queryRawUnsafe(
    `SELECT id FROM CustomerNote WHERE id = ? AND customerId = ?`,
    noteId,
    id
  )) as { id: string }[]
  if (rows.length === 0) {
    return NextResponse.json({ error: "یادداشت پیدا نشد" }, { status: 404 })
  }

  await db.$executeRawUnsafe(
    `DELETE FROM CustomerNote WHERE id = ? AND customerId = ?`,
    noteId,
    id
  )

  return NextResponse.json({ ok: true, id: noteId })
}

// Re-export the PrismaClient type alias so this file type-checks even if the
// runtime client never gets regenerated (kept for parity with the sibling route).
export type _Db = PrismaClient
