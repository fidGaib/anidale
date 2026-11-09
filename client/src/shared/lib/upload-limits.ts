import { formatFileSize } from './time'

/** Один видеофайл (как на сервере). */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024
/** Весь запрос: ограничение nginx и сервера. Небольшой запас оставлен на служебные части multipart. */
export const MAX_REQUEST_BYTES = 110 * 1024 * 1024
const REQUEST_MARGIN = 256 * 1024

/**
 * Проверяет файлы до отправки: каждое видео не больше 100 МБ, всё вместе (с уже выбранными) не больше 110 МБ.
 * Возвращает текст ошибки или пустую строку, если всё в порядке.
 */
export const validateUpload = (incoming: File[], already: File[] = []): string => {
  const tooBig = incoming.find((file) => file.type.startsWith('video/') && file.size > MAX_VIDEO_BYTES)
  if (tooBig) {
    return `«${tooBig.name}» больше ${MAX_VIDEO_BYTES / 1024 / 1024} МБ (${formatFileSize(tooBig.size)})`
  }
  const total = [...already, ...incoming].reduce((sum, file) => sum + file.size, 0)
  if (total > MAX_REQUEST_BYTES - REQUEST_MARGIN) {
    return `Файлы вместе занимают ${formatFileSize(total)}, а за один раз можно отправить не больше ${MAX_REQUEST_BYTES / 1024 / 1024} МБ. Уберите часть файлов или опубликуйте в несколько постов`
  }
  return ''
}
