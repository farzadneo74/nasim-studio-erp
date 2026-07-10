"use client"

/**
 * Client-side reminder notification engine.
 *
 * Responsibilities:
 *  - Request notification permission on init (best-effort, silent on failure).
 *  - Poll `/api/reminders?dueNow=true` every POLL_INTERVAL_MS (30s).
 *  - When a reminder becomes due, fire BOTH a browser Notification (if granted)
 *    AND play the configured alarm sound (based on /api/reminder-settings).
 *  - Track already-notified reminder IDs in localStorage so we don't re-fire
 *    for the same reminder within the same browser session.
 *  - Allow callers to register an `onFire` callback (e.g. to show a toast and
 *    trigger the overdue blocking modal re-check).
 *
 * The alarm sound loops until `stopAlarm()` is called (e.g. when the user
 * acknowledges the reminder in the overdue modal, or when no reminders are due
 * anymore on the next poll).
 */

export interface ReminderSettings {
  alertMode: "notification_only" | "notification_and_alarm"
  soundUrl: string
  volume: number
  loop: boolean
}

const DEFAULT_SETTINGS: ReminderSettings = {
  alertMode: "notification_and_alarm",
  soundUrl: "/sounds/alarm-1.wav",
  volume: 70,
  loop: true,
}

const POLL_INTERVAL_MS = 30_000
const LS_NOTIFIED_KEY = "notified-reminders"
// Prune the notified list when it grows beyond this size (keep most-recent N).
const LS_NOTIFIED_MAX = 200

export interface DueReminder {
  id: string
  title: string
  note: string | null
  dueAt: string
}

type FireHandler = (reminder: DueReminder) => void

let pollTimer: ReturnType<typeof setInterval> | null = null
let settingsCache: ReminderSettings = { ...DEFAULT_SETTINGS }
let settingsLoadPromise: Promise<void> | null = null
let audioEl: HTMLAudioElement | null = null
let currentFireHandler: FireHandler | null = null

/** Read the notified-IDs list from localStorage. */
function readNotified(): string[] {
  try {
    const raw = localStorage.getItem(LS_NOTIFIED_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []
  } catch {
    return []
  }
}

/** Append a reminder ID to the notified list (capped at LS_NOTIFIED_MAX). */
function pushNotified(id: string) {
  try {
    const cur = readNotified()
    if (cur.includes(id)) return
    cur.push(id)
    while (cur.length > LS_NOTIFIED_MAX) cur.shift()
    localStorage.setItem(LS_NOTIFIED_KEY, JSON.stringify(cur))
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

/** Reset the notified list (used on logout / role switch). */
export function resetNotified() {
  try {
    localStorage.removeItem(LS_NOTIFIED_KEY)
  } catch {
    /* ignore */
  }
}

async function loadSettings(): Promise<void> {
  try {
    const res = await fetch("/api/reminder-settings", { cache: "no-store" })
    if (!res.ok) return
    const data = (await res.json()) as Partial<ReminderSettings>
    settingsCache = {
      alertMode:
        data.alertMode === "notification_only" ||
        data.alertMode === "notification_and_alarm"
          ? data.alertMode
          : DEFAULT_SETTINGS.alertMode,
      soundUrl:
        typeof data.soundUrl === "string" && data.soundUrl
          ? data.soundUrl
          : DEFAULT_SETTINGS.soundUrl,
      volume:
        typeof data.volume === "number" && Number.isFinite(data.volume)
          ? Math.max(0, Math.min(100, Math.round(data.volume)))
          : DEFAULT_SETTINGS.volume,
      loop: typeof data.loop === "boolean" ? data.loop : DEFAULT_SETTINGS.loop,
    }
  } catch {
    /* keep defaults */
  }
}

async function ensureSettingsLoaded() {
  if (!settingsLoadPromise) {
    settingsLoadPromise = loadSettings()
  }
  return settingsLoadPromise
}

/** Reload settings from the server (call after admin changes them). */
export async function reloadReminderSettings() {
  settingsLoadPromise = loadSettings()
  return settingsLoadPromise
}

export function getReminderSettings(): ReminderSettings {
  return { ...settingsCache }
}

/**
 * Best-effort: ask the browser for notification permission. Safe to call on
 * page load. On browsers that don't support Notification, this is a no-op.
 */
export async function ensureNotificationPermission() {
  if (typeof window === "undefined") return
  if (!("Notification" in window)) return
  if (Notification.permission === "granted") return
  if (Notification.permission === "denied") return
  try {
    await Notification.requestPermission()
  } catch {
    /* ignore */
  }
}

function showBrowserNotification(r: DueReminder) {
  if (typeof window === "undefined") return
  if (!("Notification" in window)) return
  if (Notification.permission !== "granted") return
  try {
    const n = new Notification(`⏰ ${r.title}`, {
      body: r.note || "یادآوری سررسید شد",
      tag: `reminder-${r.id}`,
      // requireInteraction makes the notification stay until dismissed
      // (only honored on desktop Chrome/Edge/Firefox; ignored on Android).
      requireInteraction: true,
    })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    /* ignore — some browsers (iOS Safari) throw on `new Notification` */
  }
}

/**
 * Start playing the configured alarm sound. Loops until stopAlarm() is called
 * (only when loop=true in settings).
 */
export function playAlarm() {
  if (typeof window === "undefined") return
  if (settingsCache.alertMode === "notification_only") return
  try {
    if (!audioEl) {
      audioEl = new Audio(settingsCache.soundUrl)
      audioEl.preload = "auto"
    } else if (audioEl.src !== settingsCache.soundUrl) {
      audioEl.src = settingsCache.soundUrl
    }
    audioEl.volume = Math.max(0, Math.min(1, settingsCache.volume / 100))
    audioEl.loop = !!settingsCache.loop
    // Reset to start each time so the alarm pattern restarts cleanly.
    audioEl.currentTime = 0
    const p = audioEl.play()
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        /* autoplay may be blocked until user interaction — ignore */
      })
    }
  } catch {
    /* ignore */
  }
}

