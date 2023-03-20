import { useMutation } from '@apollo/client'
import { useEffect, useRef } from 'react'

import { useViewer } from '@/entities/viewer'
import { CREATE_POST } from '@/shared/graphql/schema'
import { useAutosizeTextArea } from '@/shared/hooks/useAutosizeTextArea'
import Icon from '@/shared/icons'

import { usePostStore } from './module'
import cl from './ui.module.less'

interface Props {
  user: {
    id: number
    avatar: string
  } | null
}
export const MakePost = ({ user }: Props) => {
  const store = usePostStore((state) => state)
  const textRef = useRef(null)
  const blockRef = useRef(null)
  useAutosizeTextArea(textRef.current, store.description)
  const [createPost, {}] = useMutation(CREATE_POST)
  const myUser = useViewer()
  const send = () => {
    const formData = new FormData()
    formData.append('description', store.description)
    store.images.forEach((file) => formData.append('images', file))
    createPost({
      variables: { owner: myUser?.id, description: formData.get('description'), images: formData.get('images') },
    }).then((res) => {
      const post = res.data.createPost
      store.addPost([post])
      store.changeText('')
      store.images = []
    })
  }
  const pressEnter = ({ shiftKey, key }: KeyboardEvent) => {
    if (key === 'Enter' && !shiftKey) send()
  }
  useEffect(() => {
    if (!store.description.trim()) return
    document.addEventListener('keydown', pressEnter, false)
    return () => {
      document.removeEventListener('keydown', pressEnter, false)
    }
  }, [store.description])
  return (
    <>
      <p className={cl.error}>{store.error}</p>
      <div ref={blockRef} className={cl.wrapper}>
        <div className={cl.wrapperColumn}>
          <img src={user?.avatar} className={cl.avatar} />
          <textarea
            ref={textRef}
            onChange={(e) => store.changeText(e.target.value)}
            value={store.description}
            placeholder='Что у вас нового?'
          ></textarea>
          <label htmlFor='file' className={cl.label}>
            <Icon id='add_photo' className={cl.addPhoto} />
          </label>
          <input
            multiple
            type='file'
            hidden
            id='file'
            accept='image/*'
            onChange={(e) => {
              store.setFiles(e.target.files || [], store)
            }}
          />
          <Icon id='send' onClick={send} />
        </div>
        {store.images.length ? (
          <div className={cl.wrapperColumn2}>
            {store.images.map((images) => (
              <img
                className={cl.preview}
                key={images.size}
                src={URL.createObjectURL(images)}
                onClick={() => {
                  let remove = store.images.filter((item) => item !== images)
                  store.images = []
                  store.setFiles(remove, store)
                }}
              />
            ))}
          </div>
        ) : (
          ''
        )}
      </div>
    </>
  )
}
