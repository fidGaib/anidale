import { DragEvent, PointerEvent, useEffect, useRef, useState } from 'react'

import { useRefreshStore } from '@/app/providers/routes/model'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { Dialog } from '@/shared/ui/dialog'

import cl from './editor.module.css'
import {
  Adjust,
  Item,
  NO_ADJUST,
  Stroke,
  TextItem,
  canPublish,
  filterCss,
  hitItem,
  moveItem,
  newSticker,
  newText,
  patchItem,
  removeItem,
} from './model'
import { drawStory, exportStory } from './render'
import { TOOLS, Tool, ToolPanel } from './tools'

interface Props {
  onClose: () => void
  /** Публикует готовую картинку; true — получилось. */
  onPublish: (image: File) => Promise<boolean>
  publishing: boolean
}

type Gesture = { kind: 'drag'; id: number; dx: number; dy: number } | { kind: 'draw' } | null

/** Редактор истории: фото или цветной фон, надписи, стикеры, рисунок, фильтры и цветокоррекция. */
export const StoryEditor = ({ onClose, onPublish, publishing }: Props) => {
  const me = useRefreshStore((s) => s.refreshData)
  const avatar = useSrcAvatar(me.avatar || '')
  const canvas = useRef<HTMLCanvasElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const [photo, setPhoto] = useState<ImageBitmap | null>(null)
  const [bg, setBg] = useState<number | null>(null)
  const [preset, setPreset] = useState('none')
  const [adjust, setAdjust] = useState<Adjust>(NO_ADJUST)
  const [items, setItems] = useState<Item[]>([])
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [tool, setTool] = useState<Tool | null>(null)
  const [brush, setBrush] = useState({ color: '#ffffff', width: 16 })
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  // Что делает указатель прямо сейчас: тянет элемент или рисует линию
  const gesture = useRef<Gesture>(null)

  const hasBase = photo !== null || bg !== null
  const selected = items.find((item) => item.id === selectedId) ?? null
  const filter = filterCss(preset, adjust)
  const ready = canPublish(photo !== null, bg !== null, items, strokes)

  useEffect(() => {
    const el = canvas.current
    if (el && hasBase) drawStory(el, { photo, bg, filter, items, strokes, selectedId })
  }, [photo, bg, filter, items, strokes, selectedId, hasBase])

  // Освобождаем память, занятую декодированной картинкой
  useEffect(() => () => photo?.close(), [photo])

  const loadPhoto = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('Нужна картинка')
    try {
      setPhoto(await createImageBitmap(file))
      setError('')
    } catch {
      setError('Не удалось открыть изображение')
    }
  }

  const point = (e: PointerEvent): [number, number] => {
    const rect = e.currentTarget.getBoundingClientRect()
    return [(e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height]
  }

  const onDown = (e: PointerEvent) => {
    const [x, y] = point(e)
    e.currentTarget.setPointerCapture(e.pointerId)
    if (tool === 'brush') {
      gesture.current = { kind: 'draw' }
      setSelectedId(null)
      setStrokes((all) => [...all, { color: brush.color, width: brush.width, points: [[x, y]] }])
      return
    }
    const hit = hitItem(items, x, y)
    setSelectedId(hit?.id ?? null)
    if (hit) {
      gesture.current = { kind: 'drag', id: hit.id, dx: hit.x - x, dy: hit.y - y }
      setTool(hit.kind === 'text' ? 'text' : 'stickers')
    }
  }

  const onMove = (e: PointerEvent) => {
    const current = gesture.current
    if (!current) return
    const [x, y] = point(e)
    if (current.kind === 'drag') {
      setItems((all) => moveItem(all, current.id, x + current.dx, y + current.dy))
      return
    }
    setStrokes((all) => {
      const last = all[all.length - 1]
      if (!last) return all
      return [...all.slice(0, -1), { ...last, points: [...last.points, [x, y]] }]
    })
  }

  const addText = () => {
    const item = newText(items)
    setItems([...items, item])
    setSelectedId(item.id)
  }
  const addSticker = (emoji: string) => {
    const item = newSticker(items, emoji)
    setItems([...items, item])
    setSelectedId(item.id)
  }
  const patchSelected = (patch: Partial<Omit<TextItem, 'kind'>>) => {
    if (selectedId !== null) setItems((all) => patchItem(all, selectedId, patch))
  }
  const removeSelected = () => {
    if (selectedId === null) return
    setItems((all) => removeItem(all, selectedId))
    setSelectedId(null)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    void loadPhoto(e.dataTransfer.files[0])
  }

  const publish = async () => {
    if (publishing || !ready) return
    setError('')
    try {
      const image = await exportStory({ photo, bg, filter, items, strokes, selectedId: null })
      if (await onPublish(image)) onClose()
      else setError('Не удалось опубликовать историю')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось опубликовать историю')
    }
  }

  const chooseTool = (next: Tool) => setTool((current) => (current === next ? null : next))

  return (
    <Dialog bare title='Новая история' width={900} onClose={onClose} busy={publishing}>
      <input
        ref={fileInput}
        type='file'
        accept='image/*'
        hidden
        onChange={(e) => {
          void loadPhoto(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <div className={cl.editor}>
        <div className={cl.stage}>
          {hasBase ? (
            <canvas
              ref={canvas}
              width={540}
              height={960}
              className={`${cl.canvas} ${tool === 'brush' ? cl.canvasBrush : ''}`}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={() => (gesture.current = null)}
              onPointerCancel={() => (gesture.current = null)}
            />
          ) : (
            <div
              className={`${cl.drop} ${dragOver ? cl.dropActive : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <span className={cl.dropIcon}>⭡</span>
              <span>Перетащите сюда фото</span>
              <button type='button' className={cl.primary} onClick={() => fileInput.current?.click()}>
                Выбрать файл
              </button>
              <button
                type='button'
                className={cl.link}
                onClick={() => {
                  setBg(0)
                  setTool('bg')
                }}
              >
                Выбрать фон
              </button>
            </div>
          )}
        </div>

        <div className={cl.side}>
          <button type='button' className={cl.close} aria-label='Закрыть' disabled={publishing} onClick={onClose}>
            ×
          </button>
          <div className={cl.tools}>
            {TOOLS.map((t) => (
              <div key={t.id}>
                <button
                  type='button'
                  disabled={!hasBase}
                  className={`${cl.tool} ${tool === t.id ? cl.toolActive : ''}`}
                  onClick={() => chooseTool(t.id)}
                >
                  <span className={cl.toolIcon}>{t.icon}</span>
                  {t.name}
                </button>
                {tool === t.id && (
                  <ToolPanel
                    tool={t.id}
                    hasPhoto={photo !== null}
                    selected={selected}
                    onAddText={addText}
                    onPatchSelected={patchSelected}
                    onRemoveSelected={removeSelected}
                    onAddSticker={addSticker}
                    brush={brush}
                    onBrush={setBrush}
                    onUndoStroke={() => setStrokes((all) => all.slice(0, -1))}
                    onClearStrokes={() => setStrokes([])}
                    strokeCount={strokes.length}
                    bg={bg}
                    onBg={(index) => {
                      setBg(index)
                      setPhoto(null)
                    }}
                    onPickPhoto={() => fileInput.current?.click()}
                    preset={preset}
                    onPreset={setPreset}
                    adjust={adjust}
                    onAdjust={setAdjust}
                  />
                )}
              </div>
            ))}
          </div>

          <div className={cl.bottom}>
            <div className={cl.author}>
              <img className={cl.authorAvatar} src={avatar} alt='' />
              <span>От {me.login}</span>
              <span className={cl.ttl}>· исчезнет через 24 часа</span>
            </div>
            {error && <p className={cl.error}>{error}</p>}
            <button type='button' className={cl.publish} disabled={publishing || !ready} onClick={() => void publish()}>
              {publishing ? 'Загрузка…' : 'Опубликовать'}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
