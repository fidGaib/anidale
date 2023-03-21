import { useMutation } from '@apollo/client'

import { MakePostImages } from '@/entities/profile/ui'
import { useViewer } from '@/entities/viewer'
import { CREATE_POST } from '@/shared/graphql/schema'
import Icon from '@/shared/icons'

import { usePostStore } from './module'
import cl from './ui.module.less'

export const MakePost = () => {
  const error_create = usePostStore((state) => state.error)
  const description = usePostStore((state) => state.description)
  const images = usePostStore((state) => state.images)
  const handleKeydown = usePostStore((state) => state.handleKeydown)
  const handleHeight = usePostStore((state) => state.handleHeight)
  const setFiles = usePostStore((state) => state.setFiles)
  const send = usePostStore((state) => state.send)

  const [createPost] = useMutation(CREATE_POST)
  const myUser = useViewer()
  return (
    <>
      <p className={cl.error}>{error_create}</p>
      <div className={cl.wrapper}>
        <div className={cl.wrapperForm}>
          <img src={myUser?.avatar || ''} className={cl.avatar} />
          <textarea
            className={cl.textarea}
            placeholder='Что у вас нового?'
            value={description}
            onKeyDown={(e) => handleKeydown(e, createPost, myUser?.id!)}
            onChange={(e) => handleHeight(e)}
          />
          <label className={cl.label}>
            <Icon iconId='add_photo' className={cl.addPhoto} />
            <input multiple type='file' hidden accept='image/*' onChange={(e) => setFiles(e.target.files!)} />
          </label>
          <Icon iconId='send' onClick={() => send(createPost, myUser?.id!)} />
        </div>
        {images?.length ? <MakePostImages /> : ''}
      </div>
    </>
  )
}
