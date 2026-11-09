import cl from './editor.module.css'
import { Adjust, BACKGROUNDS, COLORS, FILTERS, Item, NO_ADJUST, TextItem } from './model'

export type Tool = 'text' | 'stickers' | 'brush' | 'bg' | 'filters' | 'adjust'

export const TOOLS: { id: Tool; icon: string; name: string }[] = [
  { id: 'text', icon: 'Aa', name: 'Текст' },
  { id: 'stickers', icon: '🙂', name: 'Стикеры' },
  { id: 'brush', icon: '🖌', name: 'Кисть' },
  { id: 'bg', icon: '🎨', name: 'Фон' },
  { id: 'filters', icon: '◐', name: 'Фильтры' },
  { id: 'adjust', icon: '☼', name: 'Цветокоррекция' },
]

const STICKERS =
  '😀 😂 😍 😎 🥳 😭 😡 🤔 👍 👏 🙏 💪 ❤️ 🔥 ✨ ⭐ 🎉 🎁 💯 🌈 ☀️ 🌙 ❄️ 🌸 🍕 🍔 🍰 ☕ 🎵 📷 🚗 ✈️ 🐱 🐶 🦊 🐼 ⚽ 🎮 💡 📍'.split(
    ' ',
  )

export const Swatches = ({ value, onPick }: { value: string; onPick: (color: string) => void }) => (
  <div className={cl.swatches}>
    {COLORS.map((color) => (
      <button
        key={color}
        type='button'
        aria-label={color}
        className={`${cl.swatch} ${value === color ? cl.swatchActive : ''}`}
        style={{ background: color }}
        onClick={() => onPick(color)}
      />
    ))}
  </div>
)

const Slider = ({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) => (
  <label className={cl.slider}>
    <span>{label}</span>
    <input type='range' min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
  </label>
)

export interface PanelProps {
  tool: Tool
  hasPhoto: boolean
  selected: Item | null
  onAddText: () => void
  onPatchSelected: (patch: Partial<Omit<TextItem, 'kind'>>) => void
  onRemoveSelected: () => void
  onAddSticker: (emoji: string) => void
  brush: { color: string; width: number }
  onBrush: (brush: { color: string; width: number }) => void
  onUndoStroke: () => void
  onClearStrokes: () => void
  strokeCount: number
  bg: number | null
  onBg: (index: number) => void
  onPickPhoto: () => void
  preset: string
  onPreset: (id: string) => void
  adjust: Adjust
  onAdjust: (adjust: Adjust) => void
}

/** Настройки выбранного инструмента (раскрываются под списком инструментов). */
export const ToolPanel = (p: PanelProps) => {
  switch (p.tool) {
    case 'text': {
      const text = p.selected?.kind === 'text' ? p.selected : null
      return (
        <div className={cl.panel}>
          <button type='button' className={cl.panelButton} onClick={p.onAddText}>
            ＋ Добавить текст
          </button>
          {text && (
            <>
              <textarea
                className={cl.textInput}
                value={text.text}
                maxLength={120}
                rows={2}
                onChange={(e) => p.onPatchSelected({ text: e.target.value })}
              />
              <Swatches value={text.color} onPick={(color) => p.onPatchSelected({ color })} />
              <Slider
                label='Размер'
                value={text.size}
                min={40}
                max={220}
                onChange={(size) => p.onPatchSelected({ size })}
              />
              <button type='button' className={cl.panelDanger} onClick={p.onRemoveSelected}>
                Удалить текст
              </button>
            </>
          )}
          <p className={cl.panelHint}>Перетаскивайте надписи по картинке.</p>
        </div>
      )
    }
    case 'stickers':
      return (
        <div className={cl.panel}>
          <div className={cl.stickerGrid}>
            {STICKERS.map((emoji) => (
              <button key={emoji} type='button' className={cl.sticker} onClick={() => p.onAddSticker(emoji)}>
                {emoji}
              </button>
            ))}
          </div>
          {p.selected?.kind === 'sticker' && (
            <>
              <Slider
                label='Размер'
                value={p.selected.size}
                min={80}
                max={500}
                onChange={(size) => p.onPatchSelected({ size })}
              />
              <button type='button' className={cl.panelDanger} onClick={p.onRemoveSelected}>
                Удалить стикер
              </button>
            </>
          )}
        </div>
      )
    case 'brush':
      return (
        <div className={cl.panel}>
          <Swatches value={p.brush.color} onPick={(color) => p.onBrush({ ...p.brush, color })} />
          <Slider
            label='Толщина'
            value={p.brush.width}
            min={4}
            max={60}
            onChange={(width) => p.onBrush({ ...p.brush, width })}
          />
          <div className={cl.row}>
            <button type='button' className={cl.panelButton} disabled={!p.strokeCount} onClick={p.onUndoStroke}>
              Отменить
            </button>
            <button type='button' className={cl.panelButton} disabled={!p.strokeCount} onClick={p.onClearStrokes}>
              Стереть всё
            </button>
          </div>
          <p className={cl.panelHint}>Рисуйте прямо на картинке.</p>
        </div>
      )
    case 'bg':
      return (
        <div className={cl.panel}>
          <div className={cl.bgGrid}>
            {BACKGROUNDS.map(([from, to], index) => (
              <button
                key={from + to}
                type='button'
                aria-label={`Фон ${index + 1}`}
                className={`${cl.bgItem} ${!p.hasPhoto && p.bg === index ? cl.swatchActive : ''}`}
                style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                onClick={() => p.onBg(index)}
              />
            ))}
          </div>
          <button type='button' className={cl.panelButton} onClick={p.onPickPhoto}>
            {p.hasPhoto ? 'Заменить фото' : 'Выбрать фото'}
          </button>
        </div>
      )
    case 'filters':
      return (
        <div className={cl.panel}>
          <div className={cl.pills}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type='button'
                className={`${cl.pill} ${p.preset === f.id ? cl.pillActive : ''}`}
                onClick={() => p.onPreset(f.id)}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )
    case 'adjust':
      return (
        <div className={cl.panel}>
          <Slider
            label='Яркость'
            value={p.adjust.brightness}
            min={50}
            max={150}
            onChange={(brightness) => p.onAdjust({ ...p.adjust, brightness })}
          />
          <Slider
            label='Контраст'
            value={p.adjust.contrast}
            min={50}
            max={150}
            onChange={(contrast) => p.onAdjust({ ...p.adjust, contrast })}
          />
          <Slider
            label='Насыщенность'
            value={p.adjust.saturate}
            min={0}
            max={200}
            onChange={(saturate) => p.onAdjust({ ...p.adjust, saturate })}
          />
          <button type='button' className={cl.panelButton} onClick={() => p.onAdjust(NO_ADJUST)}>
            Сбросить
          </button>
        </div>
      )
  }
}
