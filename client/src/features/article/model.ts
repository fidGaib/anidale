/** Блок в редакторе статьи. Для списка текст хранит пункты, по одному на строку. */
export type EditorBlock =
  | { id: number; type: 'p' | 'h' | 'quote' | 'list'; text: string }
  | {
      id: number
      type: 'image'
      caption: string
      /** Новая картинка, ещё не отправленная на сервер. */
      file?: File
      /** Картинка, уже лежащая в статье (при редактировании). */
      src?: string
      /** Адрес для показа в редакторе. */
      preview: string
    }

export type TextType = 'p' | 'h' | 'quote' | 'list'

/** Блок статьи в том виде, в котором его отдаёт сервер. */
export type StoredBlock =
  | { type: 'p' | 'h' | 'quote'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'image'; src: string; small: string; caption: string }

export const MAX_TITLE = 120
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024

export const nextId = (blocks: EditorBlock[]) => blocks.reduce((max, b) => Math.max(max, b.id), 0) + 1

export const emptyBlock = (blocks: EditorBlock[], type: TextType = 'p'): EditorBlock => ({
  id: nextId(blocks),
  type,
  text: '',
})

/** Вставляет блок после блока `afterId` (null — в начало). */
export const insertAfter = (blocks: EditorBlock[], afterId: number | null, block: EditorBlock): EditorBlock[] => {
  if (afterId === null) return [block, ...blocks]
  const index = blocks.findIndex((b) => b.id === afterId)
  if (index < 0) return [...blocks, block]
  return [...blocks.slice(0, index + 1), block, ...blocks.slice(index + 1)]
}

export const updateBlock = (blocks: EditorBlock[], id: number, patch: Partial<EditorBlock>): EditorBlock[] =>
  blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as EditorBlock) : b))

export const removeBlock = (blocks: EditorBlock[], id: number): EditorBlock[] => blocks.filter((b) => b.id !== id)

/** Сдвигает блок вверх (-1) или вниз (1); у края остаётся на месте. */
export const moveBlock = (blocks: EditorBlock[], id: number, delta: -1 | 1): EditorBlock[] => {
  const index = blocks.findIndex((b) => b.id === id)
  const target = index + delta
  if (index < 0 || target < 0 || target >= blocks.length) return blocks
  const next = [...blocks]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

/** Есть ли в статье хоть что-то, кроме пустых блоков. */
export const hasContent = (blocks: EditorBlock[]): boolean =>
  blocks.some((b) => (b.type === 'image' ? true : b.text.trim() !== ''))

/** Готовит содержимое для отправки: JSON блоков и список новых файлов (картинка ссылается на файл по номеру). */
export const serializeArticle = (blocks: EditorBlock[]): { content: string; images: File[] } => {
  const images: File[] = []
  const content = blocks.flatMap((b): Record<string, unknown>[] => {
    if (b.type === 'image') {
      const caption = b.caption.trim()
      if (b.file) {
        images.push(b.file)
        return [{ type: 'image', file: images.length - 1, caption }]
      }
      return b.src ? [{ type: 'image', src: b.src, caption }] : []
    }
    if (b.type === 'list') {
      const items = b.text.split('\n').map((line) => line.trim())
      return [{ type: 'list', items: items.filter(Boolean) }]
    }
    return [{ type: b.type, text: b.text }]
  })
  return { content: JSON.stringify(content), images }
}

/** Превращает сохранённые блоки обратно в блоки редактора (для правки статьи). */
export const fromStored = (content: string, imageUrl: (path: string) => string): EditorBlock[] => {
  let raw: StoredBlock[] = []
  try {
    raw = JSON.parse(content) as StoredBlock[]
  } catch {
    return []
  }
  return raw.map((b, index): EditorBlock => {
    const id = index + 1
    if (b.type === 'image') return { id, type: 'image', src: b.src, caption: b.caption, preview: imageUrl(b.src) }
    if (b.type === 'list') return { id, type: 'list', text: b.items.join('\n') }
    return { id, type: b.type, text: b.text }
  })
}

/** Время чтения в минутах: около 180 слов в минуту, не меньше минуты. */
export const readingMinutes = (blocks: StoredBlock[]): number => {
  const words = blocks.reduce((sum, b) => {
    const text = b.type === 'image' ? b.caption : b.type === 'list' ? b.items.join(' ') : b.text
    return sum + (text.trim() ? text.trim().split(/\s+/).length : 0)
  }, 0)
  return Math.max(1, Math.round(words / 180))
}

/** Разбирает содержимое статьи с сервера; при сбое возвращает пустой список. */
export const parseStored = (content: string): StoredBlock[] => {
  try {
    const parsed: unknown = JSON.parse(content)
    return Array.isArray(parsed) ? (parsed as StoredBlock[]) : []
  } catch {
    return []
  }
}

/** Проверка выбранной картинки: тип и размер. Пустая строка — всё в порядке. */
export const validateImage = (file: File): string => {
  if (!file.type.startsWith('image/')) return `«${file.name}» — не картинка`
  if (file.size > MAX_IMAGE_BYTES) return `«${file.name}» больше ${MAX_IMAGE_BYTES / 1024 / 1024} МБ`
  return ''
}
