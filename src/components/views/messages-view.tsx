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
  ArrowRight,
  Users,
  User as UserIcon,
  Download,
  File as FileIcon,
  ImageIcon,
  Film,
  Music,
  Check,
  MoreVertical,
  MessageCircle,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { toPersianDigits, toJalali, JALALI_MONTHS } from "@/lib/jalali"
import { useApi } from "@/lib/api/client"
import { useWorkspace } from "@/stores/workspace"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
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
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

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
  editedAt: string | null
  createdAt: string
  reactions: Reaction[]
}
interface Participant {
  id: string
  userId: string
  userName: string
  joinedAt: string
}
interface Conversation {
  id: string
  type: "direct" | "group"
  title: string | null
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
const POLL_INTERVAL = 5_000
const PAGE_SIZE = 50
const EMOJI_PICKER = ["👍", "❤️", "🔥", "😂", "🎉", "👀"]
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
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-demo-role": role,
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
    mutationFn: async (file: File): Promise<Attachment> => {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("conversationId", conversationId)
      const res = await fetch("/api/messages/upload", {
        method: "POST",
        headers: { "x-demo-role": role },
        body: fd,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const errMsg = (data as { error?: string })?.error || `Upload failed (${res.status})`
        throw new Error(errMsg)
      }
      return data as Attachment
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["msg-conversations"] }),
    onError: (e: Error) => toast.error(e.message || "بارگذاری فایل ناموفق بود"),
  })
}

