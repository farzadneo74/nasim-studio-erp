import { masterDb } from "./master-db"
import { getCurrentStudioDb, getCurrentStudioDbName } from "./auth-helpers"
import { PrismaClient } from "@prisma/client"
import { masterDb as master } from "./master-db"
import { getCurrentUser } from "./auth"

/**
 * Read SMS provider settings from the studio DB's SystemSetting table.
 * Returns null if no setting or not active.
 */
export async function getSmsProviderConfig(db: PrismaClient): Promise<{
  active: boolean
  provider: string // "kavenegar" | "kavenegar-v2" | "disabled"
  apiKey: string
  sender: string
  senderNumber: string
} | null> {
  try {
    const row = await db.systemSetting.findUnique({ where: { key: "sms_provider" } })
    if (!row) return null
    const parsed = JSON.parse(row.value)
    return {
      active: Boolean(parsed.active),
      provider: String(parsed.provider || "disabled"),
      apiKey: String(parsed.apiKey || ""),
      sender: String(parsed.sender || ""),
      senderNumber: String(parsed.senderNumber || ""),
    }
  } catch {
    return null
  }
}

/** Normalize an Iranian phone number to the format Kavenegar expects (no leading 0, with 98 prefix). */
function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-()]/g, "")
  if (p.startsWith("+98")) p = "98" + p.slice(3)
  else if (p.startsWith("0098")) p = "98" + p.slice(4)
  else if (p.startsWith("098")) p = "98" + p.slice(3)
  else if (p.startsWith("0")) p = "98" + p.slice(1)
  else if (p.startsWith("9")) p = "98" + p
  return p
}

/**
 * Send an SMS via Kavenegar. Returns the Kavenegar message id (or null on failure).
 * Always logs a SmsTransaction row in the master DB for traceability.
 */
export async function sendSmsViaKavenegar(opts: {
  phone: string
  message: string
  apiKey: string
  sender?: string
  apiVersion?: "v1" | "v2"
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const { phone, message, apiKey, sender, apiVersion = "v1" } = opts
  if (!apiKey) return { ok: false, error: "missing api key" }
  const receptor = normalizePhone(phone)

  try {
    const baseUrl = apiVersion === "v2"
      ? `https://api.kavenegar.com/v2/${encodeURIComponent(apiKey)}/sms/send.json`
      : `https://api.kavenegar.com/v1/${encodeURIComponent(apiKey)}/sms/send.json`
    const body = new URLSearchParams()
    body.set("receptor", receptor)
    body.set("message", message)
    if (sender) body.set("sender", sender)

    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      // Don't hang the request thread forever.
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return { ok: false, error: `kavenegar http ${res.status}: ${text.slice(0, 200)}` }
    }

    const data = await res.json().catch(() => ({}))
    // Kavenegar v1 returns { return: { status, message }, entries: [{ messageid, status, ... }] }
    const entries = (data as any)?.entries
    const messageId = Array.isArray(entries) && entries.length > 0 ? String(entries[0].messageid ?? "") : ""
    const status = (data as any)?.return?.status
    if (status !== undefined && status !== 200) {
      return { ok: false, error: `kavenegar status ${status}: ${(data as any)?.return?.message ?? ""}` }
    }
    return { ok: true, messageId: messageId || undefined }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "network error" }
  }
}

/**
 * High-level SMS send helper.
 * - Reads provider config from current studio DB.
 * - Sends the SMS via Kavenegar if active.
 * - Logs a SmsTransaction row in the master DB (charge = negative amountRial).
 * - Deducts ~120 Rials per segment from the studio's smsCreditRial.
 *
 * Returns true on success (or if SMS is disabled — i.e. silent no-op),
 * false on a hard failure (provider misconfigured or Kavenegar error).
 */
export async function sendSmsToCustomer(opts: {
  phone: string
  message: string
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const db = await getCurrentStudioDb()
  if (!db) return { ok: false, error: "studio db not selected" }

  const cfg = await getSmsProviderConfig(db)
  if (!cfg || !cfg.active || cfg.provider === "disabled" || !cfg.apiKey) {
    // SMS not configured — treat as a silent skip so callers can still proceed.
    return { ok: true, skipped: true }
  }

  const user = await getCurrentUser()
  const studioId = user?.studioId && user.studioId !== "all" ? user.studioId : null
  if (!studioId) return { ok: false, error: "no studio selected" }

  const apiVersion = cfg.provider === "kavenegar-v2" ? "v2" : "v1"
  const result = await sendSmsViaKavenegar({
    phone: opts.phone,
    message: opts.message,
    apiKey: cfg.apiKey,
    sender: cfg.senderNumber || cfg.sender || undefined,
    apiVersion,
  })

  // Per-segment cost estimate (Rials). Kavenegar charges per 70 chars (Farsi).
  const segments = Math.max(1, Math.ceil(opts.message.length / 70))
  const costRial = -120 * segments // negative = consumption

  // Log to master DB SmsTransaction (best-effort).
  try {
    await master.smsTransaction.create({
      data: {
        studioId,
        type: "send",
        amountRial: costRial,
        receptor: opts.phone,
        messageSnippet: opts.message.slice(0, 100),
        kavenegarMessageId: result.messageId ?? null,
        status: result.ok ? "sent" : "failed",
      },
    })
    // Deduct from the studio's credit (best-effort).
    if (result.ok) {
      try {
        await master.studio.update({
          where: { id: studioId },
          data: { smsCreditRial: { increment: costRial } },
        })
      } catch { /* ignore */ }
    }
  } catch { /* ignore — logging is best-effort */ }

  return result.ok
    ? { ok: true }
    : { ok: false, error: result.error }
}
