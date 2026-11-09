import { useEffect, useRef, useState } from 'react'

import type { WallKind } from '@/features/profile/types'

import cl from './wall-tabs.module.css'

/** Через сколько после последнего нажатия клавиши запускается поиск. */
export const SEARCH_DELAY_MS = 300

interface Props {
  /** Архив виден только владельцу профиля. */
  isOwn: boolean
  kind: WallKind
  onKind: (kind: WallKind) => void
  search: string
  onSearch: (value: string) => void
}

/** Вкладки стены профиля («Главная», «Мои посты», «Архив постов») и поиск по постам. */
export const WallTabs = ({ isOwn, kind, onKind, search, onSearch }: Props) => {
  const tabs: { kind: WallKind; title: string }[] = [
    { kind: 'all', title: 'Главная' },
    { kind: 'own', title: 'Мои посты' },
    ...(isOwn ? [{ kind: 'archive' as const, title: 'Архив постов' }] : []),
  ]

  // Поле поиска раскрывается по клику на лупу; текст уходит наружу с задержкой, чтобы не искать на каждую букву
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(search)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setText(search)
    if (search) setOpen(true)
  }, [search])

  useEffect(() => {
    if (text === search) return
    const timer = setTimeout(() => onSearch(text), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [text, search, onSearch])

  useEffect(() => {
    if (open) input.current?.focus()
  }, [open])

  const close = () => {
    setOpen(false)
    setText('')
    onSearch('')
  }

  return (
    <div className={`playground ${cl.bar}`}>
      <div className={cl.tabs} role='tablist'>
        {tabs.map((tab) => (
          <button
            key={tab.kind}
            type='button'
            role='tab'
            aria-selected={kind === tab.kind}
            className={`${cl.tab} ${kind === tab.kind ? cl.tabActive : ''}`}
            onClick={() => onKind(tab.kind)}
          >
            {tab.title}
          </button>
        ))}
      </div>

      {open ? (
        <div className={cl.searchBox}>
          <input
            ref={input}
            className={cl.searchInput}
            placeholder='Поиск по записям'
            maxLength={100}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && close()}
          />
          <button type='button' className={cl.iconButton} title='Закрыть поиск' onClick={close}>
            ✕
          </button>
        </div>
      ) : (
        <button type='button' className={cl.iconButton} title='Поиск по записям' onClick={() => setOpen(true)}>
          <img className={cl.searchIcon} src='/icons/search.svg' alt='Поиск' />
        </button>
      )}
    </div>
  )
}
