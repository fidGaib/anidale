import { Link } from 'react-router-dom'
// import required modules
import { FreeMode, Navigation } from 'swiper'
import 'swiper/css/free-mode'
import 'swiper/css/navigation'
// swiper
import { Swiper, SwiperSlide } from 'swiper/react'
// Import Swiper styles
import 'swiper/swiper.min.css'

import { PostDropdownMenu } from '@/features/post'
import { Post } from '@/shared/graphql/gql/graphql'
import Icon from '@/shared/icons'

import cl from './ui.module.less'

export const PostOwner = ({ post }: { post: Post }) => {
  return (
    <Link to={`/profile/${post?.user?.id}`} className={cl.wrappOwner}>
      <img src={post?.user?.avatar || ''} alt='' />
      {post?.user?.login}
      <PostDropdownMenu id={post?.id || 0} userId={post?.user?.id || 0} />
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
            <img className={cl.medium} src={`http://localhost:5000/storage/${image?.medium}.webp`} />
            <img className={cl.small} src={`http://localhost:5000/storage/${image?.small}.webp`} />
          </SwiperSlide>
        ))}
      </Swiper>
    </>
  )
}
