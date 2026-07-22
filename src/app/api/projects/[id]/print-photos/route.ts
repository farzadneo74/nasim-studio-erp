import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentUser } from "@/lib/auth-helpers"
import { PHOTO_LOCATION_LABELS } from "@/lib/constants"

export const dynamic = "force-dynamic"

type Ctx = { params: Promise<{ id: string }> }

// GET /api/projects/[id]/print-photos — list all print photo selections for a project
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
    const db = await getCurrentStudioDb()
    if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
    const { id } = await params

    const items = await db.projectPrintPhoto.findMany({
      where: { projectId: id },
      include: {
        printPhotoPrice: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      items: items.map((p) => ({
        id: p.id,
        printPhotoPriceId: p.printPhotoPriceId,
        quantity: p.quantity,
        exemptFromPriceUpdate: p.exemptFromPriceUpdate,
        frozenPrice: p.frozenPrice ? Number(p.frozenPrice) : null,
        price: {
          id: p.printPhotoPrice.id,
          size: p.printPhotoPrice.size,
          paperType: p.printPhotoPrice.paperType,
          laminateType: p.printPhotoPrice.laminateType,
          photoLocation: p.printPhotoPrice.photoLocation,
          photoLocationLabel: PHOTO_LOCATION_LABELS[p.printPhotoPrice.photoLocation] || p.printPhotoPrice.photoLocation,
          price: Number(p.printPhotoPrice.price),
        },
        unitPrice: p.exemptFromPriceUpdate && p.frozenPrice ? Number(p.frozenPrice) : Number(p.printPhotoPrice.price),
        total: (p.exemptFromPriceUpdate && p.frozenPrice ? Number(p.frozenPrice) : Number(p.printPhotoPrice.price)) * p.quantity,
        createdAt: p.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/projects/[id]/print-photos — add a print photo selection
// Body: { printPhotoPriceId: string, quantity: number }
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
    const db = await getCurrentStudioDb()
    if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
    const { id } = await params

    const body = await req.json().catch(() => ({}))
    const { printPhotoPriceId, quantity } = body as { printPhotoPriceId?: string; quantity?: number }

    if (!printPhotoPriceId) {
      return NextResponse.json({ error: "انتخاب عکس چاپی الزامی است" }, { status: 400 })
    }
    const qty = Math.max(1, parseInt(String(quantity || 1), 10))

    // Verify the print photo price exists
    const ppp = await db.printPhotoPrice.findUnique({ where: { id: printPhotoPriceId } })
    if (!ppp) return NextResponse.json({ error: "قیمت عکس چاپی یافت نشد" }, { status: 404 })

    // Check if project is exempt from price updates — if so, freeze the price
    const project = await db.project.findUnique({ where: { id }, select: { exemptFromPhotoPriceUpdate: true } })
    const isExempt = project?.exemptFromPhotoPriceUpdate ?? false

    const created = await db.projectPrintPhoto.create({
      data: {
        projectId: id,
        printPhotoPriceId,
        quantity: qty,
        exemptFromPriceUpdate: isExempt,
        frozenPrice: isExempt ? ppp.price : null,
      },
      include: { printPhotoPrice: true },
    })

    return NextResponse.json({
      id: created.id,
      quantity: created.quantity,
      exemptFromPriceUpdate: created.exemptFromPriceUpdate,
      price: {
        id: ppp.id,
        size: ppp.size,
        paperType: ppp.paperType,
        laminateType: ppp.laminateType,
        photoLocation: ppp.photoLocation,
        photoLocationLabel: PHOTO_LOCATION_LABELS[ppp.photoLocation] || ppp.photoLocation,
        price: Number(ppp.price),
      },
      unitPrice: Number(ppp.price),
      total: Number(ppp.price) * qty,
    }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

