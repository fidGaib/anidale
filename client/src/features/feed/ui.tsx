import { useState } from 'react'

import { ProfileMusicList } from '@/features/music'
import { assetUrl } from '@/shared/config'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import Posts from '@/widgets/post'

import cl from './ui.module.css'

const meshBlock = [
  { icon: assetUrl('icons/note.svg'), text: 'посты', layout: 1 },
  { icon: assetUrl('icons/music.svg'), text: 'музыка', layout: 3 },
  { icon: assetUrl('icons/video.svg'), text: 'видео', layout: 4 },
]

export const MeshBlockFeed = () => {
  const [layout, setLayout] = useState(1)
  return (
    <>
      <div className={cl.meshBlock}>
        {meshBlock.map((mesh) => {
          return (
            <div key={mesh.icon} className={cl.mesh} onClick={() => setLayout(mesh.layout)}>
              <ImageLoading src={mesh.icon} className={cl.meshIcon} />
              <p>{mesh.text}</p>
            </div>
          )
        })}
      </div>
      {layout === 1 ? <Posts /> : <></>}
      {layout === 3 ? <ProfileMusicList scope='all' canAdd={false} /> : <></>}
    </>
  )
}
