import { useState } from 'react'

import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import Posts from '@/widgets/post'

import cl from './ui.module.less'

export const MeshBlockFeed = () => {
  const meshBlock = [
    { icon: '/icons/feed.svg', text: 'записи', layout: 1 },
    { icon: '/icons/note.svg', text: 'статьи', layout: 2 },
    { icon: '/icons/manga.svg', text: 'манги', layout: 3 },
    { icon: '/icons/arts.svg', text: 'арты', layout: 4 },
    { icon: '/icons/music.svg', text: 'музыка', layout: 5 },
    { icon: '/icons/video.svg', text: 'видео', layout: 6 },
  ]
  const [layout, isLayout] = useState(1)
  return (
    <>
      <div className={cl.meshBlock}>
        {meshBlock.map((mesh) => {
          return (
            <div key={mesh.icon} className={cl.mesh} onClick={() => isLayout(mesh.layout)}>
              <ImageLoading src={mesh.icon} className={cl.meshIcon} />
              <p>{mesh.text}</p>
            </div>
          )
        })}
      </div>
      {layout === 1 ? <Posts /> : <></>}
      {layout === 2 ? 'статьи' : <></>}
      {layout === 3 ? 'манги' : <></>}
      {layout === 4 ? 'арты' : <></>}
      {layout === 5 ? 'музыка' : <></>}
      {layout === 6 ? 'видео' : <></>}
    </>
  )
}
