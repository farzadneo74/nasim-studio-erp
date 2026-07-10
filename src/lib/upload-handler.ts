/**
 * Shared upload handler — used by all upload routes (user-notes, customer-notes,
 * messages, etc.) to funnel files through the centralized AttachmentService.
 */
import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentStudioDbName, getCurrentUser } from "@/lib/auth-helpers"
import { uploadAttachment, type OwnerType } from "@/lib/attachment-service"

export async function handleAttachmentUpload(
  req: NextRequest,
  ownerType: OwnerType,
  ownerId: string,
  extraFormData?: { conversationId?: string }
): Promise<NextResponse> {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
    const db = await getCurrentStudioDb()
    if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
    const studioId = await getCurrentStudioDbName()
    if (!studioId) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

    const formData = await req.formData()
    const file = formData.get("file")
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "فایل ارسال نشده است" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await uploadAttachment(db, {
      studioId,
      ownerType,
      ownerId,
      uploadedById: user.userId,
      uploadedByName: user.name,
      file: { name: file.name, type: file.type, buffer },
    })

    return NextResponse.json({
      id: result.id,
      type: result.category,
      url: result.url,
      thumbUrl: result.thumbUrl,
      name: result.fileName,
      size: result.sizeBytes,
      mime: result.mimeType,
      width: result.width,
      height: result.height,
    }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
