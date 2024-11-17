import { HTMLAttributes } from 'react'
// import required modules
import { FreeMode, Navigation } from 'swiper'
import 'swiper/css/free-mode'
import 'swiper/css/navigation'
// swiper
import { Swiper, SwiperSlide } from 'swiper/react'
// Import Swiper styles
import 'swiper/swiper.min.css'

import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'

import cl from './ui.module.less'

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
  const arts = [
    { src: '/1.png' },
    { src: '/2.png' },
    {
      src: '/4.png',
    },
  ]
  return (
    <div className={cl.meshContent}>
      <Swiper
        style={{
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          '--swiper-navigation-color': '#fff',
          '--swiper-pagination-color': '#fff',

          width: '100%',
        }}
        spaceBetween={0}
        navigation={true}
        modules={[FreeMode, Navigation]}
        className={cl.wrappImages}
      >
        {arts.map((art) => {
          return (
            <SwiperSlide key={art.src} id={cl.childSwiper}>
              <ImageLoading className={cl.item} src={art.src} />
            </SwiperSlide>
          )
        })}
      </Swiper>
    </div>
  )
}
