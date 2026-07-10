"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Save, Image as ImageIcon, MessageSquare, Info, FileText, Bell, Volume2, Play, Square } from "lucide-react"
import { toast } from "sonner"

import { useApi } from "@/lib/api/client"
import { useWorkspace } from "@/stores/workspace"
import { ROLE_PERMISSIONS } from "@/lib/constants"
import {
  previewAlarm,
  reloadReminderSettings,
  type ReminderSettings,
} from "@/lib/reminders/reminder-notifications"

import { PageHeader, EmptyState, SectionCard } from "./_shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

interface Setting {
  id: string
  key: string
  value: string
}

const SMS_PROVIDERS = [
  { value: "kavenegar", label: "کاوه‌نگار (نسخه ۱)" },
  { value: "kavenegar-v2", label: "کاوه‌نگار (نسخه ۲)" },
  { value: "disabled", label: "غیرفعال" },
]

export function SettingsSystemView() {
  const role = useWorkspace((s) => s.role)
  const canManage = ROLE_PERMISSIONS[role]?.system
  const canView = role === "admin" || role === "manager"
  const api = useApi()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<Setting[]>({
    queryKey: ["system-settings"],
    queryFn: () => api.get("/api/system"),
    enabled: canView,
  })

  // Image compression form
  const defaultImg = { maxWidth: 1920, maxHeight: 1080, quality: 82 }
  const [img, setImg] = React.useState(defaultImg)
  const [imgDirty, setImgDirty] = React.useState(false)

  // SMS form
  const defaultSms = { active: false, provider: "disabled" as string }
  const [sms, setSms] = React.useState(defaultSms)
  const [smsDirty, setSmsDirty] = React.useState(false)

  // Default contract text form
  const [contractText, setContractText] = React.useState("")
  const [contractDirty, setContractDirty] = React.useState(false)

  // Hydrate from server once available
  React.useEffect(() => {
    if (!data) return
    const imgSetting = data.find((s) => s.key === "image_compression")
    if (imgSetting) {
      try {
        const parsed = JSON.parse(imgSetting.value)
        setImg({
          maxWidth: Number(parsed.maxWidth) || 1920,
          maxHeight: Number(parsed.maxHeight) || 1080,
          quality: Number(parsed.quality) || 82,
        })
        setImgDirty(false)
      } catch {
        /* ignore */
      }
    }
    const smsSetting = data.find((s) => s.key === "sms_provider")
    if (smsSetting) {
      try {
        const parsed = JSON.parse(smsSetting.value)
        setSms({
          active: Boolean(parsed.active),
          provider: String(parsed.provider || "disabled"),
        })
        setSmsDirty(false)
      } catch {
        /* ignore */
      }
    }
    const contractSetting = data.find((s) => s.key === "contract_default_text")
    if (contractSetting) {
      // Value is stored as a JSON string; parse to get the plain text.
      let text = ""
      try {
        const parsed = JSON.parse(contractSetting.value)
        if (typeof parsed === "string") text = parsed
        else if (parsed && typeof parsed.text === "string") text = parsed.text
      } catch {
        text = contractSetting.value
      }
      setContractText(text)
      setContractDirty(false)
    } else {
      setContractText("")
      setContractDirty(false)
    }
  }, [data])

  const saveImgMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/system", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": role },
        body: JSON.stringify({
          key: "image_compression",
          value: JSON.stringify(img),
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      }
      return d
    },
    onSuccess: () => {
      toast.success("تنظیمات فشرده‌سازی تصویر ذخیره شد")
      setImgDirty(false)
      qc.invalidateQueries({ queryKey: ["system-settings"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const saveSmsMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/system", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": role },
        body: JSON.stringify({
          key: "sms_provider",
          value: JSON.stringify(sms),
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      }
      return d
    },
    onSuccess: () => {
      toast.success("تنظیمات سرویس پیامک ذخیره شد")
      setSmsDirty(false)
      qc.invalidateQueries({ queryKey: ["system-settings"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const saveContractMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/system", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": role },
        body: JSON.stringify({
          key: "contract_default_text",
          // Store as JSON-string of the plain text (so newlines + special chars survive).
          value: JSON.stringify(contractText),
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      }
      return d
    },
    onSuccess: () => {
      toast.success("متن پیش‌فرض قرارداد ذخیره شد")
      setContractDirty(false)
      qc.invalidateQueries({ queryKey: ["system-settings"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!canView) {
    return (
      <EmptyState
        icon="🔒"
        title="دسترسی محدود"
        description="فقط مدیران سیستم و مدیران می‌توانند تنظیمات سیستم را مشاهده کنند."
      />
    )
  }

  return (
    <div>
      <PageHeader title="سیستم" icon="⚙️" description="هویت استودیو، فشرده‌سازی تصویر و سرویس پیامک" />

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-muted bg-muted/30 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-muted-foreground">
          این تنظیمات روی آپلود تصاویر در یادداشت‌های پروژه و ارسال پیامک اعمال می‌شوند.
        </p>
      </div>

      {/* Studio name */}
      <div className="mb-4">
        <StudioNameCard />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Image compression */}
        <SectionCard
          title="فشرده‌سازی تصویر"
          description="تغییر اندازه و کیفیت اعمال‌شده روی تصاویر آپلودی"
        >
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                پیش‌فرض‌های آپلود
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ic-w">حداکثر عرض (px)</Label>
                  <Input
                    id="ic-w"
                    type="number"
                    min={320}
                    max={8000}
                    value={img.maxWidth}
                    disabled={!canManage}
                    onChange={(e) => {
                      setImg((f) => ({ ...f, maxWidth: Number(e.target.value) || 0 }))
                      setImgDirty(true)
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="ic-h">حداکثر ارتفاع (px)</Label>
                  <Input
                    id="ic-h"
                    type="number"
                    min={320}
                    max={8000}
                    value={img.maxHeight}
                    disabled={!canManage}
                    onChange={(e) => {
                      setImg((f) => ({ ...f, maxHeight: Number(e.target.value) || 0 }))
                      setImgDirty(true)
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label htmlFor="ic-q">کیفیت</Label>
                  <span className="text-sm font-medium tabular-nums">{img.quality}</span>
                </div>
                <Slider
                  id="ic-q"
                  min={50}
                  max={100}
                  step={1}
                  value={[img.quality]}
                  disabled={!canManage}
                  onValueChange={(v) => {
                    setImg((f) => ({ ...f, quality: v[0] }))
                    setImgDirty(true)
                  }}
                />
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>۵۰ (حجم کمتر)</span>
                  <span>۱۰۰ (بهترین کیفیت)</span>
                </div>
              </div>

              {canManage && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => saveImgMut.mutate()}
                    disabled={saveImgMut.isPending || !imgDirty}
                  >
                    <Save className="mr-1.5 h-4 w-4" />
                    {saveImgMut.isPending ? "در حال ذخیره…" : "ذخیره"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* SMS provider */}
        <SectionCard
          title="سرویس پیامک"
          description="درگاه خروجی پیامک برای اعلان‌های مشتری"
        >
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                پیکربندی سرویس
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-card p-3">
                <div>
                  <div className="text-sm font-medium">پیامک فعال</div>
                  <div className="text-xs text-muted-foreground">
                    برای ارسال اعلان‌های پیامکی به مشتری فعال کنید.
                  </div>
                </div>
                <Switch
                  checked={sms.active}
                  disabled={!canManage}
                  onCheckedChange={(v) => {
                    setSms((f) => ({ ...f, active: v }))
                    setSmsDirty(true)
                  }}
                  aria-label="تغییر وضعیت فعال بودن پیامک"
                />
              </div>

              <div>
                <Label>سرویس</Label>
                <Select
                  value={sms.provider}
                  disabled={!canManage}
                  onValueChange={(v) => {
                    setSms((f) => ({ ...f, provider: v }))
                    setSmsDirty(true)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SMS_PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  در حالت غیرفعال، عملیات «ارسال آزمایشی» در صفحه قالب‌های پیامک فقط یک پیام دمو نمایش می‌دهد.
                </p>
              </div>

              {canManage && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => saveSmsMut.mutate()}
                    disabled={saveSmsMut.isPending || !smsDirty}
                  >
                    <Save className="mr-1.5 h-4 w-4" />
                    {saveSmsMut.isPending ? "در حال ذخیره…" : "ذخیره"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Default contract text */}
      <div className="mt-4">
        <SectionCard
          title="تنظیمات قرارداد"
          description="متن پیش‌فرض شروط و شرایط — در پایین هر قرارداد قابل‌چاپ نمایش داده می‌شود."
        >
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-muted-foreground" />
                متن پیش‌فرض قرارداد
              </div>

              <Textarea
                value={contractText}
                disabled={!canManage}
                onChange={(e) => {
                  setContractText(e.target.value)
                  setContractDirty(true)
                }}
                placeholder={
                  "مثال:\n۱. تمامی تصاویر و فیلم‌ها حداکثر تا ۶۰ روز پس از رویداد تحویل مشتری خواهد شد.\n۲. بیعانه دریافتی غیرقابل بازگشت است.\n۳. هرگونه تغییر در پکیج باید پیش از تاریخ اجرا اعلام گردد."
                }
                className="min-h-[180px] resize-y leading-7"
              />

              <p className="text-xs text-muted-foreground">
                این متن در پایین هر قرارداد (بخش «شروط و شرایط») ظاهر می‌شود و در زمان چاپ توسط کاربر قابل ویرایش خواهد بود.
              </p>

              {canManage && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => saveContractMut.mutate()}
                    disabled={saveContractMut.isPending || !contractDirty}
                  >
                    <Save className="mr-1.5 h-4 w-4" />
                    {saveContractMut.isPending ? "در حال ذخیره…" : "ذخیره متن قرارداد"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Reminder settings */}
      <div className="mt-4">
        <ReminderSettingsCard canManage={!!canManage} />
      </div>
    </div>
  )
}

// ============================================================
// Studio name card
// ============================================================
function StudioNameCard() {
  const api = useApi()
  const qc = useQueryClient()
  const canEdit = useWorkspace((s) => s.role) === "admin"
  const { data, isLoading } = useQuery({
    queryKey: ["studio-name"],
    queryFn: () => api.get<{ fa: string; en: string }>("/api/studio-name"),
  })
  const [fa, setFa] = React.useState("")
  const [en, setEn] = React.useState("")
  const [dirty, setDirty] = React.useState(false)

  React.useEffect(() => {
    if (data) {
      setFa(data.fa)
      setEn(data.en)
      setDirty(false)
    }
  }, [data])

  const save = async () => {
    try {
      await api.patch("/api/studio-name", { fa, en })
      toast.success("نام استودیو به‌روزرسانی شد")
      setDirty(false)
      qc.invalidateQueries({ queryKey: ["studio-name"] })
    } catch {
      toast.error("به‌روزرسانی ناموفق بود")
    }
  }

  return (
    <SectionCard
      title="هویت استودیو"
      description="نام استودیو در سراسر سامانه (سایدبار، تاپ‌بار، خروجی‌ها)"
      actions={
        canEdit && dirty ? (
          <Button size="sm" onClick={save}>
            ذخیره
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">نام فارسی</label>
            <Input
              value={fa}
              onChange={(e) => {
                setFa(e.target.value)
                setDirty(true)
              }}
              disabled={!canEdit}
              placeholder="عکاسی نسیم"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">نام انگلیسی</label>
            <Input
              value={en}
              onChange={(e) => {
                setEn(e.target.value)
                setDirty(true)
              }}
              disabled={!canEdit}
              placeholder="NASIM STUDIO"
              dir="ltr"
            />
          </div>
        </div>
      )}
      {!canEdit && (
        <p className="mt-2 text-xs text-muted-foreground">
          فقط مدیر سیستم می‌تواند نام استودیو را تغییر دهد.
        </p>
      )}
    </SectionCard>
  )
}

// ============================================================
// Reminder settings card
// ============================================================

const ALARM_SOUNDS = [
  { value: "/sounds/alarm-1.wav", label: "زنگ کلاسیک (بوق متناوب)" },
  { value: "/sounds/alarm-2.wav", label: "سیرن دوفرکانسه (بالا/پایین)" },
  { value: "/sounds/alarm-3.wav", label: "نوای ملایم (آرپژ صعودی)" },
]

function ReminderSettingsCard({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient()
  const role = useWorkspace((s) => s.role)

  const { data, isLoading } = useQuery<ReminderSettings>({
    queryKey: ["reminder-settings"],
    queryFn: async () => {
      const res = await fetch("/api/reminder-settings", {
        headers: { "x-demo-role": role },
        cache: "no-store",
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      return res.json()
    },
  })

  const defaultSettings: ReminderSettings = {
    alertMode: "notification_and_alarm",
    soundUrl: "/sounds/alarm-1.wav",
    volume: 70,
    loop: true,
  }

  const [settings, setSettings] = React.useState<ReminderSettings>(defaultSettings)
  const [dirty, setDirty] = React.useState(false)
  const [previewing, setPreviewing] = React.useState(false)

  React.useEffect(() => {
    if (data) {
      setSettings(data)
      setDirty(false)
    }
  }, [data])

  const update = (patch: Partial<ReminderSettings>) => {
    setSettings((s) => ({ ...s, ...patch }))
    setDirty(true)
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/reminder-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": role },
        body: JSON.stringify(settings),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      }
      return d
    },
    onSuccess: () => {
      toast.success("تنظیمات یادآوری ذخیره شد")
      setDirty(false)
      qc.invalidateQueries({ queryKey: ["reminder-settings"] })
      // Refresh the client-side notifier's settings cache so the new sound /
      // volume takes effect immediately.
      void reloadReminderSettings()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handlePreview = () => {
    // Preview with the current (unsaved) settings.
    previewAlarm(settings)
    setPreviewing(true)
    // The preview tone is ~1.5s. Reset the button state after.
    setTimeout(() => setPreviewing(false), 1800)
  }

  return (
    <SectionCard
      title="تنظیمات یادآوری"
      description="نوع هشدار، صدای زنگ و حجم — برای یادآورهای سررسیدشده فعال است."
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Bell className="h-4 w-4 text-muted-foreground" />
            پیکربندی هشدار یادآور
          </div>

          {/* Alert mode radio */}
          <div>
            <Label>نوع هشدار</Label>
            <RadioGroup
              value={settings.alertMode}
              onValueChange={(v) => update({ alertMode: v as ReminderSettings["alertMode"] })}
              className="mt-2 gap-2"
              disabled={!canManage}
            >
              <label
                htmlFor="rm-mode-1"
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[[data-state=checked]]:border-amber-500/50 has-[[data-state=checked]]:bg-amber-500/5"
              >
                <RadioGroupItem id="rm-mode-1" value="notification_only" className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">اعلان فقط</div>
                  <div className="text-xs text-muted-foreground">
                    تنها یک اعلان مرورگر (و Toast درون‌صفحه) نمایش داده می‌شود؛ صدایی پخش نمی‌شود.
                  </div>
                </div>
              </label>
              <label
                htmlFor="rm-mode-2"
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[[data-state=checked]]:border-amber-500/50 has-[[data-state=checked]]:bg-amber-500/5"
              >
                <RadioGroupItem id="rm-mode-2" value="notification_and_alarm" className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">اعلان + زنگ</div>
                  <div className="text-xs text-muted-foreground">
                    در کنار اعلان مرورگر، صدای زنگ انتخاب‌شده تا زمان تأیید کاربر پخش می‌شود.
                  </div>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Sound selector (only relevant when alarm is enabled) */}
          <div className={settings.alertMode === "notification_only" ? "pointer-events-none opacity-50" : ""}>
            <Label htmlFor="rm-sound">صدای زنگ</Label>
            <Select
              value={settings.soundUrl}
              disabled={!canManage || settings.alertMode === "notification_only"}
              onValueChange={(v) => update({ soundUrl: v })}
            >
              <SelectTrigger id="rm-sound">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALARM_SOUNDS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Volume slider */}
          <div className={settings.alertMode === "notification_only" ? "pointer-events-none opacity-50" : ""}>
            <div className="mb-2 flex items-center justify-between">
              <Label htmlFor="rm-vol" className="flex items-center gap-1.5">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                حجم صدای زنگ
              </Label>
              <span className="text-sm font-medium tabular-nums">
                {settings.volume}٪
              </span>
            </div>
            <Slider
              id="rm-vol"
              min={0}
              max={100}
              step={1}
              value={[settings.volume]}
              disabled={!canManage || settings.alertMode === "notification_only"}
              onValueChange={(v) => update({ volume: v[0] })}
            />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>بی‌صدا</span>
              <span>حداکثر</span>
            </div>
          </div>

          {/* Loop toggle */}
          <div
            className={`flex items-center justify-between rounded-lg border bg-card p-3 ${
              settings.alertMode === "notification_only" ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <div>
              <div className="text-sm font-medium">تکرار زنگ</div>
              <div className="text-xs text-muted-foreground">
                زنگ تا زمان تأیید یا رد کاربر به‌صورت پیوسته پخش شود.
              </div>
            </div>
            <Switch
              checked={settings.loop}
              disabled={!canManage || settings.alertMode === "notification_only"}
              onCheckedChange={(v) => update({ loop: v })}
              aria-label="تغییر وضعیت تکرار زنگ"
            />
          </div>

          {/* Preview + test */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={handlePreview}
              disabled={previewing || settings.alertMode === "notification_only"}
            >
              {previewing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {previewing ? "در حال پخش…" : "پیش‌نمایش زنگ"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => {
                toast(
                  <>
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 shrink-0 text-amber-500" />
                      <span className="font-semibold">تست هشدار یادآور</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      این یک نمونه‌ی اعلان است. صدای زنگ نیز پخش می‌شود.
                    </p>
                  </>,
                  { duration: 6000, onDismiss: () => {}, onAutoClose: () => {} }
                )
                previewAlarm(settings)
              }}
              disabled={settings.alertMode === "notification_only"}
            >
              <Bell className="h-4 w-4" />
              تست هشدار
            </Button>
          </div>

          {canManage && (
            <div className="flex justify-end">
              <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !dirty}>
                <Save className="mr-1.5 h-4 w-4" />
                {saveMut.isPending ? "در حال ذخیره…" : "ذخیره"}
              </Button>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  )
}
