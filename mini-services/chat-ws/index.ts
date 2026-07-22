/**
 * NASIM Studio ERP — chat-ws mini-service
 *
 * Socket.io real-time server for the messenger ("گفتگو").
 * Listens on port 3003. The Next.js frontend connects via Caddy's
 * `?XTransformPort=3003` reverse-proxy rule (path = "/").
 *
 * Auth flow (same as main app):
 *   1. Client emits "authenticate" with { token } (or sends it via handshake.auth.token).
 *   2. We resolve the master DB Session → MasterUser + studioId.
 *   3. We resolve the Studio → dbName → open (cached) PrismaClient for that studio DB.
 *   4. We attach { userId, userName, studioId, studioDbName, db } to socket.data.
 *
 * Multi-tenant isolation:
 *   - Rooms are namespaced as `<studioDbName>:conv:<conversationId>`.
 *   - All persistence goes to the studio DB the socket is authenticated for.
 *
 * Internal HTTP endpoint `POST /_internal/broadcast`:
 *   - Used by the Next.js REST API to fan-out events after a DB write
 *     (e.g., after POST /api/messages/.../messages, broadcast "message:new").
 *   - Protected by CHAT_WS_INTERNAL_TOKEN (default "dev-internal-token").
 */

import { createServer, type IncomingMessage, type ServerResponse } from "http"
import { Server, type Socket } from "socket.io"
import { PrismaClient } from "@prisma/client"

// ---------------------------------------------------------------------------
// Master DB client (use the generated client from the main project).
// ---------------------------------------------------------------------------
// Bun resolves the relative path from this file's directory.
import { PrismaClient as MasterPrismaClient } from "../../src/generated/master-client"

// Resolve the project root from this file's location (two levels up from
// `mini-services/chat-ws/index.ts`). Avoid relying on `process.cwd()` because
// the service may be started from any directory.
const PROJECT_ROOT = new URL("../../", import.meta.url).pathname
const DB_DIR = `${PROJECT_ROOT}db`
const PORT = Number(process.env.CHAT_WS_PORT || 3003)
const INTERNAL_TOKEN = process.env.CHAT_WS_INTERNAL_TOKEN || "dev-internal-token"

const masterDb = new MasterPrismaClient({
  datasources: { db: { url: `file:${DB_DIR}/master.db` } },
  log: ["error", "warn"],
})

// ---------------------------------------------------------------------------
// Studio DB client cache (multi-tenant).
// ---------------------------------------------------------------------------
const studioClients = new Map<string, PrismaClient>()
function getStudioDb(dbName: string): PrismaClient {
  let client = studioClients.get(dbName)
  if (!client) {
    client = new PrismaClient({
      datasources: { db: { url: `file:${DB_DIR}/${dbName}` } },
      log: ["error", "warn"],
    })
    studioClients.set(dbName, client)
  }
  return client
}

// ---------------------------------------------------------------------------
// Auth context attached to each socket after authentication.
// ---------------------------------------------------------------------------
interface AuthContext {
  userId: string
  userName: string
  studioId: string
  studioDbName: string
  db: PrismaClient
}

// ---------------------------------------------------------------------------
// Presence tracking (in-memory, per studio).
// Map<studioDbName, Map<userId, Set<socketId>>>
// ---------------------------------------------------------------------------
const presence = new Map<string, Map<string, Set<string>>>()

function markOnline(studioDbName: string, userId: string, socketId: string) {
  let studio = presence.get(studioDbName)
  if (!studio) {
    studio = new Map()
    presence.set(studioDbName, studio)
  }
  let sockets = studio.get(userId)
  if (!sockets) {
    sockets = new Set()
    studio.set(userId, sockets)
  }
  sockets.add(socketId)
}

function markOffline(studioDbName: string, userId: string, socketId: string): boolean {
  const studio = presence.get(studioDbName)
  if (!studio) return false
  const sockets = studio.get(userId)
  if (!sockets) return false
  sockets.delete(socketId)
  if (sockets.size === 0) {
    studio.delete(userId)
    return true // user went fully offline
  }
  return false
}

