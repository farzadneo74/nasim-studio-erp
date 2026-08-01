"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Send,
  Search,
  Plus,
  Paperclip,
  X,
  Reply,
  Pencil,
  Trash2,
  SmilePlus,
  Smile,
  ArrowRight,
  ArrowDown,
  Users,
  User as UserIcon,
  Download,
  File as FileIcon,
  ImageIcon,
  Film,
  Music,
  Check,
  CheckCheck,
  Clock,
  MoreVertical,
  MessageCircle,
  Pin,
  PinOff,
  Forward,
  Copy,
  Settings,
  BellOff,
  ChevronDown,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { toPersianDigits, toJalali, JALALI_MONTHS } from "@/lib/jalali"
import { useApi } from "@/lib/api/client"
import { useWorkspace } from "@/stores/workspace"
import {
  useChatSocket,
  type ChatMessage as SocketChatMessage,
  type UseChatSocketReturn,
} from "@/lib/hooks/use-chat-socket"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { PageHeader, EmptyState } from "./_shared"

// ============================================================
// Types
// ============================================================
interface Mention {
  type: "customer" | "project" | "payment"
  id: string
  label: string
}
interface Attachment {
  type: "image" | "audio" | "video" | "file"
  url: string
  name: string
  size: number
  mime: string
}
interface Reaction {
  id: string
  userId: string
  userName: string
  emoji: string
  createdAt: string
}
interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  body: string
  mentions: Mention[]
  attachments: Attachment[]
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
  reactions: Reaction[]
  // Client-only optimistic state
  __tempId?: string
  __status?: "sending" | "sent" | "error"
}
interface Participant {
  id: string
  userId: string
  userName: string
  role: string
  joinedAt: string
  lastReadAt: string | null
  muted: boolean
  pinned: boolean
  leftAt?: string | null
}
interface Conversation {
  id: string
  type: "direct" | "group"
  title: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
  participants: Participant[]
  lastMessage: {
    id: string
    body: string
    senderId: string
    senderName: string
    createdAt: string
  } | null
  lastMessageAt: string | null
  lastMessagePreview: string | null
  lastMessageSenderName: string | null
  pinnedMessageId: string | null
  unreadCount: number
  pinned: boolean
}
interface ChatUser {
  id: string
  name: string
  phone?: string
  role: string
  roleLabel: string
}

// ============================================================
// Constants & helpers
// ============================================================
// Socket is the primary transport; HTTP polling is a slow fallback only
// (in case the socket disconnects or the user is on an unstable network).
const POLL_INTERVAL = 60_000
const PAGE_SIZE = 50
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥"]
const EMOJI_PICKER = ["👍", "❤️", "🔥", "😂", "🎉", "👀", "😮", "😢", "🙏"]
const TYPING_DEBOUNCE_MS = 3_000
const MENTION_COLORS: Record<Mention["type"], string> = {
  customer: "#f59e0b",
  project: "#10b981",
  payment: "#a855f7",
}
const MENTION_TYPE_LABELS: Record<Mention["type"], string> = {
  customer: "مشتری",
  project: "پروژه",
  payment: "پرداخت",
}

const LAST_READ_KEY = "nasim-msg-lastread"

// ============================================================
// Emoji picker categories
// ============================================================
interface EmojiCategory {
  id: string
  label: string
  icon: string
  emojis: string[]
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "smileys",
    label: "چهره‌ها",
    icon: "😀",
    emojis: [
      "😀","😁","😂","😃","😄","😅","😆","😇","😈","😉",
      "😊","😋","😌","😍","😎","😏","😐","😑","😒","😓",
      "😔","😕","😖","😗","😘","😙","😚","😛","😜","😝",
      "😞","😟","😠","😡","😢","😣","😤","😥","😦","😧",
      "😨","😩","😪","😫","😬","😭","😮","😯","😰","😱",
      "😲","😳","😴","😵","😶","🤑","🤒","🤓","🤔","🤕",
      "🤖","🤗","🤠","🤡","🤥","🤨","🤩","🤪","🤭","🤮",
    ],
  },
  {
    id: "hearts",
    label: "قلب‌ها و نمادها",
    icon: "❤️",
    emojis: [
      "❤️","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️",
      "💕","💞","💓","💗","💖","💘","💝","💟","♥️","💌",
      "✨","💫","⭐","🌟","🔥","💯","💢","💥","💦","💨",
      "❌","✅","⭕","🔴","🟢","🔵","❓","❗","‼️","⁉️",
      "👍","👎","👌","👏","🙌","🙏","🤝","✊","✋","👋",
    ],
  },
  {
    id: "animals",
    label: "حیوانات و طبیعت",
    icon: "🐶",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯",
      "🦁","🐮","🐷","🐽","🐸","🐵","🙈","🙉","🙊","🐒",
      "🐔","🐧","🐦","🐤","🐣","🐥","🦆","🦅","🦉","🦇",
      "🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜",
      "🌹","🌻","🌼","🌷","🌱","🌲","🌳","🌴","🌵","🌾",
    ],
  },
  {
    id: "food",
    label: "غذا و نوشیدنی",
    icon: "🍔",
    emojis: [
      "🍔","🍟","🍕","🌭","🥪","🌮","🌯","🥙","🧆","🥗",
      "🥘","🥫","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🦪",
      "🍤","🍙","🍚","🍘","🍥","🥠","🥮","🍢","🍡","🍧",
      "🍨","🍦","🥧","🧁","🍰","🎂","🍮","🍭","🍬","🍫",
      "☕","🍵","🥤","🧋","🍺","🍻","🥃","🍷","🥂","🍾",
    ],
  },
  {
    id: "activities",
    label: "فعالیت‌ها",
    icon: "⚽",
    emojis: [
      "⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱",
      "🪀","🏓","🏸","🏒","🏑","🥍","🏏","🥅","⛳","🏹",
      "🎣","🤿","🥊","🥋","🎽","🛹","🛼","🛷","⛸️","🥌",
      "🎿","⛷️","🏂","🪂","🏋️","🤸","🤼","🤽","🤾","🏌️",
      "🏄","🏊","🤺","🚴","🚵","🎯","🎮","🎲","🧩","🎤",
    ],
  },
  {
    id: "travel",
    label: "سفر و مکان‌ها",
    icon: "🏠",
    emojis: [
      "🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏨","🏩","🏪",
      "🏫","🏬","🏭","🏯","🏰","💒","🗼","🗽","⛪","🕌",
      "🛕","🕍","⛩️","🕋","⛲","⛺","🌁","🌃","🏙️","🌄",
      "🌅","🌇","🌉","♨️","🎠","🎡","🎢","💈","🎪","🚂",
      "✈️","🚀","🛸","🚁","⛵","🚤","🛳️","🚢","🚗","🚕",
    ],
  },
  {
    id: "objects",
    label: "اشیاء",
    icon: "💡",
    emojis: [
      "💡","🔦","🕯️","🪔","🧯","🛢️","💸","💵","💴","💶",
      "💷","🪙","💰","💳","💎","⚖️","🧰","🔧","🔨","⚒️",
      "🛠️","⚙️","🧱","⛓️","🧲","🔫","💣","🧨","🪓","🔪",
      "🗡️","⚔️","🛡️","🚬","⚰️","⚱️","🏺","🔮","📿","🧿",
      "⏰","⏳","📡","📱","💻","⌨️","🖥️","🖨️","🖱️","💽",
    ],
  },
]

const ALL_EMOJIS_FLAT: { emoji: string; label: string }[] = (() => {
  const out: { emoji: string; label: string }[] = []
  for (const cat of EMOJI_CATEGORIES) {
    for (const e of cat.emojis) {
      out.push({ emoji: e, label: cat.label })
    }
  }
  return out
})()

function getLastRead(conversationId: string): number {
  if (typeof window === "undefined") return 0
  try {
    const raw = localStorage.getItem(LAST_READ_KEY)
    if (!raw) return 0
    const map = JSON.parse(raw) as Record<string, string>
    const v = map[conversationId]
    return v ? new Date(v).getTime() : 0
  } catch {
    return 0
  }
}
function setLastRead(conversationId: string, iso: string) {
  if (typeof window === "undefined") return
  try {
    const raw = localStorage.getItem(LAST_READ_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, string>) : {}
    const prev = map[conversationId] ? new Date(map[conversationId]).getTime() : 0
    const next = new Date(iso).getTime()
    if (next > prev) {
      map[conversationId] = iso
      localStorage.setItem(LAST_READ_KEY, JSON.stringify(map))
    }
  } catch {
    /* ignore */
  }
}

function initials(name: string): string {
  if (!name) return "؟"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2)
  return (parts[0][0] || "") + (parts[1][0] || "")
}

// Stable per-name color (avoid indigo/blue)
const AVATAR_COLORS = [
  "#0ea5e9", "#10b981", "#f59e0b", "#a855f7", "#ec4899",
  "#ef4444", "#14b8a6", "#eab308", "#8b5cf6", "#06b6d4",
]
function colorForName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatBytes(bytes: number): string {
  if (!bytes) return "۰"
  const kb = bytes / 1024
  if (kb < 1024) return toPersianDigits(kb.toFixed(0)) + " کیلوبایت"
  const mb = kb / 1024
  if (mb < 1024) return toPersianDigits(mb.toFixed(1)) + " مگابایت"
  return toPersianDigits((mb / 1024).toFixed(1)) + " گیگابایت"
}

function formatChatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  const time = toPersianDigits(`${hh}:${mm}`)
  if (sameDay) return time
  if (isYesterday) return "دیروز"
  return jalaliDayMonth(d)
}

// Relative time for the conversation list: "الان", "۵ دقیقه", "۲ ساعت", "دیروز", or Jalali day-month.
function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHr = Math.floor(diffMs / 3_600_000)
  const sameDay = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()
  if (sameDay) {
    if (diffMin < 1) return "الان"
    if (diffMin < 60) return `${toPersianDigits(diffMin)} دقیقه`
    if (diffHr < 24) return `${toPersianDigits(diffHr)} ساعت`
  }
  if (isYesterday) return "دیروز"
  // Same year: day + month. Different year: include year.
  const jNow = toJalali(now)
  const j = toJalali(d)
  if (j.jy === jNow.jy) return jalaliDayMonth(d)
  return `${toPersianDigits(j.jd)} ${JALALI_MONTHS[j.jm - 1]} ${toPersianDigits(j.jy)}`
}

// Check whether the current user has read at least up to a given message —
// used to compute unread badge counts from the server-side lastReadAt.
function isReadByMe(msgTime: string, lastReadAt: string | null): boolean {
  if (!lastReadAt) return false
  return new Date(msgTime).getTime() <= new Date(lastReadAt).getTime()
}

// Jalali day-month short formatter (e.g. "۵ تیر").
function jalaliDayMonth(date: Date): string {
  const { jm, jd } = toJalali(date)
  return `${toPersianDigits(jd)} ${JALALI_MONTHS[jm - 1]}`
}

// ============================================================
// API helpers
// ============================================================
function useUserIdentity() {
  // Read the current user from /api/auth/me (only identity needed).
  const { data } = useQuery({
    queryKey: ["msg-me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me")
      if (!res.ok) throw new Error("auth")
      const data = await res.json()
      if (!data.authed) throw new Error("not authed")
      return { id: data.user.id as string, name: data.user.name as string }
    },
    staleTime: 60_000,
    retry: false,
  })
  return data
}

function useMutate() {
  const role = useWorkspace((s) => s.role)
  return React.useCallback(
    async function mutate<T = unknown>(
      url: string,
      method: "POST" | "PATCH" | "DELETE",
      body?: unknown
    ): Promise<T> {
      // Include both the Bearer token (if present) and the session cookie
      // so that mutations work whether the user is logged in via token or
      // via cookie-based session.
      let token: string | null = null
      try {
        token = localStorage.getItem("nasim-session-token")
      } catch {
        /* ignore */
      }
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-demo-role": role,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const errMsg = (data as { error?: string })?.error || `Request failed (${res.status})`
        throw new Error(errMsg)
      }
      return data as T
    },
    [role]
  )
}

// ============================================================
// Data hooks
// ============================================================
function useConversations() {
  const api = useApi()
  return useQuery<{ items: Conversation[] }>({
    queryKey: ["msg-conversations"],
    queryFn: () => api.get("/api/messages/conversations"),
    // Socket is primary; this is a fallback for when the socket is disconnected.
    refetchInterval: POLL_INTERVAL,
  })
}

function useChatUsers() {
  const api = useApi()
  return useQuery<{ items: ChatUser[] }>({
    queryKey: ["msg-users"],
    queryFn: () => api.get("/api/messages/users"),
    staleTime: 60_000,
  })
}

