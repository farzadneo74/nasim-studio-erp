"use client"

/**
 * useChatSocket — Socket.io client hook for the NASIM messenger ("گفتگو").
 *
 * Connects to the chat-ws mini-service via Caddy's `?XTransformPort=3003`
 * reverse-proxy rule (same origin as the page — NEVER direct to :3003).
 *
 * Auto-reconnects, authenticates with the localStorage session token, and
 * exposes per-event callbacks that the React view can subscribe to. The view
 * keeps its own react-query cache; this hook is purely a transport for
 * real-time events.
 *
 * The hook is intentionally framework-agnostic about state management — it
 * only emits React state changes for `isConnected` and `presence`/`typing`
 * (which are ephemeral). All durable events (`message:new`, `message:edited`,
 * ...) are forwarded to caller-supplied handlers so the view can update its
 * react-query cache.
 */

import * as React from "react"
import { io, type Socket } from "socket.io-client"

const TOKEN_KEY = "nasim-session-token"
const SOCKET_PATH = "/?XTransformPort=3003"

// ---------------------------------------------------------------------------
// Event payload types (mirror what the chat-ws server emits).
// ---------------------------------------------------------------------------
export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  body: string
  mentions: unknown[]
  attachments: unknown[]
  replyToId: string | null
  replyTo: {
    id: string
    senderId: string
    senderName: string
    body: string
  } | null
  forwardedFromId: string | null
  forwardedFromName: string | null
  editedAt: string | null
  deletedAt: string | null
  deletedFor: string[]
  pinnedAt: string | null
  readBy: { userId: string; readAt: string }[]
  createdAt: string
  reactions: {
    id: string
    userId: string
    userName: string
    emoji: string
    createdAt: string
  }[]
}

export interface ConversationUpdatedPayload {
  id: string
  type?: string
  title?: string | null
  avatarUrl?: string | null
  lastMessageAt?: string | null
  lastMessagePreview?: string | null
  lastMessageSenderName?: string | null
  participants?: {
    id: string
    userId: string
    userName: string
    role: string
    leftAt: string | null
  }[]
}

export interface TypingPayload {
  conversationId: string
  userId: string
  userName?: string
}

export interface PresencePayload {
  userId: string
  online: boolean
  lastSeenAt: string | null
}

export interface ReadReceiptPayload {
  conversationId: string
  userId: string
  lastReadAt: string
  messageIds: string[]
}

export interface ReactionPayload {
  messageId: string
  conversationId: string
  reactions: {
    id: string
    userId: string
    userName: string
    emoji: string
    createdAt: string
  }[]
}

export interface MessageDeletedPayload {
  id: string
  conversationId: string
  deletedAt?: string
  forEveryone: boolean
  forUserId?: string
}

export interface MessageAckPayload {
  tempId?: string
  message: ChatMessage
}

export interface AuthenticatedPayload {
  userId: string
  userName: string
  studioId: string
  studioDbName: string
}

export interface ChatSocketHandlers {
  onMessageNew?: (m: ChatMessage) => void
  onMessageEdited?: (m: ChatMessage) => void
  onMessageDeleted?: (p: MessageDeletedPayload) => void
  onMessageReaction?: (p: ReactionPayload) => void
  onMessageRead?: (p: ReadReceiptPayload) => void
  onMessageAck?: (p: MessageAckPayload) => void
  onTypingStart?: (p: TypingPayload) => void
  onTypingStop?: (p: TypingPayload) => void
  onPresenceUpdate?: (p: PresencePayload) => void
  onConversationUpdated?: (p: ConversationUpdatedPayload) => void
  onAuthenticated?: (p: AuthenticatedPayload) => void
  onError?: (err: { code?: string; message?: string }) => void
}

export interface UseChatSocketOptions extends ChatSocketHandlers {
  /** Disable the socket entirely (e.g. when not authed). */
  enabled?: boolean
}

export interface UseChatSocketReturn {
  socket: Socket | null
  isConnected: boolean
  /** Map of userId → online status, kept up-to-date from `presence:update` events. */
  presence: Record<string, boolean>
  /** Subscribe to a conversation's room. Idempotent. */
  subscribe: (conversationId: string) => void
  /** Unsubscribe from a conversation's room. */
  unsubscribe: (conversationId: string) => void
  /** Emit a new message via socket (preferred over REST for real-time UX). */
  sendMessage: (payload: {
    conversationId: string
    body: string
    replyToId?: string | null
    mentions?: unknown[]
    attachments?: unknown[]
    forwardedFromId?: string | null
    forwardedFromName?: string | null
    tempId: string
  }) => boolean
  /** Emit an edit. */
  editMessage: (payload: { id: string; conversationId: string; body: string }) => void
  /** Emit a delete. forEveryone = "delete for everyone" (sender only). */
  deleteMessage: (payload: {
    id: string
    conversationId: string
    forEveryone: boolean
  }) => void
  /** Toggle a reaction emoji on a message. */
  toggleReaction: (payload: {
    messageId: string
    emoji: string
    conversationId: string
  }) => void
  /** Notify the room that the current user is typing. */
  emitTypingStart: (conversationId: string) => void
  /** Notify the room that the current user stopped typing. */
  emitTypingStop: (conversationId: string) => void
  /** Mark all messages in a conversation as read. */
  emitMessageRead: (conversationId: string) => void
}