function isOnline(studioDbName: string, userId: string): boolean {
  return (presence.get(studioDbName)?.get(userId)?.size ?? 0) > 0
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function roomFor(studioDbName: string, conversationId: string) {
  return `${studioDbName}:conv:${conversationId}`
}

function studioRoom(studioDbName: string) {
  return `${studioDbName}:studio`
}

interface ShapedReaction {
  id: string
  userId: string
  userName: string
  emoji: string
  createdAt: string
}

interface ShapedReplyTo {
  id: string
  senderId: string
  senderName: string
  body: string
}

interface ShapedMessage {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  body: string
  mentions: unknown[]
  attachments: unknown[]
  replyToId: string | null
  replyTo: ShapedReplyTo | null
  forwardedFromId: string | null
  forwardedFromName: string | null
  editedAt: string | null
  deletedAt: string | null
  deletedFor: string[]
  pinnedAt: string | null
  readBy: { userId: string; readAt: string }[]
  createdAt: string
  reactions: ShapedReaction[]
}

async function shapeMessage(
  db: PrismaClient,
  m: {
    id: string
    conversationId: string
    senderId: string
    senderName: string
    body: string
    mentions: string
    attachments: string
    replyToId: string | null
    forwardedFromId: string | null
    forwardedFromName: string | null
    editedAt: Date | null
    deletedAt: Date | null
    deletedFor: string
    pinnedAt: Date | null
    readBy: string
    createdAt: Date
    reactions: {
      id: string
      userId: string
      userName: string
      emoji: string
      createdAt: Date
    }[]
  }
): Promise<ShapedMessage> {
  let mentions: unknown[] = []
  try {
    mentions = JSON.parse(m.mentions || "[]")
  } catch {
    mentions = []
  }
  let attachments: unknown[] = []
  try {
    attachments = JSON.parse(m.attachments || "[]")
  } catch {
    attachments = []
  }
  let deletedFor: string[] = []
  try {
    deletedFor = JSON.parse(m.deletedFor || "[]")
  } catch {
    deletedFor = []
  }
  let readBy: { userId: string; readAt: string }[] = []
  try {
    readBy = JSON.parse(m.readBy || "[]")
  } catch {
    readBy = []
  }

  let replyTo: ShapedReplyTo | null = null
  if (m.replyToId) {
    const r = await db.message.findUnique({
      where: { id: m.replyToId },
      select: { id: true, senderId: true, senderName: true, body: true },
    })
    if (r) replyTo = r
  }

  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    senderName: m.senderName,
    body: m.body,
    mentions,
    attachments,
    replyToId: m.replyToId,
    replyTo,
    forwardedFromId: m.forwardedFromId,
    forwardedFromName: m.forwardedFromName,
    editedAt: m.editedAt ? m.editedAt.toISOString() : null,
    deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
    deletedFor,
    pinnedAt: m.pinnedAt ? m.pinnedAt.toISOString() : null,
    readBy,
    createdAt: m.createdAt.toISOString(),
    reactions: m.reactions.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.userName,
      emoji: r.emoji,
      createdAt: r.createdAt.toISOString(),
    })),
  }
}

// ---------------------------------------------------------------------------
// Auth: resolve token → master session → studio DB.
// ---------------------------------------------------------------------------
async function resolveAuth(token: string): Promise<AuthContext | null> {
  if (!token) return null
  const session = await masterDb.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session || session.expiresAt < new Date()) return null
  if (!session.studioId) return null

  const studio = await masterDb.studio.findUnique({
    where: { id: session.studioId },
  })
  if (!studio) return null

  const db = getStudioDb(studio.dbName)
  return {
    userId: session.user.id,
    userName: session.user.name,
    studioId: studio.id,
    studioDbName: studio.dbName,
    db,
  }
}

async function ensureParticipant(
  db: PrismaClient,
  conversationId: string,
  userId: string
): Promise<boolean> {
  const p = await db.conversationParticipant.findFirst({
    where: { conversationId, userId, leftAt: null },
    select: { id: true },
  })
  return !!p
}

