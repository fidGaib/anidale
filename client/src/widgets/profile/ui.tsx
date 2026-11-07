import { useQuery } from '@apollo/client'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { ProfileMusic } from '@/entities/profile'
import { MakePost } from '@/features/profile'
import { PROFILE } from '@/shared/graphql/schema'
import { Modal } from '@/shared/hooks/Modal'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { assetUrl } from '@/shared/config'
import ButtonUI from '@/shared/ui/button'

import Posts from '../post'
import cl from './ui.module.css'

const meshBlock = [
  { icon: assetUrl('icons/arts.svg'), text: 'посты', layout: 1 },
  { icon: assetUrl('icons/music.svg'), text: 'музыка', layout: 2 },
  { icon: assetUrl('icons/video.svg'), text: 'видео', layout: 3 },
]

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
          <ImageLoading id={cl.edit_profile_ico} src={assetUrl('icons/edit.svg')} className={cl.meshIcon} />
          <div id={cl.loginWrap}>
            <div className={`playground ${cl.nickname}`}>
              {user.login || 'not found :('}{' '}
              <ImageLoading id={cl.edit_login_ico} src={assetUrl('icons/edit.svg')} className={cl.meshIcon} />
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
          {meshBlock.map((mesh) => {
            return (
              <div key={mesh.icon} className={cl.mesh} onClick={() => isLayout(mesh.layout)}>
                <ImageLoading src={mesh.icon} className={cl.meshIcon} />
                <p>{mesh.text}</p>
              </div>
            )
          })}
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
