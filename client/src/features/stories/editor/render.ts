import { BACKGROUNDS, Item, STORY_H, STORY_W, Stroke, textLines } from './model'

export interface Scene {
  /** Фото в качестве основы; если его нет — рисуется градиент bg. */
  photo: ImageBitmap | null
  bg: number | null
  /** Готовая строка CSS-фильтра (см. filterCss), действует только на основу. */
  filter: string
  items: Item[]
  strokes: Stroke[]
  /** Выбранный элемент обводится рамкой (только на экране, при экспорте — null). */
  selectedId: number | null
}

const drawBase = (ctx: CanvasRenderingContext2D, scene: Scene) => {
  const { photo } = scene
  if (photo) {
    const cover = Math.max(STORY_W / photo.width, STORY_H / photo.height)
    const contain = Math.min(STORY_W / photo.width, STORY_H / photo.height)
    ctx.save()
    ctx.filter = scene.filter === 'none' ? 'blur(40px)' : `blur(40px) ${scene.filter}`
    // Размытая копия на весь холст, чтобы вокруг фото не было пустых полос
    ctx.drawImage(
      photo,
      (STORY_W - photo.width * cover) / 2,
      (STORY_H - photo.height * cover) / 2,
      photo.width * cover,
      photo.height * cover,
    )
    ctx.restore()
    ctx.save()
    ctx.filter = scene.filter
    ctx.drawImage(
      photo,
      (STORY_W - photo.width * contain) / 2,
      (STORY_H - photo.height * contain) / 2,
      photo.width * contain,
      photo.height * contain,
    )
    ctx.restore()
    return
  }
  const [from, to] = BACKGROUNDS[scene.bg ?? 0] ?? BACKGROUNDS[0]
  const gradient = ctx.createLinearGradient(0, 0, STORY_W, STORY_H)
  gradient.addColorStop(0, from)
  gradient.addColorStop(1, to)
  ctx.save()
  ctx.filter = scene.filter
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, STORY_W, STORY_H)
  ctx.restore()
}

/**
 * Рисует историю целиком. Работает в системе координат 1080×1920 и масштабируется под размер холста,
 * поэтому экранное превью и итоговая картинка выглядят одинаково.
 */
export const drawStory = (canvas: HTMLCanvasElement, scene: Scene) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(canvas.width / STORY_W, 0, 0, canvas.height / STORY_H, 0, 0)
  ctx.clearRect(0, 0, STORY_W, STORY_H)
  drawBase(ctx, scene)

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const stroke of scene.strokes) {
    ctx.strokeStyle = stroke.color
    ctx.fillStyle = stroke.color
    ctx.lineWidth = stroke.width
    const [first, ...rest] = stroke.points
    if (!first) continue
    if (!rest.length) {
      ctx.beginPath()
      ctx.arc(first[0] * STORY_W, first[1] * STORY_H, stroke.width / 2, 0, Math.PI * 2)
      ctx.fill()
      continue
    }
    ctx.beginPath()
    ctx.moveTo(first[0] * STORY_W, first[1] * STORY_H)
    for (const [x, y] of rest) ctx.lineTo(x * STORY_W, y * STORY_H)
    ctx.stroke()
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const item of scene.items) {
    const x = item.x * STORY_W
    const y = item.y * STORY_H
    if (item.kind === 'sticker') {
      ctx.font = `${item.size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`
      ctx.fillText(item.emoji, x, y)
      continue
    }
    ctx.font = `bold ${item.size}px Calibri, "Segoe UI", sans-serif`
    ctx.fillStyle = item.color
    ctx.shadowColor = 'rgba(0,0,0,0.55)'
    ctx.shadowBlur = item.size / 6
    const lines = textLines(item.text)
    const lineHeight = item.size * 1.2
    lines.forEach((line, i) => ctx.fillText(line, x, y + (i - (lines.length - 1) / 2) * lineHeight))
    ctx.shadowBlur = 0
  }

  const selected = scene.items.find((item) => item.id === scene.selectedId)
  if (selected) {
    const lines = selected.kind === 'text' ? textLines(selected.text) : ['']
    if (selected.kind === 'text') ctx.font = `bold ${selected.size}px Calibri, "Segoe UI", sans-serif`
    const widest =
      selected.kind === 'text'
        ? Math.max(...lines.map((line) => ctx.measureText(line).width), selected.size)
        : selected.size
    const height = selected.kind === 'text' ? lines.length * selected.size * 1.2 : selected.size * 1.2
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 4
    ctx.setLineDash([16, 12])
    ctx.strokeRect(
      selected.x * STORY_W - widest / 2 - 16,
      selected.y * STORY_H - height / 2 - 8,
      widest + 32,
      height + 16,
    )
    ctx.setLineDash([])
  }
}

/** Итоговая картинка истории в полном размере (JPEG). */
export const exportStory = (scene: Scene): Promise<File> =>
  new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = STORY_W
    canvas.height = STORY_H
    drawStory(canvas, { ...scene, selectedId: null })
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(new File([blob], 'story.jpg', { type: 'image/jpeg' }))
          : reject(new Error('Не удалось собрать картинку')),
      'image/jpeg',
      0.92,
    )
  })
