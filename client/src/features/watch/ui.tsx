import { ChangeEvent, RefObject } from 'react'

import { useDarkModeStore } from '@/app/module'
import { Seekable, usePayerStore } from '@/pages/watch/module'
import { formatMediaTime } from '@/shared/lib/time'
import Input from '@/shared/ui/input'

import cl from './ui.module.css'

interface ControlsProps {
  ref__player: RefObject<Seekable>
  handle_screenfull: () => void
}

const SKIP_SECONDS = 10

export const ControlsVideo = ({ ref__player, handle_screenfull }: ControlsProps) => {
  const handle__volume = usePayerStore((store) => store.handle__volume)
  const handle__play = usePayerStore((store) => store.handle__play)
  const handle_prodress_track = usePayerStore((store) => store.handle_prodress_track)
  const loadedSeconds = usePayerStore((store) => store.loadedSeconds)
  const playedSeconds = usePayerStore((store) => store.playedSeconds)
  const duration = usePayerStore((store) => store.duration)
  const playing = usePayerStore((store) => store.playing)
  const volume = usePayerStore((store) => store.volume)

  // Длительность приходит от плеера; до неё перемотка ограничена загруженным фрагментом
  const total = duration || loadedSeconds
  const skip = (delta: number) => {
    const target = Math.min(Math.max(playedSeconds + delta, 0), total)
    handle_prodress_track(target, ref__player)
  }

  return (
    <>
      <div className={cl.video__controls_play} onClick={handle__play}>
        {playing ? <img src='/icons/pause.svg' alt='' /> : <img src='/icons/play.svg' alt='' />}
      </div>
      <div className={cl.video__controls}>
        <button type='button' className={cl.video__controls_skip} onClick={() => skip(-SKIP_SECONDS)}>
          −{SKIP_SECONDS} с
        </button>
        <input
          type='range'
          onChange={(e: ChangeEvent<HTMLInputElement>) => handle_prodress_track(e.target.value, ref__player)}
          min={0}
          max={total}
          value={Math.min(playedSeconds, total)}
          step={1}
          aria-label='Позиция в серии'
          className={cl.video__controls_track}
        />
        <span className={cl.video__controls_time}>
          {formatMediaTime(playedSeconds)} / {formatMediaTime(duration)}
        </span>
        <button type='button' className={cl.video__controls_skip} onClick={() => skip(SKIP_SECONDS)}>
          +{SKIP_SECONDS} с
        </button>
        <input
          type='range'
          onChange={handle__volume}
          min={0}
          max={1}
          value={volume}
          step={0.1}
          aria-label='Громкость'
          className={cl.video__controls_volume}
        />
        <img
          width={'30px'}
          style={{ marginLeft: '10px', cursor: 'pointer' }}
          onClick={handle_screenfull}
          src='/icons/fullscreen.svg'
          alt='На весь экран'
        />
      </div>
    </>
  )
}

export const CommentAnime = () => {
  const theme = useDarkModeStore((store) => store.theme)
  return (
    <div className={cl.commentaries}>
      <div className={cl.send__comm}>
        <Input
          type='text'
          placeholder='Поделитесь впечатлениями...'
          style={{
            color: `${theme === 'dark' ? '#fff' : '#000'}`,
            background: `${theme === 'dark' ? 'rgb(30, 30, 30)' : '#000'}`,
          }}
        />
        <img src='/icons/send.svg' alt='' />
      </div>
      <div className={cl.comm__item}>
        <div
          className={cl.avtor}
          style={{
            color: `${theme === 'dark' ? 'lightgrey' : '#000'}`,
          }}
        >
          <img src='/1.png' alt='' />
          <div className={cl.login}>kirito</div>
        </div>
        <p className={cl.description}>
          Lorem ipsum dolor sit amet consectetur, adipisicing elit. Neque assumenda excepturi incidunt quae dolore
          sapiente quia consectetur, voluptatum nobis, cupiditate obcaecati, dignissimos perferendis! Dicta at nesciunt
          ut? Doloribus, iure minus!
        </p>
      </div>
      <div className={cl.comm__item}>
        <div
          className={cl.avtor}
          style={{
            color: `${theme === 'dark' ? 'lightgrey' : '#000'}`,
          }}
        >
          <img src='/1.png' alt='' />
          <div className={cl.login}>kirito</div>
        </div>
        <p className={cl.description}>
          Lorem ipsum dolor sit amet consectetur, adipisicing elit. Neque assumenda excepturi incidunt quae dolore
          sapiente quia consectetur, voluptatum nobis, cupiditate obcaecati, dignissimos perferendis! Dicta at nesciunt
          ut? Doloribus, iure minus!
        </p>
      </div>
    </div>
  )
}
