import { toTimestamp } from '@/shared/lib/time'

export const PAGE_SIZE = 30
export const MAX_ATTACHMENTS = 10
export const MAX_FILE_SIZE = 25 * 1024 * 1024
/** Суммарный размер вложений одного сообщения. */
export const MAX_TOTAL_SIZE = 100 * 1024 * 1024
export const MAX_TEXT_LENGTH = 2000
/** Сколько сообщений можно выбрать за раз (как на сервере). */
export const MAX_SELECTION = 30
/** Быстрые реакции (тот же набор разрешён на сервере). */
export const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👎', '🎉']

export interface Attachment {
  id: number
  kind: 'image' | 'audio' | 'file'
  name: string
  size: number
  /** image: путь без расширения (.webp добавляет интерфейс); audio/file: путь файла. */
  file: string
  thumb: string
}

export interface ChatMessage {
  id: number
  text: string
  /** Миллисекунды. */
  date: number
  senderId: number
  recipientId: number
  /** Когда сообщение редактировали (мс); 0 — не редактировалось. */
  editedAt: number
  /** Логин и id автора оригинала у пересланного сообщения; пустая строка / 0, если не пересланное. */
  forwardedFrom: string
  forwardedFromId: number
  /** Id сообщения, на которое это ответ; 0 — не ответ. */
  replyToId: number
  /** Краткое содержимое оригинала; null, если это не ответ или оригинал удалён/недоступен. */
  replyTo: ReplyPreview | null
  attachments: Attachment[]
  /** Реакции участников: у каждого не больше одной. */
  reactions: Reaction[]
}

export interface Reaction {
  userId: number
  emoji: string
}

export interface ReplyPreview {
  id: number
  senderId: number
  text: string
  attachmentKind: string | null
  attachmentName: string | null
}

export interface ChatUser {
  id: number
  login: string
  avatar: string
}

export interface ConversationItem {
  user: ChatUser
  lastMessage: ChatMessage | null
  unread: number
  /** Настройки диалога у меня: без звука, в архиве, закреплён вверху списка. */
  muted: boolean
  archived: boolean
  pinned: boolean
}

/** Статус собеседника: в сети или когда был (мс; 0 — неизвестно). */
export interface Presence {
  online: boolean
  lastSeenAt: number
}

interface RawMessage {
  id?: number | null
  text?: string | null
  date?: unknown
  senderId?: number | null
  recipientId?: number | null
  editedAt?: unknown
  forwardedFrom?: string | null
  forwardedFromId?: number | null
  replyToId?: number | null
  replyTo?: {
    id?: number | null
    senderId?: number | null
    text?: string | null
    attachmentKind?: string | null
    attachmentName?: string | null
  } | null
  reactions?: Array<{ userId?: number | null; emoji?: string | null } | null> | null
  attachments?: Array<{
    id?: number | null
    kind?: string | null
    name?: string | null
    size?: number | null
    file?: string | null
    thumb?: string | null
  } | null> | null
}

/** Приводит сообщение с сервера (GraphQL или сокет) к виду для интерфейса. */
export const toMessage = (m: RawMessage): ChatMessage => ({
  id: m.id ?? 0,
  text: m.text ?? '',
  date: toTimestamp(m.date),
  senderId: m.senderId ?? 0,
  recipientId: m.recipientId ?? 0,
  editedAt: toTimestamp(m.editedAt),
  forwardedFrom: m.forwardedFrom ?? '',
  forwardedFromId: m.forwardedFromId ?? 0,
  replyToId: m.replyToId ?? 0,
  replyTo: m.replyTo
    ? {
        id: m.replyTo.id ?? 0,
        senderId: m.replyTo.senderId ?? 0,
        text: m.replyTo.text ?? '',
        attachmentKind: m.replyTo.attachmentKind ?? null,
        attachmentName: m.replyTo.attachmentName ?? null,
      }
    : null,
  reactions: (m.reactions ?? []).flatMap((x) => (x ? [{ userId: x.userId ?? 0, emoji: x.emoji ?? '' }] : [])),
  attachments: (m.attachments ?? []).flatMap((a) =>
    a
      ? [
          {
            id: a.id ?? 0,
            kind: a.kind === 'image' || a.kind === 'audio' ? a.kind : 'file',
            name: a.name ?? 'file',
            size: a.size ?? 0,
            file: a.file ?? '',
            thumb: a.thumb ?? '',
          } as Attachment,
        ]
      : [],
  ),
})
