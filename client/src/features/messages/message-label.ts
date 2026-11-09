import { ChatMessage } from './module'

/** Краткое описание сообщения без текста: тип вложения. */
export const messageLabel = (message: ChatMessage) => {
  if (message.text) return message.text
  const first = message.attachments[0]
  if (!first) return ''
  return first.kind === 'image' ? 'Фото' : first.kind === 'audio' ? 'Аудио' : first.name
}
