import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { client } from '@/app/providers/apollo-client'
import { useRefreshStore } from '@/app/providers/routes/model'
import { useNotificationsStore } from '@/features/notifications/module'
import { storageUrl } from '@/shared/config'
import { SEND_MESSAGE, STORY_VIEWERS } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSocket } from '@/shared/hooks/useSocket'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { formatDateTime, toTimestamp } from '@/shared/lib/time'

import { AddStory } from './add-story'
import { StoryGroup, useStoriesStore } from './module'
import cl from './ui.module.css'

/** Сколько показывается одна история. */
const DURATION_MS = 5000
/** Нажатие дольше этого времени — «удержание» (пауза), а не клик. */
const HOLD_MS = 250

interface Viewer {
  user: { id: number; login: string; avatar: string }
  date: number
}

const ViewerRow = ({ viewer, onOpen }: { viewer: Viewer; onOpen: () => void }) => (
  <Link to={`/profile/${viewer.user.id}`} className={cl.viewerRow} onClick={onOpen}>
    <ImageLoading className={cl.viewerAvatar} src={useSrcAvatar(viewer.user.avatar)} />
    <span className={cl.viewerName}>{viewer.user.login}</span>
    <span className={cl.viewerTime}>{formatDateTime(viewer.date)}</span>
  </Link>
)

const Item = ({ group, onOpen }: { group: StoryGroup; onOpen: () => void }) => (
  <button type='button' className={cl.item} onClick={onOpen} title={group.user.login}>
    <span className={`${cl.ring} ${group.allSeen ? cl.ringSeen : ''}`}>
      <ImageLoading className={cl.avatar} src={useSrcAvatar(group.user.avatar)} />
    </span>
    <span className={cl.name}>{group.user.login}</span>
  </button>
)

/** Ряд историй над лентой: «+» для своей и кружки людей с цветной обводкой у непросмотренных. */
export const StoriesRow = () => {
  const myId = useRefreshStore((s) => s.refreshData.id) ?? 0
  const groups = useStoriesStore((s) => s.groups)
  const error = useStoriesStore((s) => s.error)
  const load = useStoriesStore((s) => s.load)
  const open = useStoriesStore((s) => s.open)
  const { socket, isConnected } = useSocket()
  useEffect(() => {
    void load()
  }, [load, myId])

  // Кто-то добавил или удалил историю: обновляем ряд
  useEffect(() => {
    if (!socket || !isConnected) return
    const refresh = () => void load()
    socket.on('newStory', refresh)
    socket.on('storyRemoved', refresh)
    return () => {
      socket.off('newStory', refresh)
      socket.off('storyRemoved', refresh)
    }
  }, [socket, isConnected, load])

  if (groups.length === 0 && !myId) return null

  return (
    <div className={` ${cl.row}`}>
      {myId > 0 && (
        <AddStory>
          {(openPicker, uploading) => (
            <button type='button' className={cl.item} onClick={openPicker} disabled={uploading}>
              <span className={`${cl.ring} ${cl.ringAdd}`}>
                <span className={cl.plus}>{uploading ? '…' : '+'}</span>
              </span>
              <span className={cl.name}>{uploading ? 'Загрузка' : 'Добавить'}</span>
            </button>
          )}
        </AddStory>
      )}
      {groups.map((g) => (
        <Item key={g.user.id} group={g} onOpen={() => open(g.user.id)} />
      ))}
      {error && <p className={cl.error}>{error}</p>}
    </div>
  )
}

