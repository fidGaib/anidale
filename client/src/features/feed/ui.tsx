import { lazy, Suspense, useState } from 'react'

import { assetUrl } from '@/shared/config'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { Plug } from '@/shared/ui/plug'
import Posts from '@/widgets/post'

import cl from './ui.module.css'

// Музыкальная вкладка нужна только по клику — не тянем AudioPlayer/Howler в первый экран ленты.
const ProfileMusic = lazy(() => import('@/entities/profile').then((module) => ({ default: module.ProfileMusic })))

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
      {layout === 3 ? (
        <Suspense fallback={<Plug />}>
          <ProfileMusic />
        </Suspense>
      ) : (
        <></>
      )}
    </>
  )
}
