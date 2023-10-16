import { useQuery } from '@apollo/client'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'

import { MeshBlock } from '@/features/profile'
import { PROFILE } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import ButtonUI from '@/shared/ui/button'

import cl from './ui.module.less'

export const ArtWork = () => {
  const params = useParams()
  const id = parseInt(params.id || '')
  const [showModal, setModal] = useState(false)
  const { data } = useQuery(PROFILE, { variables: { id }, fetchPolicy: 'cache-and-network' })
  const user = {
    login: data?.getUser?.login,
    avatar: data?.getUser?.avatar,
  }
  document.title = `${user.login} - Профиль`

  return (
    <div className={cl.wrapper}>
      <div className={cl.artwork}>
        {showModal && (
          <div onClick={() => setModal(false)} className={cl.modalImage}>
            <ImageLoading src={useSrcAvatar(user.avatar || '')} alt='anidale' />
          </div>
        )}
        <ImageLoading
          onClick={() => setModal(true)}
          className={cl.avatar}
          src={useSrcAvatar(user.avatar || '')}
          alt='anidale'
        />
        <div className={cl.nickname}>{user.login || 'not found :('}</div>
      </div>
      <div className={cl.wrappSubscribe}>
        <Link to={'/chat'}>
          <ButtonUI>Написать</ButtonUI>
        </Link>
        <ButtonUI>Подписаться</ButtonUI>
      </div>
      <MeshBlock />
    </div>
  )
}