/** Полноэкранный просмотр историй: полоски времени, клик и клавиши для перехода, удержание ставит на паузу. */
export const StoryViewerHost = () => {
  const myId = useRefreshStore((s) => s.refreshData.id) ?? 0
  const viewer = useStoriesStore((s) => s.viewer)
  const groups = useStoriesStore((s) => s.groups)
  const step = useStoriesStore((s) => s.step)
  const close = useStoriesStore((s) => s.close)
  const markSeen = useStoriesStore((s) => s.markSeen)
  const remove = useStoriesStore((s) => s.remove)

  const [progress, setProgress] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const paused = useRef(false)
  // Список зрителей своей истории: пока он открыт, время стоит
  const [viewers, setViewers] = useState<Viewer[] | null>(null)
  const [viewersError, setViewersError] = useState('')
  // Ответ на чужую историю уходит личным сообщением
  const [reply, setReply] = useState('')
  const [replyBusy, setReplyBusy] = useState(false)
  const [replyError, setReplyError] = useState('')
  const pressedAt = useRef(0)

  const group = viewer ? groups[viewer.group] : undefined
  const story = group && viewer ? group.stories[viewer.story] : undefined
  const storyId = story?.id ?? 0

  // Новая история: полоска с нуля, просмотр засчитывается
  useEffect(() => {
    setProgress(0)
    setLoaded(false)
    setViewers(null)
    setReply('')
    setReplyError('')
    paused.current = false
    if (storyId && !groups.some((g) => g.user.id === myId && g.stories.some((s) => s.id === storyId))) markSeen(storyId)
    // groups нужен только для проверки «своя ли»; при его обновлении просмотр не перезапускаем
  }, [storyId])

  // Ход времени: останавливается на паузе и пока картинка не загрузилась
  useEffect(() => {
    if (!storyId || !loaded) return
    let last = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const dt = now - last
      last = now
      if (!paused.current) {
        setProgress((p) => {
          const next = p + dt / DURATION_MS
          if (next >= 1) {
            step(1)
            return 1
          }
          return next
        })
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [storyId, loaded, step])

  useEffect(() => {
    if (!viewer) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      // В поле ответа стрелки и пробел двигают курсор, а не листают историю
      else if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return
      else if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === ' ') paused.current = !paused.current
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [viewer, close, step])

  const onUp = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      paused.current = false
      // Удержание — только пауза; короткий клик переходит: левая треть назад, остальное вперёд
      if (Date.now() - pressedAt.current > HOLD_MS) return
      const x = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      step(x - rect.left < rect.width * 0.3 ? -1 : 1)
    },
    [step],
  )

  if (!viewer || !group || !story) return null
  // У истории сообщества хозяин — тот, кто ведёт его содержимое; писать «от имени» сообществу личные ответы нельзя
  const isCommunity = !!group.community
  const mine = group.community ? group.community.canManage : group.user.id === myId
  const profileLink = group.community ? `/community/${group.community.id}` : `/profile/${group.user.id}`

  const showViewers = async () => {
    paused.current = true
    setViewers([])
    setViewersError('')
    try {
      const { data } = await client.query({
        query: STORY_VIEWERS,
        variables: { id: story.id },
        fetchPolicy: 'network-only',
      })
      setViewers(
        data.storyViewers.map((v) => ({
          user: { id: v.user.id ?? 0, login: v.user.login ?? '', avatar: v.user.avatar ?? '' },
          date: toTimestamp(v.date),
        })),
      )
    } catch (e) {
      setViewersError(e instanceof Error ? e.message : 'Не удалось загрузить зрителей')
    }
  }
  const sendReply = async () => {
    const text = reply.trim()
    if (!text || replyBusy || !group) return
    setReplyBusy(true)
    setReplyError('')
    try {
      await client.mutate({
        mutation: SEND_MESSAGE,
        variables: { to: group.user.id, text: `↩ Ответ на историю: ${text}`, files: null, replyTo: null },
      })
      setReply('')
      useNotificationsStore.getState().pushToast({
        title: 'Ответ отправлен',
        text: group.user.login,
        link: `/messages/${group.user.id}`,
        avatar: group.user.avatar,
      })
    } catch (e) {
      setReplyError(e instanceof Error ? e.message : 'Не удалось отправить ответ')
    } finally {
      setReplyBusy(false)
    }
  }
  const hideViewers = () => {
    setViewers(null)
    paused.current = false
  }

  return (
    <div className={cl.overlay} role='dialog' aria-label='Истории'>
      <div className={cl.stage}>
        <div className={cl.bars}>
          {group.stories.map((s, i) => (
            <span key={s.id} className={cl.bar}>
              <span
                className={cl.barFill}
                style={{ width: `${i < viewer.story ? 100 : i === viewer.story ? Math.min(progress, 1) * 100 : 0}%` }}
              />
            </span>
          ))}
        </div>
        <div className={cl.head}>
          <Link to={profileLink} className={cl.author} onClick={close}>
            <ImageLoading className={cl.headAvatar} src={useSrcAvatar(group.user.avatar)} />
            <span>
              <span className={cl.login}>{group.user.login}</span>
              <span className={cl.time}>{formatDateTime(story.date)}</span>
            </span>
          </Link>
          <span className={cl.spacer} />
          {mine && (
            <button
              type='button'
              className={cl.headButton}
              onClick={() => window.confirm('Удалить историю?') && void remove(story.id)}
            >
              Удалить
            </button>
          )}
          <button type='button' className={cl.headButton} onClick={close} title='Закрыть (Esc)'>
            ✕
          </button>
        </div>

        <div
          className={cl.canvas}
          onMouseDown={() => {
            pressedAt.current = Date.now()
            paused.current = true
          }}
          onMouseUp={onUp}
          onTouchStart={() => {
            pressedAt.current = Date.now()
            paused.current = true
          }}
          onTouchEnd={onUp}
        >
          <img
            key={story.id}
            className={`${cl.image} ${loaded ? cl.imageLoaded : ''}`}
            src={storageUrl(`${story.src}.webp`)}
            alt=''
            draggable={false}
            onLoad={() => setLoaded(true)}
          />
          {!loaded && <div className={cl.spinner} />}
          {story.text && <div className={cl.caption}>{story.text}</div>}
        </div>

        {mine && (
          <button type='button' className={cl.views} onClick={() => void showViewers()}>
            👁 {story.viewsCount ?? 0}
          </button>
        )}
        {!mine && !isCommunity && myId > 0 && (
          <div className={cl.replyBar}>
            <input
              className={cl.replyInput}
              placeholder={`Ответить ${group.user.login}…`}
              value={reply}
              maxLength={500}
              disabled={replyBusy}
              // Пока пишем ответ, история стоит на месте
              onFocus={() => (paused.current = true)}
              onBlur={() => (paused.current = false)}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void sendReply()}
            />
            <button
              type='button'
              className={cl.replySend}
              disabled={!reply.trim() || replyBusy}
              onClick={() => void sendReply()}
            >
              ➤
            </button>
            {replyError && <span className={cl.replyError}>{replyError}</span>}
          </div>
        )}
        {viewers && (
          <div className={cl.viewersPanel}>
            <div className={cl.viewersHead}>
              <span>Просмотры: {story.viewsCount ?? 0}</span>
              <button type='button' className={cl.headButton} onClick={hideViewers}>
                ✕
              </button>
            </div>
            {viewersError && <p className={cl.error}>{viewersError}</p>}
            {!viewersError && viewers.length === 0 && <p className={cl.viewersEmpty}>Пока никто не смотрел</p>}
            {viewers.map((v) => (
              <ViewerRow key={v.user.id} viewer={v} onOpen={close} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
