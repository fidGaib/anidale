import { KeyboardEvent, MutableRefObject } from 'react'

import cl from './editor.module.css'
import { EditorBlock } from './model'

interface Props {
  block: EditorBlock
  first: boolean
  last: boolean
  /** Сюда кладётся поле ввода блока: так редактор переводит на него фокус. */
  fieldRefs: MutableRefObject<Record<number, HTMLTextAreaElement | null>>
  onChange: (patch: Partial<EditorBlock>) => void
  onRemove: () => void
  onMove: (delta: -1 | 1) => void
  /** Enter в абзаце: перейти к новому абзацу ниже. */
  onEnter: () => void
  /** Backspace в пустом блоке: удалить его и вернуться к предыдущему. */
  onBackspaceEmpty: () => void
}

const PLACEHOLDERS = {
  p: 'Напишите что-нибудь…',
  h: 'Заголовок раздела',
  quote: 'Цитата',
  list: 'Каждый пункт с новой строки',
} as const

const resize = (el: HTMLTextAreaElement) => {
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

/** Один блок статьи в редакторе: поле ввода или картинка с подписью и кнопками «выше / ниже / удалить». */
export const EditorBlockView = ({
  block,
  first,
  last,
  fieldRefs,
  onChange,
  onRemove,
  onMove,
  onEnter,
  onBackspaceEmpty,
}: Props) => {
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (block.type === 'image') return
    if (e.key === 'Enter' && !e.shiftKey && block.type !== 'list') {
      e.preventDefault()
      onEnter()
    } else if (e.key === 'Backspace' && block.text === '') {
      e.preventDefault()
      onBackspaceEmpty()
    }
  }

  return (
    <div className={cl.block}>
      <div className={cl.controls}>
        <button type='button' title='Выше' disabled={first} onClick={() => onMove(-1)}>
          ↑
        </button>
        <button type='button' title='Ниже' disabled={last} onClick={() => onMove(1)}>
          ↓
        </button>
        <button type='button' title='Удалить блок' onClick={onRemove}>
          ×
        </button>
      </div>

      {block.type === 'image' ? (
        <figure className={cl.figure}>
          <img src={block.preview} alt='' />
          <input
            className={cl.caption}
            value={block.caption}
            maxLength={200}
            placeholder='Подпись к картинке'
            onChange={(e) => onChange({ caption: e.target.value })}
          />
        </figure>
      ) : (
        <textarea
          ref={(el) => {
            fieldRefs.current[block.id] = el
            if (el) resize(el)
          }}
          className={`${cl.field} ${cl[`field_${block.type}`]}`}
          rows={1}
          value={block.text}
          maxLength={5000}
          placeholder={PLACEHOLDERS[block.type]}
          onKeyDown={onKeyDown}
          onChange={(e) => {
            resize(e.currentTarget)
            onChange({ text: e.target.value })
          }}
        />
      )}
    </div>
  )
}
