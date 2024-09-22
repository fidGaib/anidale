import { useMutation, useReactiveVar } from '@apollo/client'
import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { VarAuthData } from '@/app/providers/routes/AppRouter'
import { MakePostImages } from '@/entities/profile/ui'
import { CREATE_POST } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { usePostStore } from '@/shared/store'
import { Posts } from '@/widgets/post'

import cl from './ui.module.less'

export const MakePost = () => {
  const params = useParams()
  const id = parseInt(params.id || '')
  const error_create = usePostStore((state) => state.error)
  const description = usePostStore((state) => state.description)
  const images = usePostStore((state) => state.images)
  const removeImage = usePostStore((state) => state.removeImage)
  const handleKeydown = usePostStore((state) => state.handleKeydown)
  const handleHeight = usePostStore((state) => state.handleHeight)
  const setFiles = usePostStore((state) => state.setFiles)
  const send = usePostStore((state) => state.send)
  const AuthData = useReactiveVar(VarAuthData)
  const [createPost, { error, loading }] = useMutation(CREATE_POST)
  if (id !== AuthData.id) return <></>
  return (
    <>
      <p className={cl.error}>{error_create || `${error ? error!.message : ''}`}</p>
      <div className={cl.wrapper}>
        <div className='playground' style={{ borderRadius: images?.length ? ' 10px 10px 0 0' : '' }}>
          <div className={cl.wrapperForm}>
            <ImageLoading src={useSrcAvatar(AuthData.avatar)} className={cl.avatar} />
            <textarea
              className={cl.textarea}
              placeholder='Что у вас нового?'
              value={description}
              onKeyDown={(e) => handleKeydown(e, createPost, AuthData.id)}
              onChange={(e) => handleHeight(e)}
            />
            <label className={cl.label}>
              <ImageLoading className={cl.svg} src='/icons/add_photo.svg' />
              <input multiple type='file' hidden accept='image/*' onChange={(e) => setFiles(e.target.files!)} />
            </label>
            <ImageLoading className={cl.svg} src='/icons/send.svg' onClick={() => send(createPost, AuthData.id)} />
          </div>
        </div>
        {images?.length ? (
          <div className='playground' style={{ borderRadius: '0 0 10px 10px' }}>
            <MakePostImages {...{ images, removeImage }} className={loading ? cl.loading : ''} />{' '}
          </div>
        ) : (
          ''
        )}
      </div>
    </>
  )
}
export const MeshBlock = () => {
  return (
    <div>
      <div className={cl.meshBlock}>
        <div className={cl.mesh}>
          <ImageLoading src='/icons/arts.svg' className={cl.meshIcon} />
          <p>арты</p>
        </div>
        <div className={cl.mesh}>
          <ImageLoading src='/icons/music.svg' className={cl.meshIcon} />
          <p>музыка</p>
        </div>
        <div className={cl.mesh}>
          <ImageLoading src='/icons/arts.svg' className={cl.meshIcon} />
          <p>видео</p>
        </div>
      </div>
      <div className={cl.meshContent}>
        <ImageLoading src='https://cdn-edge.kwork.ru/files/portfolio/t3/63/7dd54f6bf3060c4f510220a5fb82aa6cef9c5a6a-1694447704.jpg' />
        <ImageLoading src='https://assets.faceit-cdn.net/avatars/cdf4e907-bfc3-4c5b-86be-15663126d4de_1605010404640.jpg' />
        <ImageLoading src='https://sun1-85.userapi.com/s/v1/ig2/dSMwJSDis-Ihq2TYoxBCUFPtOX0xDaanZLckoYbYK5df9R7z9MVrPCitFgELrKLDLrBLlWu3wpce7XWp6I67qXLP.jpg?size=200x200&quality=96&crop=0,0,400,400&ava=1' />
        <ImageLoading src='https://assets.faceit-cdn.net/avatars/cdf4e907-bfc3-4c5b-86be-15663126d4de_1605010404640.jpg' />
        <ImageLoading src='https://masterpiecer-images.s3.yandex.net/6dabddb577de11ee9dbbceda526c50ab:upscaled' />
        <ImageLoading src='https://sun1-85.userapi.com/s/v1/ig2/dSMwJSDis-Ihq2TYoxBCUFPtOX0xDaanZLckoYbYK5df9R7z9MVrPCitFgELrKLDLrBLlWu3wpce7XWp6I67qXLP.jpg?size=200x200&quality=96&crop=0,0,400,400&ava=1' />
        <ImageLoading src='https://masterpiecer-images.s3.yandex.net/1ac814dd6ad311ee81b4429f31467427:upscaled' />
        <ImageLoading src='https://img.freepik.com/premium-photo/sad-anime-girl-avatar_950633-124.jpg' />
        <p>Показать ещё</p>
      </div>
    </div>
  )
}

export const MeshBlockFeed = () => {
  const [meshBlock, isMeshBlock] = useState([
    { icon: '/icons/feed.svg', text: 'записи', layout: 1 },
    { icon: '/icons/note.svg', text: 'статьи', layout: 2 },
    { icon: '/icons/manga.svg', text: 'манги', layout: 3 },
    { icon: '/icons/arts.svg', text: 'арты', layout: 4 },
    { icon: '/icons/music.svg', text: 'музыка', layout: 5 },
    { icon: '/icons/video.svg', text: 'видео', layout: 6 },
  ])
  const [layout, isLayout] = useState(1)
  return (
    <>
      <div className={cl.meshBlock}>
        {meshBlock.map((mesh) => {
          return (
            <div className={cl.mesh} onClick={() => isLayout(mesh.layout)}>
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
