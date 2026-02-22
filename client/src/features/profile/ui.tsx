import { useMutation } from '@apollo/client'
import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { MakePostImages, ProfileArts } from '@/entities/profile/ui'
import { CREATE_POST } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { usePostStore } from '@/shared/store'

import cl from './ui.module.less'

// Create post
export const MakePost = () => {
  const id = parseInt(useParams().id || '')
  const [error_create, description, images, removeImage, handleHeight, handleKeydown, setFiles, send] = usePostStore(
    (state) => [
      state.error_create,
      state.description,
      state.images,
      state.removeImage,
      state.handleHeight,
      state.handleKeydown,
      state.setFiles,
      state.send,
    ],
  )
  const [refreshData] = useRefreshStore((state) => [state.refreshData])
  const [createPost, { error, loading }] = useMutation(CREATE_POST)
  if (id !== refreshData.id) return <></>
  return (
    <>
      {error_create || error?.message ? <p className={cl.error}>{error_create || error?.message}</p> : <></>}
      <div className={cl.wrapper}>
        <div
          className={`playground ${cl.wrapperForm}`}
          style={{ borderRadius: images?.length ? ' 10px 10px 0 0' : '', padding: '10px' }}
        >
          <ImageLoading src={useSrcAvatar(refreshData.avatar || '')} className={cl.avatar} />
          <textarea
            className={cl.textarea}
            placeholder='Что у вас нового?'
            value={description}
            onKeyDown={(e) => handleKeydown(e, createPost, refreshData.id)}
            onChange={(e) => handleHeight(e)}
          />
          <label className={cl.label}>
            <ImageLoading className={cl.svg} src='/icons/add_photo.svg' />
            <input multiple type='file' hidden accept='image/*' onChange={(e) => setFiles(e.target.files!)} />
          </label>
          <ImageLoading className={cl.svg} src='/icons/send.svg' onClick={() => send(createPost, refreshData.id)} />
        </div>
        {images?.length ? <MakePostImages {...{ images, removeImage }} className={loading ? cl.loading : ''} /> : <></>}
      </div>
    </>
  )
}
// mesh block profile
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
            <div key={mesh.icon} className={cl.mesh} onClick={() => isLayout(mesh.layout)}>
              <ImageLoading src={mesh.icon} className={cl.meshIcon} />
              <p>{mesh.text}</p>
            </div>
          )
        })}
      </div>
      {layout === 1 ? <ProfileArts /> : <></>}
      {layout === 2 ? <ProfileMusic /> : <></>}
      {layout === 3 ? <ProfileVideo /> : <></>}
    </div>
  )
}
const ProfileMusic = () => {
  const arts = [{ src: '/1.png' }, { src: '/2.png' }, { src: '/4.png' }]
  return <div></div>
}
const ProfileVideo = () => {
  return <div></div>
}
