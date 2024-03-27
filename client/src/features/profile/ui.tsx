import { useMutation } from '@apollo/client'
import { useParams } from 'react-router-dom'

import { MakePostImages } from '@/entities/profile/ui'
import { useViewer } from '@/entities/viewer'
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

  const [createPost, { error, loading }] = useMutation(CREATE_POST)
  const myUser = useViewer()
  if (myUser.id !== id) return <></>
  return (
    <>
      <p className={cl.error}>{error_create || `${error ? error.message : ''}`}</p>
      <div className={cl.wrapper}>
        <div className={cl.wrapperForm}>
          <ImageLoading src={useSrcAvatar(myUser.avatar)} className={cl.avatar} />
          <textarea
            className={cl.textarea}
            placeholder='Что у вас нового?'
            value={description}
            onKeyDown={(e) => handleKeydown(e, createPost, myUser.id)}
            onChange={(e) => handleHeight(e)}
          />
          <label className={cl.label}>
            <ImageLoading className={cl.svg} src='/icons/add_photo.svg' />
            <input multiple type='file' hidden accept='image/*' onChange={(e) => setFiles(e.target.files!)} />
          </label>
          <ImageLoading className={cl.svg} src='/icons/send.svg' onClick={() => send(createPost, myUser.id)} />
        </div>
        {images?.length ? <MakePostImages {...{ images, removeImage }} className={loading ? cl.loading : ''} /> : ''}
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
        <ImageLoading src='http://localhost:5000/storage/7f/7f4bbd4380f60d658a28a3e6c47d550d.webp'/>
        <ImageLoading src='https://assets.faceit-cdn.net/avatars/cdf4e907-bfc3-4c5b-86be-15663126d4de_1605010404640.jpg'/>
        <ImageLoading src='http://localhost:5000/storage/7f/7f4bbd4380f60d658a28a3e6c47d550d.webp'/>
        <ImageLoading src='https://assets.faceit-cdn.net/avatars/cdf4e907-bfc3-4c5b-86be-15663126d4de_1605010404640.jpg'/>
        <ImageLoading src='https://pushinka.top/uploads/posts/2023-04/1680492408_pushinka-top-p-top-anime-avi-dlya-ks-krasivo-9.jpg'/>
        <ImageLoading src='http://localhost:5000/storage/7f/7f4bbd4380f60d658a28a3e6c47d550d.webp'/>
        <ImageLoading src='https://sun1-85.userapi.com/s/v1/ig2/dSMwJSDis-Ihq2TYoxBCUFPtOX0xDaanZLckoYbYK5df9R7z9MVrPCitFgELrKLDLrBLlWu3wpce7XWp6I67qXLP.jpg?size=200x200&quality=96&crop=0,0,400,400&ava=1'/>
        <ImageLoading src='http://localhost:5000/storage/7f/7f4bbd4380f60d658a28a3e6c47d550d.webp'/>
        <p>Показать ещё</p>
      </div>
    </div>
  )
}

export const MeshBlockFeed = () => {
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
    </div>
  )
}
