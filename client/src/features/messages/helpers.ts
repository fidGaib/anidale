import { ChatMessage, ReplyPreview } from './module'

export const LONG_PRESS_MS = 500

/** Краткое описание сообщения для списка диалогов. */
export const preview = (message: ChatMessage | null, myId: number) => {
  if (!message) return ''
  const prefix = message.senderId === myId ? 'Вы: ' : ''
  if (message.text) return prefix + message.text
  const first = message.attachments[0]
  if (!first) return prefix
  const label = first.kind === 'image' ? 'Фото' : first.kind === 'audio' ? 'Аудио' : first.name
  return `${prefix}${label}${message.attachments.length > 1 ? ` и ещё ${message.attachments.length - 1}` : ''}`
}

/** Что показать вместо текста в цитате ответа: сам текст или тип вложения. */
export const replyLabel = (reply: ReplyPreview) => {
  if (reply.text) return reply.text
  if (reply.attachmentKind === 'image') return 'Фото'
  if (reply.attachmentKind === 'audio') return 'Аудио'
  return reply.attachmentName || 'Вложение'
}
