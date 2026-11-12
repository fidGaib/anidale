import { useRef } from 'react'
import ReactPlayer from 'react-player/lazy'
import screenfull from 'screenfull'

import { useDarkModeStore } from '@/app/module'
import { ControlsVideo } from '@/features/watch'
import { usePayerStore } from '@/pages/watch/module'

import cl from './ui.module.css'

interface Props {
  title: string
  /** Адрес видеофайла; пустая строка — видео ещё не загружено. */
  src: string
  description?: string
}

export const ViedeoWrapper = ({ title, src, description }: Props) => {
  const ref__player = useRef<ReactPlayer>(null)
  const refScreenfull = useRef<HTMLDivElement>(null)
  // store player
  const playing = usePayerStore((store) => store.playing)
  const volume = usePayerStore((store) => store.volume)
  const handle__progress = usePayerStore((store) => store.handle__progress)
  const handle_screenfull = () => {
    if (refScreenfull.current) screenfull.toggle(refScreenfull.current)
  }
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
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              ref={ref__player}
              onProgress={handle__progress}
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