/** Stop the alarm sound (if playing). */
export function stopAlarm() {
  if (!audioEl) return
  try {
    audioEl.pause()
    audioEl.currentTime = 0
  } catch {
    /* ignore */
  }
}

/**
 * One-shot: preview the alarm sound (used by the settings "تست هشدار" button).
 * Honors the given settings (not the cached ones) so admin can preview
 * different sounds without saving first.
 */
export function previewAlarm(settings: ReminderSettings) {
  if (typeof window === "undefined") return
  if (settings.alertMode === "notification_only") return
  try {
    if (!audioEl) {
      audioEl = new Audio(settings.soundUrl)
    } else if (audioEl.src !== settings.soundUrl) {
      audioEl.src = settings.soundUrl
    }
    audioEl.volume = Math.max(0, Math.min(1, settings.volume / 100))
    audioEl.loop = false // preview never loops
    audioEl.currentTime = 0
    const p = audioEl.play()
    if (p && typeof p.catch === "function") p.catch(() => {})
  } catch {
    /* ignore */
  }
}

async function pollOnce() {
  try {
    const res = await fetch("/api/reminders?dueNow=true", { cache: "no-store" })
    if (!res.ok) return
    const data = (await res.json()) as { items: DueReminder[] }
    const items = Array.isArray(data.items) ? data.items : []
    const notified = readNotified()
    const fresh = items.filter((r) => !notified.includes(r.id))
    if (fresh.length === 0) return
    // Fire notifications + sound for each newly-due reminder.
    let anyFired = false
    for (const r of fresh) {
      showBrowserNotification(r)
      currentFireHandler?.(r)
      pushNotified(r.id)
      anyFired = true
    }
    if (anyFired) {
      playAlarm()
    }
  } catch {
    /* network errors — ignore, retry on next interval */
  }
}

/**
 * Start the polling engine. Returns a stop() function.
 *
 * @param onFire Optional callback invoked once per newly-fired reminder.
 */
export function startReminderNotifier(onFire?: FireHandler): () => void {
  if (typeof window === "undefined") return () => {}
  if (pollTimer !== null) return () => {}
  currentFireHandler = onFire ?? null

  // Best-effort one-time setup on first start.
  void ensureNotificationPermission()
  void ensureSettingsLoaded().then(() => {
    // Initial immediate poll so a reminder that just came due fires right away.
    void pollOnce()
  })

  pollTimer = setInterval(() => {
    void pollOnce()
  }, POLL_INTERVAL_MS)

  return () => {
    if (pollTimer !== null) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    stopAlarm()
    currentFireHandler = null
  }
}

/** Clear the notified tracking for a specific reminder so it can re-fire. */
export function clearNotified(reminderId: string) {
  try {
    const cur = readNotified().filter((id) => id !== reminderId)
    localStorage.setItem(LS_NOTIFIED_KEY, JSON.stringify(cur))
  } catch {
    /* ignore */
  }
}
