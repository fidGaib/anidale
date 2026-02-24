import { HTMLAttributes, useState } from 'react'
import Dropzone from 'react-dropzone'
import { useParams } from 'react-router-dom'

import { useSettingsStore } from '@/features/settings/module'
import { AudioPlayer, OneMusic } from '@/pages/music'
import { Modal } from '@/shared/hooks/Modal'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useAudioPlayer } from '@/shared/hooks/useAudioPlayer'
import ButtonUI from '@/shared/ui/button'

import cl from './ui.module.less'
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
export const ProfileArts = () => {
  const [arts, setArts] = useState([{ src: '/1.png' }, { src: '/2.png' }, { src: '/4.png' }])
  const [active__modal, setActiveModal] = useState(false)
  const [modalSrcArt, setModalSrcArt] = useState('')
  const [image, setImage] = useState<File | string>('')
  const validateFile = useSettingsStore((state) => state.validateFile)
  // Обработка загрузки файла
  const handleDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      if (await validateFile(acceptedFiles)) {
        setImage(acceptedFiles[0])
      }
    }
  }
  const { id } = useParams()
  return (
    <>
      {id ? (
        <div className={cl.loadArt}>
          {/* Зона загрузки */}
          {!image && (
            <Dropzone onDrop={handleDrop} accept={{ 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] }}>
              {({ getRootProps, getInputProps }) => (
                <div {...getRootProps()} className={cl.dropzone}>
                  <input {...getInputProps()} />
                  <ImageLoading src='/icons/add_photo.svg' />
                </div>
              )}
            </Dropzone>
          )}
        </div>
      ) : (
        <></>
      )}
      <div className={cl.pinterestGrid}>
        <Modal active={active__modal} setActive={setActiveModal}>
          <div className={cl.artInModal}>
            <ImageLoading src={modalSrcArt} />
            <ButtonUI>Загрузить</ButtonUI>
            <ButtonUI>Поделиться</ButtonUI>
            <ButtonUI>Пожаловаться</ButtonUI>
          </div>
        </Modal>
        {arts.map((image, i) => {
          return (
            <>
              <div
                key={image.src + i}
                className={cl.gridItem}
                onClick={() => {
                  setModalSrcArt(image.src)
                  setActiveModal(true)
                }}
              >
                <ImageLoading src={image.src} />
              </div>
            </>
          )
        })}
      </div>
    </>
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
