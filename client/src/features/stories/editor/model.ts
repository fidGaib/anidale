/** Холст истории: все координаты хранятся в долях 0..1, размеры — в пикселях холста 1080×1920. */
export const STORY_W = 1080
export const STORY_H = 1920

export interface Adjust {
  /** Все значения в процентах, 100 — без изменений. */
  brightness: number
  contrast: number
  saturate: number
}
export const NO_ADJUST: Adjust = { brightness: 100, contrast: 100, saturate: 100 }

export interface FilterPreset {
  id: string
  name: string
  css: string
}
export const FILTERS: FilterPreset[] = [
  { id: 'none', name: 'Без фильтра', css: '' },
  { id: 'bw', name: 'Ч/б', css: 'grayscale(1)' },
  { id: 'sepia', name: 'Сепия', css: 'sepia(0.85)' },
  { id: 'warm', name: 'Тёплый', css: 'sepia(0.3) saturate(1.3) brightness(1.03)' },
  { id: 'cool', name: 'Холодный', css: 'hue-rotate(-18deg) saturate(1.15) brightness(1.02)' },
  { id: 'fade', name: 'Выцветший', css: 'contrast(0.85) brightness(1.12) saturate(0.8)' },
  { id: 'vivid', name: 'Яркий', css: 'saturate(1.7) contrast(1.1)' },
]

/** Градиенты для историй без фото: [от, до]. */
export const BACKGROUNDS: [string, string][] = [
  ['#ff512f', '#dd2476'],
  ['#4776e6', '#8e54e9'],
  ['#11998e', '#38ef7d'],
  ['#f7971e', '#ffd200'],
  ['#232526', '#414345'],
  ['#00c6ff', '#0072ff'],
  ['#ee9ca7', '#ffdde1'],
  ['#1d2b64', '#f8cdda'],
]

export const COLORS = ['#ffffff', '#000000', '#ff3b30', '#ff9500', '#ffd60a', '#34c759', '#0a84ff', '#bf5af2']

/** CSS-фильтр холста: пресет и ручная цветокоррекция вместе. */
export const filterCss = (presetId: string, adjust: Adjust): string => {
  const parts: string[] = []
  const preset = FILTERS.find((f) => f.id === presetId)
  if (preset?.css) parts.push(preset.css)
  if (adjust.brightness !== 100) parts.push(`brightness(${adjust.brightness / 100})`)
  if (adjust.contrast !== 100) parts.push(`contrast(${adjust.contrast / 100})`)
  if (adjust.saturate !== 100) parts.push(`saturate(${adjust.saturate / 100})`)
  return parts.join(' ') || 'none'
}

interface ItemBase {
  id: number
  /** Центр элемента, доли холста. */
  x: number
  y: number
  /** Размер шрифта / смайлика в px холста. */
  size: number
}
export interface TextItem extends ItemBase {
  kind: 'text'
  text: string
  color: string
}
export interface StickerItem extends ItemBase {
  kind: 'sticker'
  emoji: string
}
export type Item = TextItem | StickerItem

export interface Stroke {
  color: string
  width: number
  points: [number, number][]
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** Строки текста по переводам строки. */
export const textLines = (text: string): string[] => text.split('\n')

/** Половина ширины и высоты элемента в долях холста (приблизительно: для попадания курсором). */
export const itemHalfExtent = (item: Item): { w: number; h: number } => {
  if (item.kind === 'sticker') return { w: item.size / 2 / STORY_W, h: item.size / 2 / STORY_H }
  const lines = textLines(item.text)
  const longest = Math.max(1, ...lines.map((line) => line.length))
  return {
    w: (longest * item.size * 0.55) / 2 / STORY_W,
    h: (lines.length * item.size * 1.2) / 2 / STORY_H,
  }
}

/** Верхний (последний добавленный) элемент под точкой или null. */
export const hitItem = (items: Item[], x: number, y: number): Item | null => {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]
    const { w, h } = itemHalfExtent(item)
    if (Math.abs(x - item.x) <= w && Math.abs(y - item.y) <= h) return item
  }
  return null
}

export const moveItem = (items: Item[], id: number, x: number, y: number): Item[] =>
  items.map((item) => (item.id === id ? { ...item, x: clamp01(x), y: clamp01(y) } : item))

export const patchItem = (
  items: Item[],
  id: number,
  patch: Partial<Omit<TextItem, 'kind'>> | { emoji: string },
): Item[] => items.map((item) => (item.id === id ? ({ ...item, ...patch } as Item) : item))

export const removeItem = (items: Item[], id: number): Item[] => items.filter((item) => item.id !== id)

/** Новый id: больше любого существующего. */
export const nextId = (items: Item[]): number => items.reduce((max, item) => Math.max(max, item.id), 0) + 1

export const newText = (items: Item[], text = 'Текст'): TextItem => ({
  kind: 'text',
  id: nextId(items),
  text,
  color: '#ffffff',
  size: 96,
  x: 0.5,
  y: 0.5,
})

export const newSticker = (items: Item[], emoji: string): StickerItem => ({
  kind: 'sticker',
  id: nextId(items),
  emoji,
  size: 220,
  x: 0.5,
  y: 0.5,
})

/** Историю можно публиковать, когда есть основа (фото или фон) и, для фона, хоть что-то на нём. */
export const canPublish = (hasPhoto: boolean, hasBackground: boolean, items: Item[], strokes: Stroke[]): boolean => {
  if (hasPhoto) return true
  return hasBackground && (items.some((i) => i.kind !== 'text' || i.text.trim() !== '') || strokes.length > 0)
}
