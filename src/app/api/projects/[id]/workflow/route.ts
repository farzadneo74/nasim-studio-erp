import { NextRequest, NextResponse } from "next/server"
import { getCurrentStudioDb, getCurrentRole, getCurrentUser } from "@/lib/auth-helpers"
import {
  tracksForCategory,
  STAGE_ASSIGNEE_ROLES,
  MANUAL_STAGES,
  type WorkflowTrack,
} from "@/lib/constants"

type Ctx = { params: Promise<{ id: string }> }

// GET /api/projects/[id]/workflow — returns the workflow state for a project:
// { tracks: [{ track, stages: [{ stage, assignee, startedAt, completedAt, isAuto }] }] }
export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const db = await getCurrentStudioDb()
    if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })
    const { id } = await params
    const project = await db.project.findUnique({
      where: { id },
      include: { servicePackage: true, workflows: { include: { assignee: { select: { id: true, firstName: true, lastName: true, role: true } } } } },
    })
    if (!project) return NextResponse.json({ error: "پروژه یافت نشد" }, { status: 404 })

    const tracks = tracksForCategory(project.servicePackage.category)
    const result = tracks.map((track: WorkflowTrack) => {
      const currentStatus = track === "photo" ? project.photoStatus : project.videoStatus
      return {
        track,
        currentStatus,
        stages: MANUAL_STAGES.map((stage) => {
          const wf = project.workflows.find((w) => w.track === track && w.stage === stage)
          return {
            stage,
            assignee: wf?.assignee ?? null,
            assigneeId: wf?.assigneeId ?? null,
            startedAt: wf?.startedAt?.toISOString() ?? null,
            completedAt: wf?.completedAt?.toISOString() ?? null,
            isAuto: wf?.isAuto ?? false,
            allowedRoles: STAGE_ASSIGNEE_ROLES[stage] || [],
          }
        }),
      }
    })

    return NextResponse.json({
      tracks: result,
      category: project.servicePackage.category,
      project: {
        isPriceFrozen: project.isPriceFrozen,
        exemptFromPhotoPriceUpdate: project.exemptFromPhotoPriceUpdate,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PUT /api/projects/[id]/workflow — set the assignee for a stage.
// Body: { track: "photo"|"video", stage: string, assigneeId: string|null }
// Admin/manager only.
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const role = await getCurrentRole()
    if (!["admin", "manager"].includes(role)) {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 })
    }
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "نشست معتبر نیست" }, { status: 401 })
    const db = await getCurrentStudioDb()
    if (!db) return NextResponse.json({ error: "استودیو انتخاب نشده" }, { status: 400 })

    const { id } = await params
    const body = (await req.json().catch(() => ({}))) as {
      track: WorkflowTrack
      stage: string
      assigneeId: string | null
    }

    if (!body.track || !body.stage) {
      return NextResponse.json({ error: "track و stage الزامی است" }, { status: 400 })
    }

    // Verify the assignee exists (if provided) — allow any employee to be assigned
    if (body.assigneeId) {
      const assignee = await db.user.findUnique({ where: { id: body.assigneeId }, select: { id: true, role: true } })
      if (!assignee) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 })
      // No role restriction — the manager decides who to assign
    }

    // Upsert the workflow row
    const wf = await db.projectWorkflow.upsert({
      where: {
        projectId_track_stage: { projectId: id, track: body.track, stage: body.stage },
      },
      create: {
        projectId: id,
        track: body.track,
        stage: body.stage,
        assigneeId: body.assigneeId,
      },
      update: {
        assigneeId: body.assigneeId,
      },
      include: { assignee: { select: { id: true, firstName: true, lastName: true, role: true } } },
    })

    // اگر مسئولی مشخص شد، برای او نوتیفیکیشن و کارت کانبان ایجاد کن
    if (body.assigneeId) {
      // دریافت اطلاعات پروژه — فقط include استفاده می‌شود (نه select)
      const project = await db.project.findUnique({
        where: { id },
        include: { servicePackage: { select: { title: true } } },
      })
      const projectTitle = project?.servicePackage?.title || "پروژه"
      const stageLabel: Record<string, string> = {
        managing: "در حال مدیریت",
        editing: "در حال ادیت و تدوین",
        qc: "کنترل کیفیت",
        render: "چاپ و رندر",
        ready: "آماده تحویل",
        delivered: "تحویل داده شد",
      }
      const label = stageLabel[body.stage] || body.stage

      // Create notification
      await db.notification.create({
        data: {
          userId: body.assigneeId,
          title: "کار جدید محول شد",
          message: `پروژه «${projectTitle}» — مرحله: ${label} به شما محول شد.`,
          type: "info",
          read: false,
          link: "projects",
          refId: id,
        },
      }).catch(() => {})

      // Create or find a "در صف" kanban column for the assignee
      let queueColumn = await db.kanbanColumn.findFirst({
        where: { userId: body.assigneeId, title: "در صف" },
        select: { id: true },
      })
      if (!queueColumn) {
        queueColumn = await db.kanbanColumn.create({
          data: {
            userId: body.assigneeId,
            title: "در صف",
            color: "#64748b",
            order: 0,
          },
        })
      }

      // Check if a card already exists for this project+stage+user
      const existingCard = await db.kanbanCard.findFirst({
        where: {
          userId: body.assigneeId,
          sourceProjectId: id,
          title: { contains: projectTitle },
        },
        select: { id: true },
      })
      if (!existingCard) {
        await db.kanbanCard.create({
          data: {
            columnId: queueColumn.id,
            userId: body.assigneeId,
            title: `${projectTitle} — ${label}`,
            description: `مرحله: ${label} | مسیر: ${body.track === "photo" ? "عکس" : "فیلم"}`,
            order: 0,
            sourceProjectId: id,
          },
        })
      }
    }

    return NextResponse.json({ ok: true, workflow: wf })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "خطای ناشناخته"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

