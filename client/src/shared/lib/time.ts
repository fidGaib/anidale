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

/** Подпись дня для разделителя в переписке: «Сегодня», «Вчера», «12 мая» (с годом, если он не текущий). */
export const formatDay = (timestamp: number) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((startOf(now) - startOf(date)) / 86_400_000)
  if (diffDays === 0) return 'Сегодня'
  if (diffDays === 1) return 'Вчера'
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  })
}

/** Ключ календарного дня: сообщения с одним ключом идут под одним разделителем. */
export const dayKey = (timestamp: number) => {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** «в сети» или «был(а) 5 мин. назад», «был(а) вчера в 14:07», «был(а) 12 мая». */
export const formatLastSeen = (online: boolean, lastSeenAt: number) => {
  if (online) return 'в сети'
  if (!lastSeenAt) return 'был(а) давно'
  const minutes = Math.floor((Date.now() - lastSeenAt) / 60_000)
  if (minutes < 1) return 'был(а) только что'
  if (minutes < 60) return `был(а) ${minutes} мин. назад`
  const date = new Date(lastSeenAt)
  const time = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const day = formatDay(lastSeenAt)
  if (day === 'Сегодня') return `был(а) сегодня в ${time}`
  if (day === 'Вчера') return `был(а) вчера в ${time}`
  return `был(а) ${day}`
}
