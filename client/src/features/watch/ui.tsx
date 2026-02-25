import { useDarkModeStore } from '@/app/module'
import { usePayerStore } from '@/pages/watch/module'
import Input from '@/shared/ui/input'

import cl from './ui.module.css'

export const ControlsVideo = ({ ref__player, handle_screenfull }: any) => {
  const handle__volume = usePayerStore((store) => store.handle__volume)
  const handle__play = usePayerStore((store) => store.handle__play)
  const handle_prodress_track = usePayerStore((store) => store.handle_prodress_track)
  const loadedSeconds = usePayerStore((store) => store.loadedSeconds)
  const playedSeconds = usePayerStore((store) => store.playedSeconds)
  const playing = usePayerStore((store) => store.playing)
  const volume = usePayerStore((store) => store.volume)

  return (
    <>
      <div className={cl.video__controls_play} onClick={handle__play}>
        {playing ? <img src='/icons/pause.svg' alt='' /> : <img src='/icons/play.svg' alt='' />}
      </div>
      <div className={cl.video__controls}>
        <input
          type='range'
          onChange={handle__volume}
          min={0}
          max={1}
          value={volume}
          step={0.1}
          className={cl.video__controls_volume}
        />
        <input
          type='range'
          onChange={(e: any) => {
            handle_prodress_track(e.target.value, ref__player)
            console.log(playedSeconds)
          }}
          min={0}
          max={loadedSeconds}
          value={playedSeconds}
          step={1}
          className={cl.video__controls_track}
        />
        <img
          width={'30px'}
          style={{ marginLeft: '20px', cursor: 'pointer' }}
          onClick={handle_screenfull}
          src='/icons/fullscreen.svg'
          alt=''
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