function useMessages(conversationId: string | null) {
  const api = useApi()
  return useQuery<{ items: Message[]; hasMore: boolean }>({
    queryKey: ["msg-messages", conversationId],
    queryFn: () => api.get(`/api/messages/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
    // Socket is primary; this is a slow fallback only.
    refetchInterval: POLL_INTERVAL,
  })
}

function useOlderMessages(conversationId: string | null) {
  const api = useApi()
  const qc = useQueryClient()
  return React.useCallback(
    async (beforeIso: string): Promise<{ items: Message[]; hasMore: boolean }> => {
      const data = await api.get(
        `/api/messages/conversations/${conversationId}/messages?before=${encodeURIComponent(beforeIso)}`
      )
      // Merge into cache
      qc.setQueryData<{ items: Message[]; hasMore: boolean }>(
        ["msg-messages", conversationId],
        (old) => {
          if (!old) return data
          const existingIds = new Set(old.items.map((m) => m.id))
          const newOnes = data.items.filter((m) => !existingIds.has(m.id))
          // API returns newest first; we keep newest first in cache and reverse only at render
          return { items: [...old.items, ...newOnes], hasMore: data.hasMore }
        }
      )
      return data
    },
    [api, qc, conversationId]
  )
}

// ============================================================
// Mutations
// ============================================================
function useSendMessage(conversationId: string) {
  const mutate = useMutate()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      body: string
      replyToId?: string | null
      mentions?: Mention[]
      attachments?: Attachment[]
    }) =>
      mutate<Message>(
        `/api/messages/conversations/${conversationId}/messages`,
        "POST",
        payload
      ),
    onSuccess: (msg) => {
      qc.setQueryData<{ items: Message[]; hasMore: boolean }>(
        ["msg-messages", conversationId],
        (old) => {
          if (!old) return { items: [msg], hasMore: false }
          return { items: [msg, ...old.items], hasMore: old.hasMore }
        }
      )
      qc.invalidateQueries({ queryKey: ["msg-conversations"] })
      setLastRead(conversationId, msg.createdAt)
    },
    onError: (e: Error) => toast.error(e.message || "ارسال پیام ناموفق بود"),
  })
}

function useEditMessage(conversationId: string) {
  const mutate = useMutate()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) =>
      mutate<Message>(`/api/messages/${id}`, "PATCH", { body }),
    onSuccess: (msg) => {
      qc.setQueryData<{ items: Message[]; hasMore: boolean }>(
        ["msg-messages", conversationId],
        (old) => {
          if (!old) return old
          return {
            ...old,
            items: old.items.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)),
          }
        }
      )
      qc.invalidateQueries({ queryKey: ["msg-conversations"] })
    },
    onError: (e: Error) => toast.error(e.message || "ویرایش ناموفق بود"),
  })
}

function useDeleteMessage(conversationId: string) {
  const mutate = useMutate()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => mutate<{ ok: boolean }>(`/api/messages/${id}`, "DELETE"),
    onSuccess: (_, id) => {
      qc.setQueryData<{ items: Message[]; hasMore: boolean }>(
        ["msg-messages", conversationId],
        (old) => {
          if (!old) return old
          return { ...old, items: old.items.filter((m) => m.id !== id) }
        }
      )
      qc.invalidateQueries({ queryKey: ["msg-conversations"] })
    },
    onError: (e: Error) => toast.error(e.message || "حذف ناموفق بود"),
  })
}

function useToggleReaction(conversationId: string) {
  const mutate = useMutate()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, emoji }: { id: string; emoji: string }) =>
      mutate<{ items: Reaction[] }>(`/api/messages/${id}/reactions`, "POST", { emoji }),
    onSuccess: (data, vars) => {
      qc.setQueryData<{ items: Message[]; hasMore: boolean }>(
        ["msg-messages", conversationId],
        (old) => {
          if (!old) return old
          return {
            ...old,
            items: old.items.map((m) =>
              m.id === vars.id ? { ...m, reactions: data.items } : m
            ),
          }
        }
      )
    },
    onError: (e: Error) => toast.error(e.message || "افزودن واکنش ناموفق بود"),
  })
}

function useCreateConversation() {
  const mutate = useMutate()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      type: "direct" | "group"
      title?: string
      participantIds: string[]
    }) => mutate<Conversation>("/api/messages/conversations", "POST", payload),
    onSuccess: (conv) => {
      qc.setQueryData<{ items: Conversation[] }>(["msg-conversations"], (old) => {
        if (!old) return { items: [conv] }
        const exists = old.items.some((c) => c.id === conv.id)
        if (exists) return old
        return { items: [conv, ...old.items] }
      })
    },
    onError: (e: Error) => toast.error(e.message || "ایجاد گفتگو ناموفق بود"),
  })
}

function useUploadAttachment(conversationId: string) {
  const role = useWorkspace((s) => s.role)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      file: File
      onProgress?: (pct: number) => void
      abortSignal?: AbortSignal
    }): Promise<Attachment> => {
      const { file, onProgress, abortSignal } = params
      return new Promise<Attachment>((resolve, reject) => {
        const fd = new FormData()
        fd.append("file", file)
        fd.append("conversationId", conversationId)
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100))
          }
        }
        xhr.onload = () => {
          let data: unknown = {}
          try {
            data = JSON.parse(xhr.responseText || "{}")
          } catch {
            data = {}
          }
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data as Attachment)
          } else {
            const errMsg =
              (data as { error?: string })?.error || `Upload failed (${xhr.status})`
            reject(new Error(errMsg))
          }
        }
        xhr.onerror = () => reject(new Error("خطای شبکه در بارگذاری فایل"))
        xhr.onabort = () => reject(new Error("__cancel__"))
        xhr.open("POST", "/api/messages/upload")
        xhr.setRequestHeader("x-demo-role", role)
        if (abortSignal) {
          if (abortSignal.aborted) {
            xhr.abort()
          } else {
            abortSignal.addEventListener("abort", () => xhr.abort(), { once: true })
          }
        }
        xhr.send(fd)
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["msg-conversations"] }),
    onError: (e: Error) => {
      // Suppress the toast for cancellations — the user already chose to cancel.
      if (e.message !== "__cancel__") {
        toast.error(e.message || "بارگذاری فایل ناموفق بود")
      }
    },
  })
}

// ============================================================
// Conversation management mutations (PATCH /api/messages/conversations/[id])
// ============================================================
function useConversationAction() {
  const mutate = useMutate()
  const qc = useQueryClient()
  return React.useCallback(
    async function action(
      conversationId: string,
      body: {
        action:
          | "rename"
          | "set-avatar"
          | "add-participants"
          | "remove-participant"
          | "leave"
          | "promote"
          | "mute"
          | "pin"
        [k: string]: unknown
      }
    ): Promise<{ ok: boolean }> {
      const r = await mutate<{ ok: boolean }>(
        `/api/messages/conversations/${conversationId}`,
        "PATCH",
        body
      )
      qc.invalidateQueries({ queryKey: ["msg-conversations"] })
      qc.invalidateQueries({ queryKey: ["msg-messages", conversationId] })
      return r
    },
    [mutate, qc]
  )
}

// ============================================================
// Permanently delete an entire conversation + all its messages + attachments.
// Emits a `conversation:deleted` socket event to all participants via the
// server. The view listens for that event to clear the active chat.
// ============================================================
function useDeleteConversation() {
  const mutate = useMutate()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (conversationId: string) =>
      mutate<{ ok: boolean; id: string }>(
        `/api/messages/conversations/${conversationId}`,
        "DELETE"
      ),
    onSuccess: (_, conversationId) => {
      qc.setQueryData<{ items: Conversation[] }>(["msg-conversations"], (old) => {
        if (!old) return old
        return { items: old.items.filter((c) => c.id !== conversationId) }
      })
      qc.removeQueries({ queryKey: ["msg-messages", conversationId] })
      toast.success("گفتگو حذف شد")
    },
    onError: (e: Error) => toast.error(e.message || "حذف گفتگو ناموفق بود"),
  })
}

// ============================================================
// Forward messages to another conversation
// ============================================================
function useForwardMessages(targetConversationId: string) {
  const mutate = useMutate()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (messageIds: string[]) =>
      mutate<{ ok: boolean; createdIds: string[] }>(
        `/api/messages/conversations/${targetConversationId}/forward`,
        "POST",
        { messageIds }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["msg-messages", targetConversationId] })
      qc.invalidateQueries({ queryKey: ["msg-conversations"] })
      toast.success("پیام فوروارد شد")
    },
    onError: (e: Error) => toast.error(e.message || "فوروارد ناموفق بود"),
  })
}

// ============================================================
// Mark all messages in a conversation as read (REST fallback when socket
// is not connected).
// ============================================================
function useMarkConversationRead() {
  const mutate = useMutate()
  return React.useCallback(
    async (conversationId: string) => {
      try {
        await mutate<{ ok: boolean; lastReadAt: string }>(
          `/api/messages/conversations/${conversationId}/read`,
          "POST",
          {}
        )
      } catch {
        /* ignore — socket will also fire message:read */
      }
    },
    [mutate]
  )
}

// ============================================================
// Mention rendering
// ============================================================
// ✅ FIXES-7B: mentions render as clickable spans with a distinct style
//    (`bg-primary/10 text-primary cursor-pointer rounded px-1`).
//    - customer mention → openCustomer(customerId)
//    - project mention  → openProject(projectId)
//    - payment mention  → openProject(projectId) (payment's id IS the project id)
//    Mentions are stored on the Message row as a `mentions: Mention[]` array
//    ({ type, id, label }); the body contains `@label` substrings which the
//    renderer parses and turns into clickable spans.
function renderBodyWithMentions(body: string, mentions: Mention[], onMentionClick?: (m: Mention) => void): React.ReactNode {
  if (!body) return null
  if (!mentions || mentions.length === 0) {
    return <span className="whitespace-pre-wrap break-words">{body}</span>
  }
  // Sort mentions by label length desc so longer labels match first.
  const sorted = [...mentions].sort((a, b) => b.label.length - a.label.length)
  const mentionLabels = sorted.map((m) => m.label)
  // Build a regex that matches @label for any mention label
  const escaped = mentionLabels.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  const re = new RegExp(`@(${escaped.join("|")})`, "g")
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = re.exec(body)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={key++} className="whitespace-pre-wrap break-words">
          {body.slice(lastIndex, match.index)}
        </span>
      )
    }
    const label = match[1]
    const mention = sorted.find((m) => m.label === label)
    const typeLabel = mention ? MENTION_TYPE_LABELS[mention.type] : "اشاره"
    const clickable = !!mention && !!onMentionClick
    // ✅ Per FIXES-7B spec: distinct style for mentions —
    //   bg-primary/10 text-primary cursor-pointer rounded px-1
    // We add `mx-0.5` for a tiny bit of horizontal breathing room between
    // neighbouring text and `align-baseline` so the chip sits on the text
    // baseline (it would otherwise float above the line).
    const baseClass = "mx-0.5 inline-flex items-center rounded px-1 align-baseline text-[0.92em] font-medium"
    const clickableClass = clickable
      ? `${baseClass} bg-primary/10 text-primary cursor-pointer transition-opacity hover:opacity-80`
      : `${baseClass} bg-muted text-muted-foreground`
    parts.push(
      <span
        key={key++}
        className={clickableClass}
        title={clickable ? `${typeLabel} — کلیک برای باز کردن` : typeLabel}
        onClick={clickable && mention ? (e) => { e.stopPropagation(); onMentionClick!(mention) } : undefined}
        role={clickable ? "button" : undefined}
      >
        @{label}
      </span>
    )
    lastIndex = re.lastIndex
  }
  if (lastIndex < body.length) {
    parts.push(
      <span key={key++} className="whitespace-pre-wrap break-words">
        {body.slice(lastIndex)}
      </span>
    )
  }
  return <span className="break-words">{parts}</span>
}

// ✅ Wrapper component that wires the mention click handler to workspace navigation:
//   - customer mention → openCustomer(customerId)
//   - project mention  → openProject(projectId)
//   - payment mention  → openProject(projectId) (the payment mention's id is the
//     associated project id; the financials section is no longer a separate tab
//     so we just open the project).
function MessageBodyWithMentions({ body, mentions }: { body: string; mentions: Mention[] }) {
  const openCustomer = useWorkspace((s) => s.openCustomer)
  const openProject = useWorkspace((s) => s.openProject)

  const handleMentionClick = React.useCallback((m: Mention) => {
    if (!m.id) return
    if (m.type === "customer") {
      openCustomer(m.id)
    } else if (m.type === "project") {
      openProject(m.id)
    } else if (m.type === "payment") {
      // The payment mention's id is the project id (see MentionPickerDialog usage).
      openProject(m.id)
    }
  }, [openCustomer, openProject])

  return (
    <>
      {renderBodyWithMentions(body, mentions, handleMentionClick)}
    </>
  )
}

// ============================================================
// Attachment renderer
// ============================================================
function AttachmentRenderer({ att, onImageClick }: { att: Attachment; onImageClick?: (url: string) => void }) {
  const name = att.name || "فایل"
  if (att.type === "image") {
    return (
      <button
        type="button"
        onClick={() => onImageClick?.(att.url)}
        className="block overflow-hidden rounded-lg border bg-muted/40"
        title={name}
      >
        { }
        <img
          src={att.url}
          alt={name}
          className="max-h-64 max-w-full object-cover"
          loading="lazy"
        />
      </button>
    )
  }
  if (att.type === "audio") {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2">
        <Music className="size-4 shrink-0 text-muted-foreground" />
        <audio controls src={att.url} className="h-8 max-w-full flex-1" />
      </div>
    )
  }
  if (att.type === "video") {
    return (
      <video
        controls
        src={att.url}
        className="max-h-80 max-w-full rounded-lg border bg-black"
      />
    )
  }
  // file
  return (
    <a
      href={att.url}
      download={name}
      className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2 text-xs hover:bg-muted/60 transition-colors"
    >
      <FileIcon className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <span className="text-muted-foreground">{formatBytes(att.size)}</span>
      <Download className="size-3.5 shrink-0 text-muted-foreground" />
    </a>
  )
}

function PendingAttachmentChip({ att, onRemove }: { att: { name: string; size: number; type: string }; onRemove: () => void }) {
  const Icon =
    att.type === "image"
      ? ImageIcon
      : att.type === "audio"
      ? Music
      : att.type === "video"
      ? Film
      : FileIcon
  return (
    <div className="flex items-center gap-1.5 rounded-md border bg-muted/40 py-1 pr-2 pl-1 text-xs">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="max-w-[160px] truncate">{att.name}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-5"
        onClick={onRemove}
        aria-label="حذف پیوست"
      >
        <X className="size-3" />
      </Button>
    </div>
  )
}

// ============================================================
// Reaction pill
// ============================================================
function ReactionPill({
  emoji,
  count,
  reactedByMe,
  onClick,
}: {
  emoji: string
  count: number
  reactedByMe: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
        reactedByMe
          ? "border-primary/40 bg-primary/10 text-foreground"
          : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
      )}
    >
      <span>{emoji}</span>
      <span className="font-medium tabular-nums">{toPersianDigits(count)}</span>
    </button>
  )
}

// ============================================================
// Read-receipt tick (✓ / ✓✓ / blue ✓✓)
// ============================================================
function ReadReceiptTick({
  message,
  isMine,
  otherUserIds,
}: {
  message: Message
  isMine: boolean
  otherUserIds: string[]
}) {
  if (!isMine) return null
  // While optimistically sending: show a clock.
  if (message.__status === "sending") {
    return <Clock className="size-3 text-muted-foreground" aria-label="در حال ارسال" />
  }
  if (message.__status === "error") {
    return <span className="text-[10px] text-destructive" aria-label="خطا">⚠</span>
  }
  // readBy contains userIds of OTHER users who have read the message.
  const readers = (message.readBy || []).map((r) => r.userId)
  const readByOther = readers.some((u) => otherUserIds.includes(u))
  if (readByOther) {
    // Blue double-check (read)
    return <CheckCheck className="size-3.5 text-sky-500" aria-label="خوانده شد" />
  }
  // Single check (delivered to server) — we got the ack.
  return <Check className="size-3.5 text-muted-foreground" aria-label="ارسال شد" />
}

// ============================================================
// Message bubble
// ============================================================
function MessageBubble({
  message,
  isMine,
  isGroup,
  meId,
  otherUserIds,
  onReply,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onReact,
  onForward,
  onPin,
  onCopy,
  onImageClick,
  onScrollToMessage,
}: {
  message: Message
  isMine: boolean
  isGroup: boolean
  meId: string
  otherUserIds: string[]
  onReply: (m: Message) => void
  onEdit: (m: Message) => void
  onDeleteForMe: (m: Message) => void
  onDeleteForEveryone: (m: Message) => void
  onReact: (m: Message, emoji: string) => void
  onForward: (m: Message) => void
  onPin: (m: Message) => void
  onCopy: (m: Message) => void
  onImageClick: (url: string) => void
  onScrollToMessage?: (id: string) => void
}) {
  const [emojiOpen, setEmojiOpen] = React.useState(false)
  const [actionDialogOpen, setActionDialogOpen] = React.useState(false)
  const color = colorForName(message.senderName)
  const time = formatChatTime(message.createdAt)
  const images = message.attachments.filter((a) => a.type === "image")
  const others = message.attachments.filter((a) => a.type !== "image")

  // Group reactions by emoji
  const reactionsByEmoji = React.useMemo(() => {
    const map = new Map<string, { count: number; reactedByMe: boolean; users: string[] }>()
    for (const r of message.reactions) {
      const e = r.emoji
      if (!map.has(e)) map.set(e, { count: 0, reactedByMe: false, users: [] })
      const v = map.get(e)!
      v.count++
      v.users.push(r.userName)
      if (r.userId === meId) v.reactedByMe = true
    }
    return Array.from(map.entries())
  }, [message.reactions, meId])

  const isDeleted = !!message.deletedAt

  // Alignment:
  //   - isMine → bubble on the LEFT (flex-row, items-start)
  //   - others → bubble on the RIGHT (flex-row-reverse, items-end)
  // The avatar is shown only for others' messages, on their outer side.
  // (User explicitly requested: own messages on the LEFT, others on the RIGHT.)

  return (
    <div
      className={cn(
        "group flex w-full gap-2 px-3 py-1.5",
        isMine ? "flex-row" : "flex-row-reverse"
      )}
    >
      {/* Avatar — only for others' messages, on the outer side (right for RTL) */}
      {!isMine && (
        <Avatar className="size-8 shrink-0 self-end">
          <AvatarFallback
            className="text-[11px] font-semibold text-white"
            style={{ backgroundColor: color }}
          >
            {initials(message.senderName)}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Bubble column */}
      <div className={cn("flex max-w-[78%] flex-col gap-1", isMine ? "items-start" : "items-end")}>
        {/* Sender name (group only) */}
        {isGroup && !isMine && !isDeleted && (
          <div className="px-1 text-[11px] font-medium" style={{ color }}>
            {message.senderName}
          </div>
        )}

        <div
          className={cn(
            "relative rounded-2xl px-3 py-2 text-sm shadow-sm transition-opacity",
            isMine
              ? "rounded-tl-md bg-sky-100/80 text-foreground dark:bg-sky-500/15"
              : "rounded-tr-md bg-muted text-foreground",
            message.__status === "sending" && "opacity-60"
          )}
        >
          {/* Forwarded label */}
          {!!message.forwardedFromName && !isDeleted && (
            <div className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Forward className="size-3" />
              <span>
                فوروارد شده از: <span className="font-medium">{message.forwardedFromName}</span>
              </span>
            </div>
          )}

          {/* Reply quote (clickable) */}
          {message.replyTo && !isDeleted && (
            <button
              type="button"
              onClick={() => onScrollToMessage?.(message.replyTo!.id)}
              className={cn(
                "mb-1.5 block w-full rounded-md border-r-2 bg-background/40 px-2 py-1 text-right text-xs hover:bg-background/70 transition-colors",
                isMine ? "border-sky-500/60" : "border-muted-foreground/40"
              )}
            >
              <div className="font-medium text-muted-foreground">
                {message.replyTo.senderId === meId ? "شما" : message.replyTo.senderName}
              </div>
              <div className="line-clamp-2 text-muted-foreground">
                {message.replyTo.body || "📎 پیوست"}
              </div>
            </button>
          )}

          {/* Deleted state */}
          {isDeleted ? (
            <div className="italic text-muted-foreground">این پیام حذف شد</div>
          ) : (
            <>
              {/* Body */}
              {message.body && (
                <div className="leading-relaxed">
                  <MessageBodyWithMentions body={message.body} mentions={message.mentions} />
                </div>
              )}

              {/* Attachments */}
              {images.length > 0 && (
                <div className={cn("mt-1 grid gap-1", images.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                  {images.map((a, i) => (
                    <AttachmentRenderer key={i} att={a} onImageClick={onImageClick} />
                  ))}
                </div>
              )}
              {others.length > 0 && (
                <div className="mt-1 flex flex-col gap-1">
                  {others.map((a, i) => (
                    <AttachmentRenderer key={i} att={a} onImageClick={onImageClick} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Footer: time + edited + read receipt */}
          <div
            className={cn(
              "mt-1 flex items-center gap-1 text-[10px] text-muted-foreground",
              isMine ? "justify-end" : "justify-start"
            )}
          >
            {message.editedAt && !isDeleted && <span>ویرایش شد</span>}
            <span className="tabular-nums">{time}</span>
            {isMine && !isDeleted && (
              <ReadReceiptTick
                message={message}
                isMine={isMine}
                otherUserIds={otherUserIds}
              />
            )}
          </div>

          {/* Always-visible action button — opens a Dialog (works on mobile + desktop) */}
          {!isDeleted && (
            <div
              className={cn(
                "absolute -top-3 z-20",
                isMine ? "right-1" : "left-1"
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 rounded-full border bg-background shadow-md"
                onClick={() => setActionDialogOpen(true)}
                aria-label="عملیات پیام"
                title="عملیات پیام"
              >
                <MoreVertical className="size-3.5" />
              </Button>

              {/* Action Dialog — works reliably on mobile + desktop */}
              <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
                <DialogContent className="max-w-xs p-0 sm:max-w-sm">
                  {/* Quick reactions row */}
                  <div className="border-b p-3">
                    <div className="mb-2 text-center text-xs text-muted-foreground">واکنش سریع</div>
                    <div className="flex flex-wrap justify-center gap-1">
                      {QUICK_REACTIONS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => {
                            onReact(message, e)
                            setActionDialogOpen(false)
                          }}
                          className="flex size-10 items-center justify-center rounded-lg text-xl transition-colors hover:bg-accent"
                          aria-label={`واکنش ${e}`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => { onReply(message); setActionDialogOpen(false) }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                    >
                      <Reply className="size-4 text-muted-foreground" /> پاسخ
                    </button>
                    <button
                      type="button"
                      onClick={() => { onForward(message); setActionDialogOpen(false) }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                    >
                      <Forward className="size-4 text-muted-foreground" /> فوروارد
                    </button>
                    <button
                      type="button"
                      onClick={() => { onPin(message); setActionDialogOpen(false) }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                    >
                      <Pin className="size-4 text-muted-foreground" /> سنجاق
                    </button>
                    <button
                      type="button"
                      onClick={() => { onCopy(message); setActionDialogOpen(false) }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                    >
                      <Copy className="size-4 text-muted-foreground" /> کپی متن
                    </button>
                    {isMine && (
                      <button
                        type="button"
                        onClick={() => { onEdit(message); setActionDialogOpen(false) }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                      >
                        <Pencil className="size-4 text-muted-foreground" /> ویرایش
                      </button>
                    )}
                    <div className="my-1 border-t" />
                    <button
                      type="button"
                      onClick={() => { onDeleteForMe(message); setActionDialogOpen(false) }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" /> حذف برای من
                    </button>
                    {isMine && (
                      <button
                        type="button"
                        onClick={() => { onDeleteForEveryone(message); setActionDialogOpen(false) }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" /> حذف برای همه
                      </button>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Reactions row */}
        {reactionsByEmoji.length > 0 && (
          <div className={cn("flex flex-wrap gap-1 px-1", isMine ? "justify-start" : "justify-end")}>
            {reactionsByEmoji.map(([emoji, info]) => (
              <ReactionPill
                key={emoji}
                emoji={emoji}
                count={info.count}
                reactedByMe={info.reactedByMe}
                onClick={() => onReact(message, emoji)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Mention picker — searchable, tabbed, customer-filter aware.
// Calls GET /api/messages/mentions?type=customer|project|payment&search=...&customerId=...
// Remembers the most recently tagged customer and uses it as a filter for the
// project / payment tabs (with a clearable badge).
// ============================================================
interface MentionItem {
  id: string
  label: string
  [k: string]: unknown
}

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = React.useState<T>(value)
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function useMentionItems(
  type: Mention["type"],
  search: string,
  customerId: string | null
) {
  const api = useApi()
  return useQuery<{ items: MentionItem[] }>({
    queryKey: ["msg-mentions", type, search, customerId || ""],
    queryFn: () => {
      const params = new URLSearchParams({ type, search })
      if (customerId) params.set("customerId", customerId)
      return api.get(`/api/messages/mentions?${params.toString()}`)
    },
    staleTime: 0,
    retry: false,
  })
}

// MentionPickerDialog — a modal-based mention picker (works reliably on mobile + desktop)
function MentionPickerDialog({
  open,
  onOpenChange,
  onPick,
  activeCustomer,
  onActiveCustomerChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onPick: (m: Mention) => void
  activeCustomer: { id: string; label: string } | null
  onActiveCustomerChange: (c: { id: string; label: string } | null) => void
}) {
  const [type, setType] = React.useState<Mention["type"]>("customer")
  const [search, setSearch] = React.useState("")
  const debouncedSearch = useDebouncedValue(search, 300)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open) {
      setSearch("")
      setType("customer")
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [open])

  const filterCustomerId =
    type === "customer" ? null : activeCustomer?.id || null
  const itemsQ = useMentionItems(type, debouncedSearch, filterCustomerId)

  function handleSelect(item: MentionItem) {
    const mention: Mention = {
      type,
      id: item.id,
      label: extractLabel(item, type),
    }
    if (type === "customer") {
      onActiveCustomerChange({ id: item.id, label: mention.label })
    }
    onPick(mention)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 sm:max-w-lg">
        <DialogHeader className="border-b p-3 pb-2">
          <DialogTitle className="text-sm">انتخاب مورد برای اشاره</DialogTitle>
          <DialogDescription className="text-xs">
            مشتری، پروژه یا پرداخت را برای ارجاع در پیام انتخاب کنید.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={type}
          onValueChange={(v) => setType(v as Mention["type"])}
          className="gap-0"
        >
          <div className="px-3 pt-1">
            <TabsList className="grid h-9 w-full grid-cols-3">
              <TabsTrigger value="customer" className="gap-1 text-xs">
                <UserIcon className="size-3.5" /> مشتری
              </TabsTrigger>
              <TabsTrigger value="project" className="gap-1 text-xs">
                <FolderIcon className="size-3.5" /> پروژه
              </TabsTrigger>
              <TabsTrigger value="payment" className="gap-1 text-xs">
                <WalletIcon className="size-3.5" /> پرداخت
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Active customer filter badge */}
          {type !== "customer" && activeCustomer && (
            <div className="mx-3 mt-2 flex items-center justify-between gap-2 rounded-md bg-amber-500/10 px-3 py-1.5">
              <span className="text-[11px] text-amber-700 dark:text-amber-400">
                فیلتر: {activeCustomer.label}
              </span>
              <button
                type="button"
                onClick={() => onActiveCustomerChange(null)}
                className="rounded p-0.5 hover:bg-amber-500/20"
                aria-label="حذف فیلتر"
              >
                <X className="size-3" />
              </button>
            </div>
          )}

          {/* Search */}
          <div className="relative mx-3 mt-2 border-b">
            <Search className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                type === "customer"
                  ? "جستجوی نام یا تلفن مشتری..."
                  : "جستجو..."
              }
              className="h-10 rounded-none border-0 pr-9 shadow-none focus-visible:ring-0"
            />
          </div>

          {/* List */}
          <TabsContent value={type} className="mt-0">
            <ScrollArea className="h-64" type="auto">
              {itemsQ.isLoading ? (
                <div className="space-y-1 p-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : itemsQ.isError ? (
                <div className="p-4 text-center text-xs text-destructive">
                  خطا در بارگذاری اطلاعات.
                </div>
              ) : (itemsQ.data?.items || []).length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  {search.trim()
                    ? "موردی یافت نشد."
                    : type === "customer"
                      ? "هیچ مشتری‌ای موجود نیست."
                      : activeCustomer
                        ? "این مشتری پروژه/پرداختی ندارد."
                        : "موردی موجود نیست."}
                </div>
              ) : (
                <ul className="divide-y">
                  {itemsQ.data!.items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(item)}
                        className="flex w-full items-start gap-2 px-3 py-2.5 text-right transition-colors hover:bg-accent"
                      >
                        <span
                          className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] text-white"
                          style={{ backgroundColor: MENTION_COLORS[type] }}
                        >
                          {MENTION_TYPE_LABELS[type].charAt(0)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium">
                            {extractPrimary(item, type)}
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {extractSecondary(item, type)}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// Legacy Popover-based MentionPicker (kept for backward compatibility, not used)
function MentionPicker({
  open,
  onOpenChange,
  onPick,
  activeCustomer,
  onActiveCustomerChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onPick: (m: Mention) => void
  activeCustomer: { id: string; label: string } | null
  onActiveCustomerChange: (c: { id: string; label: string } | null) => void
}) {
  // Delegate to the Dialog version
  return (
    <MentionPickerDialog
      open={open}
      onOpenChange={onOpenChange}
      onPick={onPick}
      activeCustomer={activeCustomer}
      onActiveCustomerChange={onActiveCustomerChange}
    />
  )
}

function extractLabel(item: MentionItem, type: Mention["type"]): string {
  if (type === "customer") {
    const name = String(item.name || "")
    const phone = String(item.phone || "")
    return phone ? `${name} (${phone})` : name
  }
  if (type === "project") {
    const pkg = String(item.packageTitle || "")
    const cust = String(item.customerName || "")
    const num = String(item.contractNumber || "")
    const parts = [pkg, cust, num ? `#${num}` : ""].filter(Boolean)
    return parts.join(" — ")
  }
  // payment
  const amt = Number(item.amount || 0)
  const amtFa = toPersianDigits(amt.toLocaleString("fa-IR")) + " ریال"
  const pkg = String(item.packageTitle || "")
  const cust = String(item.customerName || "")
  const parts = [amtFa, pkg, cust].filter(Boolean)
  return parts.join(" — ")
}

function extractPrimary(item: MentionItem, type: Mention["type"]): string {
  if (type === "customer") return String(item.name || "")
  if (type === "project") return String(item.packageTitle || "پروژه")
  return toPersianDigits(Number(item.amount || 0).toLocaleString("fa-IR")) + " ریال"
}

function extractSecondary(item: MentionItem, type: Mention["type"]): string {
  if (type === "customer") return String(item.phone || "")
  if (type === "project") {
    const cust = String(item.customerName || "")
    const num = String(item.contractNumber || "")
    return num ? `${cust} • #${num}` : cust
  }
  const cust = String(item.customerName || "")
  const pkg = String(item.packageTitle || "")
  return pkg ? `${pkg} • ${cust}` : cust
}

// FolderIcon + WalletIcon — inline minimal SVG components (avoids extra lucide imports
// in case they're not exported in the current version).
function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </svg>
  )
}
function WalletIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  )
}

