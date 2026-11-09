import { createGraphQLError } from 'graphql-yoga'

/** Предельные размеры статьи: защита от гигантских запросов и мусора в базе. */
export const ARTICLE_LIMITS = {
  title: 120,
  blocks: 300,
  text: 5000,
  listItems: 50,
  listItem: 500,
  caption: 200,
  totalText: 60000,
  images: 30,
  excerpt: 160,
} as const

export type TextKind = 'p' | 'h' | 'quote'

/** Блок статьи в том виде, в котором он хранится в базе. */
export type Block =
  | { type: TextKind; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'image'; src: string; small: string; caption: string }

/** Картинка статьи, уже лежащая в хранилище. */
export interface StoredImage {
  src: string
  small: string
}

/** Блок после проверки: картинка либо ещё не сохранена (номер файла в запросе), либо уже есть в статье. */
export type ParsedBlock =
  | { type: TextKind; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'image'; file: number; caption: string }
  | { type: 'image'; src: string; small: string; caption: string }

const fail = (message: string): never => {
  throw createGraphQLError(message)
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const cleanText = (value: unknown, max: number, tooLong: string): string => {
  if (typeof value !== 'string') return ''
  const text = value.replace(/\r\n?/g, '\n').trim()
  if (text.length > max) fail(tooLong)
  return text
}

/** Заголовок статьи: обязателен, не длиннее предела. */
export const cleanTitle = (value: unknown): string => {
  const title = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  if (!title) fail('Введите заголовок статьи')
  if (title.length > ARTICLE_LIMITS.title) fail(`Заголовок длиннее ${ARTICLE_LIMITS.title} символов`)
  return title
}

/**
 * Проверяет содержимое статьи, пришедшее от клиента JSON-строкой, и приводит его к единому виду.
 * Пустые абзацы и списки отбрасываются. Картинка ссылается либо на загруженный файл по номеру,
 * либо на картинку, которая уже есть в этой статье (при редактировании).
 */
export const parseContent = (json: string, fileCount: number, existing: StoredImage[] = []): ParsedBlock[] => {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return fail('Не удалось прочитать содержимое статьи')
  }
  if (!Array.isArray(raw)) return fail('Не удалось прочитать содержимое статьи')
  if (raw.length > ARTICLE_LIMITS.blocks) fail('Статья слишком длинная')

  const blocks: ParsedBlock[] = []
  const usedFiles = new Set<number>()
  let totalText = 0
  let images = 0

  for (const item of raw) {
    if (!isRecord(item)) return fail('Не удалось прочитать содержимое статьи')
    switch (item.type) {
      case 'p':
      case 'h':
      case 'quote': {
        const text = cleanText(item.text, ARTICLE_LIMITS.text, 'Абзац слишком длинный')
        totalText += text.length
        if (text) blocks.push({ type: item.type, text })
        break
      }
      case 'list': {
        if (!Array.isArray(item.items)) return fail('Не удалось прочитать содержимое статьи')
        if (item.items.length > ARTICLE_LIMITS.listItems) fail('В списке слишком много пунктов')
        const items = item.items
          .map((entry) => cleanText(entry, ARTICLE_LIMITS.listItem, 'Пункт списка слишком длинный'))
          .filter(Boolean)
        totalText += items.reduce((sum, entry) => sum + entry.length, 0)
        if (items.length) blocks.push({ type: 'list', items })
        break
      }
      case 'image': {
        images += 1
        if (images > ARTICLE_LIMITS.images) fail(`В статье не больше ${ARTICLE_LIMITS.images} картинок`)
        const caption = cleanText(item.caption, ARTICLE_LIMITS.caption, 'Подпись к картинке слишком длинная')
        if (typeof item.file === 'number') {
          const file = item.file
          if (!Number.isInteger(file) || file < 0 || file >= fileCount)
            fail('Картинка не найдена среди загруженных файлов')
          if (usedFiles.has(file)) fail('Один файл нельзя использовать дважды')
          usedFiles.add(file)
          blocks.push({ type: 'image', file, caption })
        } else {
          const known = existing.find((image) => image.src === item.src)
          if (!known) return fail('Картинка не найдена в статье')
          blocks.push({ type: 'image', src: known.src, small: known.small, caption })
        }
        break
      }
      default:
        return fail('Неизвестный тип блока статьи')
    }
  }

  if (totalText > ARTICLE_LIMITS.totalText) fail('Статья слишком длинная')
  if (blocks.length === 0) fail('Статья пуста')
  return blocks
}

/** Краткое начало статьи для карточки на стене: первый абзац (или заголовок), без переносов строк. */
export const makeExcerpt = (blocks: Block[]): string => {
  const first = blocks.find((block) => block.type === 'p') ?? blocks.find((block) => block.type === 'quote')
  const text = first && 'text' in first ? first.text : ''
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > ARTICLE_LIMITS.excerpt ? `${flat.slice(0, ARTICLE_LIMITS.excerpt - 1).trimEnd()}…` : flat
}

/** Номера файлов, которые статья использует (по порядку блоков). */
export const usedFileIndexes = (blocks: ParsedBlock[]): number[] =>
  blocks.flatMap((block) => (block.type === 'image' && 'file' in block ? [block.file] : []))

/** Картинки, которые есть в сохранённом содержимом (для очистки хранилища). */
export const storedImages = (content: string): StoredImage[] => {
  try {
    const blocks = JSON.parse(content) as Block[]
    return blocks.flatMap((block) => (block.type === 'image' ? [{ src: block.src, small: block.small }] : []))
  } catch {
    return []
  }
}

/** Все файлы статьи (обложка и картинки в тексте) для удаления из хранилища. */
export const articleFiles = (article: {
  cover: string
  coverSmall: string
  content: string
}): { medium: string; small: string }[] => [
  ...(article.cover ? [{ medium: article.cover, small: article.coverSmall }] : []),
  ...storedImages(article.content).map((image) => ({ medium: image.src, small: image.small })),
]
