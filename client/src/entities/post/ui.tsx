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

import { useDarkModeStore } from '@/app/module'
import { Post } from '@/shared/graphql/gql/graphql'
import { Modal } from '@/shared/hooks/Modal'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import ButtonUI from '@/shared/ui/button'

import cl from './ui.module.css'

export const PostOwner = ({ post }: { post: Post }) => {
  const theme = useDarkModeStore((store) => store.theme)
  return (
    <Link
      to={`/profile/${post?.user?.id}`}
      className={cl.wrappOwner}
      style={{ color: `${theme === 'dark' ? 'gray' : '#000'}` }}
    >
      <ImageLoading src={useSrcAvatar(post?.user?.avatar || '')} alt='anidale' />
      {post?.user?.login}
    </Link>
  )
}
export const PostActionWrapp = () => {
  return (
    <div className={cl.wrappActions}>
      <div className={cl.icon}>
        <ImageLoading src='/icons/like.svg' alt='anidale like icon' />
      </div>
      <div className={cl.icon}>
        <ImageLoading src='/icons/comm.svg' alt='anidale comments icon' />
      </div>
    </div>
  )
}
export const PostImages = ({ images }: Post) => {
  const [active__modal, setActiveModal] = useState(false)
  const [modalSrcArt, setModalSrcArt] = useState('')
  if (!images?.length) return <></>
  else
    return (
      <>
        <Modal active={active__modal} setActive={setActiveModal}>
          <div className={cl.artInModal}>
            <ImageLoading src={modalSrcArt} />
            <ButtonUI>Загрузить</ButtonUI>
            <ButtonUI>Поделиться</ButtonUI>
            <ButtonUI>Пожаловаться</ButtonUI>
          </div>
        </Modal>
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
            <SwiperSlide
              key={image?.medium! + image?.id}
              id={cl.childSwiper}
              onClick={() => {
                setModalSrcArt(`http://localhost:5000/storage/${image!.medium}.webp`)
                setActiveModal(true)
              }}
            >
              <ImageLoading className={cl.small} src={`http://localhost:5000/storage/${image!.small}.webp`} />
              <ImageLoading className={cl.medium} src={`http://localhost:5000/storage/${image!.medium}.webp`} />
            </SwiperSlide>
          ))}
        </Swiper>
      </>
    )
}
