export const MAX_TEXT_LENGTH = 2000
export const MAX_PAGE_LIMIT = 50
export const MAX_CONVERSATIONS = 50
export const MAX_FORWARD_RECIPIENTS = 10
export const MAX_SELECTION = 30

export const userSelect = { id: true, avatar: true, login: true } as const

/** Пара участников в каноническом порядке: меньший id всегда userA. */
export const pair = (x: number, y: number) => (x < y ? ([x, y] as const) : ([y, x] as const))

export interface DbAttachment {
  id: number
  kind: string
  name: string
  size: number
  file: string
  thumb: string
  high: string
}

/** Что подгружать вместе с сообщением: вложения и реакции. */
export const messageInclude = {
  attachments: true,
  reactions: { select: { userId: true, emoji: true } },
} as const

/** Реакции, которые можно ставить (как в панели клиента). */
export const ALLOWED_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👎', '🎉']
export const MAX_PINNED = 10

export interface DbMessage {
  id: number
  text: string
  date: Date
  senderId: number
  editedAt: Date | null
  replyToId: number | null
  fwdUserId: number | null
  fwdLogin: string
  attachments: DbAttachment[]
  reactions?: { userId: number; emoji: string }[]
}

/** Краткое содержимое сообщения, на которое ответили. */
export interface ReplyPreview {
  id: number
  senderId: number
  text: string
  attachmentKind: string | null
  attachmentName: string | null
}

/** Сообщение в виде для GraphQL и сокета: добавляем получателя, которого в таблице нет. */
export const toMessage = (message: DbMessage, userA: number, userB: number) => ({
  id: message.id,
  text: message.text,
  date: message.date,
  senderId: message.senderId,
  recipientId: message.senderId === userA ? userB : userA,
  editedAt: message.editedAt,
  replyToId: message.replyToId,
  forwardedFrom: message.fwdLogin || null,
  forwardedFromId: message.fwdUserId,
  attachments: message.attachments,
  reactions: message.reactions ?? [],
})

export const room = (userId: number) => `user:${userId}`

/** Данные нового сообщения: текст, вложения и (для пересылки) автор оригинала. */
export interface NewMessage {
  text: string
  attachments: { kind: string; name: string; size: number; file: string; thumb: string; high: string }[]
  fwdUserId?: number | null
  fwdLogin?: string
  replyToId?: number | null
}

export const PREVIEW_LENGTH = 200
