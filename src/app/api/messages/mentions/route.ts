import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentRole } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"

/**
 * GET /api/messages/mentions?type=customer|project|payment&search=...&customerId=...
 *
 * Returns a filtered, searchable list of customers/projects/payments for the
 * @-mention picker in the messenger composer.
 *
 *  - type=customer: search by name OR phone. Returns all customers (limited).
 *  - type=project:  if `customerId` is provided, returns only that customer's
 *                   projects; otherwise returns recent projects. Supports search
 *                   by project title / customer name.
 *  - type=payment:  if `customerId` is provided, returns only payments for that
 *                   customer's projects; otherwise returns recent payments.
 *                   Supports search.
 */
export async function GET(req: NextRequest) {
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
  const role = await getCurrentRole()
  if (!role) return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const type = (searchParams.get("type") || "customer") as "customer" | "project" | "payment"
  const search = (searchParams.get("search") || "").trim()
  const customerId = (searchParams.get("customerId") || "").trim()
  const limit = Math.min(50, Number(searchParams.get("limit") || 30))

  try {
    if (type === "customer") {
      const where: Record<string, unknown> = {}
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { phone: { contains: search } },
          { extraPhones: { contains: search } },
        ]
      }
      const customers = await db.customer.findMany({
        where,
        select: {
          id: true,
          name: true,
          phone: true,
          customerType: true,
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
      })
      return NextResponse.json({
        items: customers.map((c) => ({
          id: c.id,
          label: `${c.name} — ${c.phone}`,
          name: c.name,
          phone: c.phone,
          type: c.customerType,
        })),
      })
    }

    if (type === "project") {
      // If a customer is tagged, only their projects.
      const customerFilter = customerId
        ? { contract: { customerId } }
        : search
          ? {
              OR: [
                { contract: { customer: { name: { contains: search } } } },
                { contract: { customer: { phone: { contains: search } } } },
                { servicePackage: { title: { contains: search } } },
              ],
            }
          : {}

      const projects = await db.project.findMany({
        where: customerFilter as Record<string, unknown>,
        select: {
          id: true,
          status: true,
          startDatetime: true,
          contract: {
            select: {
              contractNumber: true,
              customer: { select: { id: true, name: true, phone: true } },
            },
          },
          servicePackage: { select: { title: true } },
        },
        orderBy: { startDatetime: "desc" },
        take: limit,
      })
      return NextResponse.json({
        items: projects.map((p) => ({
          id: p.id,
          label: `${p.servicePackage?.title || "پروژه"} — ${p.contract?.customer?.name || ""} (${p.contract?.contractNumber || ""})`,
          customerName: p.contract?.customer?.name || "",
          packageTitle: p.servicePackage?.title || "",
          contractNumber: p.contract?.contractNumber || "",
          status: p.status,
        })),
      })
    }

    if (type === "payment") {
      // Payments linked to projects of the (optionally) tagged customer.
      const customerFilter = customerId
        ? { project: { contract: { customerId } } }
        : search
          ? {
              OR: [
                { project: { contract: { customer: { name: { contains: search } } } } },
                { project: { contract: { customer: { phone: { contains: search } } } } },
                { project: { servicePackage: { title: { contains: search } } } },
              ],
            }
          : {}

      const payments = await db.payment.findMany({
        where: customerFilter as Record<string, unknown>,
        select: {
          id: true,
          amount: true,
          paymentType: true,
          method: true,
          isConfirmed: true,
          datePaid: true,
          project: {
            select: {
              id: true,
              contract: {
                select: {
                  contractNumber: true,
                  customer: { select: { id: true, name: true } },
                },
              },
              servicePackage: { select: { title: true } },
            },
          },
        },
        orderBy: { datePaid: "desc" },
        take: limit,
      })
      return NextResponse.json({
        items: payments.map((p) => ({
          id: p.id,
          label: `${Number(p.amount).toLocaleString("fa-IR")} ریال — ${p.project?.servicePackage?.title || ""} — ${p.project?.contract?.customer?.name || ""}`,
          amount: Number(p.amount),
          paymentType: p.paymentType,
          method: p.method,
          isConfirmed: p.isConfirmed,
          customerName: p.project?.contract?.customer?.name || "",
          packageTitle: p.project?.servicePackage?.title || "",
        })),
      })
    }

    return NextResponse.json({ items: [] })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg, items: [] }, { status: 500 })
  }
}

