import { useEffect, useRef, useState } from 'react'

import { Track, useMusicStore } from '@/features/music/module'

import {
  DotsIcon,
  DownloadIcon,
  HeartIcon,
  NoteIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
} from './icons'
import { coverGradient, formatDuration, sameTrack, useDuration, useMusicPageStore } from './model'
import cl from './ui.module.css'

interface Props {
  track: Track
  /** Список, из которого запускаем: он станет очередью «вперёд/назад». */
  queue: Track[]
  /** Трек принадлежит текущему пользователю: его можно удалить с сервера. */
  owned: boolean
  /** Плейлист, в котором показан трек: из него можно убрать. */
  playlistId?: number
  onAddToPlaylist: (track: Track) => void
}

/** Строка трека в списке: обложка, название, исполнитель, лайк и меню действий. */
export const TrackRow = ({ track, queue, owned, playlistId, onAddToPlaylist }: Props) => {
  const playOne = useMusicStore((s) => s.playOne)
  const currentId = useMusicStore((s) => s.currentId)
  const isPlaying = useMusicStore((s) => s.isPlaying)
  const markPlayed = useMusicPageStore((s) => s.markPlayed)
  const liked = useMusicPageStore((state) => state.liked.some((item) => sameTrack(item, track)))
  const toggleLike = useMusicPageStore((s) => s.toggleLike)
  const addToMine = useMusicPageStore((s) => s.addToMine)
  const removeTrack = useMusicPageStore((s) => s.removeTrack)
  const removeFromPlaylist = useMusicPageStore((s) => s.removeFromPlaylist)
  const duration = useDuration(track.url)

  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menu) return
    const onDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenu(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMenu(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menu])

  const active = currentId === track.id
  const playing = active && isPlaying

  const play = () => {
    if (!track.url) return
    playOne(track, queue)
    markPlayed(track)
  }

  return (
    <div className={`${cl.row} ${active ? cl.rowActive : ''}`}>
      <button
        type='button'
        className={cl.rowCover}
        style={{ background: coverGradient(track) }}
        onClick={play}
        aria-label={playing ? 'Пауза' : `Играть «${track.title}»`}
      >
        <NoteIcon className={cl.rowCoverNote} />
        <span className={`${cl.rowCoverPlay} ${active || playing ? cl.rowCoverPlayActive : ''}`}>
          {playing ? <PauseIcon /> : <PlayIcon />}
        </span>
      </button>

      <button type='button' className={cl.rowInfo} onClick={play}>
        <span className={cl.rowTitle}>
          {playing && (
            <span className={cl.equalizer} aria-hidden>
              <i />
              <i />
              <i />
            </span>
          )}
          {track.title || 'Без названия'}
        </span>
        <span className={cl.rowArtist}>
          {track.artist || 'Неизвестный исполнитель'}
          {owned && <span className={cl.rowBadge}>мой трек</span>}
        </span>
      </button>

      <span className={cl.rowDuration}>{formatDuration(duration)}</span>

      <div className={cl.rowActions}>
        <button
          type='button'
          className={`${cl.rowIcon} ${liked ? cl.rowIconLiked : ''}`}
          onClick={() => toggleLike(track)}
          title={liked ? 'Убрать из «Мне нравится»' : 'Нравится'}
          aria-label={liked ? 'Убрать из «Мне нравится»' : 'Нравится'}
          aria-pressed={liked}
        >
          <HeartIcon filled={liked} />
        </button>

        <button
          type='button'
          className={cl.rowIcon}
          onClick={() => onAddToPlaylist(track)}
          title='Добавить в плейлист'
          aria-label='Добавить в плейлист'
        >
          <PlusIcon />
        </button>

        <div className={cl.rowMenuWrap} ref={menuRef}>
          <button
            type='button'
            className={`${cl.rowIcon} ${menu ? cl.rowIconOpen : ''}`}
            onClick={() => setMenu((open) => !open)}
            title='Ещё'
            aria-label='Ещё'
            aria-expanded={menu}
          >
            <DotsIcon />
          </button>
          {menu && (
            <div className={cl.rowMenu} role='menu'>
              {!owned && (
                <button
                  type='button'
                  role='menuitem'
                  className={cl.rowMenuItem}
                  onClick={() => {
                    setMenu(false)
                    void addToMine(track)
                  }}
                >
                  <PlusIcon /> В мою музыку
                </button>
              )}
              <button
                type='button'
                role='menuitem'
                className={cl.rowMenuItem}
                onClick={() => {
                  setMenu(false)
                  onAddToPlaylist(track)
                }}
              >
                <PlusIcon /> В плейлист
              </button>
              <a className={cl.rowMenuItem} href={track.url} download={`${track.artist} — ${track.title}`} role='menuitem'>
                <DownloadIcon /> Скачать
              </a>
              {playlistId !== undefined && (
                <button
                  type='button'
                  role='menuitem'
                  className={cl.rowMenuItem}
                  onClick={() => {
                    setMenu(false)
                    removeFromPlaylist(playlistId, track.id)
                  }}
                >
                  <TrashIcon /> Убрать из плейлиста
                </button>
              )}
              {owned && (
                <button
                  type='button'
                  role='menuitem'
                  className={`${cl.rowMenuItem} ${cl.rowMenuItemDanger}`}
                  onClick={() => {
                    setMenu(false)
                    if (window.confirm(`Удалить «${track.title}»? Файл тоже удалится.`)) void removeTrack(track)
                  }}
                >
                  <TrashIcon /> Удалить трек
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
