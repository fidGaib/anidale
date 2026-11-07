import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { useDarkModeStore } from '@/app/module'
import { assetUrl, storageUrl } from '@/shared/config'
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
        <ImageLoading src={assetUrl('icons/like.svg')} alt='anidale like icon' />
      </div>
      <div className={cl.icon}>
        <ImageLoading src={assetUrl('icons/comm.svg')} alt='anidale comments icon' />
      </div>
    </div>
  )
}
export const PostImages = ({ images }: Post) => {
  const [active__modal, setActiveModal] = useState(false)
  const [modalSrcArt, setModalSrcArt] = useState('')
  const scrollerRef = useRef<HTMLDivElement>(null)

  if (!images?.length) return <></>

  const scrollByPage = (direction: 1 | -1) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollBy({ left: direction * scroller.clientWidth, behavior: 'smooth' })
  }

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
      <div className={cl.wrappImages}>
        <div className={cl.scroller} ref={scrollerRef}>
          {images.map((image, index) => (
            <div
              key={`${image?.id ?? index}-${image?.medium ?? ''}`}
              className={cl.imageSlide}
              onClick={() => {
                setModalSrcArt(storageUrl(`${image?.medium ?? ''}.webp`))
                setActiveModal(true)
              }}
            >
              <ImageLoading className={cl.small} src={storageUrl(`${image?.small ?? ''}.webp`)} />
              <ImageLoading className={cl.medium} src={storageUrl(`${image?.medium ?? ''}.webp`)} />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <>
            <button
              type='button'
              aria-label='Предыдущее изображение'
              className={`${cl.navButton} ${cl.navPrev}`}
              onClick={() => scrollByPage(-1)}
            >
              ‹
            </button>
            <button
              type='button'
              aria-label='Следующее изображение'
              className={`${cl.navButton} ${cl.navNext}`}
              onClick={() => scrollByPage(1)}
            >
              ›
            </button>
          </>
        )}
      </div>
    </>
  )
}