// ============================================================
// Mention rendering
// ============================================================
function renderBodyWithMentions(body: string, mentions: Mention[]): React.ReactNode {
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
    const color = mention ? MENTION_COLORS[mention.type] : "#64748b"
    const typeLabel = mention ? MENTION_TYPE_LABELS[mention.type] : "اشاره"
    parts.push(
      <span
        key={key++}
        className="mx-0.5 inline-flex items-center rounded px-1.5 py-0.5 text-[0.85em] font-medium align-baseline"
        style={{ backgroundColor: color + "22", color }}
        title={typeLabel}
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
// Message bubble
// ============================================================
function MessageBubble({
  message,
  isMine,
  isGroup,
  meId,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onImageClick,
}: {
  message: Message
  isMine: boolean
  isGroup: boolean
  meId: string
  onReply: (m: Message) => void
  onEdit: (m: Message) => void
  onDelete: (m: Message) => void
  onReact: (m: Message, emoji: string) => void
  onImageClick: (url: string) => void
}) {
  const [emojiOpen, setEmojiOpen] = React.useState(false)
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

  return (
    <div
      className={cn(
        "group flex w-full gap-2 px-3 py-1.5",
        isMine ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
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

      {/* Bubble */}
      <div className={cn("flex max-w-[78%] flex-col gap-1", isMine ? "items-end" : "items-start")}>
        {/* Sender name (group only) */}
        {isGroup && !isMine && (
          <div className="px-1 text-[11px] font-medium" style={{ color }}>
            {message.senderName}
          </div>
        )}

        <div
          className={cn(
            "relative rounded-2xl px-3 py-2 text-sm shadow-sm",
            isMine
              ? "rounded-tl-md bg-primary/10 text-foreground dark:bg-primary/15"
              : "rounded-tr-md bg-muted text-foreground"
          )}
        >
          {/* Reply quote */}
          {message.replyTo && (
            <div
              className={cn(
                "mb-1.5 rounded-md border-r-2 bg-background/40 px-2 py-1 text-xs",
                isMine ? "border-primary/60" : "border-muted-foreground/40"
              )}
            >
              <div className="font-medium text-muted-foreground">
                {message.replyTo.senderId === meId ? "شما" : message.replyTo.senderName}
              </div>
              <div className="line-clamp-2 text-muted-foreground">
                {message.replyTo.body || "📎 پیوست"}
              </div>
            </div>
          )}

          {/* Body */}
          {message.body && (
            <div className="leading-relaxed">{renderBodyWithMentions(message.body, message.mentions)}</div>
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

          {/* Footer: time + edited */}
          <div
            className={cn(
              "mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground",
              isMine ? "justify-start" : "justify-end"
            )}
          >
            {message.editedAt && <span>(ویرایش شد)</span>}
            <span className="tabular-nums">{time}</span>
          </div>

          {/* Hover action menu */}
          <div
            className={cn(
              "absolute top-0 z-10 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100",
              isMine ? "left-1" : "right-1"
            )}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7 rounded-full border bg-background shadow"
                  aria-label="عملیات پیام"
                >
                  <MoreVertical className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isMine ? "start" : "end"} className="w-44">
                <DropdownMenuItem onClick={() => onReply(message)}>
                  <Reply className="ml-2 size-3.5" /> پاسخ
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onReact(message, EMOJI_PICKER[0])}
                >
                  <SmilePlus className="ml-2 size-3.5" /> واکنش سریع
                </DropdownMenuItem>
                <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <SmilePlus className="ml-2 size-3.5" /> انتخاب ایموجی
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="left"
                    sideOffset={4}
                    className="w-auto p-1.5"
                  >
                    <div className="flex flex-wrap gap-1">
                      {EMOJI_PICKER.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => {
                            onReact(message, e)
                            setEmojiOpen(false)
                          }}
                          className="rounded p-1 text-lg hover:bg-accent"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {isMine && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEdit(message)}>
                      <Pencil className="ml-2 size-3.5" /> ویرایش
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(message)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="ml-2 size-3.5" /> حذف
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Reactions row */}
        {reactionsByEmoji.length > 0 && (
          <div className={cn("flex flex-wrap gap-1 px-1", isMine ? "justify-end" : "justify-start")}>
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
// Mention picker (popover)
// ============================================================
function MentionPicker({
  open,
  onOpenChange,
  onPick,
  anchor,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onPick: (m: Mention) => void
  anchor?: React.ReactNode
}) {
  const [type, setType] = React.useState<Mention["type"]>("customer")
  const [label, setLabel] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open) {
      setLabel("")
      setType("customer")
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  function submit() {
    const t = label.trim()
    if (!t) return
    onPick({ type, id: "", label: t })
    onOpenChange(false)
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {anchor && <PopoverTrigger asChild>{anchor}</PopoverTrigger>}
      <PopoverContent
        side="top"
        align="start"
        className="w-72 p-3"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="mb-2 text-xs font-medium text-muted-foreground">انتخاب نوع اشاره</div>
        <div className="mb-2 flex gap-1.5">
          {(Object.keys(MENTION_TYPE_LABELS) as Mention["type"][]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "rounded-md border px-2 py-1 text-xs transition-colors",
                type === t
                  ? "border-transparent text-white"
                  : "bg-background hover:bg-accent"
              )}
              style={type === t ? { backgroundColor: MENTION_COLORS[t] } : undefined}
            >
              {MENTION_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <Input
          ref={inputRef}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              submit()
            } else if (e.key === "Escape") {
              onOpenChange(false)
            }
          }}
          placeholder="نام را وارد کنید..."
          className="mb-2"
        />
        <div className="flex justify-end gap-1.5">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button type="button" size="sm" onClick={submit} disabled={!label.trim()}>
            افزودن
          </Button>
        </div>
      </PopoverContent>
    </Popover>
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
}

function Composer({
  conversationId,
  replyTo,
  editing,
  meId,
  onCancelReply,
  onCancelEdit,
}: ComposerProps) {
  const [text, setText] = React.useState("")
  const [pendingAttachments, setPendingAttachments] = React.useState<Attachment[]>([])
  const [mentions, setMentions] = React.useState<Mention[]>([])
  const [mentionOpen, setMentionOpen] = React.useState(false)
  const [mentionAnchorPos, setMentionAnchorPos] = React.useState<{ start: number } | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const sendMut = useSendMessage(conversationId)
  const editMut = useEditMessage(conversationId)
  const uploadMut = useUploadAttachment(conversationId)

  // When entering edit mode, populate text + mentions
  React.useEffect(() => {
    if (editing) {
      setText(editing.body)
      setMentions(editing.mentions || [])
      setPendingAttachments([])
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [editing])

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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    e.target.value = "" // reset
    for (const f of files) {
      uploadMut.mutate(f, {
        onSuccess: (att) => {
          setPendingAttachments((prev) => [...prev, att])
        },
      })
    }
  }

  const busy = sendMut.isPending || editMut.isPending || uploadMut.isPending

  return (
    <div className="border-t bg-background px-3 py-2.5">
      {/* Reply preview */}
      {replyTo && !editing && (
        <div className="mb-2 flex items-center gap-2 rounded-md border-r-2 border-primary/60 bg-muted/40 px-2 py-1.5 text-xs">
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

      <div className="flex items-end gap-2">
        {/* Attachment button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          aria-label="پیوست"
          title="پیوست"
        >
          <Paperclip className="size-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,audio/*,video/*,*/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Mention button (manual trigger as alternative to typing @) */}
        <MentionPicker
          open={mentionOpen}
          onOpenChange={setMentionOpen}
          onPick={handlePickMention}
          anchor={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 shrink-0"
              onClick={() => {
                setMentionAnchorPos({ start: textareaRef.current?.selectionStart ?? text.length })
                setMentionOpen(true)
              }}
              disabled={busy}
              aria-label="اشاره"
              title="افزودن اشاره (@)"
            >
              <span className="text-base font-bold leading-none">@</span>
            </Button>
          }
        />

        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={editing ? "ویرایش پیام..." : "پیام بنویسید... (Enter برای ارسال، Shift+Enter برای خط جدید)"}
          rows={1}
          className="min-h-9 max-h-40 flex-1 resize-none"
          disabled={busy}
        />

        {/* Send / Save button */}
        <Button
          type="button"
          size="icon"
          className="size-9 shrink-0"
          onClick={handleSend}
          disabled={busy || (!text.trim() && pendingAttachments.length === 0)}
          aria-label={editing ? "ذخیره" : "ارسال"}
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
}: {
  conversations: Conversation[]
  isLoading: boolean
  activeId: string | null
  onSelect: (c: Conversation) => void
  onNewChat: () => void
  meId: string | undefined
}) {
  const [search, setSearch] = React.useState("")
  const filtered = conversations.filter((c) => {
    if (!search) return true
    const title =
      c.type === "group"
        ? c.title || ""
        : c.participants.find((p) => p.userId !== meId)?.userName || ""
    return title.includes(search)
  })

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
            <div className="text-sm font-medium">هیچ گفتگویی وجود ندارد</div>
            <div className="mt-1 text-xs text-muted-foreground">
              برای شروع، روی «گفتگوی جدید» بزنید.
            </div>
          </div>
        ) : (
          <ul>
            {filtered.map((c) => {
              const other = c.participants.find((p) => p.userId !== meId)
              const title =
                c.type === "group"
                  ? c.title || "گروه"
                  : other?.userName || "کاربر"
              const last = c.lastMessage
              const lastTime = last ? formatChatTime(last.createdAt) : ""
              const lastBody =
                last?.body ||
                (last ? "📎 پیوست" : "بدون پیام")
              const lastSender =
                last?.senderId === meId ? "شما" : last?.senderName || ""
              // Unread: client computes via lastRead
              const lastRead = getLastRead(c.id)
              const unread =
                last && new Date(last.createdAt).getTime() > lastRead ? 1 : 0
              const isActive = c.id === activeId
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2.5 text-right transition-colors hover:bg-accent/50",
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
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{title}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                          {lastTime}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="line-clamp-1 text-xs text-muted-foreground">
                          {lastSender && (
                            <span className="font-medium text-foreground/70">
                              {lastSender}:{" "}
                            </span>
                          )}
                          {lastBody}
                        </span>
                        {unread > 0 && (
                          <span className="size-2 shrink-0 rounded-full bg-rose-500" />
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
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
}: {
  conversation: Conversation
  me: { id: string; name: string } | undefined
  onBack: () => void
}) {
  const messagesQ = useMessages(conversation.id)
  const fetchOlder = useOlderMessages(conversation.id)
  const editMut = useEditMessage(conversation.id)
  const delMut = useDeleteMessage(conversation.id)
  const reactMut = useToggleReaction(conversation.id)

  const [replyTo, setReplyTo] = React.useState<Message | null>(null)
  const [editing, setEditing] = React.useState<Message | null>(null)
  const [lightbox, setLightbox] = React.useState<string | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = React.useState(true)
  const [loadingOlder, setLoadingOlder] = React.useState(false)

  // Determine chat title
  const other = conversation.participants.find((p) => p.userId !== me?.id)
  const title =
    conversation.type === "group"
      ? conversation.title || "گروه"
      : other?.userName || "کاربر"
  const subtitle =
    conversation.type === "group"
      ? conversation.participants.map((p) => p.userName).join("، ")
      : other ? "گفتگوی شخصی" : ""

  // Messages in chronological order (oldest first)
  const sortedMessages = React.useMemo(() => {
    const items = (messagesQ.data?.items || []).slice()
    items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    return items
  }, [messagesQ.data])

  // Auto-scroll to bottom on new message (only if user is at bottom)
  React.useEffect(() => {
    if (atBottom && scrollRef.current) {
      const el = scrollRef.current
      el.scrollTop = el.scrollHeight
    }
  }, [sortedMessages.length, atBottom])

  // Mark last-read when messages arrive
  React.useEffect(() => {
    if (sortedMessages.length === 0) return
    const last = sortedMessages[sortedMessages.length - 1]
    setLastRead(conversation.id, last.createdAt)
  }, [sortedMessages, conversation.id])

  // Reset reply/edit state when switching conversations
  React.useEffect(() => {
    setReplyTo(null)
    setEditing(null)
  }, [conversation.id])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setAtBottom(distFromBottom < 80)
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

  function handleReply(m: Message) {
    setReplyTo(m)
    setEditing(null)
  }
  function handleEdit(m: Message) {
    setEditing(m)
    setReplyTo(null)
  }
  async function handleDelete(m: Message) {
    if (!window.confirm("این پیام حذف شود؟")) return
    delMut.mutate(m.id)
  }
  function handleReact(m: Message, emoji: string) {
    reactMut.mutate({ id: m.id, emoji })
  }

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
            <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>
          )}
        </div>
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
            <div className="text-sm font-medium">شروع گفتگو</div>
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
                <div className="my-2 flex justify-center">
                  <span className="rounded-full bg-muted px-3 py-0.5 text-[10px] text-muted-foreground">
                    {g.label}
                  </span>
                </div>
                {g.messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    isMine={!!me && m.senderId === me.id}
                    isGroup={conversation.type === "group"}
                    meId={me?.id || ""}
                    onReply={handleReply}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onReact={handleReact}
                    onImageClick={setLightbox}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <Composer
        conversationId={conversation.id}
        replyTo={replyTo}
        editing={editing}
        meId={me?.id}
        onCancelReply={() => setReplyTo(null)}
        onCancelEdit={() => setEditing(null)}
      />

      {/* Lightbox */}
      <ImageLightbox url={lightbox} onClose={() => setLightbox(null)} />
    </div>
  )
}

function formatDayLabel(d: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "امروز"
  if (d.toDateString() === yesterday.toDateString()) return "دیروز"
  return jalaliDayMonth(d)
}

// ============================================================
// Main view
// ============================================================
export function MessagesView() {
  const me = useUserIdentity()
  const conversationsQ = useConversations()
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [newChatOpen, setNewChatOpen] = React.useState(false)

  // Auto-select first conversation on desktop if none selected
  const conversations = conversationsQ.data?.items || []
  const active = conversations.find((c) => c.id === activeId) || null

  // On mobile, we hide the list when a conversation is open
  const [mobileShowChat, setMobileShowChat] = React.useState(false)
  React.useEffect(() => {
    setMobileShowChat(!!active)
  }, [active])

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
          />
        </div>

        {/* Right pane */}
        <div
          className={cn(
            "min-h-0",
            mobileShowChat ? "block" : "hidden lg:block"
          )}
        >
          {active ? (
            <ChatPane
              conversation={active}
              me={me}
              onBack={handleBack}
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
