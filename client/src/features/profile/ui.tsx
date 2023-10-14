import { useMutation } from '@apollo/client'

import { MakePostImages } from '@/entities/profile/ui'
import { useViewer } from '@/entities/viewer'
import { CREATE_POST } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import Icon from '@/shared/icons'
import { usePostStore } from '@/shared/store'

import cl from './ui.module.less'

export const MakePost = () => {
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
            <Icon iconId='add_photo' className={cl.addPhoto} />
            <input multiple type='file' hidden accept='image/*' onChange={(e) => setFiles(e.target.files!)} />
          </label>
          <Icon iconId='send' onClick={() => send(createPost, myUser.id)} />
        </div>
        {images?.length ? <MakePostImages {...{ images, removeImage }} className={loading ? cl.loading : ''} /> : ''}
      </div>
    </>
  )
}
export const MeshBlock = () => {
  return (
    <div className={cl.meshBlock}>
      <div className={cl.mesh}>
        <Icon iconId='feed' className={cl.meshIcon} />
        <p>записи</p>
      </div>
      <div className={cl.mesh}>
        <Icon iconId='art' className={cl.meshIcon} />
        <p>арты</p>
      </div>
      <div className={cl.mesh}>
        <Icon iconId='music' className={cl.meshIcon} />
        <p>музыка</p>
      </div>
      <div className={cl.mesh}>
        <Icon iconId='video' className={cl.meshIcon} />
        <p>видео</p>
      </div>
    </div>
  )
}
