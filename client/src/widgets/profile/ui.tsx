import { useState } from 'react'

import { MeshBlock } from '@/features/profile'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'

import cl from './ui.module.less'

interface Props {
  avatar?: string
  login?: string
}
export const defaultAvatar =
  'http://anime.com.ru/modules/coppermine/albums_for_animecomru/Anime_CG/Anime_Pictures_2013/ES_08/20/601767.jpg'
export const ArtWork = ({ avatar, login }: Props) => {
  const [showModal, setModal] = useState(false)
  return (
    <div className={cl.wrapper}>
      <div className={cl.artwork}>
        {showModal && (
          <div onClick={() => setModal(false)} className={cl.modalImage}>
            <ImageLoading src={useSrcAvatar(avatar || defaultAvatar)} alt='anidale' />
          </div>
        )}
        <ImageLoading
          onClick={() => setModal(true)}
          className={cl.avatar}
          src={useSrcAvatar(avatar || defaultAvatar)}
          alt='anidale'
        />
        <div className={cl.nickname}>{login || 'not found :('}</div>
      </div>
      <MeshBlock />
    </div>
  )
}