export function useChatSocket(opts: UseChatSocketOptions = {}): UseChatSocketReturn {
  const { enabled = true, ...handlers } = opts
  const handlersRef = React.useRef(handlers)
  React.useLayoutEffect(() => {
    handlersRef.current = handlers
  })

  const [socket, setSocket] = React.useState<Socket | null>(null)
  const [isConnected, setIsConnected] = React.useState(false)
  const [presence, setPresence] = React.useState<Record<string, boolean>>({})

  // Connect once on mount (when enabled).
  React.useEffect(() => {
    if (!enabled) return
    let token: string | null = null
    try {
      token = localStorage.getItem(TOKEN_KEY)
    } catch {
      token = null
    }
    // No token → no point in connecting (the server will reject us anyway).
    // The view will start polling as a fallback.
    if (!token) return

    const s = io(SOCKET_PATH, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
      forceNew: true,
    })
    setSocket(s)

    const onConnect = () => setIsConnected(true)
    const onDisconnect = () => {
      setIsConnected(false)
      // Mark everyone offline on disconnect — the server will re-announce
      // presence when we reconnect.
      setPresence({})
    }
    const onMessageNew = (m: ChatMessage) => handlersRef.current.onMessageNew?.(m)
    const onMessageEdited = (m: ChatMessage) => handlersRef.current.onMessageEdited?.(m)
    const onMessageDeleted = (p: MessageDeletedPayload) =>
      handlersRef.current.onMessageDeleted?.(p)
    const onMessageReaction = (p: ReactionPayload) =>
      handlersRef.current.onMessageReaction?.(p)
    const onMessageRead = (p: ReadReceiptPayload) => handlersRef.current.onMessageRead?.(p)
    const onMessageAck = (p: MessageAckPayload) => handlersRef.current.onMessageAck?.(p)
    const onTypingStart = (p: TypingPayload) => handlersRef.current.onTypingStart?.(p)
    const onTypingStop = (p: TypingPayload) => handlersRef.current.onTypingStop?.(p)
    const onPresenceUpdate = (p: PresencePayload) => {
      setPresence((prev) => ({ ...prev, [p.userId]: !!p.online }))
      handlersRef.current.onPresenceUpdate?.(p)
    }
    const onConversationUpdated = (p: ConversationUpdatedPayload) =>
      handlersRef.current.onConversationUpdated?.(p)
    const onAuthenticated = (p: AuthenticatedPayload) =>
      handlersRef.current.onAuthenticated?.(p)
    const onError = (err: { code?: string; message?: string }) =>
      handlersRef.current.onError?.(err)

    s.on("connect", onConnect)
    s.on("disconnect", onDisconnect)
    s.on("authenticated", onAuthenticated)
    s.on("message:new", onMessageNew)
    s.on("message:edited", onMessageEdited)
    s.on("message:deleted", onMessageDeleted)
    s.on("message:reaction", onMessageReaction)
    s.on("message:read", onMessageRead)
    s.on("message:ack", onMessageAck)
    s.on("typing:start", onTypingStart)
    s.on("typing:stop", onTypingStop)
    s.on("presence:update", onPresenceUpdate)
    s.on("conversation:updated", onConversationUpdated)
    s.on("error", onError)

    return () => {
      s.off("connect", onConnect)
      s.off("disconnect", onDisconnect)
      s.off("authenticated", onAuthenticated)
      s.off("message:new", onMessageNew)
      s.off("message:edited", onMessageEdited)
      s.off("message:deleted", onMessageDeleted)
      s.off("message:reaction", onMessageReaction)
      s.off("message:read", onMessageRead)
      s.off("message:ack", onMessageAck)
      s.off("typing:start", onTypingStart)
      s.off("typing:stop", onTypingStop)
      s.off("presence:update", onPresenceUpdate)
      s.off("conversation:updated", onConversationUpdated)
      s.off("error", onError)
      s.disconnect()
      setSocket(null)
      setIsConnected(false)
    }
  }, [enabled])

  // Stable action callbacks (don't recreate on every render).
  const subscribe = React.useCallback(
    (conversationId: string) => {
      socket?.emit("conversation:subscribe", { conversationId })
    },
    [socket]
  )
  const unsubscribe = React.useCallback(
    (conversationId: string) => {
      socket?.emit("conversation:unsubscribe", { conversationId })
    },
    [socket]
  )
  const sendMessage = React.useCallback(
    (payload: Parameters<UseChatSocketReturn["sendMessage"]>[0]) => {
      if (!socket?.connected) return false
      socket.emit("message:send", payload)
      return true
    },
    [socket]
  )
  const editMessage = React.useCallback(
    (payload: Parameters<UseChatSocketReturn["editMessage"]>[0]) => {
      socket?.emit("message:edit", payload)
    },
    [socket]
  )
  const deleteMessage = React.useCallback(
    (payload: Parameters<UseChatSocketReturn["deleteMessage"]>[0]) => {
      socket?.emit("message:delete", payload)
    },
    [socket]
  )
  const toggleReaction = React.useCallback(
    (payload: Parameters<UseChatSocketReturn["toggleReaction"]>[0]) => {
      socket?.emit("reaction:toggle", payload)
    },
    [socket]
  )
  const emitTypingStart = React.useCallback(
    (conversationId: string) => {
      socket?.emit("typing:start", { conversationId })
    },
    [socket]
  )
  const emitTypingStop = React.useCallback(
    (conversationId: string) => {
      socket?.emit("typing:stop", { conversationId })
    },
    [socket]
  )
  const emitMessageRead = React.useCallback(
    (conversationId: string) => {
      socket?.emit("message:read", { conversationId })
    },
    [socket]
  )

  return {
    socket,
    isConnected,
    presence,
    subscribe,
    unsubscribe,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    emitTypingStart,
    emitTypingStop,
    emitMessageRead,
  }
}

