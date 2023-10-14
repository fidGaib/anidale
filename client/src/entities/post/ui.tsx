import { useState } from 'react'
import { Link } from 'react-router-dom'
// import required modules
import { FreeMode, Navigation } from 'swiper'
import 'swiper/css/free-mode'
import 'swiper/css/navigation'
// swiper
import { Swiper, SwiperSlide } from 'swiper/react'
// Import Swiper styles
import 'swiper/swiper.min.css'

import { Post } from '@/shared/graphql/gql/graphql'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import Icon from '@/shared/icons'
import { defaultAvatar } from '@/widgets/profile'

import cl from './ui.module.less'

export const PostOwner = ({ post }: { post: Post }) => {
  return (
    <Link to={`/profile/${post?.user?.id}`} className={cl.wrappOwner}>
      <ImageLoading src={useSrcAvatar(post?.user?.avatar || defaultAvatar)} alt='anidale' />
      {post?.user?.login}
    </Link>
  )
}
export const PostDescription = ({ description }: Post) => {
  return <>{description && <div className={cl.text}>{description}</div>}</>
}
export const PostActionWrapp = () => {
  return (
    <div className={cl.wrappActions}>
      <div className={cl.icon}>
        <Icon iconId='like' />
      </div>
      <div className={cl.icon}>
        <Icon iconId='comm' />
      </div>
    </div>
  )
}
export const PostImages = ({ images }: Post) => {
  const [showModal, setModal] = useState(false)
  return (
    <>
      <Swiper
        style={{
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          '--swiper-navigation-color': '#fff',
          '--swiper-pagination-color': '#fff',
        }}
        spaceBetween={0}
        navigation={true}
        modules={[FreeMode, Navigation]}
        className={cl.wrappImages}
      >
        {images?.map((image) => (
          <SwiperSlide key={image?.id} id={cl.childSwiper}>
            <ImageLoading className={cl.small} src={`http://localhost:5000/storage/${image?.small}.webp`} />
            <ImageLoading
              onClick={() => setModal(true)}
              className={cl.medium}
              src={`http://localhost:5000/storage/${image?.medium}.webp`}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </>
  )
}
