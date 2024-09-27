import { useEffect, useState } from 'react'
import useSound from 'use-sound'

import Content from '@/shared/content'

import cl from './ui.module.less'
import memphis from '/memphis.mp3'

export const Music = () => {
  document.title = 'AniDale - Музыка'
  const [isPlaying, setIsPlaying] = useState(false)
  const [play, { pause, duration, sound }] = useSound(memphis)
  const playingButton = () => {
    if (isPlaying) {
      pause() // приостанавливаем воспроизведение звука
      setIsPlaying(false)
    } else {
      play() // воспроизводим аудиозапись
      setIsPlaying(true)
    }
  }
  const [currTime, setCurrTime] = useState({
    min: '',
    sec: '',
  })
  const [seconds, setSeconds] = useState() // текущая позиция звука в секундах
  const sec = duration!! / 1000
  const min = Math.floor(sec / 60)
  const secRemain = Math.floor(sec % 60)
  const time = {
    min: min,
    sec: secRemain,
  }
  useEffect(() => {
    const interval = setInterval(() => {
      if (sound) {
        setSeconds(sound.seek([])) // устанавливаем состояние с текущим значением в секундах
        const min = Math.floor(sound.seek([]) / 60)
        const sec = Math.floor(sound.seek([]) % 60)
        setCurrTime({
          min: min.toString(),
          sec: sec.toString(),
        })
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [sound])
  return (
    <Content id={cl.content}>
      <ul className={`playground ${cl.head_music}`} style={{ borderRadius: '10px 10px 0 0' }}>
        <p>Плеер</p>
      </ul>
      <div className={`playground ${cl.stateMusic}`} style={{ borderRadius: '0 0 10px 10px' }}>
        <img
          className={cl.preview}
          src='https://assets.faceit-cdn.net/avatars/cdf4e907-bfc3-4c5b-86be-15663126d4de_1605010404640.jpg'
        />
        <div>
          <div className={cl.time}>
            <p>
              {currTime.min}:{currTime.sec}
            </p>
          </div>
          <input
            type='range'
            min='0'
            max={duration!! / 1000}
            defaultValue='0'
            value={seconds}
            className={cl.timeline}
            onChange={(e) => {
              sound.seek([e.target.value])
            }}
            style={{ backgroundColor: 'brown', scrollbarColor: 'brown' }}
          />
        </div>
        <div className={cl.settings}>
          <img className={cl.musicIcons} src='/icons/skip_music_rotate.svg' />
          {!isPlaying ? (
            <img onClick={playingButton} className={cl.musicIcons} src='/icons/play.svg' />
          ) : (
            <img onClick={playingButton} className={cl.musicIcons} src='/icons/pause.svg' />
          )}
          <img className={cl.musicIcons} src='/icons/skip_music.svg' />
        </div>
      </div>
      <ul className={`playground ${cl.head_music}`} style={{ borderRadius: '10px', marginTop: 5 }}>
        <p>Моя музыка</p>
      </ul>
      <div className={`playground ${cl.one_child}`}>
        <img onClick={playingButton} src='/1.png' />
        <div className={cl.info_music}>
          <div className={cl.title}>memphis 9mm</div>
          <div className={cl.owner}>memphis 9mm edit, basiska</div>
        </div>
      </div>
      <div className={`playground ${cl.one_child}`}>
        <img onClick={playingButton} src='/2.png' />
        <div className={cl.info_music}>
          <div className={cl.title}>alisa</div>
          <div className={cl.owner}>alisa edit, basiska</div>
        </div>
      </div>
      <div className={`playground ${cl.one_child}`}>
        <img onClick={playingButton} src='/4.png' />
        <div className={cl.info_music}>
          <div className={cl.title}>BASS</div>
          <div className={cl.owner}>BASS edit, basiska</div>
        </div>
      </div>
    </Content>
  )
}
export const MusicOne = () => {
  return (
    <div className={cl.one_child}>
      <img src='/2.png' />
      <div className={cl.info_music}>
        <div className={cl.title}>memphis 9mm</div>
        <div className={cl.owner}>memphis 9mm edit, basiska</div>
      </div>
    </div>
  )
}
