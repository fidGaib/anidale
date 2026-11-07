import { useMutation } from '@apollo/client'
import { useEffect, useRef, useState } from 'react'

import Content from '@/shared/content'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useAudioPlayer } from '@/shared/hooks/useAudioPlayer'

import cl from './ui.module.css'
import memphis from '/memphis.mp3'

export const Music = () => {
  document.title = 'AniDale - Музыка'
  const { playingButton } = useAudioPlayer(memphis)
  return (
    <Content id={cl.content}>
      <AudioPlayer />
      <OneMusic playingButton={playingButton} title={'Неизвестный трек'} artist={'Неизвестный исполнитель'} />
      <OneMusic playingButton={playingButton} title={'Неизвестный трек'} artist={'Неизвестный исполнитель'} />
    </Content>
  )
}
export const AudioPlayer = () => {
  // const { isPlaying, currTime, seconds, totalDuration, durationFormatted, playingButton, handleSeek, rangeRef } =
  //   useAudioPlayer(memphis)
  // const [musicFiles, setMusicFiles] = useState([])
  // const [musicList, setMusicList] = useState([])
  // const fileInputRef = useRef(null)
  // const loadMusic = () => {
  //   fileInputRef.current?.click()
  // }
  // const handleFileChange = async (event: any) => {
  //   const files = Array.from(event.target.files)
  //   const MAX_FILE_SIZE = 15 * 1024 * 1024
  //   const validFiles = files.filter((file) => file.size <= MAX_FILE_SIZE && file.type.startsWith('audio/'))
  //   if (validFiles.length !== files.length) {
  //     alert('Некоторые файлы слишком большие или не являются аудио.')
  //   }
  //   setMusicFiles((prev) => [...prev, ...files])

  //   if (files.length > 0) {
  //     const firstFileUrl = URL.createObjectURL(files[0])
  //     const [createPost, { error, loading }] = useMutation(loadMusicQuery)
  //     await createPost({variables: {music}}).then((res: any) => {
  //       setMusicList((prev) => [...prev, ...res.data])
  //   })
  // }
  // useEffect(() => {
  //   return () => {
  //     musicFiles.forEach((file) => URL.revokeObjectURL(URL.createObjectURL(file)))
  //   }
  // }, [musicFiles])

  return (
    <div className={`playground ${cl.parent_music}`}>
      <ul className={` ${cl.head_music}`} style={{ borderRadius: '10px 10px 0 0' }}>
        <p>Плеер</p>
        <input
          type='file'
          // ref={fileInputRef}
          // onChange={handleFileChange}
          accept='audio/*'
          multiple
          style={{ display: 'none' }}
        />
        <ImageLoading
          // onClick={
          //   // loadMusic
          //   }
          className={cl.load_music}
          src={'/icons/plus.png'}
        />
      </ul>
      <div className={`${cl.stateMusic}`} style={{ borderRadius: '0 0 10px 10px' }}>
        <img className={cl.preview} src={'/1.png'} />
        <div>
          <div className={cl.time}>
            <p>{/* {currTime.min}:{currTime.sec} / {durationFormatted.min}:{durationFormatted.sec} */}</p>
          </div>
          {/* <input
            ref={rangeRef}
            type='range'
            min='0'
            max={totalDuration}
            value={seconds}
            className={cl.timeline}
            onChange={handleSeek}
            style={{ backgroundColor: 'brown', scrollbarColor: 'brown' }}
          /> */}
        </div>
        <div className={cl.settings}>
          <img className={cl.musicIcons} src='/icons/skip_music_rotate.svg' />
          {/* {!isPlaying ? (
            <img onClick={playingButton} className={cl.musicIcons} src='/icons/play.svg' />
          ) : (
            <img onClick={playingButton} className={cl.musicIcons} src='/icons/pause.svg' />
          )} */}
          <img className={cl.musicIcons} src='/icons/skip_music.svg' />
        </div>
      </div>
    </div>
  )
}
export const OneMusic = ({ playingButton, title, artist }: any) => {
  return (
    <div className={`playground ${cl.one_child}`}>
      <img onClick={playingButton} src='/1.png' />
      <div className={cl.info_music}>
        <div className={cl.title}>{title}</div>
        <div className={cl.owner}>{artist}</div>
      </div>
    </div>
  )
}
