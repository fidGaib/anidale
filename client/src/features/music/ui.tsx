import { useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import ButtonUI from '@/shared/ui/button'
import { UploadProgress } from '@/shared/ui/progress'

import { MusicScope, isValidScope, useMusicStore } from './module'
import cl from './ui.module.css'

interface Props {
  /** Что показываем: id профиля или 'all' — вся музыка сайта (лента). */
  scope: MusicScope
  /** Свой список: можно загружать новые файлы и удалять треки. */
  canAdd: boolean
}

const formatTime = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Страницы входа/регистрации/выхода: музыка там не играет и панель не показывается. */
const AUTH_PATHS = ['/signin', '/signup', '/signout']

/**
 * Глобальная мини-панель плеера: висит поверх всех страниц, поэтому музыка, начатая в списке,
 * остаётся под управлением и после перехода на другую страницу.
 * На страницах входа плеер останавливается (гость мог включить музыку в ленте и пойти входить).
 */
export const GlobalPlayer = () => {
  const { pathname } = useLocation()
  const myId = useRefreshStore((s) => s.refreshData.id)
  const reset = useMusicStore((s) => s.reset)
  // Для гостя корень «/» — это страница входа
  const isAuthPage = AUTH_PATHS.includes(pathname) || (pathname === '/' && !myId)

  useEffect(() => {
    if (isAuthPage) reset()
  }, [isAuthPage, reset])

  if (isAuthPage) return null
  return <Player />
}

/** Панель плеера: текущий трек, «назад», пауза/play, «вперёд» и перемотка. */
const Player = () => {
  // Играющий трек не зависит от списка на экране
  const track = useMusicStore((s) => s.current)
  const stop = useMusicStore((s) => s.stop)
  const isPlaying = useMusicStore((s) => s.isPlaying)
  const currentTime = useMusicStore((s) => s.currentTime)
  const duration = useMusicStore((s) => s.duration)
  const togglePlay = useMusicStore((s) => s.togglePlay)
  const next = useMusicStore((s) => s.next)
  const prev = useMusicStore((s) => s.prev)
  const seek = useMusicStore((s) => s.seek)

  if (!track) return null
  const pct = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0

  return (
    <div className={`playground ${cl.player} ${cl.floating}`}>
      <img className={cl.close} src='/icons/close.svg' alt='Закрыть плеер' title='Закрыть плеер' onClick={stop} />
      <div className={cl.playerTitle}>
        {track.title} <span className={cl.artist}>— {track.artist}</span>
      </div>
      <div className={cl.playerControls}>
        <img
          className={cl.control}
          src='/icons/skip_music_rotate.svg'
          alt='Предыдущий'
          title='Предыдущий'
          onClick={prev}
        />
        <img
          className={cl.control}
          src={isPlaying ? '/icons/pause.svg' : '/icons/play.svg'}
          alt={isPlaying ? 'Пауза' : 'Играть'}
          onClick={togglePlay}
        />
        <img className={cl.control} src='/icons/skip_music.svg' alt='Следующий' title='Следующий' onClick={next} />
      </div>
      <div className={cl.timeline}>
        <span className={cl.time}>{formatTime(currentTime)}</span>
        <input
          className={cl.range}
          type='range'
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          disabled={!duration}
          style={{ ['--range-pct' as string]: `${pct}%` }}
          onChange={(e) => seek(parseFloat(e.target.value))}
        />
        <span className={cl.time}>{formatTime(duration)}</span>
      </div>
    </div>
  )
}

/** Список музыки в профиле: загрузка с сервера, добавление аудиофайлов и воспроизведение. */
export const ProfileMusicList = ({ scope, canAdd }: Props) => {
  const myId = useRefreshStore((s) => s.refreshData.id)
  const notice = useMusicStore((s) => s.notice)
  const addedIds = useMusicStore((s) => s.addedIds)
  const addToMine = useMusicStore((s) => s.addToMine)
  const removeMine = useMusicStore((s) => s.removeMine)
  const myFiles = useMusicStore((s) => s.myFiles)
  const myFilesSet = useMemo(() => new Set(myFiles), [myFiles])
  const inputRef = useRef<HTMLInputElement>(null)
  const tracks = useMusicStore((s) => s.tracks)
  const currentId = useMusicStore((s) => s.currentId)
  const isPlaying = useMusicStore((s) => s.isPlaying)
  const error = useMusicStore((s) => s.error)
  const loading = useMusicStore((s) => s.loading)
  const uploading = useMusicStore((s) => s.uploading)
  const uploadPercent = useMusicStore((s) => s.uploadPercent)
  const uploadLabel = useMusicStore((s) => s.uploadLabel)
  const hasMore = useMusicStore((s) => s.hasMore)
  const load = useMusicStore((s) => s.load)
  const loadMore = useMusicStore((s) => s.loadMore)
  const addFiles = useMusicStore((s) => s.addFiles)
  const removeTrack = useMusicStore((s) => s.removeTrack)
  const toggle = useMusicStore((s) => s.toggle)

  useEffect(() => {
    if (isValidScope(scope)) void load(scope)
  }, [scope, load])

  return (
    <div className={cl.wrapper}>
      <div className={`playground ${cl.head}`}>
        <p>Музыка</p>
        {canAdd && (
          <>
            <input
              ref={inputRef}
              type='file'
              hidden
              multiple
              accept='audio/*'
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files)
                // Сброс, чтобы тот же файл можно было выбрать повторно.
                e.target.value = ''
              }}
            />
            <img
              className={cl.add}
              src='/icons/plus.png'
              alt='Добавить музыку'
              title='Добавить музыку'
              style={uploading ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
              onClick={() => inputRef.current?.click()}
            />
          </>
        )}
      </div>
      {error && <p className={cl.error}>{error}</p>}
      {notice && <p className={cl.notice}>{notice}</p>}
      {uploading && uploadPercent !== null && <UploadProgress percent={uploadPercent} label={uploadLabel} />}
      {tracks.length === 0 && loading ? (
        <p className={cl.status}>Загрузка…</p>
      ) : tracks.length === 0 ? (
        <div className={`playground ${cl.empty}`}>
          {canAdd ? 'Пока нет музыки. Нажмите «+», чтобы добавить аудиофайлы' : 'Музыки пока нет'}
        </div>
      ) : (
        tracks.map((track) => {
          const playing = currentId === track.id && isPlaying
          return (
            <div key={track.id} className={`playground ${cl.track} ${currentId === track.id ? cl.active : ''}`}>
              <img
                className={cl.control}
                src={playing ? '/icons/pause.svg' : '/icons/play.svg'}
                alt={playing ? 'Пауза' : 'Играть'}
                onClick={() => toggle(track.id)}
              />
              <div className={cl.info}>
                <div className={cl.title}>{track.title}</div>
                <div className={cl.artist}>
                  {track.artist}
                  {scope === 'all' && track.ownerLogin ? ` · ${track.ownerLogin}` : ''}
                </div>
              </div>
              {/* Чужой трек можно добавить к себе (нужен вход) */}
              {myId && scope !== myId ? (
                myFilesSet.has(track.file) || track.ownerId === myId || addedIds.includes(track.id) ? (
                  <span className={cl.added} title='Этот трек уже есть в вашем профиле'>
                    <img className={cl.addedIcon} src='/icons/check.svg' alt='Уже у вас' />
                    <img
                      className={cl.removeMine}
                      src='/icons/delete.svg'
                      alt='Удалить из моего профиля'
                      title='Удалить из моего профиля'
                      onClick={() => {
                        if (window.confirm('Удалить трек из вашего профиля?')) void removeMine(track.file, myId)
                      }}
                    />
                  </span>
                ) : (
                  <img
                    className={cl.addToMine}
                    src='/icons/plus.svg'
                    alt='Добавить к себе'
                    title='Добавить к себе'
                    onClick={() => void addToMine(track.id, myId)}
                  />
                )
              ) : null}
              {canAdd && (
                <img
                  className={cl.remove}
                  src='/icons/delete.svg'
                  alt='Удалить'
                  title='Удалить'
                  onClick={() => removeTrack(track.id)}
                />
              )}
            </div>
          )
        })
      )}
      {hasMore && (
        <div className={cl.more}>
          <ButtonUI onClick={() => void loadMore()}>{loading ? 'Загрузка…' : 'Показать ещё'}</ButtonUI>
        </div>
      )}
    </div>
  )
}
