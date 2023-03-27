import { MeshBlock } from '@/features/profile'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'

import cl from './ui.module.less'

interface Props {
  avatar?: string
  login?: string
}
const defaultAvatar =
  'http://anime.com.ru/modules/coppermine/albums_for_animecomru/Anime_CG/Anime_Pictures_2013/ES_08/20/601767.jpg'
export const ArtWork = ({ avatar, login }: Props) => {
  return (
    <div className={cl.wrapper}>
      <div className={cl.artwork}>
        <ImageLoading className={cl.avatar} src={avatar || defaultAvatar} alt='anidale' />
        <div className={cl.nickname}>{login || 'not found :('}</div>
      </div>
      <MeshBlock />
    </div>
  )
}
