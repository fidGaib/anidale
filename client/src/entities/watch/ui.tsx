import { useRef } from 'react'
import ReactPlayer from 'react-player'
import screenfull from 'screenfull'

import { useDarkModeStore } from '@/app/module'
import { ControlsVideo } from '@/features/watch'
import { dataAnime, usePayerStore } from '@/pages/watch/module'

import cl from './ui.module.less'

export const ViedeoWrapper = () => {
  const ref__player = useRef()
  const refScreenfull = useRef()
  // store player
  const playing = usePayerStore((store) => store.playing)
  const volume = usePayerStore((store) => store.volume)
  const handle__progress = usePayerStore((store) => store.handle__progress)
  const handle_screenfull = () => {
    screenfull.toggle(refScreenfull.current)
  }
  const theme = useDarkModeStore((store) => store.theme)
  return (
    <>
      <p className={cl.title} style={{ color: `${theme === 'dark' ? 'lightgrey' : '#000'}` }}>
        {dataAnime[0].title}
      </p>
      {/* @ts-ignore */}
      <div className={cl.video__wrapper} ref={refScreenfull}>
        <ReactPlayer
          url={dataAnime[0].src}
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
      </div>
      <p className={cl.description}>{dataAnime[0].desc}</p>
    </>
  )
}
