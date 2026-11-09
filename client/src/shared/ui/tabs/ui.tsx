import cl from './ui.module.css'

export interface TabItem<T extends string> {
  id: T
  title: string
  /** Число-значок (например, заявок). Ноль не показывается. */
  badge?: number
  /** false — вкладка скрыта. */
  show?: boolean
}

interface Props<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (id: T) => void
  /** Рисовать вкладки в карточке `playground`. */
  card?: boolean
  /** Дополнительный класс контейнера (например, чтобы убрать нижний отступ). */
  className?: string
}

/** Единые вкладки сайта: подчёркнутая активная, значок со счётчиком. */
export const Tabs = <T extends string>({ items, value, onChange, card = false, className = '' }: Props<T>) => (
  <nav className={`${card ? 'playground' : ''} ${cl.tabs} ${className}`}>
    {items
      .filter((item) => item.show !== false)
      .map((item) => (
        <button
          key={item.id}
          type='button'
          className={`${cl.tab} ${value === item.id ? cl.active : ''}`}
          onClick={() => onChange(item.id)}
        >
          {item.title}
          {!!item.badge && <span className={cl.badge}>{item.badge}</span>}
        </button>
      ))}
  </nav>
)
