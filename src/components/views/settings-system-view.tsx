"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Save, Image as ImageIcon, MessageSquare, Info, Bell, Volume2, Play, Square, Upload, Bold, Italic, Underline, Smile } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { useApi } from "@/lib/api/client"
import { useWorkspace } from "@/stores/workspace"
import { hasPermission } from "@/lib/constants"
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
  const canManage = hasPermission(role, "system")
  const canView = hasPermission(role, "system")
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

  // SMS form — extended with Kavenegar config
  const defaultSms = { active: false, provider: "disabled" as string, apiKey: "", sender: "", senderNumber: "" }
  const [sms, setSms] = React.useState(defaultSms)
  const [smsDirty, setSmsDirty] = React.useState(false)

  // Logo form
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null)
  const [logoDirty, setLogoDirty] = React.useState(false)
  const logoFileRef = React.useRef<HTMLInputElement | null>(null)

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
          apiKey: String(parsed.apiKey || ""),
          sender: String(parsed.sender || ""),
          senderNumber: String(parsed.senderNumber || ""),
        })
        setSmsDirty(false)
      } catch {
        /* ignore */
      }
    }
    // Logo
    const logoSetting = data.find((s) => s.key === "studio_logo")
    if (logoSetting) {
      try {
        const parsed = JSON.parse(logoSetting.value)
        setLogoUrl(parsed.url || null)
      } catch {
        setLogoUrl(logoSetting.value || null)
      }
      setLogoDirty(false)
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

  const saveLogoMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/system", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-demo-role": role },
        body: JSON.stringify({
          key: "studio_logo",
          value: JSON.stringify({ url: logoUrl }),
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((d as { error?: string })?.error || `Request failed (${res.status})`)
      }
      return d
    },
    onSuccess: () => {
      toast.success("لوگو ذخیره شد")
      setLogoDirty(false)
      qc.invalidateQueries({ queryKey: ["system-settings"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error("حجم فایل باید کمتر از ۲ مگابایت باشد")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setLogoUrl(reader.result as string)
      setLogoDirty(true)
    }
    reader.readAsDataURL(file)
  }

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

      {/* Studio Logo */}
      <div className="mb-4">
        <SectionCard
          title="لوگوی استودیو"
          description="لوگو در قراردادها و خروجی‌های چاپی استفاده می‌شود"
        >
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-white p-1">
                <img src={logoUrl} alt="logo" className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed bg-muted/30">
                <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <input
                ref={logoFileRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoFileRef.current?.click()}
                  disabled={!canManage}
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  انتخاب فایل
                </Button>
                {logoUrl && canManage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-rose-600"
                    onClick={() => { setLogoUrl(null); setLogoDirty(true) }}
                  >
                    حذف لوگو
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                فرمت: PNG, JPG, SVG — حداکثر ۲ مگابایت
              </p>
              {logoDirty && canManage && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => saveLogoMut.mutate()}
                  disabled={saveLogoMut.isPending}
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {saveLogoMut.isPending ? "در حال ذخیره..." : "ذخیره لوگو"}
                </Button>
              )}
            </div>
          </div>
        </SectionCard>
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

        {/* SMS provider — with Kavenegar config */}
        <SectionCard
          title="سرویس پیامک"
          description="پیکربندی کاوه‌نگار برای ارسال پیامک به مشتریان"
        >
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
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
              </div>

              {/* Kavenegar config — show when provider is kavenegar or kavenegar-v2 */}
              {(sms.provider === "kavenegar" || sms.provider === "kavenegar-v2") && (
                <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                  <div className="text-xs font-semibold text-muted-foreground">
                    تنظیمات کاوه‌نگار
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">API Key</Label>
                    <Input
                      dir="ltr"
                      value={sms.apiKey}
                      disabled={!canManage}
                      onChange={(e) => {
                        setSms((f) => ({ ...f, apiKey: e.target.value }))
                        setSmsDirty(true)
                      }}
                      placeholder="کلید API از پنل کاوه‌نگار"
                      className="text-left text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      از پنل کاوه‌نگار → تنظیمات → API Key دریافت کنید
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">شماره فرستنده (Sender)</Label>
                    <Input
                      dir="ltr"
                      value={sms.sender}
                      disabled={!canManage}
                      onChange={(e) => {
                        setSms((f) => ({ ...f, sender: e.target.value }))
                        setSmsDirty(true)
                      }}
                      placeholder="مثلاً 10004346"
                      className="text-left text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      شماره خط فرستنده که از کاوه‌نگار خریداری کرده‌اید
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">شماره تلفن استودیو (اختیاری)</Label>
                    <Input
                      dir="ltr"
                      value={sms.senderNumber}
                      disabled={!canManage}
                      onChange={(e) => {
                        setSms((f) => ({ ...f, senderNumber: e.target.value }))
                        setSmsDirty(true)
                      }}
                      placeholder="09120000000"
                      className="text-left text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      شماره تماس استودیو که در متن پیامک‌ها استفاده می‌شود
                    </p>
                  </div>
                </div>
              )}

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

      {/* Pricing settings — delayed pricing delay */}
      <div className="mt-4">
        <PricingSettingsCard />
      </div>

      {/* Default contract text — rich text editor */}
      <div className="mt-4">
        <SectionCard
          title="تنظیمات قرارداد"
          description="متن پیش‌فرض شروط و شرایط — با امکان فرمت‌بندی (بولد، ایتالیک، ایموجی)"
        >
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <RichTextEditor
              value={contractText}
              onChange={(v) => { setContractText(v); setContractDirty(true) }}
              onSave={() => saveContractMut.mutate()}
              canManage={!!canManage}
              saving={saveContractMut.isPending}
              dirty={contractDirty}
            />
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

// ============================================================
// Pricing settings — delayed pricing delay (days)
// ============================================================
function PricingSettingsCard() {
  const api = useApi()
  const qc = useQueryClient()
  const role = useWorkspace((s) => s.role)
  const canManage = hasPermission(role, "system")

  const { data, isLoading } = useQuery<Setting[]>({
    queryKey: ["system-settings"],
    queryFn: () => api.get("/api/system"),
  })

  const [delayedDays, setDelayedDays] = React.useState(30)

  React.useEffect(() => {
    const s = data?.find((x) => x.key === "delayed_pricing_days")
    if (s) {
      try {
        const val = JSON.parse(s.value)
        setDelayedDays(Number(val.days) || 30)
      } catch {
        setDelayedDays(30)
      }
    }
  }, [data])

  const saveMut = useMutation({
    mutationFn: async () => {
      return api.patch("/api/system", {
        key: "delayed_pricing_days",
        value: JSON.stringify({ days: delayedDays }),
      })
    },
    onSuccess: () => {
      toast.success("تنظیمات قیمت‌گذاری ذخیره شد")
      qc.invalidateQueries({ queryKey: ["system-settings"] })
    },
    onError: (e: Error) => toast.error(e.message || "ذخیره ناموفق بود"),
  })

  return (
    <SectionCard
      title="تنظیمات قیمت‌گذاری"
      description="مدت زمان مهلت قیمت‌گذاری برای استراتژی «مهلت‌دار»"
    >
      {isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border bg-amber-500/5 p-3 text-xs text-muted-foreground">
            <strong className="text-amber-700 dark:text-amber-400">استراتژی مهلت‌دار:</strong>{" "}
            وقتی قیمت پکیج تغییر می‌کند، برای پروژه‌های جدید قیمت جدید اعمال می‌شود.
            برای پروژه‌های قبلی، وقتی به حالت «آماده تحویل» می‌رسند، به مدت{" "}
            <strong>{delayedDays} روز</strong> قیمت قدیمی حفظ می‌شود و بعد از آن قیمت جدید اعمال می‌گردد.
          </div>
          <div>
            <Label className="mb-2 block text-sm font-medium">مدت زمان مهلت (روز)</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={365}
                value={delayedDays}
                onChange={(e) => setDelayedDays(Math.max(1, Number(e.target.value) || 30))}
                disabled={!canManage}
                className="w-32"
                dir="ltr"
              />
              <span className="text-sm text-muted-foreground">روز</span>
            </div>
          </div>
          {canManage && (
            <div className="flex justify-end">
              <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
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


// ============================================================
// Rich Text Editor — simple contentEditable with toolbar
// Supports: bold, italic, underline, emoji, font size
// ============================================================
const EMOJIS = ["😀", "😎", "🥰", "😍", "🤗", "😊", "👋", "👍", "👏", "🙌", "🎉", "🎊", "✨", "⭐", "🌟", "💫", "💖", "❤️", "💕", "🌹", "🌸", "🌺", "🎯", "📸", "🎥", "🎬", "🎵", "🎶", "💎", "🏆", "🎁", "🎈", "🎂", "🥳", "💍", "👰", "🤵", "💑", "👨‍👩‍👧‍👦", "📅", "⏰", "📍", "📞", "✅", "❌", "⚠️", "📞", "📱", "💬", "📧", "🏠", "🏢", "💵", "💰", "💳", "🧾", "📋", "📝", "📌", "🔍", "✏️", "🎨", "🖼️", "🌈", "🔥", "💡", "🔔", "📢"]

function RichTextEditor({
  value,
  onChange,
  onSave,
  canManage,
  saving,
  dirty,
}: {
  value: string
  onChange: (v: string) => void
  onSave: () => void
  canManage: boolean
  saving: boolean
  dirty: boolean
}) {
  const editorRef = React.useRef<HTMLDivElement | null>(null)
  const [showEmojis, setShowEmojis] = React.useState(false)

  // Set initial content
  React.useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || ""
    }
  }, [value])

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val)
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const insertEmoji = (emoji: string) => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      range.deleteContents()
      range.insertNode(document.createTextNode(emoji))
      range.collapse(false)
      sel.removeAllRanges()
      sel.addRange(range)
    } else if (editorRef.current) {
      editorRef.current.innerHTML += emoji
    }
    if (editorRef.current) onChange(editorRef.current.innerHTML)
    setShowEmojis(false)
  }

  const fontSize = (size: string) => {
    exec("fontSize", size)
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      {canManage && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-lg border bg-muted/50 p-2">
          <button
            type="button"
            onClick={() => exec("bold")}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-background"
            title="بولد"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => exec("italic")}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-background"
            title="ایتالیک"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => exec("underline")}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-background"
            title="زیرخط"
          >
            <Underline className="h-3.5 w-3.5" />
          </button>
          <div className="mx-1 h-5 w-px bg-border" />
          {/* Font size */}
          <Select value="" onValueChange={(v) => fontSize(v)}>
            <SelectTrigger className="h-7 w-[80px] text-[11px]">
              <span className="text-muted-foreground">اندازه</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">کوچک</SelectItem>
              <SelectItem value="3">معمولی</SelectItem>
              <SelectItem value="5">بزرگ</SelectItem>
              <SelectItem value="7">خیلی بزرگ</SelectItem>
            </SelectContent>
          </Select>
          <div className="mx-1 h-5 w-px bg-border" />
          {/* Emoji */}
          <button
            type="button"
            onClick={() => setShowEmojis(!showEmojis)}
            className={cn("flex h-7 w-7 items-center justify-center rounded hover:bg-background", showEmojis && "bg-background")}
            title="ایموجی"
          >
            <Smile className="h-3.5 w-3.5" />
          </button>
          {showEmojis && (
            <div className="absolute right-0 top-9 z-20 max-h-48 w-72 overflow-y-auto rounded-lg border bg-popover p-2 shadow-lg">
              <div className="flex flex-wrap gap-1">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => insertEmoji(e)}
                    className="flex h-7 w-7 items-center justify-center rounded text-base hover:bg-accent"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mx-1 h-5 w-px bg-border" />
          <button
            type="button"
            onClick={() => exec("insertUnorderedList")}
            className="flex h-7 items-center justify-center rounded px-2 text-[11px] hover:bg-background"
            title="لیست نقطه‌ای"
          >
            • لیست
          </button>
          <button
            type="button"
            onClick={() => exec("insertOrderedList")}
            className="flex h-7 items-center justify-center rounded px-2 text-[11px] hover:bg-background"
            title="لیست شماره‌ای"
          >
            ۱. لیست
          </button>
          <div className="mx-1 h-5 w-px bg-border" />
          <button
            type="button"
            onClick={() => exec("justifyRight")}
            className="flex h-7 items-center justify-center rounded px-2 text-[11px] hover:bg-background"
            title="راست‌چین"
          >
            راست
          </button>
          <button
            type="button"
            onClick={() => exec("justifyCenter")}
            className="flex h-7 items-center justify-center rounded px-2 text-[11px] hover:bg-background"
            title="وسط‌چین"
          >
            وسط
          </button>
        </div>
      )}

      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable={canManage}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        className={cn(
          "min-h-[200px] resize-y overflow-y-auto rounded-lg border bg-background p-3 text-sm leading-7 outline-none focus:ring-2 focus:ring-ring",
          !canManage && "cursor-not-allowed opacity-80"
        )}
        dir="rtl"
        suppressContentEditableWarning
      />

      <p className="text-xs text-muted-foreground">
        این متن در پایین هر قرارداد (بخش «شروط و شرایط») ظاهر می‌شود و در زمان چاپ توسط کاربر قابل ویرایش خواهد بود.
      </p>

      {canManage && dirty && (
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={saving}>
            <Save className="mr-1.5 h-4 w-4" />
            {saving ? "در حال ذخیره…" : "ذخیره متن قرارداد"}
          </Button>
        </div>
      )}
    </div>
  )
}
