import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentRole, getCurrentUser } from "@/lib/auth-helpers"
import {
  canTransitionTrack,
  NEXT_STAGE,
  overallStatus,
  tracksForCategory,
  normalizeStatus,
  PROJECT_STATUSES,
  type ProjectStatus,
  type Role,
  type WorkflowTrack,
} from "@/lib/constants"
import { getEffectivePrice } from "@/lib/pricing"

type Ctx = { params: Promise<{ id: string }> }

// PATCH /api/projects/[id]/status
// Body: { track?: "photo"|"video", stage: ProjectStatus }
// - If track is provided, updates that track's status (dual-track).
// - If no track, updates the overall status (legacy/single-track).
// Auto-advances: marks the current stage's workflow row as completed, creates
// the next stage's row with startedAt=now.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const role = await getCurrentRole() as Role
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
    const db = await getCurrentStudioDb()
    if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

    const { id } = await params
    const body = (await req.json().catch(() => ({}))) as {
      track?: WorkflowTrack
      stage?: string
      status?: string // legacy alias for stage
    }

    const stageStr = body.stage || body.status
    if (!stageStr || !PROJECT_STATUSES.includes(stageStr as ProjectStatus)) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 })
    }
    const nextStage = stageStr as ProjectStatus

    const project = await db.project.findUnique({
      where: { id },
      include: {
        servicePackage: true,
        fieldTeam: true,
        studioTeam: true,
        payments: { where: { isConfirmed: true } },
        workflows: true,
      },
    })
    if (!project) return NextResponse.json({ error: "پروژه یافت نشد" }, { status: 404 })

    // Determine which tracks to update
    const tracks = body.track ? [body.track] : tracksForCategory(project.servicePackage.category)
    const now = new Date()
    const updateData: Record<string, unknown> = {}

    for (const track of tracks) {
      const currentStatus = (track === "photo" ? project.photoStatus : project.videoStatus) as ProjectStatus
      const normalizedCurrent = normalizeStatus(currentStatus) as ProjectStatus
      if (!canTransitionTrack(normalizedCurrent, nextStage, role)) {
        return NextResponse.json(
          { error: `غیرمجاز: ${normalizedCurrent} → ${nextStage} برای نقش ${role}` },
          { status: 403 }
        )
      }

      // Update the track status field
      if (track === "photo") updateData.photoStatus = nextStage
      else updateData.videoStatus = nextStage

      // Mark current stage's workflow row as completed
      const currentWorkflow = project.workflows.find(
        (w) => w.track === track && w.stage === normalizedCurrent
      )
      if (currentWorkflow && !currentWorkflow.completedAt) {
        await db.projectWorkflow.update({
          where: { id: currentWorkflow.id },
          data: { completedAt: now },
        })
      }

      // Create/update the next stage's workflow row with startedAt
      const existingNext = project.workflows.find(
        (w) => w.track === track && w.stage === nextStage
      )
      if (existingNext) {
        if (!existingNext.startedAt) {
          await db.projectWorkflow.update({
            where: { id: existingNext.id },
            data: { startedAt: now },
          })
        }
      } else {
        await db.projectWorkflow.create({
          data: {
            projectId: id,
            track,
            stage: nextStage,
            startedAt: now,
            isAuto: false,
          },
        })
      }

      // Track-specific side effects
      // (actualStartDatetime/actualEndDatetime removed from schema)
    }

    // Compute the overall status from the (potentially updated) track statuses
    const newPhotoStatus = (updateData.photoStatus as string) || project.photoStatus
    const newVideoStatus = (updateData.videoStatus as string) || project.videoStatus
    // For mix projects, videoStatus is also tracked. For photo-only, videoStatus stays "scheduled" and we use photoStatus.
    const isMix = project.servicePackage.category === "mix"
    const overall = isMix
      ? overallStatus(newPhotoStatus, newVideoStatus)
      : overallStatus(newPhotoStatus, null)
    updateData.status = overall

    // Golden Tick: when ANY track reaches "ready", set ready fields
    if (tracks.some((t) => (t === "photo" ? updateData.photoStatus : updateData.videoStatus) === "ready")) {
      if (!project.isReadyForDelivery) {
        updateData.isReadyForDelivery = true
        updateData.readyDate = now
        const totalPaid = project.payments.reduce((s, p) => s + Number(p.amount), 0)
        const priceAtReady = getEffectivePrice({
          pricingStrategy: project.pricingStrategy as never,
          calculatedPrice: project.calculatedPrice,
          lockedPrice: project.lockedPrice,
          isPriceFrozen: project.isPriceFrozen,
          isReadyForDelivery: false,
          readyDate: null,
          priceAtReadyTime: null,
          packageCurrentPrice: project.servicePackage.currentPrice,
          totalConfirmedPaid: totalPaid,
        })
        updateData.priceAtReadyTime = priceAtReady
      }
    }

    // Delivered: salary automation (only when overall is delivered)
    let salaryCreated = 0
    if (overall === "delivered") {
      // Salary automation (idempotent)
      const activeRules = await db.salaryRule.findMany({ where: { isActive: true } })
      const totalPaid = project.payments.reduce((s, p) => s + Number(p.amount), 0)
      const eff = getEffectivePrice({
        pricingStrategy: project.pricingStrategy as never,
        calculatedPrice: project.calculatedPrice,
        lockedPrice: project.lockedPrice,
        isPriceFrozen: project.isPriceFrozen,
        isReadyForDelivery: project.isReadyForDelivery,
        readyDate: project.readyDate,
        priceAtReadyTime: project.priceAtReadyTime,
        packageCurrentPrice: project.servicePackage.currentPrice,
        totalConfirmedPaid: totalPaid,
      })
      const teamMap = [
        ...project.fieldTeam.map((u) => ({ userId: u.id, role: u.role, applyOn: "field_work" as const })),
        ...project.studioTeam.map((u) => ({ userId: u.id, role: u.role, applyOn: "studio_work" as const })),
      ]
      for (const t of teamMap) {
        const rule = activeRules.find((r) => r.role === t.role && r.applyOn === t.applyOn)
        if (!rule) continue
        const exists = await db.salaryRecord.findFirst({
          where: { userId: t.userId, projectId: id, ruleUsedId: rule.id },
          select: { id: true },
        })
        if (exists) continue
        const amt = rule.commissionType === "percent"
          ? Math.round((eff * Number(rule.commissionValue)) / 100)
          : Number(rule.commissionValue)
        await db.salaryRecord.create({
          data: { userId: t.userId, projectId: id, amount: amt, ruleUsedId: rule.id, isPaid: false },
        })
        salaryCreated++
      }
    }

    const updated = await db.project.update({ where: { id }, data: updateData })

    // Notification on ready
    if (overall === "ready" && !project.isReadyForDelivery) {
      await db.notification.create({
        data: {
          title: "پروژه آماده تحویل",
          message: `پروژه ${project.id.slice(-6).toUpperCase()} آماده تحویل شد.`,
          read: false,
          link: "projects",
          refId: id,
        },
      })
    }

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      photoStatus: updated.photoStatus,
      videoStatus: updated.videoStatus,
      isReadyForDelivery: updated.isReadyForDelivery,
      readyDate: updated.readyDate,
      priceAtReadyTime: updated.priceAtReadyTime ? Number(updated.priceAtReadyTime) : null,
      salaryCreated,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/projects/[id]/status — auto-transition check (called periodically
// or on dashboard load). Advances scheduled→running if startDatetime is within
// 7 days, and running→managing if endDatetime has passed.
export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const db = await getCurrentStudioDb()
    if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
    const { id } = await params
    const project = await db.project.findUnique({
      where: { id },
      include: { servicePackage: true, workflows: true },
    })
    if (!project) return NextResponse.json({ error: "پروژه یافت نشد" }, { status: 404 })

    const tracks = tracksForCategory(project.servicePackage.category)
    const now = new Date()
    const updateData: Record<string, unknown> = {}
    let changed = false

    for (const track of tracks) {
      const currentStatus = normalizeStatus(track === "photo" ? project.photoStatus : project.videoStatus) as ProjectStatus
      // Auto: scheduled → running (when startDatetime is within 7 days or passed)
      if (currentStatus === "scheduled" && project.startDatetime) {
        const daysUntil = (project.startDatetime.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        if (daysUntil <= 7) {
          if (track === "photo") updateData.photoStatus = "running"
          else updateData.videoStatus = "running"
          changed = true
          // Mark workflow
          const wf = project.workflows.find((w) => w.track === track && w.stage === "scheduled")
          if (wf && !wf.completedAt) {
            await db.projectWorkflow.update({ where: { id: wf.id }, data: { completedAt: now } })
          }
          await db.projectWorkflow.upsert({
            where: { projectId_track_stage: { projectId: id, track, stage: "running" } },
            create: { projectId: id, track, stage: "running", startedAt: now, isAuto: true },
            update: { startedAt: now, isAuto: true },
          })
        }
      }
      // Auto: running → managing (when endDatetime passes)
      if (currentStatus === "running" && project.endDatetime && project.endDatetime < now) {
        if (track === "photo") updateData.photoStatus = "managing"
        else updateData.videoStatus = "managing"
        changed = true
        const wf = project.workflows.find((w) => w.track === track && w.stage === "running")
        if (wf && !wf.completedAt) {
          await db.projectWorkflow.update({ where: { id: wf.id }, data: { completedAt: now } })
        }
        await db.projectWorkflow.upsert({
          where: { projectId_track_stage: { projectId: id, track, stage: "managing" } },
          create: { projectId: id, track, stage: "managing", startedAt: now, isAuto: true },
          update: { startedAt: now },
        })
      }
    }

    if (changed) {
      const newPhoto = (updateData.photoStatus as string) || project.photoStatus
      const newVideo = (updateData.videoStatus as string) || project.videoStatus
      const isMix = project.servicePackage.category === "mix"
      updateData.status = isMix ? overallStatus(newPhoto, newVideo) : overallStatus(newPhoto, null)
      await db.project.update({ where: { id }, data: updateData })
    }

    return NextResponse.json({ ok: true, changed, updated: changed ? updateData : null })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

