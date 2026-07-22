/**
 * Helper: broadcast an event to the chat-ws socket.io service via its
 * internal HTTP endpoint.
 *
 * The chat-ws service exposes `POST /_internal/broadcast` (protected by a
 * shared token). Next.js API routes call this after a successful DB write
 * so that connected clients receive real-time updates.
 *
 * If the chat-ws service is down, this silently no-ops (returns false) — the
 * REST response is still returned to the caller; clients will pick up the
 * change on their next poll (or when they reconnect to the socket).
 */

const CHAT_WS_INTERNAL_TOKEN = process.env.CHAT_WS_INTERNAL_TOKEN || "dev-internal-token"
const CHAT_WS_INTERNAL_URL =
  process.env.CHAT_WS_INTERNAL_URL || "http://localhost:3003/_internal/broadcast"

export interface BroadcastPayload {
  /** Room name(s) — typically `<studioDbName>:conv:<conversationId>`. */
  room?: string | string[]
  /** Event name (e.g. "message:new"). */
  event: string
  /** Event payload. */
  data?: unknown
}

export async function broadcastToChatWs(payload: BroadcastPayload): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)
    const res = await fetch(CHAT_WS_INTERNAL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-token": CHAT_WS_INTERNAL_TOKEN,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return res.ok
  } catch {
    // Chat-ws service is down or unreachable. Silently ignore — REST still works.
    return false
  }
}

/**
 * Build the room name for a conversation in a studio.
 * Matches the format used by the chat-ws service: `<studioDbName>:conv:<conversationId>`.
 */
export function conversationRoom(studioDbName: string, conversationId: string): string {
  return `${studioDbName}:conv:${conversationId}`
}

/**
 * Build the studio-wide room name (used for conversation:list updates and presence).
 */
export function studioRoom(studioDbName: string): string {
  return `${studioDbName}:studio`
}