// ============================================================
// Composer
// ============================================================
interface ComposerProps {
  conversationId: string
  replyTo: Message | null
  editing: Message | null
  meId: string | undefined
  onCancelReply: () => void
  onCancelEdit: () => void
  /** Called when the user starts typing (debounced). */
  onTypingStart?: () => void
  /** Called when the user stops typing for TYPING_DEBOUNCE_MS. */
  onTypingStop?: () => void
  /** If provided, used as the primary send path. Returns true if accepted. */
  onSocketSend?: (payload: {
    conversationId: string
    body: string
    replyToId?: string | null
    mentions?: unknown[]
    attachments?: unknown[]
    tempId: string
  }) => boolean
  /** Called with the tempId once a send succeeded (used to optimistically
   *  insert the message into the cache). */
  onOptimisticSend?: (tempId: string, body: string, replyToId: string | null) => void
}

// ============================================================
// EmojiPicker — popover with categorized emoji grid + search.
// ============================================================
// EmojiPickerDialog — modal-based emoji picker (works reliably on mobile + desktop)
function EmojiPickerDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onPick: (emoji: string) => void
}) {
  const [activeCat, setActiveCat] = React.useState<string>(EMOJI_CATEGORIES[0].id)
  const [search, setSearch] = React.useState("")
  const searchRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open) {
      setSearch("")
      setActiveCat(EMOJI_CATEGORIES[0].id)
      setTimeout(() => searchRef.current?.focus(), 100)
    }
  }, [open])

  const filtered = React.useMemo(() => {
    if (!search.trim()) return null
    const q = search.trim().toLowerCase()
    const out: string[] = []
    for (const cat of EMOJI_CATEGORIES) {
      if (cat.label.toLowerCase().includes(q) || cat.id.includes(q)) {
        out.push(...cat.emojis)
      }
    }
    return out.length > 0 ? out : ALL_EMOJIS_FLAT.map((e) => e.emoji)
  }, [search])

  const currentEmojis = filtered
    ? filtered
    : EMOJI_CATEGORIES.find((c) => c.id === activeCat)?.emojis || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 sm:max-w-lg">
        <DialogHeader className="border-b p-3 pb-2">
          <DialogTitle className="text-sm">انتخاب ایموجی</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative mx-3 mt-2 border-b">
          <Search className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی ایموجی..."
            className="h-10 rounded-none border-0 pr-9 shadow-none focus-visible:ring-0"
          />
        </div>

        {/* Category tabs */}
        {!filtered && (
          <div className="flex items-center gap-0.5 overflow-x-auto px-2 py-1">
            {EMOJI_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCat(cat.id)}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-md text-lg transition-colors",
                  activeCat === cat.id
                    ? "bg-accent ring-1 ring-primary/40"
                    : "hover:bg-accent/60"
                )}
                title={cat.label}
              >
                {cat.icon}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        <ScrollArea className="h-60" type="auto">
          <div className="grid grid-cols-7 gap-0.5 p-2 sm:grid-cols-8">
            {currentEmojis.map((e, i) => (
              <button
                key={`${e}-${i}`}
                type="button"
                onClick={() => onPick(e)}
                className="flex size-9 items-center justify-center rounded-md text-xl transition-colors hover:bg-accent"
              >
                {e}
              </button>
            ))}
            {currentEmojis.length === 0 && (
              <div className="col-span-7 p-4 text-center text-xs text-muted-foreground sm:col-span-8">
                چیزی یافت نشد.
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// Legacy Popover-based EmojiPicker (kept for backward compatibility, not used)
function EmojiPicker({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onPick: (emoji: string) => void
}) {
  return (
    <EmojiPickerDialog open={open} onOpenChange={onOpenChange} onPick={onPick} />
  )
}

// ============================================================
// UploadProgressDialog — shown while files are uploading via XHR.
// Each entry tracks file, progress 0-100, and an AbortController.
// The user can cancel an individual upload or all of them.
// ============================================================
interface UploadEntry {
  id: string
  file: File
  progress: number
  status: "uploading" | "done" | "error" | "canceled"
  abortCtrl: AbortController
}

function UploadProgressDialog({
  open,
  entries,
  onClose,
  onCancelOne,
  onCancelAll,
}: {
  open: boolean
  entries: UploadEntry[]
  onClose: () => void
  onCancelOne: (id: string) => void
  onCancelAll: () => void
}) {
  const activeCount = entries.filter((e) => e.status === "uploading").length
  // Auto-close when there are no more active uploads (all done/canceled/errored).
  React.useEffect(() => {
    if (open && entries.length > 0 && activeCount === 0) {
      const t = setTimeout(onClose, 600)
      return () => clearTimeout(t)
    }
  }, [open, entries.length, activeCount, onClose])

  return (
    <Dialog
      open={open && entries.length > 0}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>بارگذاری فایل‌ها</DialogTitle>
          <DialogDescription>
            {activeCount > 0
              ? `${toPersianDigits(activeCount)} فایل در حال بارگذاری...`
              : "بارگذاری کامل شد."}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {entries.map((e) => (
            <div key={e.id} className="rounded-md border p-2">
              <div className="mb-1 flex items-center gap-2">
                <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-xs">{e.file.name}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                  {e.status === "done"
                    ? "انجام شد"
                    : e.status === "error"
                      ? "خطا"
                      : e.status === "canceled"
                        ? "لغو شد"
                        : `${toPersianDigits(e.progress)}٪`}
                </span>
                {e.status === "uploading" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 shrink-0"
                    onClick={() => onCancelOne(e.id)}
                    aria-label="لغو"
                  >
                    <X className="size-3" />
                  </Button>
                )}
              </div>
              <Progress
                value={e.progress}
                className={cn(
                  "h-1.5",
                  e.status === "error" && "bg-destructive/30 [&>div]:bg-destructive",
                  e.status === "done" && "bg-emerald-500/20 [&>div]:bg-emerald-500",
                  e.status === "canceled" && "bg-muted-foreground/20 [&>div]:bg-muted-foreground"
                )}
              />
              <div className="mt-1 text-[10px] text-muted-foreground">
                {formatBytes(e.file.size)}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          {activeCount > 0 && (
            <Button variant="outline" onClick={onCancelAll}>
              لغو همه
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            بستن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Composer({
  conversationId,
  replyTo,
  editing,
  meId,
  onCancelReply,
  onCancelEdit,
  onTypingStart,
  onTypingStop,
  onSocketSend,
  onOptimisticSend,
}: ComposerProps) {
  const [text, setText] = React.useState("")
  const [pendingAttachments, setPendingAttachments] = React.useState<Attachment[]>([])
  const [mentions, setMentions] = React.useState<Mention[]>([])
  const [mentionOpen, setMentionOpen] = React.useState(false)
  const [emojiOpen, setEmojiOpen] = React.useState(false)
  const [mentionAnchorPos, setMentionAnchorPos] = React.useState<{ start: number } | null>(null)
  // Active customer filter for the mention picker (project/payment tabs).
  const [activeCustomer, setActiveCustomer] = React.useState<{ id: string; label: string } | null>(null)
  // Upload queue: list of in-flight uploads with progress + cancel controllers.
  const [uploadEntries, setUploadEntries] = React.useState<UploadEntry[]>([])
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false)

  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Typing debounce: emit typing:start on first keystroke, re-emit every
  // TYPING_DEBOUNCE_MS while still typing, emit typing:stop after idle.
  const typingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingEmitRef = React.useRef<number>(0)
  const isTypingRef = React.useRef(false)

  const sendMut = useSendMessage(conversationId)
  const editMut = useEditMessage(conversationId)
  const uploadMut = useUploadAttachment(conversationId)

  // Auto-resize the textarea to fit content (max 3 lines, then scroll).
  const autoResize = React.useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    const maxH = 96 // ~3 lines
    ta.style.height = Math.min(ta.scrollHeight, maxH) + "px"
  }, [])

  React.useEffect(() => {
    autoResize()
  }, [text, autoResize])

  // When entering edit mode, populate text + mentions
  React.useEffect(() => {
    if (editing) {
      setText(editing.body)
      setMentions(editing.mentions || [])
      setPendingAttachments([])
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [editing])

  // Clear typing state when switching conversations
  React.useEffect(() => {
    setText("")
    setMentions([])
    setPendingAttachments([])
    setActiveCustomer(null)
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = null
    }
    isTypingRef.current = false
  }, [conversationId])

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed && pendingAttachments.length === 0) return
    if (editing) {
      editMut.mutate(
        { id: editing.id, body: text },
        {
          onSuccess: () => {
            setText("")
            setMentions([])
            onCancelEdit()
          },
        }
      )
      return
    }
    // Try socket first (real-time + optimistic). Fall back to REST.
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    if (onSocketSend && onSocketSend({
      conversationId,
      body: text,
      replyToId: replyTo?.id ?? null,
      mentions,
      attachments: pendingAttachments,
      tempId,
    })) {
      // Optimistically insert.
      onOptimisticSend?.(tempId, text, replyTo?.id ?? null)
      setText("")
      setMentions([])
      setPendingAttachments([])
      onCancelReply()
      // Stop typing indicator if active
      if (isTypingRef.current) {
        isTypingRef.current = false
        onTypingStop?.()
      }
      return
    }
    // Fallback: REST mutation (still works; just not as snappy).
    sendMut.mutate(
      {
        body: text,
        replyToId: replyTo?.id ?? null,
        mentions,
        attachments: pendingAttachments,
      },
      {
        onSuccess: () => {
          setText("")
          setMentions([])
          setPendingAttachments([])
          onCancelReply()
        },
      }
    )
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter = send; Shift+Enter = newline
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setText(val)
    // Detect "@" trigger: when the user types "@" at start, after a space, or after a newline
    const pos = e.target.selectionStart
    const before = val.slice(0, pos)
    const triggerMatch = /(?:^|\s)@$/.exec(before)
    if (triggerMatch && !mentionOpen) {
      setMentionAnchorPos({ start: pos })
      setMentionOpen(true)
    }
    // Typing indicator debounce (only for non-empty input and not editing).
    if (val.trim() && !editing) {
      const now = Date.now()
      if (!isTypingRef.current) {
        isTypingRef.current = true
        onTypingStart?.()
        lastTypingEmitRef.current = now
      } else if (now - lastTypingEmitRef.current > TYPING_DEBOUNCE_MS) {
        // Re-emit typing:start to refresh the indicator on the other side.
        onTypingStart?.()
        lastTypingEmitRef.current = now
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => {
        isTypingRef.current = false
        onTypingStop?.()
      }, TYPING_DEBOUNCE_MS)
    } else if (isTypingRef.current) {
      // Input cleared — stop typing immediately.
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      isTypingRef.current = false
      onTypingStop?.()
    }
  }

  function handlePickMention(m: Mention) {
    // Replace the trailing "@" with "@label " at the cursor position
    const pos = mentionAnchorPos?.start ?? text.length
    const before = text.slice(0, pos)
    const after = text.slice(pos)
    // Remove the trailing "@"
    const newBefore = before.replace(/@$/, "")
    const insertion = `@${m.label} `
    const next = newBefore + insertion + after
    setText(next)
    setMentions((prev) => [...prev, m])
    // Place caret after the insertion
    const newPos = newBefore.length + insertion.length
    setTimeout(() => {
      const ta = textareaRef.current
      if (ta) {
        ta.focus()
        ta.setSelectionRange(newPos, newPos)
      }
    }, 0)
  }

  function handlePickEmoji(emoji: string) {
    // Insert at cursor position
    const ta = textareaRef.current
    if (!ta) {
      setText((prev) => prev + emoji)
      return
    }
    const start = ta.selectionStart ?? text.length
    const end = ta.selectionEnd ?? text.length
    const next = text.slice(0, start) + emoji + text.slice(end)
    setText(next)
    const newPos = start + emoji.length
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(newPos, newPos)
    }, 0)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    e.target.value = "" // reset
    if (files.length === 0) return
    setUploadDialogOpen(true)
    for (const f of files) {
      const id = `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const abortCtrl = new AbortController()
      const entry: UploadEntry = {
        id,
        file: f,
        progress: 0,
        status: "uploading",
        abortCtrl,
      }
      setUploadEntries((prev) => [...prev, entry])
      uploadMut.mutate(
        {
          file: f,
          abortSignal: abortCtrl.signal,
          onProgress: (pct) => {
            setUploadEntries((prev) =>
              prev.map((x) => (x.id === id ? { ...x, progress: pct } : x))
            )
          },
        },
        {
          onSuccess: (att) => {
            setPendingAttachments((prev) => [...prev, att])
            setUploadEntries((prev) =>
              prev.map((x) => (x.id === id ? { ...x, status: "done", progress: 100 } : x))
            )
          },
          onError: (err) => {
            const isCancel = (err as Error).message === "__cancel__"
            setUploadEntries((prev) =>
              prev.map((x) =>
                x.id === id
                  ? { ...x, status: isCancel ? "canceled" : "error" }
                  : x
              )
            )
          },
        }
      )
    }
  }

  function handleCancelOne(id: string) {
    setUploadEntries((prev) =>
      prev.map((x) => {
        if (x.id === id && x.status === "uploading") {
          x.abortCtrl.abort()
          return { ...x, status: "canceled" }
        }
        return x
      })
    )
  }
  function handleCancelAll() {
    setUploadEntries((prev) =>
      prev.map((x) => {
        if (x.status === "uploading") {
          x.abortCtrl.abort()
          return { ...x, status: "canceled" }
        }
        return x
      })
    )
  }
  function handleCloseUploadDialog() {
    // Cancel anything still uploading then clear the list.
    handleCancelAll()
    setUploadEntries([])
    setUploadDialogOpen(false)
  }

  const busy = sendMut.isPending || editMut.isPending || uploadMut.isPending
  const canSend = !busy && (!!text.trim() || pendingAttachments.length > 0)

  return (
    <div className="border-t bg-background px-2 py-2 sm:px-3 sm:py-2.5">
      {/* Reply preview */}
      {replyTo && !editing && (
        <div className="mb-2 flex items-center gap-2 rounded-md border-r-2 border-sky-500/60 bg-muted/40 px-2 py-1.5 text-xs">
          <Reply className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="font-medium">
              پاسخ به {replyTo.senderId === meId ? "شما" : replyTo.senderName}
            </div>
            <div className="line-clamp-1 text-muted-foreground">
              {replyTo.body || "📎 پیوست"}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="size-6" onClick={onCancelReply} aria-label="لغو پاسخ">
            <X className="size-3" />
          </Button>
        </div>
      )}

      {/* Edit preview */}
      {editing && (
        <div className="mb-2 flex items-center gap-2 rounded-md border-r-2 border-amber-500/60 bg-amber-500/10 px-2 py-1.5 text-xs">
          <Pencil className="size-3.5 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-amber-700 dark:text-amber-400">در حال ویرایش پیام</div>
            <div className="line-clamp-1 text-muted-foreground">{editing.body || "📎 پیوست"}</div>
          </div>
          <Button variant="ghost" size="icon" className="size-6" onClick={onCancelEdit} aria-label="لغو ویرایش">
            <X className="size-3" />
          </Button>
        </div>
      )}

      {/* Pending attachments */}
      {pendingAttachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {pendingAttachments.map((a, i) => (
            <PendingAttachmentChip
              key={i}
              att={{ name: a.name, size: a.size, type: a.type }}
              onRemove={() =>
                setPendingAttachments((prev) => prev.filter((_, idx) => idx !== i))
              }
            />
          ))}
        </div>
      )}

      {/* Pending mentions (chips) */}
      {mentions.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {mentions.map((m, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: MENTION_COLORS[m.type] + "22", color: MENTION_COLORS[m.type] }}
            >
              @{m.label}
              <button
                type="button"
                onClick={() => setMentions((prev) => prev.filter((_, idx) => idx !== i))}
                className="opacity-70 hover:opacity-100"
                aria-label="حذف اشاره"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Composer row: [vertical buttons] [textarea] [emoji+send] */}
      <div className="flex items-end gap-1.5 sm:gap-2">
        {/* Vertical button column: attachment on top, @ below */}
        <div className="flex shrink-0 flex-col gap-0.5">
          {/* Attachment button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 sm:size-8"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            aria-label="پیوست"
            title="پیوست فایل"
          >
            <Paperclip className="size-3.5" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,audio/*,video/*,*/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Mention button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 font-bold sm:size-8"
            onClick={() => {
              setMentionAnchorPos({ start: textareaRef.current?.selectionStart ?? text.length })
              setMentionOpen(true)
            }}
            disabled={busy}
            aria-label="اشاره"
            title="افزودن اشاره (@)"
          >
            <span className="text-sm leading-none">@</span>
          </Button>
        </div>

        {/* Textarea — takes all remaining space */}
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={editing ? "ویرایش پیام..." : "پیام بنویسید..."}
          rows={1}
          className="max-h-24 min-h-9 flex-1 resize-none overflow-y-auto text-sm"
          disabled={busy}
        />

        {/* Right column: emoji (desktop) + send */}
        <div className="flex shrink-0 flex-col items-center gap-0.5">
          {/* Emoji picker button (desktop only) */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden size-7 shrink-0 sm:inline-flex sm:size-8"
            onClick={() => setEmojiOpen(true)}
            disabled={busy}
            aria-label="ایموجی"
            title="انتخاب ایموجی"
          >
            <Smile className="size-3.5" />
          </Button>

          {/* Send / Save button — always visible, prominent, circular */}
          <Button
            type="button"
            size="icon"
            className="size-9 shrink-0 rounded-full sm:size-10"
            onClick={handleSend}
            disabled={!canSend}
            aria-label={editing ? "ذخیره" : "ارسال"}
            title={editing ? "ذخیره" : "ارسال"}
          >
            {busy ? (
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : editing ? (
              <Check className="size-4" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Mention picker as a Dialog (more reliable on mobile than Popover) */}
      <MentionPickerDialog
        open={mentionOpen}
        onOpenChange={setMentionOpen}
        onPick={handlePickMention}
        activeCustomer={activeCustomer}
        onActiveCustomerChange={setActiveCustomer}
      />

      {/* Emoji picker as a Dialog (more reliable on mobile than Popover) */}
      <EmojiPickerDialog
        open={emojiOpen}
        onOpenChange={setEmojiOpen}
        onPick={handlePickEmoji}
      />

      {/* Upload progress dialog */}
      <UploadProgressDialog
        open={uploadDialogOpen}
        entries={uploadEntries}
        onClose={handleCloseUploadDialog}
        onCancelOne={handleCancelOne}
        onCancelAll={handleCancelAll}
      />
    </div>
  )
}

// ============================================================
// New chat dialog
// ============================================================
function NewChatDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: (conv: Conversation) => void
}) {
  const usersQ = useChatUsers()
  const createMut = useCreateConversation()
  const [mode, setMode] = React.useState<"direct" | "group">("direct")
  const [title, setTitle] = React.useState("")
  const [selected, setSelected] = React.useState<string[]>([])
  const [search, setSearch] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setMode("direct")
      setTitle("")
      setSelected([])
      setSearch("")
    }
  }, [open])

  const filtered = (usersQ.data?.items || []).filter((u) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      u.name.toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q) ||
      (u.roleLabel || "").toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    )
  })

  function toggle(id: string) {
    setSelected((prev) => {
      if (mode === "direct") {
        // For direct, only one can be selected
        return prev.includes(id) ? [] : [id]
      }
      return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    })
  }

  function handleSubmit() {
    if (selected.length === 0) {
      toast.error("حداقل یک عضو انتخاب کنید")
      return
    }
    if (mode === "group" && !title.trim()) {
      toast.error("نام گروه را وارد کنید")
      return
    }
    createMut.mutate(
      {
        type: mode,
        title: mode === "group" ? title.trim() : undefined,
        participantIds: selected,
      },
      {
        onSuccess: (conv) => {
          onCreated(conv)
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>گفتگوی جدید</DialogTitle>
          <DialogDescription>یک کاربر برای گفتگوی شخصی یا چند کاربر برای گروه انتخاب کنید.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "direct" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => {
                setMode("direct")
                setSelected([])
              }}
            >
              <UserIcon className="ml-1.5 size-4" /> گفتگوی شخصی
            </Button>
            <Button
              type="button"
              variant={mode === "group" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => {
                setMode("group")
                setSelected([])
              }}
            >
              <Users className="ml-1.5 size-4" /> گروه
            </Button>
          </div>

          {/* Group title */}
          {mode === "group" && (
            <div className="space-y-1.5">
              <Label htmlFor="grp-title">نام گروه</Label>
              <Input
                id="grp-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلاً: تیم عکاسی"
              />
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجوی کاربر..."
              className="pr-9"
            />
          </div>

          {/* Users list */}
          <div className="max-h-72 overflow-y-auto rounded-md border">
            {usersQ.isLoading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                کاربری یافت نشد.
              </div>
            ) : (
              <ul className="divide-y">
                {filtered.map((u) => {
                  const isSel = selected.includes(u.id)
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => toggle(u.id)}
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-3 text-right transition-colors hover:bg-accent min-h-[52px]",
                          isSel && "bg-primary/10 ring-1 ring-inset ring-primary/30"
                        )}
                      >
                        <Avatar className="size-10 shrink-0">
                          <AvatarFallback
                            className="text-sm font-semibold text-white"
                            style={{ backgroundColor: colorForName(u.name) }}
                          >
                            {initials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{u.name}</div>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span className="rounded bg-muted px-1 py-0.5">{u.roleLabel}</span>
                            {u.studioName && (
                              <span className="truncate" dir="ltr">{u.phone}</span>
                            )}
                          </div>
                        </div>
                        {isSel && (
                          <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="size-3" />
                          </div>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {selected.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {toPersianDigits(selected.length)} عضو انتخاب شده
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button onClick={handleSubmit} disabled={createMut.isPending || selected.length === 0}>
            {createMut.isPending ? "در حال ایجاد..." : "ایجاد گفتگو"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Image lightbox
// ============================================================
function ImageLightbox({
  url,
  onClose,
}: {
  url: string | null
  onClose: () => void
}) {
  React.useEffect(() => {
    if (!url) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [url, onClose])

  if (!url) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <Button
        variant="outline"
        size="icon"
        className="absolute right-4 top-4 size-9 bg-background/80"
        onClick={onClose}
        aria-label="بستن"
      >
        <X className="size-4" />
      </Button>
      { }
      <img
        src={url}
        alt="preview"
        className="max-h-full max-w-full rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

// ============================================================
// Conversations list (left pane)
// ============================================================
function ConversationsList({
  conversations,
  isLoading,
  activeId,
  onSelect,
  onNewChat,
  meId,
  presence,
  onToggleMute,
  onTogglePin,
  onDelete,
}: {
  conversations: Conversation[]
  isLoading: boolean
  activeId: string | null
  onSelect: (c: Conversation) => void
  onNewChat: () => void
  meId: string | undefined
  presence: Record<string, boolean>
  onToggleMute?: (c: Conversation) => void
  onTogglePin?: (c: Conversation) => void
  onDelete?: (c: Conversation) => void
}) {
  const [search, setSearch] = React.useState("")
  // Confirmation dialog state for "delete entire conversation".
  const [deleteTarget, setDeleteTarget] = React.useState<Conversation | null>(null)
  const deleteMut = useDeleteConversation()

  // Sort: pinned first (by lastMessageAt desc within), then non-pinned (by lastMessageAt desc).
  const sorted = React.useMemo(() => {
    const arr = conversations.slice()
    arr.sort((a, b) => {
      const pa = a.pinned ? 1 : 0
      const pb = b.pinned ? 1 : 0
      if (pa !== pb) return pb - pa
      const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
      const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
      return tb - ta
    })
    return arr
  }, [conversations])

  const filtered = sorted.filter((c) => {
    if (!search) return true
    const title =
      c.type === "group"
        ? c.title || ""
        : c.participants.find((p) => p.userId !== meId)?.userName || ""
    return title.includes(search)
  })

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    await deleteMut.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="border-b p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">گفتگوها</h2>
          <Button size="sm" onClick={onNewChat} className="h-8">
            <Plus className="ml-1 size-3.5" /> گفتگوی جدید
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی گفتگوها..."
            className="h-9 pr-9"
          />
        </div>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <MessageCircle className="mb-2 size-8 text-muted-foreground/60" />
            <div className="text-sm font-medium">هنوز گفتگویی ندارید</div>
            <div className="mt-1 text-xs text-muted-foreground">
              برای شروع، روی «گفتگوی جدید» بزنید.
            </div>
          </div>
        ) : (
          <ul>
            {filtered.map((c) => {
              const me = c.participants.find((p) => p.userId === meId)
              const other = c.participants.find((p) => p.userId !== meId)
              const title =
                c.type === "group"
                  ? c.title || "گروه"
                  : other?.userName || "کاربر"
              // Prefer denormalized lastMessage* fields, fall back to lastMessage object.
              const lastTime = formatRelativeTime(
                c.lastMessageAt || c.lastMessage?.createdAt || null
              )
              const lastBody =
                c.lastMessagePreview ||
                c.lastMessage?.body ||
                (c.lastMessage ? "📎 پیوست" : "هنوز پیامی ندارید")
              const lastSenderName =
                c.lastMessageSenderName ||
                c.lastMessage?.senderName ||
                ""
              const lastSenderIsMe = c.lastMessage
                ? c.lastMessage.senderId === meId
                : false
              const senderPrefix =
                lastSenderName && (c.type === "group" || !lastSenderIsMe)
                  ? lastSenderIsMe
                    ? "شما: "
                    : c.type === "group"
                      ? `${lastSenderName}: `
                      : ""
                  : ""

              // Unread count (server-computed).
              const unread = c.unreadCount || 0
              const isActive = c.id === activeId
              const isMuted = !!me?.muted
              const isPinned = !!c.pinned
              const isOnline =
                c.type === "direct" && other ? !!presence[other.userId] : false
              // For group conversations, only owner/admin can delete. We allow
              // opening the menu always; the server enforces authorization and
              // returns an error if the user lacks permission.
              const canDelete =
                !!onDelete &&
                (c.type === "direct" ||
                  me?.role === "owner" ||
                  me?.role === "admin")

              return (
                <li key={c.id} className="relative group/conv">
                  <button
                    type="button"
                    onClick={() => onSelect(c)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2.5 pr-10 text-right transition-colors hover:bg-accent/50",
                      isActive && "bg-accent"
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="size-10">
                        <AvatarFallback
                          className="text-xs font-semibold text-white"
                          style={{
                            backgroundColor:
                              c.type === "group" ? "#64748b" : colorForName(title),
                          }}
                        >
                          {c.type === "group" ? (
                            <Users className="size-4" />
                          ) : (
                            initials(title)
                          )}
                        </AvatarFallback>
                      </Avatar>
                      {c.type === "group" && (
                        <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-0.5">
                          <Users className="size-3 text-muted-foreground" />
                        </span>
                      )}
                      {isOnline && (
                        <span
                          className="absolute -bottom-0.5 -left-0.5 size-3 rounded-full border-2 border-card bg-emerald-500"
                          aria-label="آنلاین"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1">
                          {isPinned && (
                            <Pin className="size-3 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate text-sm font-medium">{title}</span>
                          {isMuted && (
                            <BellOff className="size-3 shrink-0 text-muted-foreground/70" />
                          )}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                          {lastTime}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="line-clamp-1 text-xs text-muted-foreground">
                          {senderPrefix && (
                            <span className="font-medium text-foreground/70">
                              {senderPrefix}
                            </span>
                          )}
                          {lastBody}
                        </span>
                        {unread > 0 ? (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white tabular-nums">
                            {toPersianDigits(unread > 99 ? "۹۹+" : unread)}
                          </span>
                        ) : isMuted ? (
                          <span className="size-2 shrink-0 rounded-full bg-muted-foreground/40" />
                        ) : null}
                      </div>
                    </div>
                  </button>
                  {/* Always-visible action menu (mobile-friendly — no hover needed) */}
                  {(onTogglePin || onToggleMute || canDelete) && (
                    <div className="absolute left-1 top-1/2 -translate-y-1/2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-full bg-background shadow-sm ring-1 ring-border/50"
                            aria-label="عملیات گفتگو"
                            title="عملیات گفتگو"
                          >
                            <MoreVertical className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-44">
                          {onTogglePin && (
                            <DropdownMenuItem onClick={() => onTogglePin(c)}>
                              <Pin className="ml-2 size-3.5" />
                              {isPinned ? "حذف سنجاق" : "سنجاق کردن"}
                            </DropdownMenuItem>
                          )}
                          {onToggleMute && (
                            <DropdownMenuItem onClick={() => onToggleMute(c)}>
                              <BellOff className="ml-2 size-3.5" />
                              {isMuted ? "بازگردانی اعلان" : "بی‌صدا کردن"}
                            </DropdownMenuItem>
                          )}
                          {canDelete && (onTogglePin || onToggleMute) && (
                            <DropdownMenuSeparator />
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(c)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="ml-2 size-3.5" />
                              حذف کامل گفتگو
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Delete-conversation confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>حذف کامل گفتگو</DialogTitle>
            <DialogDescription>
              این عمل تمام پیام‌ها، فایل‌ها و واکنش‌های این گفتگو را برای همه
              شرکت‌کنندگان به طور کامل حذف می‌کند. این عمل قابل بازگشت نیست.
              آیا مطمئن هستید؟
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              انصراف
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "در حال حذف..." : "حذف کامل"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Chat pane (right pane)
// ============================================================
function ChatPane({
  conversation,
  me,
  onBack,
  socket,
  presence,
  typingUsers,
  onClearTyping,
}: {
  conversation: Conversation
  me: { id: string; name: string } | undefined
  onBack: () => void
  socket: UseChatSocketReturn
  presence: Record<string, boolean>
  typingUsers: string[]
  onClearTyping: (userId: string) => void
}) {
  const messagesQ = useMessages(conversation.id)
  const fetchOlder = useOlderMessages(conversation.id)
  const editMut = useEditMessage(conversation.id)
  const delMut = useDeleteMessage(conversation.id)
  const reactMut = useToggleReaction(conversation.id)
  const markRead = useMarkConversationRead()
  const convAction = useConversationAction()
  const qc = useQueryClient()

  const [replyTo, setReplyTo] = React.useState<Message | null>(null)
  const [editing, setEditing] = React.useState<Message | null>(null)
  const [lightbox, setLightbox] = React.useState<string | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = React.useState(true)
  const [loadingOlder, setLoadingOlder] = React.useState(false)
  const [showNewMessagesBtn, setShowNewMessagesBtn] = React.useState(false)
  const [forwardOpen, setForwardOpen] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [pinnedMessage, setPinnedMessage] = React.useState<Message | null>(null)
  const messageRefs = React.useRef<Map<string, HTMLDivElement>>(new Map())

  // Determine chat title
  const other = conversation.participants.find((p) => p.userId !== me?.id)
  const title =
    conversation.type === "group"
      ? conversation.title || "گروه"
      : other?.userName || "کاربر"

  // Other participant userIds (used for read receipts).
  const otherUserIds = React.useMemo(
    () =>
      conversation.participants
        .filter((p) => p.userId !== me?.id && !p.leftAt)
        .map((p) => p.userId),
    [conversation.participants, me?.id]
  )

  // Subtitle: presence-based for direct, member list for group.
  const isOtherOnline = other ? !!presence[other.userId] : false
  const subtitle =
    conversation.type === "group"
      ? conversation.participants
          .filter((p) => !p.leftAt)
          .map((p) => p.userName)
          .join("، ")
      : other
        ? typingUsers.length > 0
          ? "در حال تایپ..."
          : isOtherOnline
            ? "آنلاین"
            : "گفتگوی شخصی"
        : ""

  // Messages in chronological order (oldest first)
  const sortedMessages = React.useMemo(() => {
    const items = (messagesQ.data?.items || []).slice()
    items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    return items
  }, [messagesQ.data])

  // Auto-scroll to bottom on conversation open + on new message if near bottom.
  React.useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current
      // On conversation switch, always jump to bottom.
      el.scrollTop = el.scrollHeight
    }
  }, [conversation.id])

  React.useEffect(() => {
    if (atBottom && scrollRef.current) {
      const el = scrollRef.current
      el.scrollTop = el.scrollHeight
    }
    if (sortedMessages.length > 0 && atBottom) {
      const last = sortedMessages[sortedMessages.length - 1]
      if (last.senderId !== me?.id) {
        // Mark as read (so the other side's ✓ turns to ✓✓ blue).
        socket.emitMessageRead(conversation.id)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedMessages.length, atBottom, conversation.id])

  // Subscribe to the conversation room on the socket.
  React.useEffect(() => {
    socket.subscribe(conversation.id)
    // Mark all as read on open.
    socket.emitMessageRead(conversation.id)
    markRead(conversation.id)
    return () => {
      socket.unsubscribe(conversation.id)
    }
  }, [conversation.id, socket, markRead])

  // Reset reply/edit state when switching conversations
  React.useEffect(() => {
    setReplyTo(null)
    setEditing(null)
  }, [conversation.id])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const newAtBottom = distFromBottom < 100
    setAtBottom(newAtBottom)
    setShowNewMessagesBtn(!newAtBottom && sortedMessages.length > 0)
    // Load older when scrolled to top
    if (el.scrollTop < 40 && !loadingOlder && messagesQ.data?.hasMore) {
      const prevHeight = el.scrollHeight
      setLoadingOlder(true)
      const first = sortedMessages[0]
      if (first) {
        fetchOlder(first.createdAt).finally(() => {
          // Restore scroll position
          requestAnimationFrame(() => {
            if (el) {
              const newHeight = el.scrollHeight
              el.scrollTop = newHeight - prevHeight
            }
          })
          setLoadingOlder(false)
        })
      } else {
        setLoadingOlder(false)
      }
    }
  }

  function scrollToBottom() {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      setAtBottom(true)
      setShowNewMessagesBtn(false)
    }
  }

  function scrollToMessage(id: string) {
    const el = messageRefs.current.get(id)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      el.classList.add("ring-2", "ring-sky-400")
      setTimeout(() => el.classList.remove("ring-2", "ring-sky-400"), 1500)
    }
  }

  function handleReply(m: Message) {
    setReplyTo(m)
    setEditing(null)
  }
  function handleEdit(m: Message) {
    setEditing(m)
    setReplyTo(null)
  }
  function handleDeleteForMe(m: Message) {
    if (!window.confirm("این پیام برای شما حذف شود؟")) return
    // Optimistic: remove from cache immediately.
    qc.setQueryData<{ items: Message[]; hasMore: boolean }>(
      ["msg-messages", conversation.id],
      (old) => {
        if (!old) return old
        return { ...old, items: old.items.filter((x) => x.id !== m.id) }
      }
    )
    // Use socket for real-time (if connected); otherwise REST fallback.
    if (socket.isConnected) {
      socket.deleteMessage({ id: m.id, conversationId: conversation.id, forEveryone: false })
    } else {
      delMut.mutate(m.id)
    }
  }
  function handleDeleteForEveryone(m: Message) {
    if (!window.confirm("این پیام برای همه حذف شود؟ این عمل قابل بازگشت نیست.")) return
    if (socket.isConnected) {
      socket.deleteMessage({ id: m.id, conversationId: conversation.id, forEveryone: true })
    } else {
      // REST fallback (no query param: forEveryone defaults to false in the existing
      // deleteMut — we'd need to call the route directly with ?forEveryone=true).
      let token: string | null = null
      try {
        token = localStorage.getItem("nasim-session-token")
      } catch {
        /* ignore */
      }
      fetch(`/api/messages/${m.id}?forEveryone=true`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "x-demo-role": useWorkspace.getState().role,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
        .then(() => qc.invalidateQueries({ queryKey: ["msg-messages", conversation.id] }))
        .catch(() => toast.error("حذف ناموفق بود"))
    }
  }
  function handleReact(m: Message, emoji: string) {
    if (socket.isConnected) {
      socket.toggleReaction({ messageId: m.id, emoji, conversationId: conversation.id })
      // Optimistic: toggle locally so the user sees immediate feedback.
      const hasReacted = m.reactions.some(
        (r) => r.userId === me?.id && r.emoji === emoji
      )
      qc.setQueryData<{ items: Message[]; hasMore: boolean }>(
        ["msg-messages", conversation.id],
        (old) => {
          if (!old) return old
          return {
            ...old,
            items: old.items.map((x) => {
              if (x.id !== m.id) return x
              const next = hasReacted
                ? x.reactions.filter(
                    (r) => !(r.userId === me?.id && r.emoji === emoji)
                  )
                : [
                    ...x.reactions,
                    {
                      id: `temp-${Date.now()}`,
                      userId: me?.id || "",
                      userName: me?.name || "",
                      emoji,
                      createdAt: new Date().toISOString(),
                    },
                  ]
              return { ...x, reactions: next }
            }),
          }
        }
      )
    } else {
      reactMut.mutate({ id: m.id, emoji })
    }
  }
  function handleForward(m: Message) {
    setForwardOpen(true)
    // Stash the message id on a ref so the dialog can pick it up.
    forwardSrcRef.current = [m.id]
  }
  function handlePin(m: Message) {
    setPinnedMessage(m)
    toast.success("پیام سنجاق شد")
  }
  function handleCopy(m: Message) {
    if (!m.body) {
      toast.error("متن پیام خالی است")
      return
    }
    try {
      navigator.clipboard.writeText(m.body)
      toast.success("متن کپی شد")
    } catch {
      toast.error("کپی ناموفق بود")
    }
  }

  // Ref to hold forwarded source message ids between opening the dialog and
  // the user picking a target conversation.
  const forwardSrcRef = React.useRef<string[]>([])

  const groupedByDay = React.useMemo(() => {
    const groups: { key: string; label: string; messages: Message[] }[] = []
    for (const m of sortedMessages) {
      const d = new Date(m.createdAt)
      const key = d.toDateString()
      const label = formatDayLabel(d)
      let g = groups.find((x) => x.key === key)
      if (!g) {
        g = { key, label, messages: [] }
        groups.push(g)
      }
      g.messages.push(m)
    }
    return groups
  }, [sortedMessages])

  // Optimistic send: insert a temp message into the cache. The socket's
  // message:ack handler will replace it with the real one.
  const handleOptimisticSend = React.useCallback(
    (tempId: string, body: string, replyToId: string | null) => {
      const tempMsg: Message = {
        id: tempId,
        __tempId: tempId,
        __status: "sending",
        conversationId: conversation.id,
        senderId: me?.id || "",
        senderName: me?.name || "شما",
        body,
        mentions: [],
        attachments: [],
        replyToId,
        replyTo: null,
        forwardedFromId: null,
        forwardedFromName: null,
        editedAt: null,
        deletedAt: null,
        deletedFor: [],
        pinnedAt: null,
        readBy: [],
        createdAt: new Date().toISOString(),
        reactions: [],
      }
      qc.setQueryData<{ items: Message[]; hasMore: boolean }>(
        ["msg-messages", conversation.id],
        (old) => {
          if (!old) return { items: [tempMsg], hasMore: false }
          return { items: [tempMsg, ...old.items], hasMore: old.hasMore }
        }
      )
      // Force scroll to bottom.
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      })
    },
    [conversation.id, me, qc]
  )

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 border-b bg-card px-3 py-2.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 lg:hidden"
          onClick={onBack}
          aria-label="بازگشت"
        >
          <ArrowRight className="size-4" />
        </Button>
        <Avatar className="size-9 shrink-0">
          <AvatarFallback
            className="text-xs font-semibold text-white"
            style={{
              backgroundColor:
                conversation.type === "group" ? "#64748b" : colorForName(title),
            }}
          >
            {conversation.type === "group" ? <Users className="size-4" /> : initials(title)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{title}</div>
          {subtitle && (
            <div
              className={cn(
                "truncate text-[11px]",
                typingUsers.length > 0
                  ? "text-sky-500"
                  : "text-muted-foreground"
              )}
            >
              {typingUsers.length > 0 ? (
                <span className="inline-flex items-center gap-1">
                  {subtitle}
                  <span className="inline-flex gap-0.5">
                    <span className="size-1 animate-bounce rounded-full bg-sky-500 [animation-delay:-0.3s]" />
                    <span className="size-1 animate-bounce rounded-full bg-sky-500 [animation-delay:-0.15s]" />
                    <span className="size-1 animate-bounce rounded-full bg-sky-500" />
                  </span>
                </span>
              ) : (
                subtitle
              )}
            </div>
          )}
        </div>
        {/* Connection status indicator */}
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            socket.isConnected ? "bg-emerald-500" : "bg-amber-400"
          )}
          title={socket.isConnected ? "متصل" : "در حال اتصال..."}
        />
        {/* Group settings button */}
        {conversation.type === "group" && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={() => setSettingsOpen(true)}
            aria-label="تنظیمات گروه"
            title="تنظیمات گروه"
          >
            <Settings className="size-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto py-2"
      >
        {messagesQ.isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className={cn("h-12 w-2/3", i % 2 === 0 && "ml-auto")} />
            ))}
          </div>
        ) : sortedMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <MessageCircle className="mb-2 size-8 text-muted-foreground/60" />
            <div className="text-sm font-medium">هنوز پیامی ندارید</div>
            <div className="mt-1 text-xs text-muted-foreground">
              اولین پیام را ارسال کنید.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {loadingOlder && (
              <div className="py-2 text-center">
                <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              </div>
            )}
            {groupedByDay.map((g) => (
              <div key={g.key}>
                {/* Sticky date separator */}
                <div className="sticky top-2 z-10 my-2 flex justify-center">
                  <span className="rounded-full bg-muted px-3 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
                    {g.label}
                  </span>
                </div>
                {g.messages.map((m) => (
                  <div
                    key={m.id}
                    ref={(el) => {
                      if (el) messageRefs.current.set(m.id, el)
                      else messageRefs.current.delete(m.id)
                    }}
                    className="rounded-md transition-shadow"
                  >
                    <MessageBubble
                      message={m}
                      isMine={!!me && m.senderId === me.id}
                      isGroup={conversation.type === "group"}
                      meId={me?.id || ""}
                      otherUserIds={otherUserIds}
                      onReply={handleReply}
                      onEdit={handleEdit}
                      onDeleteForMe={handleDeleteForMe}
                      onDeleteForEveryone={handleDeleteForEveryone}
                      onReact={handleReact}
                      onForward={handleForward}
                      onPin={handlePin}
                      onCopy={handleCopy}
                      onImageClick={setLightbox}
                      onScrollToMessage={scrollToMessage}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* "New messages" floating button */}
      {showNewMessagesBtn && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-24 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full bg-sky-500 px-3 py-1.5 text-xs font-medium text-white shadow-lg hover:bg-sky-600"
        >
          <ArrowDown className="size-3.5" />
          پیام‌های جدید
        </button>
      )}

      {/* Composer */}
      <Composer
        conversationId={conversation.id}
        replyTo={replyTo}
        editing={editing}
        meId={me?.id}
        onCancelReply={() => setReplyTo(null)}
        onCancelEdit={() => setEditing(null)}
        onTypingStart={() => socket.emitTypingStart(conversation.id)}
        onTypingStop={() => socket.emitTypingStop(conversation.id)}
        onSocketSend={(payload) => socket.sendMessage(payload)}
        onOptimisticSend={handleOptimisticSend}
      />

      {/* Lightbox */}
      <ImageLightbox url={lightbox} onClose={() => setLightbox(null)} />

      {/* Forward dialog */}
      <ForwardDialog
        open={forwardOpen}
        onOpenChange={setForwardOpen}
        sourceMessageIds={forwardSrcRef.current}
        meId={me?.id}
      />

      {/* Group settings dialog */}
      {conversation.type === "group" && (
        <GroupSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          conversation={conversation}
          meId={me?.id}
          onAction={convAction}
        />
      )}
    </div>
  )
}

function formatDayLabel(d: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "امروز"
  if (d.toDateString() === yesterday.toDateString()) return "دیروز"
  const { jy, jm, jd } = toJalali(d)
  return `${toPersianDigits(jd)} ${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}`
}

// ============================================================
// Forward dialog — pick a target conversation to forward selected messages to.
// ============================================================
function ForwardDialog({
  open,
  onOpenChange,
  sourceMessageIds,
  meId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  sourceMessageIds: string[]
  meId: string | undefined
}) {
  const conversationsQ = useConversations()
  const [search, setSearch] = React.useState("")
  const [targetId, setTargetId] = React.useState<string | null>(null)

  // Use the selected target's forward mutation.
  const forwardMut = useForwardMessages(targetId || "")

  React.useEffect(() => {
    if (open) {
      setSearch("")
      setTargetId(null)
    }
  }, [open])

  const conversations = (conversationsQ.data?.items || []).filter((c) => {
    if (!search) return true
    const title =
      c.type === "group"
        ? c.title || ""
        : c.participants.find((p) => p.userId !== meId)?.userName || ""
    return title.includes(search)
  })

  function handleSubmit() {
    if (!targetId || sourceMessageIds.length === 0) return
    forwardMut.mutate(sourceMessageIds, {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>فوروارد پیام</DialogTitle>
          <DialogDescription>
            یک گفتگو برای فوروارد {toPersianDigits(sourceMessageIds.length)} پیام انتخاب کنید.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی گفتگو..."
            className="pr-9"
          />
        </div>

        <div className="max-h-72 overflow-y-auto rounded-md border">
          {conversationsQ.isLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              گفتگویی یافت نشد.
            </div>
          ) : (
            <ul className="divide-y">
              {conversations.map((c) => {
                const other = c.participants.find((p) => p.userId !== meId)
                const t =
                  c.type === "group" ? c.title || "گروه" : other?.userName || "کاربر"
                const isSel = c.id === targetId
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setTargetId(c.id)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2.5 text-right transition-colors hover:bg-accent",
                        isSel && "bg-primary/10 ring-1 ring-inset ring-primary/30"
                      )}
                    >
                      <Avatar className="size-8 shrink-0">
                        <AvatarFallback
                          className="text-xs font-semibold text-white"
                          style={{
                            backgroundColor:
                              c.type === "group" ? "#64748b" : colorForName(t),
                          }}
                        >
                          {c.type === "group" ? <Users className="size-3.5" /> : initials(t)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate text-sm">{t}</span>
                      {isSel && <Check className="size-4 text-primary" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>انصراف</Button>
          <Button onClick={handleSubmit} disabled={!targetId || forwardMut.isPending}>
            {forwardMut.isPending ? "در حال فوروارد..." : "فوروارد"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Group settings dialog — rename / add / remove / leave / promote
// ============================================================
function GroupSettingsDialog({
  open,
  onOpenChange,
  conversation,
  meId,
  onAction,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  conversation: Conversation
  meId: string | undefined
  onAction: (id: string, body: { action: string; [k: string]: unknown }) => Promise<{ ok: boolean }>
}) {
  const usersQ = useChatUsers()
  const [title, setTitle] = React.useState(conversation.title || "")
  const [addSearch, setAddSearch] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setTitle(conversation.title || "")
      setAddSearch("")
    }
  }, [open, conversation.title])

  const me = conversation.participants.find((p) => p.userId === meId)
  const isAdmin = me?.role === "owner" || me?.role === "admin"
  const activeMembers = conversation.participants.filter((p) => !p.leftAt)

  async function handleRename() {
    if (!title.trim()) return toast.error("نام گروه الزامی است")
    setBusy(true)
    try {
      await onAction(conversation.id, { action: "rename", title: title.trim() })
      toast.success("نام گروه تغییر کرد")
    } catch (e) {
      toast.error((e as Error).message || "خطا")
    } finally {
      setBusy(false)
    }
  }

  async function handleAdd(userId: string) {
    setBusy(true)
    try {
      await onAction(conversation.id, { action: "add-participants", participantIds: [userId] })
      toast.success("عضو اضافه شد")
    } catch (e) {
      toast.error((e as Error).message || "خطا")
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(userId: string) {
    if (!window.confirm("این عضو حذف شود؟")) return
    setBusy(true)
    try {
      await onAction(conversation.id, { action: "remove-participant", userId })
      toast.success("عضو حذف شد")
    } catch (e) {
      toast.error((e as Error).message || "خطا")
    } finally {
      setBusy(false)
    }
  }

  async function handlePromote(userId: string, role: "admin" | "member") {
    setBusy(true)
    try {
      await onAction(conversation.id, { action: "promote", userId, role })
      toast.success(role === "admin" ? "کاربر مدیر شد" : "کاربر عضو عادی شد")
    } catch (e) {
      toast.error((e as Error).message || "خطا")
    } finally {
      setBusy(false)
    }
  }

  async function handleLeave() {
    if (!window.confirm("از گروه خارج می‌شوید؟")) return
    setBusy(true)
    try {
      await onAction(conversation.id, { action: "leave" })
      toast.success("از گروه خارج شدید")
      onOpenChange(false)
    } catch (e) {
      toast.error((e as Error).message || "خطا")
    } finally {
      setBusy(false)
    }
  }

  // Users not already in the group (for the add-participant picker).
  const candidateUsers = (usersQ.data?.items || []).filter(
    (u) => !activeMembers.some((p) => p.userId === u.id)
  )
  const filteredCandidates = candidateUsers.filter((u) => {
    if (!addSearch.trim()) return true
    return (
      u.name.includes(addSearch) ||
      (u.phone || "").includes(addSearch) ||
      (u.roleLabel || "").includes(addSearch)
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تنظیمات گروه</DialogTitle>
          <DialogDescription>مدیریت نام و اعضای گروه</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Rename */}
          <div className="space-y-1.5">
            <Label htmlFor="grp-name">نام گروه</Label>
            <div className="flex gap-2">
              <Input
                id="grp-name"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!isAdmin || busy}
              />
              <Button
                onClick={handleRename}
                disabled={!isAdmin || busy || !title.trim() || title === conversation.title}
              >
                ذخیره
              </Button>
            </div>
            {!isAdmin && (
              <p className="text-[11px] text-muted-foreground">فقط مدیر می‌تواند نام را تغییر دهد.</p>
            )}
          </div>

          <Separator />

          {/* Members list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>اعضا ({toPersianDigits(activeMembers.length)})</Label>
              <Button variant="outline" size="sm" onClick={handleLeave} disabled={busy}>
                خروج از گروه
              </Button>
            </div>
            <ul className="divide-y rounded-md border">
              {activeMembers.map((p) => (
                <li key={p.id} className="flex items-center gap-2 px-3 py-2">
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback
                      className="text-xs font-semibold text-white"
                      style={{ backgroundColor: colorForName(p.userName) }}
                    >
                      {initials(p.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {p.userName}
                      {p.userId === meId && <span className="text-muted-foreground"> (شما)</span>}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {p.role === "owner" ? "مالک" : p.role === "admin" ? "مدیر" : "عضو"}
                    </div>
                  </div>
                  {isAdmin && p.userId !== meId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7" aria-label="عملیات">
                          <MoreVertical className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-44">
                        <DropdownMenuItem
                          onClick={() =>
                            handlePromote(p.userId, p.role === "admin" ? "member" : "admin")
                          }
                        >
                          {p.role === "admin" ? "تنزل به عضو" : "ارتقا به مدیر"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRemove(p.userId)}
                          className="text-destructive focus:text-destructive"
                        >
                          حذف از گروه
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Add participant (admin only) */}
          {isAdmin && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>افزودن عضو</Label>
                <Input
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  placeholder="جستجوی کاربر..."
                />
                <div className="max-h-40 overflow-y-auto rounded-md border">
                  {filteredCandidates.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      کاربری یافت نشد.
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {filteredCandidates.slice(0, 10).map((u) => (
                        <li key={u.id}>
                          <button
                            type="button"
                            onClick={() => handleAdd(u.id)}
                            disabled={busy}
                            className="flex w-full items-center gap-2 px-3 py-2 text-right hover:bg-accent disabled:opacity-50"
                          >
                            <Avatar className="size-7 shrink-0">
                              <AvatarFallback
                                className="text-[11px] font-semibold text-white"
                                style={{ backgroundColor: colorForName(u.name) }}
                              >
                                {initials(u.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="min-w-0 flex-1 truncate text-sm">{u.name}</span>
                            <span className="text-[11px] text-muted-foreground">{u.roleLabel}</span>
                            <Plus className="size-3.5 text-primary" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>بستن</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Main view
// ============================================================
export function MessagesView() {
  const me = useUserIdentity()
  const conversationsQ = useConversations()
  const qc = useQueryClient()
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [newChatOpen, setNewChatOpen] = React.useState(false)
  // On mobile, we hide the list when a conversation is open
  const [mobileShowChat, setMobileShowChat] = React.useState(false)

  // Typing state: per-conversation set of userIds currently typing.
  const [typingByConv, setTypingByConv] = React.useState<
    Record<string, Record<string, { userId: string; userName: string; at: number }>>
  >({})
  const typingTimersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Clear typing state for a user in a conversation (called when their message
  // arrives or after a timeout).
  const clearTyping = React.useCallback((convId: string, userId: string) => {
    setTypingByConv((prev) => {
      const conv = prev[convId]
      if (!conv || !conv[userId]) return prev
      const next = { ...prev, [convId]: { ...conv } }
      delete next[convId][userId]
      return next
    })
  }, [])

  // ---- Socket.io real-time wiring ----
  const socket = useChatSocket({
    enabled: !!me?.id,
    onMessageNew: (m) => {
      // Insert into the message cache if not already present (the REST API
      // also broadcasts the same shape, so dedupe by id).
      qc.setQueryData<{ items: Message[]; hasMore: boolean }>(
        ["msg-messages", m.conversationId],
        (old) => {
          if (!old) return { items: [m as Message], hasMore: false }
          if (old.items.some((x) => x.id === m.id)) return old
          return { items: [m as Message, ...old.items], hasMore: old.hasMore }
        }
      )
      // Clear typing indicator for the sender of this message.
      clearTyping(m.conversationId, m.senderId)
      // Invalidate conversation list (so last message preview / unread count refresh).
      qc.invalidateQueries({ queryKey: ["msg-conversations"] })
    },
    onMessageEdited: (m) => {
      qc.setQueryData<{ items: Message[]; hasMore: boolean }>(
        ["msg-messages", m.conversationId],
        (old) => {
          if (!old) return old
          return {
            ...old,
            items: old.items.map((x) => (x.id === m.id ? { ...x, ...(m as Message), __status: undefined } : x)),
          }
        }
      )
    },
    onMessageDeleted: (p) => {
      if (p.forEveryone) {
        // Mark as deleted in cache (don't remove — show "این پیام حذف شد").
        qc.setQueryData<{ items: Message[]; hasMore: boolean }>(
          ["msg-messages", p.conversationId],
          (old) => {
            if (!old) return old
            return {
              ...old,
              items: old.items.map((x) =>
                x.id === p.id
                  ? { ...x, deletedAt: p.deletedAt || new Date().toISOString(), body: "" }
                  : x
              ),
            }
          }
        )
      } else if (p.forUserId) {
        // "Delete for me" — remove only for that user (only this user sees it gone).
        qc.setQueryData<{ items: Message[]; hasMore: boolean }>(
          ["msg-messages", p.conversationId],
          (old) => {
            if (!old) return old
            return { ...old, items: old.items.filter((x) => x.id !== p.id) }
          }
        )
      }
    },
    onMessageReaction: (p) => {
      qc.setQueryData<{ items: Message[]; hasMore: boolean }>(
        ["msg-messages", p.conversationId],
        (old) => {
          if (!old) return old
          return {
            ...old,
            items: old.items.map((x) =>
              x.id === p.messageId ? { ...x, reactions: p.reactions as Reaction[] } : x
            ),
          }
        }
      )
    },
    onMessageRead: (p) => {
      // Mark all messages in this conversation as read by `p.userId`.
      qc.setQueryData<{ items: Message[]; hasMore: boolean }>(
        ["msg-messages", p.conversationId],
        (old) => {
          if (!old) return old
          const readAt = p.lastReadAt
          return {
            ...old,
            items: old.items.map((x) => {
              if (x.senderId === p.userId) return x // own messages — no change
              const already = x.readBy.some((r) => r.userId === p.userId)
              if (already) return x
              return {
                ...x,
                readBy: [...x.readBy, { userId: p.userId, readAt }],
              }
            }),
          }
        }
      )
      // Also clear unreadCount for this conversation.
      qc.setQueryData<{ items: Conversation[] }>(["msg-conversations"], (old) => {
        if (!old) return old
        return {
          items: old.items.map((c) =>
            c.id === p.conversationId ? { ...c, unreadCount: 0 } : c
          ),
        }
      })
    },
    onMessageAck: (p) => {
      // Replace the optimistic temp message with the real one.
      qc.setQueryData<{ items: Message[]; hasMore: boolean }>(
        ["msg-messages", p.message.conversationId],
        (old) => {
          if (!old) return { items: [p.message as Message], hasMore: false }
          // If the tempId is in the cache, replace it; otherwise insert at top.
          const hasTemp = p.tempId && old.items.some((x) => x.__tempId === p.tempId)
          if (hasTemp) {
            return {
              ...old,
              items: old.items.map((x) =>
                x.__tempId === p.tempId
                  ? { ...(p.message as Message), __status: "sent" as const }
                  : x
              ),
            }
          }
          // Dedupe by id in case the broadcast already came in.
          if (old.items.some((x) => x.id === p.message.id)) return old
          return { items: [p.message as Message, ...old.items], hasMore: old.hasMore }
        }
      )
      // Also invalidate conversations list (last message preview).
      qc.invalidateQueries({ queryKey: ["msg-conversations"] })
    },
    onTypingStart: (p) => {
      setTypingByConv((prev) => {
        const conv = prev[p.conversationId] || {}
        return {
          ...prev,
          [p.conversationId]: {
            ...conv,
            [p.userId]: { userId: p.userId, userName: p.userName || "", at: Date.now() },
          },
        }
      })
      // Auto-clear after 5s if no further typing event arrives.
      const key = `${p.conversationId}:${p.userId}`
      const existing = typingTimersRef.current.get(key)
      if (existing) clearTimeout(existing)
      const timer = setTimeout(() => {
        clearTyping(p.conversationId, p.userId)
        typingTimersRef.current.delete(key)
      }, 5000)
      typingTimersRef.current.set(key, timer)
    },
    onTypingStop: (p) => {
      clearTyping(p.conversationId, p.userId)
      const key = `${p.conversationId}:${p.userId}`
      const t = typingTimersRef.current.get(key)
      if (t) {
        clearTimeout(t)
        typingTimersRef.current.delete(key)
      }
    },
    onError: (err) => {
      // Quietly toast socket errors (don't spam — server already handles reconnect).
      if (err?.message) {
        // Only show non-trivial errors
        // toast.error(err.message)
      }
    },
  })

  // ---- Listen for `conversation:deleted` socket events ----
  // The hook doesn't expose this event directly (it only handles `conversation:updated`),
  // so we attach a raw listener to the underlying socket. This handles the case where
  // ANOTHER user (or another tab) deletes a conversation — we need to remove it from
  // our cache and clear the active chat if it was open.
  React.useEffect(() => {
    const raw = socket.socket
    if (!raw) return
    const handler = (p: { id?: string } | undefined) => {
      const id = p?.id
      if (!id) return
      // Remove from conversation list cache.
      qc.setQueryData<{ items: Conversation[] }>(["msg-conversations"], (old) => {
        if (!old) return old
        return { items: old.items.filter((c) => c.id !== id) }
      })
      // Drop the messages cache for that conversation.
      qc.removeQueries({ queryKey: ["msg-messages", id] })
      // Clear active chat if it was the deleted conversation.
      setActiveId((prev) => (prev === id ? null : prev))
      setMobileShowChat((prev) => (prev ? false : prev))
    }
    raw.on("conversation:deleted", handler)
    return () => {
      raw.off("conversation:deleted", handler)
    }
  }, [socket.socket, qc])

  // Auto-select first conversation on desktop if none selected
  const conversations = conversationsQ.data?.items || []
  const active = conversations.find((c) => c.id === activeId) || null

  React.useEffect(() => {
    setMobileShowChat(!!active)
  }, [active])

  // Conversation action handler (mute, pin) for the list hover menu.
  const convAction = useConversationAction()
  async function handleToggleMute(c: Conversation) {
    const me = c.participants.find((p) => p.userId === me?.id)
    const nextMuted = !me?.muted
    try {
      await convAction(c.id, { action: "mute", muted: nextMuted })
      toast.success(nextMuted ? "گفتگو بی‌صدا شد" : "اعلان‌ها بازگردانده شد")
    } catch (e) {
      toast.error((e as Error).message || "خطا")
    }
  }
  async function handleTogglePin(c: Conversation) {
    const nextPinned = !c.pinned
    try {
      await convAction(c.id, { action: "pin", pinned: nextPinned })
      toast.success(nextPinned ? "گفتگو سنجاق شد" : "سنجاق حذف شد")
    } catch (e) {
      toast.error((e as Error).message || "خطا")
    }
  }

  // Called by ConversationsList AFTER a successful delete. We use it to clear the
  // active chat if the deleted conversation was open. (The list itself already
  // removed the conversation from the cache and showed a success toast.)
  function handleConversationDeleted(c: Conversation) {
    if (activeId === c.id) {
      setActiveId(null)
      setMobileShowChat(false)
    }
  }

  function handleSelect(c: Conversation) {
    setActiveId(c.id)
    setLastRead(c.id, new Date().toISOString())
    setMobileShowChat(true)
  }
  function handleBack() {
    setMobileShowChat(false)
  }
  function handleCreated(c: Conversation) {
    setActiveId(c.id)
    setLastRead(c.id, new Date().toISOString())
    setMobileShowChat(true)
  }

  // Typing users for the currently-open conversation.
  const activeTypingUsers = activeId
    ? Object.values(typingByConv[activeId] || {}).map((x) => x.userId)
    : []

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col">
      <PageHeader
        title="پیام‌رسانی"
        description="ارتباط بین اعضای استودیو"
        icon="💬"
      />

      <div className="grid min-h-0 flex-1 overflow-hidden rounded-xl border bg-card shadow-sm lg:grid-cols-[320px_1fr]">
        {/* Left pane */}
        <div
          className={cn(
            "min-h-0 border-l bg-card",
            mobileShowChat ? "hidden lg:block" : "block"
          )}
        >
          <ConversationsList
            conversations={conversations}
            isLoading={conversationsQ.isLoading}
            activeId={activeId}
            onSelect={handleSelect}
            onNewChat={() => setNewChatOpen(true)}
            meId={me?.id}
            presence={socket.presence}
            onToggleMute={handleToggleMute}
            onTogglePin={handleTogglePin}
            onDelete={handleConversationDeleted}
          />
        </div>

        {/* Right pane */}
        <div
          className={cn(
            "relative min-h-0",
            mobileShowChat ? "block" : "hidden lg:block"
          )}
        >
          {active ? (
            <ChatPane
              conversation={active}
              me={me}
              onBack={handleBack}
              socket={socket}
              presence={socket.presence}
              typingUsers={activeTypingUsers}
              onClearTyping={(userId) => clearTyping(active.id, userId)}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState
                icon="💬"
                title="یک گفتگو انتخاب کنید"
                description="برای شروع گفتگو، از فهرست سمت راست یک گفتگو را انتخاب کنید یا گفتگوی جدید بسازید."
              />
            </div>
          )}
        </div>
      </div>

      <NewChatDialog
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        onCreated={handleCreated}
      />
    </div>
  )
}

