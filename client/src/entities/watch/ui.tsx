import { useCallback, useEffect, useRef } from 'react'
import type ReactPlayerType from 'react-player'
import ReactPlayerLazy from 'react-player/lazy'
import screenfull from 'screenfull'

import { useDarkModeStore } from '@/app/module'
import { ControlsVideo } from '@/features/watch'
import { usePayerStore } from '@/pages/watch/module'

import cl from './ui.module.css'

/**
 * Vite 8 отдаёт CommonJS-модуль react-player/lazy как { default: Component }.
 * Без разворота React получает объект вместо компонента и падает с ошибкой #130.
 */
const ReactPlayer =
  (ReactPlayerLazy as unknown as { default?: typeof ReactPlayerLazy }).default ?? ReactPlayerLazy

const SKIP_SECONDS = 10

interface Props {
  title: string
  /** Адрес видеофайла; пустая строка — видео ещё не загружено. */
  src: string
  description?: string
  /** Серия закончилась: обычно открываем следующую. */
  onEnded?: () => void
  /** Место, с которого продолжить серию (секунды). */
  startAt?: number
  /** Плеер продвинулся: страница сохраняет прогресс. */
  onProgressSave?: (playedSeconds: number, duration: number) => void
}

export const ViedeoWrapper = ({ title, src, description, onEnded, startAt = 0, onProgressSave }: Props) => {
  const ref__player = useRef<ReactPlayerType>(null)
  const refScreenfull = useRef<HTMLDivElement>(null)
  // Стартовая позиция может прийти позже монтирования (запрос прогресса), поэтому храним её в ref
  const startAtRef = useRef(Math.max(startAt, 0))
  startAtRef.current = Math.max(startAt, 0)
  // store player
  const playing = usePayerStore((store) => store.playing)
  const volume = usePayerStore((store) => store.volume)
  const muted = usePayerStore((store) => store.muted)
  const playbackRate = usePayerStore((store) => store.playbackRate)
  const buffering = usePayerStore((store) => store.buffering)
  const playedSeconds = usePayerStore((store) => store.playedSeconds)
  const loadedSeconds = usePayerStore((store) => store.loadedSeconds)
  const duration = usePayerStore((store) => store.duration)
  const handle__play = usePayerStore((store) => store.handle__play)
  const handle__progress = usePayerStore((store) => store.handle__progress)
  const handle__duration = usePayerStore((store) => store.handle__duration)
  const toggleMute = usePayerStore((store) => store.toggleMute)
  const changeVolume = usePayerStore((store) => store.changeVolume)
  const setBuffering = usePayerStore((store) => store.setBuffering)
  const resetProgress = usePayerStore((store) => store.resetProgress)
  const handle_screenfull = useCallback(() => {
    if (refScreenfull.current) screenfull.toggle(refScreenfull.current)
  }, [])
  // Картинка в картинке: HTML5-видео умеет это само, остальные источники просто игнорируем
  const handle_pip = useCallback(async () => {
    const player = ref__player.current as unknown as { getInternalPlayer?: () => HTMLVideoElement | null }
    const video = player?.getInternalPlayer?.()
    if (!video) return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await video.requestPictureInPicture()
    } catch {
      // Браузер не поддерживает PiP или запрос отменён — ничего не ломаем
    }
  }, [])

  // Новая серия начинается с нуля, а не с позиции предыдущей
  useEffect(() => {
    resetProgress()
  }, [src, resetProgress])

  // Продолжение просмотра: ставим сохранённую позицию, когда известна длительность.
  // onReady срабатывает до метаданных, и seekTo на этом этапе теряется.
  const resumed = useRef(false)
  const tryResume = useCallback((knownDuration: number) => {
    const target = startAtRef.current
    if (resumed.current || target <= 1 || knownDuration <= 0) return
    resumed.current = true
    ref__player.current?.seekTo(Math.min(target, knownDuration))
  }, [])

  const handleDuration = useCallback(
    (value: number) => {
      handle__duration(value)
      tryResume(value)
    },
    [handle__duration, tryResume],
  )

  // Прогресс мог загрузиться после метаданных — тогда досылаем перемотку отдельно
  useEffect(() => {
    tryResume(usePayerStore.getState().duration)
  }, [startAt, tryResume])

  const handleProgress = useCallback(
    (state: { playedSeconds: number; loadedSeconds: number }) => {
      handle__progress(state)
      onProgressSave?.(state.playedSeconds, duration)
    },
    [duration, handle__progress, onProgressSave],
  )

  // Клавиши как в привычных плеерах; поля ввода не перехватываем
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      const total = duration || loadedSeconds
      const seek = (seconds: number) => ref__player.current?.seekTo(Math.min(Math.max(seconds, 0), total))
      if (event.code === 'Space') {
        event.preventDefault()
        handle__play()
      } else if (event.code === 'ArrowLeft') {
        event.preventDefault()
        seek(playedSeconds - SKIP_SECONDS)
      } else if (event.code === 'ArrowRight') {
        event.preventDefault()
        seek(playedSeconds + SKIP_SECONDS)
      } else if (event.key.toLowerCase() === 'f') {
        handle_screenfull()
      } else if (event.key.toLowerCase() === 'm') {
        toggleMute()
      } else if (event.code === 'ArrowUp') {
        event.preventDefault()
        changeVolume(0.1)
      } else if (event.code === 'ArrowDown') {
        event.preventDefault()
        changeVolume(-0.1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [changeVolume, duration, handle__play, handle_screenfull, loadedSeconds, playedSeconds, toggleMute])

  const theme = useDarkModeStore((store) => store.theme)

  return (
    <>
      <p className={cl.title} style={{ color: `${theme === 'dark' ? 'lightgrey' : '#000'}` }}>
        {title}
      </p>
      <div className={cl.video__wrapper} ref={refScreenfull}>
        {src ? (
          <>
            <ReactPlayer
              url={src}
              playing={playing}
              controls={false}
              width={'100%'}
              height={'100%'}
              volume={volume}
              muted={muted}
              playbackRate={playbackRate}
              playsinline
              progressInterval={500}
              onProgress={handleProgress}
              onDuration={handleDuration}
              onEnded={onEnded}
              onBuffer={() => setBuffering(true)}
              onBufferEnd={() => setBuffering(false)}
              onPlay={() => setBuffering(false)}
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              ref={ref__player}
              className={cl.video}
            />
            {buffering && (
              <div className={cl.buffering} role='status' aria-label='Загрузка видео'>
                <span className={cl.spinner} />
              </div>
            )}
            <ControlsVideo ref__player={ref__player} handle_screenfull={handle_screenfull} handle_pip={handle_pip} />
          </>
        ) : (
          <div className={cl.empty}>
            <img src='/icons/video.svg' alt='' />
            <span>Видео этой серии ещё не загружено</span>
          </div>
        )}
      </div>
      {description && <p className={cl.description}>{description}</p>}
    </>
  )
}
