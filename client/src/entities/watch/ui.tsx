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
}

export const ViedeoWrapper = ({ title, src, description, onEnded }: Props) => {
  const ref__player = useRef<ReactPlayerType>(null)
  const refScreenfull = useRef<HTMLDivElement>(null)
  // store player
  const playing = usePayerStore((store) => store.playing)
  const volume = usePayerStore((store) => store.volume)
  const playedSeconds = usePayerStore((store) => store.playedSeconds)
  const loadedSeconds = usePayerStore((store) => store.loadedSeconds)
  const duration = usePayerStore((store) => store.duration)
  const handle__play = usePayerStore((store) => store.handle__play)
  const handle__progress = usePayerStore((store) => store.handle__progress)
  const handle__duration = usePayerStore((store) => store.handle__duration)
  const resetProgress = usePayerStore((store) => store.resetProgress)
  const handle_screenfull = useCallback(() => {
    if (refScreenfull.current) screenfull.toggle(refScreenfull.current)
  }, [])

  // Новая серия начинается с нуля, а не с позиции предыдущей
  useEffect(() => {
    resetProgress()
  }, [src, resetProgress])

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
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [duration, handle__play, handle_screenfull, loadedSeconds, playedSeconds])

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
              playsinline
              progressInterval={500}
              onProgress={handle__progress}
              onDuration={handle__duration}
              onEnded={onEnded}
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              ref={ref__player}
              className={cl.video}
            />
            <ControlsVideo ref__player={ref__player} handle_screenfull={handle_screenfull} />
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
