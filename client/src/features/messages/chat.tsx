import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { assetUrl } from '@/shared/config'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSocket } from '@/shared/hooks/useSocket'
import { copyText } from '@/shared/lib/clipboard'
import { dayKey, formatDateTime, formatDay, formatLastSeen } from '@/shared/lib/time'
import ButtonUI from '@/shared/ui/button'
import { ContextMenu, ContextMenuItem } from '@/shared/ui/context-menu'

import { Avatar } from './avatar'
import { PinnedBar, ReactionBar, SearchPanel } from './chat-parts'
import { Composer } from './composer'
import { useDeleteDialog } from './delete-dialog'
import { ForwardModal } from './forward-modal'
import { MessageBubble } from './message-bubble'
import { ChatMessage, useMessagesStore } from './module'
import cl from './ui.module.css'

/** Открытый диалог: шапка, история с подгрузкой и поле ввода. */
export const Chat = ({ userId }: { userId: number }) => {
  const myId = useRefreshStore((s) => s.refreshData.id) ?? 0
  const openChat = useMessagesStore((s) => s.openChat)
  const closeChat = useMessagesStore((s) => s.closeChat)
  const loadOlder = useMessagesStore((s) => s.loadOlder)
  const messages = useMessagesStore((s) => s.messages)
  const activeUser = useMessagesStore((s) => s.activeUser)
  const hasMore = useMessagesStore((s) => s.hasMore)
  const loading = useMessagesStore((s) => s.loading)
  const error = useMessagesStore((s) => s.error)
  const pinnedList = useMessagesStore((s) => s.pinnedList)
  const react = useMessagesStore((s) => s.react)
  const jumpTo = useMessagesStore((s) => s.jumpTo)
  const backToLatest = useMessagesStore((s) => s.backToLatest)
  const detached = useMessagesStore((s) => s.detached)
  const missedWhileDetached = useMessagesStore((s) => s.missedWhileDetached)
  const firstUnreadId = useMessagesStore((s) => s.firstUnreadId)
  const peerPresence = useMessagesStore((s) => s.peerPresence)
  const peerRead = useMessagesStore((s) => s.peerRead)
  const peerTyping = useMessagesStore((s) => s.peerTyping)
  const notice = useMessagesStore((s) => s.notice)
  const startEdit = useMessagesStore((s) => s.startEdit)
  const startReply = useMessagesStore((s) => s.startReply)
  const deleteMessage = useMessagesStore((s) => s.deleteMessage)
  const pinMessage = useMessagesStore((s) => s.pinMessage)
  const selection = useMessagesStore((s) => s.selection)
  const toggleSelect = useMessagesStore((s) => s.toggleSelect)
  const clearSelection = useMessagesStore((s) => s.clearSelection)
  const deleteMessages = useMessagesStore((s) => s.deleteMessages)
  const navigate = useNavigate()
  const { ask, modal } = useDeleteDialog(() => navigate('/messages'))
  // Меню действий над сообщением и окно пересылки
  const [menu, setMenu] = useState<{ x: number; y: number; message: ChatMessage } | null>(null)
  const [forwardIds, setForwardIds] = useState<number[] | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  // Сколько новых сообщений пришло, пока список прокручен вверх
  const [unseen, setUnseen] = useState(0)
  const [farFromBottom, setFarFromBottom] = useState(false)
  const { socket, isConnected } = useSocket()
  // Раз в полминуты пересчитываем «был(а) N мин. назад»
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30_000)
    return () => clearInterval(t)
  }, [])
  const closeMenu = useCallback(() => setMenu(null), [])
  const isPinned = (id: number) => pinnedList.some((m) => m.id === id)

  const menuItems: ContextMenuItem[] = menu
    ? [
        { label: 'Ответить', onClick: () => startReply(menu.message), svg: '/icons/reply.svg' },
        {
          label: 'Копировать текст',
          hidden: !menu.message.text,
          onClick: () => void copyText(menu.message.text),
          svg: '/icons/copy (2).svg',
        },
        {
          label: 'Редактировать',
          hidden: menu.message.senderId !== myId,
          onClick: () => startEdit(menu.message),
          svg: '/icons/edit.svg',
        },
        { label: 'Переслать', onClick: () => setForwardIds([menu.message.id]), svg: '/icons/forward.svg' },
        { label: 'Выбрать', onClick: () => toggleSelect(menu.message.id), svg: '/icons/select.svg' },
        {
          label: isPinned(menu.message.id) ? 'Открепить' : 'Закрепить',
          onClick: () => void pinMessage(menu.message.id, !isPinned(menu.message.id)),
          svg: isPinned(menu.message.id) ? '/icons/unpin.svg' : '/icons/pin.svg',
        },
        {
          label: 'Удалить у меня',
          danger: true,
          onClick: () => void deleteMessage(menu.message.id, false),
          svg: '/icons/delete.svg',
        },
        {
          label: 'Удалить у всех',
          danger: true,
          // Стереть у обоих можно только своё сообщение
          hidden: menu.message.senderId !== myId,
          onClick: () => {
            if (window.confirm('Удалить сообщение у всех? Это нельзя отменить.')) {
              void deleteMessage(menu.message.id, true)
            }
          },
          svg: '/icons/delete.svg',
        },
      ]
    : []

  // «Удалить у всех» доступно, только если все выбранные сообщения мои
  const allMineSelected = !!selection && selection.every((id) => messages.find((m) => m.id === id)?.senderId === myId)

  // Esc выходит из режима выбора
  useEffect(() => {
    if (!selection) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && clearSelection()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selection, clearSelection])

  const scroller = useRef<HTMLDivElement>(null)
  /** Прокрутка к сообщению; если оно не загружено, подгружается кусок истории вокруг него. */
  const scrollToMessage = async (id: number) => {
    stickToBottom.current = false
    const wasLoaded = useMessagesStore.getState().messages.some((m) => m.id === id)
    if (!wasLoaded && !(await jumpTo(id))) return
    // Дожидаемся отрисовки подгруженного окна
    setTimeout(
      () => {
        const el = document.getElementById(`msg-${id}`)
        el?.scrollIntoView({ block: 'center', behavior: wasLoaded ? 'smooth' : 'auto' })
        // Короткая подсветка найденного сообщения
        el?.classList.add(cl.flash)
        setTimeout(() => el?.classList.remove(cl.flash), 1600)
      },
      wasLoaded ? 0 : 60,
    )
  }

  // Запоминаем высоту перед подгрузкой старых сообщений, чтобы список не «прыгал»
  const olderFrom = useRef<number | null>(null)
  const stickToBottom = useRef(true)

  useEffect(() => {
    stickToBottom.current = true
    setUnseen(0)
    setSearchOpen(false)
    void openChat(userId)
    return () => closeChat()
  }, [userId, openChat, closeChat])

  // Подписка на «в сети» собеседника; после переподключения сокета подписываемся заново
  useEffect(() => {
    if (!socket || !isConnected) return
    socket.emit('watch', { userId })
    return () => {
      socket.emit('watch', { userId: null })
    }
  }, [socket, isConnected, userId])

  // Есть непрочитанные: показываем историю с первого из них
  useEffect(() => {
    if (firstUnreadId <= 0) return
    stickToBottom.current = false
    const t = setTimeout(() => document.getElementById('unread-sep')?.scrollIntoView({ block: 'start' }), 0)
    return () => clearTimeout(t)
  }, [firstUnreadId])

  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    if (olderFrom.current !== null) {
      el.scrollTop = el.scrollHeight - olderFrom.current
      olderFrom.current = null
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages])

  const lastId = messages.length > 0 ? messages[messages.length - 1].id : 0
  const lastIsMine = messages.length > 0 && messages[messages.length - 1].senderId === myId
  const prevLastId = useRef(0)
  useEffect(() => {
    // Пришло чужое сообщение, а мы смотрим старую историю: считаем непрочитанное для кнопки «вниз»
    if (lastId > prevLastId.current && prevLastId.current !== 0 && !lastIsMine && !stickToBottom.current && !detached) {
      setUnseen((n) => n + 1)
    }
    prevLastId.current = lastId
  }, [lastId, lastIsMine, detached])
  useEffect(() => {
    // Своё новое сообщение всегда показываем целиком
    if (lastIsMine) stickToBottom.current = true
  }, [lastIsMine, messages.length])

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottom.current = distance < 80
    setFarFromBottom(distance > 300)
    if (distance < 80) setUnseen(0)
  }

  const goDown = () => {
    if (detached) {
      stickToBottom.current = true
      void backToLatest()
      return
    }
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    setUnseen(0)
  }

  /** Копирует выбранные сообщения: «Автор, дата» и текст, в порядке переписки. */
  const copySelected = async () => {
    if (!selection) return
    const text = messages
      .filter((m) => selection.includes(m.id) && m.text)
      .map(
        (m) =>
          `${m.senderId === myId ? 'Вы' : activeUser?.login ?? 'Собеседник'}, ${formatDateTime(m.date)}\n${m.text}`,
      )
      .join('\n\n')
    if (text) await copyText(text)
    clearSelection()
  }

  const older = async () => {
    olderFrom.current = scroller.current ? scroller.current.scrollHeight - scroller.current.scrollTop : null
    stickToBottom.current = false
    await loadOlder()
  }

  return (
    <div className={`playground ${cl.chatBox}`}>
      {modal}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems}
          onClose={closeMenu}
          header={
            <ReactionBar
              current={menu.message.reactions.find((x) => x.userId === myId)?.emoji}
              onPick={(emoji) => {
                closeMenu()
                void react(menu.message.id, emoji)
              }}
            />
          }
        />
      )}
      {forwardIds !== null && <ForwardModal messageIds={forwardIds} onClose={() => setForwardIds(null)} />}
      <div className={cl.chatHead}>
        <Link to='/messages' className={cl.back} title='К диалогам'>
          ←
        </Link>
        {activeUser && (
          <Link to={`/profile/${activeUser.id}`} className={cl.chatUser}>
            <Avatar src={activeUser.avatar} />
            <span className={cl.userInfo}>
              <span className={cl.login}>{activeUser.login || 'Пользователь'}</span>
              {peerTyping ? (
                <span className={cl.typing}>печатает…</span>
              ) : (
                peerPresence && (
                  <span className={`${cl.status} ${peerPresence.online ? cl.statusOnline : ''}`}>
                    {formatLastSeen(peerPresence.online, peerPresence.lastSeenAt)}
                  </span>
                )
              )}
            </span>
          </Link>
        )}
        <span className={cl.spacer} />
        <button
          type='button'
          className={cl.iconButton}
          title='Поиск по сообщениям'
          onClick={() => setSearchOpen((open) => !open)}
        >
          <ImageLoading src={assetUrl('icons/search.svg')} />
        </button>
        {/* <ButtonUI onClick={() => ask({ id: userId, login: activeUser?.login ?? '' })}>Удалить диалог</ButtonUI> */}
      </div>
      {searchOpen && (
        <SearchPanel
          userId={userId}
          myId={myId}
          peerLogin={activeUser?.login ?? ''}
          onPick={(id) => void scrollToMessage(id)}
          onClose={() => setSearchOpen(false)}
        />
      )}
      <PinnedBar
        pinned={pinnedList}
        myId={myId}
        onGo={(id) => void scrollToMessage(id)}
        onUnpin={(id) => void pinMessage(id, false)}
      />
      <div className={cl.history} ref={scroller} onScroll={onScroll}>
        {hasMore && (
          <div className={cl.older}>
            <ButtonUI disabled={loading} onClick={() => void older()}>
              {loading ? 'Загрузка…' : 'Показать более ранние'}
            </ButtonUI>
          </div>
        )}
        {loading && messages.length === 0 && <p className={cl.hint}>Загрузка…</p>}
        {!loading && messages.length === 0 && !error && <p className={cl.hint}>Сообщений пока нет. Напишите первым</p>}
        {messages.map((m, index) => (
          <Fragment key={m.id}>
            {(index === 0 || dayKey(messages[index - 1].date) !== dayKey(m.date)) && (
              <div className={cl.daySep}>
                <span>{formatDay(m.date)}</span>
              </div>
            )}
            {m.id === firstUnreadId && (
              <div className={cl.unreadSep} id='unread-sep'>
                Непрочитанные сообщения
              </div>
            )}
            <MessageBubble
              message={m}
              mine={m.senderId === myId}
              read={m.id <= peerRead}
              selecting={selection !== null}
              selected={!!selection?.includes(m.id)}
              onToggle={() => toggleSelect(m.id)}
              pinned={isPinned(m.id)}
              onReact={(emoji) => void react(m.id, emoji)}
              myId={myId}
              peerLogin={activeUser?.login ?? ''}
              onJump={(id) => void scrollToMessage(id)}
              onMenu={(x, y) => setMenu({ x, y, message: m })}
            />
          </Fragment>
        ))}
      </div>
      {(farFromBottom || detached) && (
        <button
          type='button'
          className={cl.downButton}
          onClick={goDown}
          title={detached ? 'К последним сообщениям' : 'Вниз'}
        >
          {detached ? '⤓' : '↓'}
          {(detached ? missedWhileDetached : unseen) > 0 && (
            <span className={cl.downBadge}>{detached ? missedWhileDetached : unseen}</span>
          )}
        </button>
      )}
      {error && <p className={cl.error}>{error}</p>}
      {notice && <p className={cl.notice}>{notice}</p>}
      {selection ? (
        <div className={cl.selectBar}>
          <span className={cl.selectCount}>Выбрано: {selection.length}</span>
          <span className={cl.spacer} />
          <ButtonUI onClick={() => setForwardIds(selection)}>Переслать</ButtonUI>
          <ButtonUI onClick={() => void copySelected()}>Копировать</ButtonUI>
          <ButtonUI onClick={() => void deleteMessages(selection, false)}>Удалить у меня</ButtonUI>
          {allMineSelected && (
            <ButtonUI
              onClick={() => {
                if (window.confirm(`Удалить выбранные сообщения (${selection.length}) у всех? Это нельзя отменить.`)) {
                  void deleteMessages(selection, true)
                }
              }}
            >
              Удалить у всех
            </ButtonUI>
          )}
          <ButtonUI onClick={clearSelection}>Отмена</ButtonUI>
        </div>
      ) : (
        <Composer key={userId} userId={userId} />
      )}
    </div>
  )
}
