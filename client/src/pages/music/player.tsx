import { useRef } from 'react'

import { useMusicStore } from '@/features/music/module'

import { CloseIcon, MuteIcon, NextIcon, NoteIcon, PauseIcon, PlayIcon, PrevIcon, VolumeIcon } from './icons'
import { coverGradient, formatDuration } from './model'
import cl from './ui.module.css'

/**
 * Нижняя панель плеера страницы музыки. Управляет тем же общим Audio, что и мини-плеер
 * на остальных страницах, поэтому музыка не обрывается при переходе.
 */
export const MusicPlayerBar = () => {
  const track = useMusicStore((s) => s.current)
  const isPlaying = useMusicStore((s) => s.isPlaying)
  const currentTime = useMusicStore((s) => s.currentTime)
  const duration = useMusicStore((s) => s.duration)
  const volume = useMusicStore((s) => s.volume)
  const togglePlay = useMusicStore((s) => s.togglePlay)
  const next = useMusicStore((s) => s.next)
  const prev = useMusicStore((s) => s.prev)
  const seek = useMusicStore((s) => s.seek)
  const setVolume = useMusicStore((s) => s.setVolume)
  const stop = useMusicStore((s) => s.stop)
  const lastVolume = useRef(volume || 0.8)

  if (!track) return null

  const pct = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0
  const muted = volume === 0

  const toggleMute = () => {
    if (muted) setVolume(lastVolume.current || 0.8)
    else {
      lastVolume.current = volume
      setVolume(0)
    }
  }

  return (
    <div className={`${cl.bar} ${cl.barVisible}`}>
      <div className={cl.barInner}>
        <div className={cl.barTrack}>
          <span className={cl.barCover} style={{ background: coverGradient(track) }}>
            <NoteIcon className={cl.barCoverIcon} />
          </span>
          <span className={cl.barText}>
            <span className={cl.barTitle}>{track.title}</span>
            <span className={cl.barArtist}>{track.artist}</span>
          </span>
        </div>

        <div className={cl.barCenter}>
          <div className={cl.barButtons}>
            <button type='button' className={cl.barBtn} onClick={prev} aria-label='Предыдущий трек'>
              <PrevIcon />
            </button>
            <button
              type='button'
              className={`${cl.barBtn} ${cl.barPlay}`}
              onClick={togglePlay}
              aria-label={isPlaying ? 'Пауза' : 'Играть'}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button type='button' className={cl.barBtn} onClick={next} aria-label='Следующий трек'>
              <NextIcon />
            </button>
          </div>
          <div className={cl.barTimeline}>
            <span className={cl.barTime}>{formatDuration(currentTime)}</span>
            <input
              className={cl.barRange}
              type='range'
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              disabled={!duration}
              style={{ ['--range-pct' as string]: `${pct}%` }}
              onChange={(e) => seek(parseFloat(e.target.value))}
              aria-label='Позиция трека'
            />
            <span className={cl.barTime}>{formatDuration(duration)}</span>
          </div>
        </div>

        <div className={cl.barRight}>
          <div className={cl.barVolume}>
            <button
              type='button'
              className={cl.barBtn}
              onClick={toggleMute}
              aria-label={muted ? 'Включить звук' : 'Выключить звук'}
            >
              {muted ? <MuteIcon /> : <VolumeIcon />}
            </button>
            <input
              className={cl.barRange}
              type='range'
              min={0}
              max={1}
              step={0.01}
              value={volume}
              style={{ ['--range-pct' as string]: `${volume * 100}%` }}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              aria-label='Громкость'
            />
          </div>
          <button type='button' className={cl.barBtn} onClick={stop} aria-label='Закрыть плеер'>
            <CloseIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
