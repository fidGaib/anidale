import { useMutation, useReactiveVar } from '@apollo/client'
import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { VarAuthData } from '@/app/providers/routes/AppRouter'
import { MakePostImages, ProfileArts } from '@/entities/profile/ui'
import { CREATE_POST } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { usePostStore } from '@/shared/store'

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
      {error_create || error?.message ? <p className={cl.error}>{error_create || error?.message}</p> : <></>}
      <div className={cl.wrapper}>
        <div
          className={`playground ${cl.wrapperForm}`}
          style={{ borderRadius: images?.length ? ' 10px 10px 0 0' : '', padding: '10px' }}
        >
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
        {images?.length ? <MakePostImages {...{ images, removeImage }} className={loading ? cl.loading : ''} /> : <></>}
      </div>
    </>
  )
}
export const MeshBlockProfile = () => {
  const meshBlock = [
    { icon: '/icons/arts.svg', text: 'арты', layout: 1 },
    { icon: '/icons/music.svg', text: 'музыка', layout: 2 },
    { icon: '/icons/video.svg', text: 'видео', layout: 3 },
  ]
  const [layout, isLayout] = useState(1)
  return (
    <div className={cl.wrapArts}>
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
      {layout === 1 ? <ProfileArts /> : <></>}
      {layout === 2 ? 'музыка' : <></>}
      {layout === 3 ? 'видео' : <></>}
    </div>
  )
}
