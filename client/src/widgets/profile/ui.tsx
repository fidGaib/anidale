import { useQuery } from '@apollo/client'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { FreeMode } from 'swiper'
import 'swiper/css/free-mode'
import 'swiper/css/navigation'
import { Swiper, SwiperSlide } from 'swiper/react'
import 'swiper/swiper.min.css'

import { useRefreshStore } from '@/app/providers/routes/model'
import { ProfileMusic } from '@/entities/profile'
import { MakePost } from '@/features/profile'
import { PROFILE } from '@/shared/graphql/schema'
import { Modal } from '@/shared/hooks/Modal'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import ButtonUI from '@/shared/ui/button'

import Posts from '../post'
import cl from './ui.module.css'

export const ArtWork = () => {
  const params = useParams()
  const id = parseInt(params.id || '')
  const { data } = useQuery(PROFILE, { variables: { id }, fetchPolicy: 'network-only' })
  const user = {
    login: data?.getUser?.login,
    avatar: data?.getUser?.avatar,
  }
  document.title = `${user.login} - Профиль`

  const [refreshData] = useRefreshStore((state) => [state.refreshData])

  const avatar = useSrcAvatar(user.avatar || '')

  const meshBlock = [
    { icon: '/icons/arts.svg', text: 'посты', layout: 1 },
    { icon: '/icons/music.svg', text: 'музыка', layout: 2 },
    { icon: '/icons/video.svg', text: 'видео', layout: 3 },
  ]
  const [layout, isLayout] = useState(1)
  const [active__modal, setActiveModal] = useState(false)
  const [modalSrcArt, setModalSrcArt] = useState('')
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
      <div className={`playground ${cl.wrapper}`} style={{ padding: 0 }}>
        <div className={cl.artwork}>
          <ImageLoading
            onClick={() => {
              setModalSrcArt(avatar)
              setActiveModal(true)
            }}
            className={cl.avatar}
            src={avatar}
          />
          <ImageLoading id={cl.edit_profile_ico} src='/icons/edit.svg' className={cl.meshIcon} />
          <div id={cl.loginWrap}>
            <div className={`playground ${cl.nickname}`}>
              {user.login || 'not found :('}{' '}
              <ImageLoading id={cl.edit_login_ico} src='/icons/edit.svg' className={cl.meshIcon} />
            </div>
          </div>
        </div>
        {refreshData.id !== id ? (
          <div className={cl.wrappSubscribe}>
            <Link to={'/chat'}>
              <ButtonUI>Написать</ButtonUI>
            </Link>
            <ButtonUI>Подписаться</ButtonUI>
          </div>
        ) : (
          <></>
        )}
        <div className={cl.wrapperSwiper}>
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
        {layout === 2 ? <ProfileMusic /> : <></>}
        {layout === 3 ? <></> : <></>}
      </div>
      {layout === 1 ? (
        <>
          <MakePost />
          <Posts />
        </>
      ) : (
        <></>
      )}
    </>
  )
}