// ---------------------------------------------------------------------------
// HTTP server (socket.io attaches to this; we also expose /_internal/broadcast).
// ---------------------------------------------------------------------------
const httpServer = createServer()

// IMPORTANT: socket.io (with path: "/") intercepts ALL requests whose URL
// starts with "/". To allow our internal broadcast endpoint and health check
// to coexist, we register our listener FIRST and only respond to known
// non-socket.io routes. For everything else, we do nothing — engine.io's
// listener (added later when `new Server(httpServer)` runs) will handle it.
httpServer.on("request", async (req: IncomingMessage, res: ServerResponse) => {
  // Strip the query string for path matching.
  const rawUrl = req.url || "/"
  const path = rawUrl.split("?", 1)[0]

  // Health check.
  if (req.method === "GET" && (path === "/health" || path === "/healthz")) {
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ ok: true, service: "chat-ws", port: PORT }))
    return
  }

  // Internal broadcast endpoint.
  if (req.method === "POST" && path === "/_internal/broadcast") {
    const token = req.headers["x-internal-token"]
    if (token !== INTERNAL_TOKEN) {
      res.writeHead(401, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "invalid internal token" }))
      return
    }
    let body = ""
    for await (const chunk of req) body += chunk
    let payload: {
      room?: string | string[]
      event: string
      data?: unknown
      excludeSocket?: string
    }
    try {
      payload = JSON.parse(body)
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: "invalid JSON" }))
      return
    }
    try {
      if (payload.room) {
        const rooms = Array.isArray(payload.room) ? payload.room : [payload.room]
        if (payload.excludeSocket) {
          for (const r of rooms) io.to(r).except(payload.excludeSocket).emit(payload.event, payload.data)
        } else {
          for (const r of rooms) io.to(r).emit(payload.event, payload.data)
        }
      } else {
        io.emit(payload.event, payload.data)
      }
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ ok: true }))
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" })
      res.end(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }))
    }
    return
  }

  // For all other paths: do nothing. Engine.io (socket.io) listener will
  // handle them (only requests whose path starts with "/socket.io/").
  // If the path doesn't match engine.io either, the request will hang — but
  // that should not happen in practice because the frontend only hits
  // /socket.io/ and the Next.js API only hits /_internal/broadcast.
})

const io = new Server(httpServer, {
  // Use the default socket.io path "/socket.io" instead of "/" so that our
  // custom HTTP routes (/_internal/broadcast, /health) on the same server
  // are reachable. The Caddyfile gateway rule is `?XTransformPort=*` (matches
  // on the query param), so any path is fine — the frontend's
  // `io("/?XTransformPort=3003")` will work because socket.io-client defaults
  // to `/socket.io` internally.
  path: "/socket.io/",
  cors: { origin: "*", methods: ["GET", "POST"] },
  pingTimeout: 60_000,
  pingInterval: 25_000,
  connectTimeout: 10_000,
})

// ---------------------------------------------------------------------------
// Socket middleware: extract token from handshake.auth or auth header.
// ---------------------------------------------------------------------------
io.use(async (socket, next) => {
  const token =
    (socket.handshake.auth?.token as string | undefined) ||
    (socket.handshake.headers.authorization?.startsWith("Bearer ")
      ? socket.handshake.headers.authorization.slice(7)
      : undefined) ||
    (typeof socket.handshake.query.token === "string" ? socket.handshake.query.token : undefined)

  if (!token) {
    return next(new Error("auth:missing-token"))
  }
  const auth = await resolveAuth(token)
  if (!auth) {
    return next(new Error("auth:invalid"))
  }
  socket.data.auth = auth
  socket.data.token = token
  return next()
})

