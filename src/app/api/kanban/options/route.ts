import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb } from "@/lib/auth-helpers"
import { getCurrentUser } from "@/lib/auth"
import { ROLE_LABELS, type Role } from "@/lib/constants"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest) {
  const db = await getCurrentStudioDb()
  if (!db) return NextResponse.json({ users: [], projects: [], customers: [] })
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ users: [], projects: [], customers: [] })
  const [users, projects, customers] = await Promise.all([
    db.user.findMany({ orderBy: [{ role: "asc" }, { firstName: "asc" }], select: { id: true, firstName: true, lastName: true, role: true, isAvailable: true } }),
    db.project.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { contract: { select: { contractNumber: true, customer: { select: { id: true, name: true } } } }, servicePackage: { select: { title: true, category: true } } } }),
    db.customer.findMany({ orderBy: { lastInteraction: "desc" }, take: 200, select: { id: true, name: true, phone: true } }),
  ])
  return NextResponse.json({
    users: users.map((u) => ({ id: u.id, fullName: `${u.firstName} ${u.lastName}`, role: u.role, roleLabel: ROLE_LABELS[u.role as Role] ?? u.role, isAvailable: u.isAvailable })),
    projects: projects.map((p) => ({ id: p.id, contractNumber: p.contract.contractNumber, customerId: p.contract.customer.id, customerName: p.contract.customer.name, packageTitle: p.servicePackage.title, status: p.status })),
    customers: customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone })),
  })
}
