import { Fragment, useEffect, useRef, useState } from 'react'

import { client } from '@/app/providers/apollo-client'
import { SEARCH_MESSAGES } from '@/shared/graphql/schema'
import { formatDateTime } from '@/shared/lib/time'

import { messageLabel } from './message-label'
import { ChatMessage, REACTIONS, toMessage } from './module'
import cl from './ui.module.css'

const SEARCH_PAGE = 20

/** Подсвечивает совпадения запроса в тексте (без разбора HTML: только split по регулярному выражению). */
const Highlight = ({ text, query }: { text: string; query: string }) => {
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (!escaped) return <>{text}</>
  const parts = text.split(new RegExp(`(${escaped})`, 'i'))
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className={cl.mark}>
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}

interface SearchProps {
  userId: number
  myId: number
  peerLogin: string
  /** Выбрали найденное сообщение: прокрутить к нему. */
  onPick: (id: number) => void
  onClose: () => void
}

/** Поиск по сообщениям открытого диалога. Результаты — новые сверху, подгрузка по кнопке. */
export const SearchPanel = ({ userId, myId, peerLogin, onPick, onClose }: SearchProps) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [more, setMore] = useState(false)
  const [error, setError] = useState('')
  // Номер запроса: ответ на устаревший запрос не должен перезаписать свежий
  const token = useRef(0)

  const run = async (text: string, beforeId?: number) => {
    const mine = ++token.current
    setLoading(true)
    setError('')
    try {
      const { data } = await client.query({
        query: SEARCH_MESSAGES,
        variables: { userId, query: text, beforeId: beforeId ?? null, limit: SEARCH_PAGE },
        fetchPolicy: 'network-only',
      })
      if (mine !== token.current) return
      const found = (data.searchMessages ?? []).map(toMessage)
      setResults((prev) => (beforeId ? [...prev, ...found] : found))
      setMore(found.length === SEARCH_PAGE)
    } catch (e) {
      if (mine === token.current) setError(e instanceof Error ? e.message : 'Не удалось выполнить поиск')
    } finally {
      if (mine === token.current) setLoading(false)
    }
  }

  // Поиск запускается через 300 мс после последнего нажатия клавиши
  useEffect(() => {
    const text = query.trim()
    if (!text) {
      token.current++
      setResults([])
      setMore(false)
      setLoading(false)
      return
    }
    const t = setTimeout(() => void run(text), 300)
    return () => clearTimeout(t)
  }, [query, userId])

  return (
    <div className={cl.searchPanel}>
      <div className={cl.searchRow}>
        <input
          autoFocus
          className={cl.forwardSearch}
          placeholder='Поиск по сообщениям…'
          value={query}
          maxLength={100}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
        />
        <img
          className={cl.chipRemove}
          src='/icons/close.svg'
          alt='Закрыть поиск'
          title='Закрыть поиск'
          onClick={onClose}
        />
      </div>
      {error && <p className={cl.error}>{error}</p>}
      {query.trim() && !loading && results.length === 0 && !error && <p className={cl.hint}>Ничего не найдено</p>}
      {results.length > 0 && (
        <ul className={cl.searchList}>
          {results.map((m) => (
            <li key={m.id} className={cl.searchItem} onClick={() => onPick(m.id)}>
              <div className={cl.searchMeta}>
                <span>{m.senderId === myId ? 'Вы' : peerLogin || 'Собеседник'}</span>
                <span>{formatDateTime(m.date)}</span>
              </div>
              <div className={cl.searchText}>
                <Highlight text={m.text.slice(0, 200)} query={query} />
              </div>
            </li>
          ))}
          {more && (
            <li className={cl.searchMore}>
              <button
                type='button'
                className={cl.linkButton}
                disabled={loading}
                onClick={() => void run(query.trim(), results[results.length - 1].id)}
              >
                {loading ? 'Загрузка…' : 'Показать ещё'}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

interface PinnedProps {
  pinned: ChatMessage[]
  myId: number
  onGo: (id: number) => void
  onUnpin: (id: number) => void
}

/**
 * Полоска закреплённых сообщений. При нескольких закрепах каждый клик по полоске
 * переходит к следующему (по кругу), как в Телеграме. Показывается счётчик «2 из 3».
 */
export const PinnedBar = ({ pinned, myId, onGo, onUnpin }: PinnedProps) => {
  // Начинаем с самого свежего закрепа
  const [index, setIndex] = useState(Math.max(pinned.length - 1, 0))
  const count = pinned.length
  const prevCount = useRef(count)

  useEffect(() => {
    // Добавили закреп: показываем его; убрали: индекс не должен выйти за границы
    setIndex((i) => (count > prevCount.current ? count - 1 : Math.min(Math.max(i, 0), Math.max(count - 1, 0))))
    prevCount.current = count
  }, [count])

  if (count === 0) return null
  const current = pinned[Math.min(index, count - 1)]
  const author = current.senderId === myId ? 'Вы' : ''

  const next = () => {
    onGo(current.id)
    // Следующий клик ведёт к предыдущему по времени закрепа
    setIndex((i) => (i - 1 + count) % count)
  }

  return (
    <div className={cl.pinnedBar}>
      <span>📌</span>
      <div className={cl.pinnedText} title='Перейти к сообщению' onClick={next}>
        {count > 1 && (
          <span className={cl.pinnedCount}>
            Закреплённое {Math.min(index, count - 1) + 1} из {count}
          </span>
        )}
        <span>
          {author ? `${author}: ` : ''}
          {messageLabel(current)}
        </span>
      </div>
      <img
        className={cl.chipRemove}
        src='/icons/close.svg'
        alt='Открепить'
        title='Открепить'
        onClick={() => onUnpin(current.id)}
      />
    </div>
  )
}

/** Быстрые реакции над пунктами контекстного меню. */
export const ReactionBar = ({
  current,
  onPick,
}: {
  /** Моя реакция на это сообщение: подсвечивается, повторный клик снимает её. */
  current?: string
  onPick: (emoji: string) => void
}) => (
  <div className={cl.reactionBar}>
    {REACTIONS.map((emoji) => (
      <button
        key={emoji}
        type='button'
        className={`${cl.reactionPick} ${emoji === current ? cl.reactionPickActive : ''}`}
        onClick={() => onPick(emoji)}
      >
        {emoji}
      </button>
    ))}
  </div>
)
