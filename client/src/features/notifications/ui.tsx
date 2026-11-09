import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { useOpenPost } from '@/features/post-viewer/post-link'
import { assetUrl } from '@/shared/config'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import useOutsideClick from '@/shared/hooks/useOutsideClick'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { formatDateTime } from '@/shared/lib/time'

import { AppNotification, useNotificationsStore } from './module'
import { notificationText } from './text'
import cl from './ui.module.css'

const ICONS: Record<AppNotification['type'], string> = { like: '❤️', comment: '💬', track: '🎵', repost: '↪' }

const Item = ({ n, onOpen }: { n: AppNotification; onOpen: (n: AppNotification) => void }) => (
  <li className={`${cl.item} ${n.read ? '' : cl.unread}`} onClick={() => onOpen(n)}>
    <ImageLoading className={cl.avatar} src={useSrcAvatar(n.actor.avatar)} />
    <div className={cl.body}>
      <p className={cl.title}>{n.actor.login || 'Пользователь'}</p>
      <p className={cl.description}>
        <span className={cl.kind}>{ICONS[n.type]}</span> {notificationText(n)}
      </p>
      <p className={cl.date}>{formatDateTime(n.date)}</p>
    </div>
  </li>
)

/** Колокольчик в шапке со счётчиком непрочитанных и выпадающим списком уведомлений. */
export const NotificationBell = () => {
  const myId = useRefreshStore((s) => s.refreshData.id) ?? 0
  const navigate = useNavigate()
  const openPost = useOpenPost()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const items = useNotificationsStore((s) => s.items)
  const unread = useNotificationsStore((s) => s.unread)
  const loading = useNotificationsStore((s) => s.loading)
  const loaded = useNotificationsStore((s) => s.loaded)
  const hasMore = useNotificationsStore((s) => s.hasMore)
  const error = useNotificationsStore((s) => s.error)
  const load = useNotificationsStore((s) => s.load)
  const loadMore = useNotificationsStore((s) => s.loadMore)
  const markAllRead = useNotificationsStore((s) => s.markAllRead)

  const close = useCallback(() => setOpen(false), [])
  useOutsideClick(ref, close)

  // Пока список открыт, непрочитанные подсвечены; при закрытии они отмечаются прочитанными
  const wasOpen = useRef(false)
  useEffect(() => {
    if (wasOpen.current && !open) void markAllRead()
    wasOpen.current = open
  }, [open, markAllRead])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  const toggle = () => {
    if (!open) void load()
    setOpen((value) => !value)
  }

  const openItem = (n: AppNotification) => {
    setOpen(false)
    // Лайк или комментарий: пост открывается окном поверх текущей страницы, как в ВК; трек ведёт в музыку
    if (n.type !== 'track' && n.postId) openPost(n.postId)
    else navigate(n.type === 'track' ? '/music' : `/profile/${myId}`)
  }

  return (
    <div className={cl.wrap} ref={ref}>
      <button type='button' className={cl.bell} onClick={toggle} title='Уведомления'>
        <ImageLoading
          className={cl.bellIcon}
          src={assetUrl('icons/notification.svg')}
          alt='anidale notification icon'
        />
        {unread > 0 && <span className={cl.badge}>{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className={`playground ${cl.dropdown}`}>
          <div className={cl.head}>Уведомления</div>
          {error && <p className={cl.hint}>{error}</p>}
          {!loaded && loading && <p className={cl.hint}>Загрузка…</p>}
          {loaded && items.length === 0 && !error && (
            <p className={cl.hint}>Пока ничего нового. Здесь появятся лайки, комментарии и добавленные треки</p>
          )}
          <ul className={cl.list}>
            {items.map((n) => (
              <Item key={n.id} n={n} onOpen={openItem} />
            ))}
          </ul>
          {hasMore && (
            <button type='button' className={cl.more} disabled={loading} onClick={() => void loadMore()}>
              {loading ? 'Загрузка…' : 'Показать ещё'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
