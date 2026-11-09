import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { assetUrl } from '@/shared/config'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'

import cl from './ui.module.css'

export interface ContextMenuItem {
  label: string
  onClick: () => void
  /** Опасное действие (удаление): красный цвет. */
  danger?: boolean
  /** Скрыть пункт, не убирая его из списка (удобно строить меню по условиям). */
  hidden?: boolean
  svg: string
}

interface Props {
  /** Координаты клика в окне браузера. */
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
  /** Произвольный блок над пунктами (например, строка быстрых реакций). Закрытие меню — через onClose. */
  header?: ReactNode
}

/**
 * Контекстное меню, которое открывается в точке клика (правая кнопка мыши или долгое нажатие).
 * Закрывается кликом вне меню, Escape, прокруткой и изменением размера окна.
 */
export const ContextMenu = ({ x, y, items, onClose, header }: Props) => {
  const ref = useRef<HTMLUListElement>(null)
  const [position, setPosition] = useState({ left: x, top: y })

  // Меню не должно выходить за край окна: после измерения сдвигаем его внутрь
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    setPosition({
      left: Math.max(4, Math.min(x, window.innerWidth - width - 4)),
      top: Math.max(4, Math.min(y, window.innerHeight - height - 4)),
    })
  }, [x, y])

  useEffect(() => {
    const close = () => onClose()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    // Клик в другом месте закрывает меню; клик по самому пункту обрабатывается ниже
    window.addEventListener('mousedown', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const visible = items.filter((item) => !item.hidden)
  if (visible.length === 0) return null
  return (
    <ul
      ref={ref}
      className={`playground ${cl.menu}`}
      style={{ left: position.left, top: position.top }}
      // mousedown внутри меню не должен его закрывать раньше, чем сработает click по пункту
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {header && <li className={cl.header}>{header}</li>}
      {visible.map((item) => (
        <li
          key={item.label}
          className={`${cl.item} ${item.danger ? cl.danger : ''}`}
          onClick={() => {
            onClose()
            item.onClick()
          }}
        >
          <ImageLoading className={cl.icon} src={assetUrl(item.svg)} />
          <div className={cl.text}>{item.label}</div>
        </li>
      ))}
    </ul>
  )
}
