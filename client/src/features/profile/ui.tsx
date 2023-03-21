import { useMutation } from '@apollo/client'

import { MakePostImages } from '@/entities/profile/ui'
import { useViewer } from '@/entities/viewer'
import { CREATE_POST } from '@/shared/graphql/schema'
import Icon from '@/shared/icons'

import { usePostStore } from './module'
import cl from './ui.module.less'

export const MakePost = () => {
  const store = usePostStore((state) => state)
  const [createPost] = useMutation(CREATE_POST)
  const myUser = useViewer()
  return (
    <>
      <p className={cl.error}>{store.error}</p>
      <div className={cl.wrapper}>
        <div className={cl.wrapperForm}>
          <img src={myUser?.avatar || ''} className={cl.avatar} />
          <textarea
            className={cl.textarea}
            placeholder='Что у вас нового?'
            value={store.description}
            onKeyDown={(e) => store.handleKeydown(e, store, createPost, myUser?.id!)}
            onChange={(e) => store.handleHeight(e, store)}
          />
          <label className={cl.label}>
            <Icon iconId='add_photo' className={cl.addPhoto} />
            <input
              multiple
              type='file'
              hidden
              accept='image/*'
              onChange={(e) => store.setFiles(e.target.files!, store)}
            />
          </label>
          <Icon iconId='send' onClick={() => store.send(createPost, store, myUser?.id!)} />
        </div>
        {store.images?.length ? <MakePostImages store={store} /> : ''}
      </div>
    </>
  )
}
