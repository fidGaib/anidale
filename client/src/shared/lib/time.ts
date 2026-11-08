/**
 * Приводит дату с сервера к миллисекундам. По GraphQL скаляр Date приходит числом,
 * а по сокету (JSON) — строкой ISO, поэтому принимаем оба вида.
 */
export const toTimestamp = (value: unknown): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value) {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : Date.parse(value)
  }
  return 0
}

/** «5 мая, 14:07». Пустая строка, если даты нет. */
export const formatDateTime = (timestamp: number) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** Для списка диалогов: сегодня — время, иначе дата. */
export const formatShort = (timestamp: number) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  return date.toDateString() === now.toDateString()
    ? date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}
