import { ReactNode, useEffect } from 'react'

import cl from './ui.module.css'

interface Props {
  title?: string
  /** Закрытие по крестику, Escape и клику по затемнению. */
  onClose: () => void
  /** Пока идёт загрузка, закрыть окно нельзя. */
  busy?: boolean
  /** Ширина окна в px. */
  width?: number
  /** Блок справа в шапке, рядом с крестиком. */
  headerExtra?: ReactNode
  children: ReactNode
  /** Нижняя полоса: кнопка публикации и подсказки. */
  footer?: ReactNode
  /** Без шапки и подвала: окно целиком рисует содержимое (редактор историй). */
  bare?: boolean
}

/** Модальное окно по центру экрана с затемнением. */
export const Dialog = ({ title, onClose, busy = false, width = 480, headerExtra, children, footer, bare }: Props) => {
  useEffect(() => {
    // Перехватываем Escape раньше остальных: закрыться должно только верхнее окно
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      if (!busy) onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose, busy])

  return (
    <div className={cl.overlay} onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div
        className={`playground ${cl.dialog}`}
        style={{ width: `min(${width}px, 96vw)` }}
        role='dialog'
        aria-label={title}
      >
        {!bare && (
          <div className={cl.header}>
            <span className={cl.title}>{title}</span>
            <div className={cl.headerExtra}>
              {headerExtra}
              <button type='button' className={cl.close} aria-label='Закрыть' disabled={busy} onClick={onClose}>
                ×
              </button>
            </div>
          </div>
        )}
        <div className={bare ? cl.bare : cl.body}>{children}</div>
        {!bare && footer && <div className={cl.footer}>{footer}</div>}
      </div>
    </div>
  )
}
