import { useMutation } from '@apollo/client'
import { ChangeEventHandler, KeyboardEventHandler } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'

import { useViewer } from '@/entities/viewer'
import { CREATE_POST } from '@/shared/graphql/schema'
import Icon from '@/shared/icons'

import cl from './ui.module.less'

interface Props {
  user: {
    id: number
    avatar: string
  } | null
}

interface InputValues {
  description: string
  images: File[]
}

const resizeTextarea: ChangeEventHandler<HTMLTextAreaElement> = (e) => {
  const el = e.target
  if (el) {
    el.style.height = '0px'
    el.style.height = el.scrollHeight + 'px'
  }
}

export const MakePost = ({ user }: Props) => {
  const { register, handleSubmit, watch, setValue } = useForm<InputValues>()
  const images = watch('images')

  const [createPost, {}] = useMutation(CREATE_POST)
  const myUser = useViewer()

  const onSubmit: SubmitHandler<InputValues> = ({ images, description }) => {
    if (!description && images.length === 0) {
      alert('Не могу отправить пустой пост')
      return
    }

    createPost({ variables: { owner: myUser?.id, description, images } })
  }

  const handleRemoveImage = (image: File) =>
    setValue(
      'images',
      Array.from(images).filter((el) => el !== image),
    )

  const handleKeydown: KeyboardEventHandler<HTMLTextAreaElement> = ({ key, shiftKey }) => {
    if (key === 'Enter' && !shiftKey) handleSubmit(onSubmit)()
  }

  return (
    <>
      <div className={cl.wrapper}>
        <div className={cl.wrapperColumn}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <img src={user?.avatar} className={cl.avatar} />
            <textarea
              {...register('description', { onChange: resizeTextarea })}
              placeholder='Что у вас нового?'
              onKeyDown={handleKeydown}
            />
            <label className={cl.label}>
              <Icon id='add_photo' className={cl.addPhoto} />
              <input {...register('images')} multiple type='file' hidden accept='image/*' />
            </label>
            <button type='submit'>
              <Icon id='send' />
            </button>
          </form>
        </div>
        {images && images.length ? <ImagesPreview images={images} onRemove={handleRemoveImage} /> : ''}
      </div>
    </>
  )
}

function ImagesPreview(props: { images: any[]; onRemove: (image: File) => void }) {
  if (!props.images) return <></>

  return (
    <div className={cl.wrapperColumn2}>
      {Array.from(props.images).map((image) => (
        <img
          className={cl.preview}
          key={image.size}
          src={URL.createObjectURL(image)}
          onClick={() => props.onRemove(image)}
        />
      ))}
    </div>
  )
}