// ---------------------------------------------------------------------------
// Connection lifecycle.
// ---------------------------------------------------------------------------
io.on("connection", (socket: Socket) => {
  const auth = socket.data.auth as AuthContext | undefined
  if (!auth) {
    socket.disconnect(true)
    return
  }
  const { userId, userName, studioDbName, db } = auth

  // Join the per-studio room (used for presence broadcasts).
  socket.join(studioRoom(studioDbName))
  const wasOnline = isOnline(studioDbName, userId)
  markOnline(studioDbName, userId, socket.id)
  if (!wasOnline) {
    io.to(studioRoom(studioDbName)).emit("presence:update", {
      userId,
      online: true,
      lastSeenAt: null,
    })
  }

  // Greet the client with its auth identity.
  socket.emit("authenticated", {
    userId,
    userName,
    studioId: auth.studioId,
    studioDbName,
  })

  // -------------------------------------------------------------------------
  // subscribe / unsubscribe to a conversation room.
  // -------------------------------------------------------------------------
  socket.on("conversation:subscribe", async (payload: { conversationId?: string }) => {
    const conversationId = payload?.conversationId
    if (!conversationId) return
    const ok = await ensureParticipant(db, conversationId, userId)
    if (!ok) {
      socket.emit("error", { code: "forbidden", message: "شما عضو این گفتگو نیستید" })
      return
    }
    socket.join(roomFor(studioDbName, conversationId))
    socket.emit("conversation:subscribed", { conversationId })
  })

  socket.on("conversation:unsubscribe", (payload: { conversationId?: string }) => {
    const conversationId = payload?.conversationId
    if (!conversationId) return
    socket.leave(roomFor(studioDbName, conversationId))
  })

  // -------------------------------------------------------------------------
  // typing:start / typing:stop — broadcast to the conversation room.
  // No persistence. The client debounces and sends "stop" after a timeout.
  // -------------------------------------------------------------------------
  socket.on("typing:start", (payload: { conversationId?: string }) => {
    const conversationId = payload?.conversationId
    if (!conversationId) return
    const room = roomFor(studioDbName, conversationId)
    socket.to(room).emit("typing:start", { conversationId, userId, userName })
  })

  socket.on("typing:stop", (payload: { conversationId?: string }) => {
    const conversationId = payload?.conversationId
    if (!conversationId) return
    const room = roomFor(studioDbName, conversationId)
    socket.to(room).emit("typing:stop", { conversationId, userId })
  })

  // -------------------------------------------------------------------------
  // message:read — mark all messages in the conversation as read by this user,
  // update participant.lastReadAt, and broadcast read receipts.
  // -------------------------------------------------------------------------
  socket.on("message:read", async (payload: { conversationId?: string; messageId?: string }) => {
    const conversationId = payload?.conversationId
    if (!conversationId) return
    const ok = await ensureParticipant(db, conversationId, userId)
    if (!ok) return
    const now = new Date()

    // Update participant.lastReadAt
    await db.conversationParticipant.updateMany({
      where: { conversationId, userId, leftAt: null },
      data: { lastReadAt: now },
    })

    // Add this user to readBy for all messages in the conversation that don't
    // already have them and aren't sent by them.
    const msgs = await db.message.findMany({
      where: {
        conversationId,
        senderId: { not: userId },
        deletedAt: null,
      },
      select: { id: true, readBy: true },
    })
    const updatedIds: string[] = []
    for (const m of msgs) {
      let readBy: { userId: string; readAt: string }[] = []
      try {
        readBy = JSON.parse(m.readBy || "[]")
      } catch {
        readBy = []
      }
      if (!readBy.some((r) => r.userId === userId)) {
        readBy.push({ userId, readAt: now.toISOString() })
        await db.message.update({
          where: { id: m.id },
          data: { readBy: JSON.stringify(readBy) },
        })
        updatedIds.push(m.id)
      }
    }

    // Broadcast read receipt to the room (including other sockets of the same user).
    io.to(roomFor(studioDbName, conversationId)).emit("message:read", {
      conversationId,
      userId,
      lastReadAt: now.toISOString(),
      messageIds: updatedIds,
    })
  })

  // -------------------------------------------------------------------------
  // message:send — let the client send directly via socket (alternative to REST).
  // Persists to DB, then broadcasts "message:new" to the room (including the
  // sender's other sockets, but not this socket — the client optimistically
  // already has it).
  // -------------------------------------------------------------------------
  socket.on(
    "message:send",
    async (payload: {
      conversationId?: string
      body?: string
      replyToId?: string | null
      mentions?: unknown[]
      attachments?: unknown[]
      forwardedFromId?: string | null
      forwardedFromName?: string | null
      tempId?: string
    }) => {
      const conversationId = payload?.conversationId
      if (!conversationId) return
      const ok = await ensureParticipant(db, conversationId, userId)
      if (!ok) {
        socket.emit("error", { code: "forbidden", message: "شما عضو این گفتگو نیستید" })
        return
      }
      const text = typeof payload.body === "string" ? payload.body : ""
      const attachments = Array.isArray(payload.attachments) ? payload.attachments : []
      if (!text.trim() && attachments.length === 0) {
        socket.emit("error", { code: "empty", message: "پیام خالی است" })
        return
      }
      const replyToId =
        typeof payload.replyToId === "string" && payload.replyToId ? payload.replyToId : null
      if (replyToId) {
        const r = await db.message.findUnique({
          where: { id: replyToId },
          select: { conversationId: true },
        })
        if (!r || r.conversationId !== conversationId) {
          socket.emit("error", { code: "bad-reply", message: "پیام مرجع نامعتبر است" })
          return
        }
      }

      try {
        const created = await db.message.create({
          data: {
            conversationId,
            senderId: userId,
            senderName: userName,
            body: text,
            mentions: JSON.stringify(Array.isArray(payload.mentions) ? payload.mentions : []),
            attachments: JSON.stringify(attachments),
            replyToId,
            forwardedFromId:
              typeof payload.forwardedFromId === "string" ? payload.forwardedFromId : null,
            forwardedFromName:
              typeof payload.forwardedFromName === "string" ? payload.forwardedFromName : null,
          },
          include: { reactions: true },
        })

        // Update conversation denormalized fields.
        const preview = text.trim().slice(0, 80) || "📎 پیوست"
        await db.conversation.update({
          where: { id: conversationId },
          data: {
            updatedAt: new Date(),
            lastMessageAt: created.createdAt,
            lastMessagePreview: preview,
            lastMessageSenderName: userName,
          },
        })

        const shaped = await shapeMessage(db, created)

        // Echo back to the sender's other sockets (NOT this socket).
        socket.emit("message:ack", {
          tempId: payload.tempId,
          message: shaped,
        })
        // Broadcast to everyone in the room except this socket.
        socket.to(roomFor(studioDbName, conversationId)).emit("message:new", shaped)
        // Also broadcast conversation:updated for list refresh.
        io.to(studioRoom(studioDbName)).emit("conversation:updated", {
          id: conversationId,
          lastMessageAt: shaped.createdAt,
          lastMessagePreview: preview,
          lastMessageSenderName: userName,
        })
      } catch (e) {
        socket.emit("error", {
          code: "send-failed",
          message: e instanceof Error ? e.message : "خطای ناشناخته",
        })
      }
    }
  )

  // -------------------------------------------------------------------------
  // message:edit — only the sender can edit their own message.
  // -------------------------------------------------------------------------
  socket.on(
    "message:edit",
    async (payload: { id?: string; body?: string; conversationId?: string }) => {
      const id = payload?.id
      const conversationId = payload?.conversationId
      const text = typeof payload?.body === "string" ? payload.body : ""
      if (!id || !conversationId || !text.trim()) return
      const existing = await db.message.findUnique({
        where: { id },
        select: { senderId: true, conversationId: true },
      })
      if (!existing || existing.senderId !== userId || existing.conversationId !== conversationId) {
        socket.emit("error", { code: "forbidden", message: "اجازه ویرایش ندارید" })
        return
      }
      const updated = await db.message.update({
        where: { id },
        data: { body: text, editedAt: new Date() },
        include: { reactions: true },
      })
      const shaped = await shapeMessage(db, updated)
      io.to(roomFor(studioDbName, conversationId)).emit("message:edited", shaped)
    }
  )

  // -------------------------------------------------------------------------
  // message:delete — soft delete (set deletedAt) for sender; "delete for me"
  // (append userId to deletedFor JSON) for anyone.
  // -------------------------------------------------------------------------
  socket.on(
    "message:delete",
    async (payload: {
      id?: string
      conversationId?: string
      forEveryone?: boolean
    }) => {
      const id = payload?.id
      const conversationId = payload?.conversationId
      if (!id || !conversationId) return
      const existing = await db.message.findUnique({
        where: { id },
        select: { senderId: true, conversationId: true, deletedFor: true },
      })
      if (!existing || existing.conversationId !== conversationId) return

      if (payload.forEveryone) {
        if (existing.senderId !== userId) {
          socket.emit("error", { code: "forbidden", message: "فقط فرستنده می‌تواند حذف کند" })
          return
        }
        await db.message.update({
          where: { id },
          data: { deletedAt: new Date(), body: "" },
        })
        io.to(roomFor(studioDbName, conversationId)).emit("message:deleted", {
          id,
          conversationId,
          deletedAt: new Date().toISOString(),
          forEveryone: true,
        })
      } else {
        // delete for me only
        let deletedFor: string[] = []
        try {
          deletedFor = JSON.parse(existing.deletedFor || "[]")
        } catch {
          deletedFor = []
        }
        if (!deletedFor.includes(userId)) {
          deletedFor.push(userId)
          await db.message.update({
            where: { id },
            data: { deletedFor: JSON.stringify(deletedFor) },
          })
        }
        socket.emit("message:deleted", {
          id,
          conversationId,
          forEveryone: false,
          forUserId: userId,
        })
      }
    }
  )

  // -------------------------------------------------------------------------
  // reaction:toggle — toggle a reaction emoji on a message.
  // -------------------------------------------------------------------------
  socket.on(
    "reaction:toggle",
    async (payload: { messageId?: string; emoji?: string; conversationId?: string }) => {
      const messageId = payload?.messageId
      const emoji = payload?.emoji
      const conversationId = payload?.conversationId
      if (!messageId || !emoji || !conversationId) return
      const ok = await ensureParticipant(db, conversationId, userId)
      if (!ok) return

      const existing = await db.messageReaction.findFirst({
        where: { messageId, userId, emoji },
      })
      if (existing) {
        await db.messageReaction.delete({ where: { id: existing.id } })
      } else {
        try {
          await db.messageReaction.create({
            data: { messageId, userId, userName, emoji },
          })
        } catch {
          /* race condition, ignore */
        }
      }
      const reactions = await db.messageReaction.findMany({ where: { messageId } })
      io.to(roomFor(studioDbName, conversationId)).emit("message:reaction", {
        messageId,
        conversationId,
        reactions: reactions.map((r) => ({
          id: r.id,
          userId: r.userId,
          userName: r.userName,
          emoji: r.emoji,
          createdAt: r.createdAt.toISOString(),
        })),
      })
    }
  )

  // -------------------------------------------------------------------------
  // Disconnect: update presence.
  // -------------------------------------------------------------------------
  socket.on("disconnect", () => {
    const wentOffline = markOffline(studioDbName, userId, socket.id)
    if (wentOffline) {
      io.to(studioRoom(studioDbName)).emit("presence:update", {
        userId,
        online: false,
        lastSeenAt: new Date().toISOString(),
      })
    }
  })

  socket.on("error", (err: Error) => {
    console.error("[chat-ws] socket error", err.message)
  })
})

// ---------------------------------------------------------------------------
// Start.
// ---------------------------------------------------------------------------
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`[chat-ws] Socket.io server listening on port ${PORT}`)
  console.log(`[chat-ws] Internal broadcast token: ${INTERNAL_TOKEN === "dev-internal-token" ? "(default dev)" : "(custom)"}`)
})

// ---------------------------------------------------------------------------
// Graceful shutdown.
// ---------------------------------------------------------------------------
function shutdown() {
  console.log("[chat-ws] shutting down...")
  io.close(() => {
    httpServer.close(() => {
      Promise.all([
        masterDb.$disconnect(),
        ...Array.from(studioClients.values()).map((c) => c.$disconnect()),
      ]).finally(() => process.exit(0))
    })
  })
}
process.on("SIGTERM", shutdown)
process.on("SIGINT", shutdown)

