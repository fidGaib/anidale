import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { formatShort } from '@/shared/lib/time'
import { ContextMenu, ContextMenuItem } from '@/shared/ui/context-menu'

import { Avatar } from './avatar'
import { useDeleteDialog } from './delete-dialog'
import { getDraft, useDraftsStore } from './drafts'
import { LONG_PRESS_MS, preview } from './helpers'
import { ConversationItem, useMessagesStore } from './module'
import cl from './ui.module.css'

/** Список диалогов слева. */
export const ConversationList = ({ activeId }: { activeId: number | null }) => {
  const myId = useRefreshStore((s) => s.refreshData.id) ?? 0
  const conversations = useMessagesStore((s) => s.conversations)
  const loading = useMessagesStore((s) => s.conversationsLoading)
  const setSettings = useMessagesStore((s) => s.setSettings)
  const drafts = useDraftsStore((s) => s.drafts)
  const draftsOwner = useDraftsStore((s) => s.owner)
  const navigate = useNavigate()
  const { ask, modal } = useDeleteDialog((userId) => {
    if (activeId === userId) navigate('/messages')
  })
  const [showArchive, setShowArchive] = useState(false)
  const [menu, setMenu] = useState<{ x: number; y: number; item: ConversationItem } | null>(null)
  const closeMenu = useCallback(() => setMenu(null), [])
  // На телефоне правой кнопки нет: меню открывается долгим нажатием
  const pressTimer = useRef<number | undefined>(undefined)
  const cancelPress = () => window.clearTimeout(pressTimer.current)

  // Подгружаем черновики текущего пользователя из localStorage
  useEffect(() => {
    getDraft(0)
  }, [myId])
  const myDrafts = draftsOwner === myId ? drafts : {}

  const archivedCount = conversations.filter((c) => c.archived).length
  // Если архив опустел, возвращаемся к основному списку
  useEffect(() => {
    if (showArchive && archivedCount === 0) setShowArchive(false)
  }, [showArchive, archivedCount])
  const visible = conversations.filter((c) => c.archived === showArchive)
  const archivedUnread = conversations.reduce((sum, c) => sum + (c.archived && !c.muted ? c.unread : 0), 0)

  const menuItems: ContextMenuItem[] = menu
    ? [
        {
          label: menu.item.pinned ? 'Открепить диалог' : 'Закрепить диалог',
          svg: menu.item.pinned ? '/icons/unpin.svg' : '/icons/pin.svg',
          onClick: () => void setSettings(menu.item.user.id, { pinned: !menu.item.pinned }),
        },
        {
          label: menu.item.muted ? 'Включить звук' : 'Отключить звук',
          onClick: () => void setSettings(menu.item.user.id, { muted: !menu.item.muted }),
          svg: menu.item.muted ? '/icons/unmute.svg' : '/icons/mute (2).svg',
        },
        {
          label: menu.item.archived ? 'Вернуть из архива' : 'В архив',
          onClick: () => void setSettings(menu.item.user.id, { archived: !menu.item.archived }),
          svg: menu.item.archived ? '/icons/unarchive.svg' : '/icons/archive.svg',
        },
        {
          label: 'Удалить диалог',
          danger: true,
          onClick: () => ask({ id: menu.item.user.id, login: menu.item.user.login }),
          svg: '/icons/delete.svg',
        },
      ]
    : []

  return (
    <div className={`playground ${cl.listBox}`}>
      {modal}
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={closeMenu} />}
      <div className={cl.listHead}>
        {showArchive ? (
          <>
            <button type='button' className={cl.linkButton} onClick={() => setShowArchive(false)}>
              ← Назад
            </button>
            <span> Архив</span>
          </>
        ) : (
          'Сообщения'
        )}
      </div>
      {!showArchive && archivedCount > 0 && (
        <div className={cl.archiveRow} onClick={() => setShowArchive(true)}>
          <span>🗄 Архив</span>
          <span className={cl.previewText}>{archivedCount}</span>
          {archivedUnread > 0 && <span className={cl.badge}>{archivedUnread > 99 ? '99+' : archivedUnread}</span>}
        </div>
      )}
      {loading && conversations.length === 0 && <p className={cl.hint}>Загрузка…</p>}
      {!loading && conversations.length === 0 && (
        <p className={cl.hint}>Диалогов пока нет. Откройте профиль человека и нажмите «Написать»</p>
      )}
      {visible.map((c) => {
        const draft = activeId === c.user.id ? '' : myDrafts[c.user.id] ?? ''
        return (
          <Link
            key={c.user.id}
            to={`/messages/${c.user.id}`}
            className={`${cl.dialog} ${activeId === c.user.id ? cl.dialogActive : ''}`}
            onContextMenu={(e) => {
              e.preventDefault()
              setMenu({ x: e.clientX, y: e.clientY, item: c })
            }}
            onTouchStart={(e) => {
              const touch = e.touches[0]
              pressTimer.current = window.setTimeout(
                () => setMenu({ x: touch.clientX, y: touch.clientY, item: c }),
                LONG_PRESS_MS,
              )
            }}
            onTouchEnd={cancelPress}
            onTouchMove={cancelPress}
            onTouchCancel={cancelPress}
          >
            <Avatar src={c.user.avatar} />
            <div className={cl.dialogBody}>
              <div className={cl.dialogTop}>
                <span className={cl.login}>
                  {c.pinned ? '📌 ' : ''}
                  {c.user.login}
                  {c.muted ? ' 🔕' : ''}
                </span>
                <span className={cl.time}>{c.lastMessage ? formatShort(c.lastMessage.date) : ''}</span>
              </div>
              <div className={cl.dialogBottom}>
                <span className={cl.previewText}>
                  {draft ? (
                    <>
                      <span className={cl.draftLabel}>Черновик: </span>
                      {draft}
                    </>
                  ) : (
                    preview(c.lastMessage, myId)
                  )}
                </span>
                {c.unread > 0 && (
                  <span className={`${cl.badge} ${c.muted ? cl.badgeMuted : ''}`}>
                    {c.unread > 99 ? '99+' : c.unread}
                  </span>
                )}
              </div>
            </div>
            <img
              className={cl.removeDialog}
              src='/icons/delete.svg'
              alt='Удалить диалог'
              title='Удалить диалог'
              onClick={(e) => {
                // Крестик внутри ссылки: не переходим в чат
                e.preventDefault()
                e.stopPropagation()
                ask({ id: c.user.id, login: c.user.login })
              }}
            />
          </Link>
        )
      })}
    </div>
  )
}
