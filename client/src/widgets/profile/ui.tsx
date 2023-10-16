import { useQuery } from '@apollo/client'
import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { MeshBlock } from '@/features/profile'
import { PROFILE } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'

import cl from './ui.module.less'

interface Props {
  user: {
    avatar?: string
    login?: string
  }
}
export const defaultAvatar =
  'http://anime.com.ru/modules/coppermine/albums_for_animecomru/Anime_CG/Anime_Pictures_2013/ES_08/20/601767.jpg'
export const ArtWork = () => {
  const params = useParams()
  const id = parseInt(params.id || '')
  const [showModal, setModal] = useState(false)
  const { data } = useQuery(PROFILE, { variables: { id }, fetchPolicy: 'network-only' })
  const user = {
    login: data?.getUser?.login,
    avatar: data?.getUser?.avatar,
  }
  document.title = `${data?.getUser?.login} - Профиль`
  return (
    <div className={cl.wrapper}>
      <div className={cl.artwork}>
        {showModal && (
          <div onClick={() => setModal(false)} className={cl.modalImage}>
            <ImageLoading src={useSrcAvatar(user.avatar || defaultAvatar)} alt='anidale' />
          </div>
        )}
        <ImageLoading
          onClick={() => setModal(true)}
          className={cl.avatar}
          src={useSrcAvatar(user.avatar || defaultAvatar)}
          alt='anidale'
        />
        <div className={cl.nickname}>{user.login || 'not found :('}</div>
      </div>
      <MeshBlock />
    </div>
  )
}
