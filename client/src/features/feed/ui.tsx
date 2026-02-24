import { useState } from 'react'
import { FreeMode } from 'swiper'
import { Swiper, SwiperSlide } from 'swiper/react'

import { ProfileArts, ProfileMusic } from '@/entities/profile'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import Posts from '@/widgets/post'

import cl from './ui.module.less'

export const MeshBlockFeed = () => {
  const meshBlock = [
    { icon: '/icons/note.svg', text: 'посты', layout: 1 },
    { icon: '/icons/arts.svg', text: 'арты', layout: 2 },
    { icon: '/icons/music.svg', text: 'музыка', layout: 3 },
    { icon: '/icons/video.svg', text: 'видео', layout: 4 },
  ]
  const [layout, isLayout] = useState(1)
  return (
    <>
      <div className={cl.meshBlock}>
        <Swiper
          spaceBetween={0}
          modules={[FreeMode]}
          width={350}
          breakpoints={{
            280: {
              slidesPerView: 4,
            },
          }}
        >
          {meshBlock.map((mesh) => {
            return (
              <SwiperSlide key={mesh.icon} className={cl.mesh} onClick={() => isLayout(mesh.layout)}>
                <ImageLoading src={mesh.icon} className={cl.meshIcon} />
                <p>{mesh.text}</p>
              </SwiperSlide>
            )
          })}
        </Swiper>
      </div>
      {layout === 1 ? <Posts /> : <></>}
      {layout === 2 ? <ProfileArts /> : <></>}
      {layout === 3 ? <ProfileMusic /> : <></>}
    </>
  )
}
