import { NextRequest, NextResponse } from "next/server"
import { getCurrentRole } from "@/lib/auth-helpers"
import { handleAttachmentUpload } from "@/lib/upload-handler"

export async function POST(req: NextRequest) {
  const role = await getCurrentRole()
  if (!role) return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
  return handleAttachmentUpload(req, "user_note", "pending")
}
