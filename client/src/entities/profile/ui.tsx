import { HTMLAttributes, useState } from 'react'

import { AudioPlayer, OneMusic } from '@/pages/music'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useAudioPlayer } from '@/shared/hooks/useAudioPlayer'

import cl from './ui.module.css'
import memphis from '/memphis.mp3'

interface Props extends HTMLAttributes<HTMLElement> {
  className: string
  images: File[]
  removeImage(i: File): void
}
export const MakePostImages: React.FC<Props> = ({ className, images, removeImage, ...rest }) => {
  return (
    <div
      className={`playground ${cl.imagesPreview} ${className}`}
      {...rest}
      style={{ borderRadius: images?.length ? ' 0 0 10px 10px' : '', paddingTop: '0' }}
    >
      {images.map((image) => (
        <div key={image.size} className={cl.imagePreviewWrapper}>
          <ImageLoading
            key={image.name}
            className={cl.imagePreviewClose}
            src={'/icons/close.svg'}
            onClick={() => removeImage(image)}
            alt='anidale close svg'
          />
          <ImageLoading className={cl.imagePreview} src={URL.createObjectURL(image)} />
        </div>
      ))}
    </div>
  )
}
export const ProfileMusic = () => {
  const { playingButton } = useAudioPlayer(memphis)
  return (
    <>
      <AudioPlayer />
      <OneMusic playingButton={playingButton} title={'Неизвестный трек'} artist={'Неизвестный исполнитель'} />
    </>
  )
}
