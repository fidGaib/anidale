import { useMutation } from '@apollo/client'
import { useRef, useState } from 'react'

import { ViewerVar } from '@/entities/viewer'
import { CREATE_POST } from '@/shared/graphql/schema'
import { useAutosizeTextArea } from '@/shared/hooks/useAutosizeTextArea'
import Icon from '@/shared/icons'

import cl from './ui.module.less'

interface Props {
  user: {
    id: number
    avatar: string
  } | null
}
export const MakePost = ({ user }: Props) => {
  const [text, setText] = useState('')
  const textRef = useRef(null)
  const blockRef = useRef(null)
  const myUser = ViewerVar()
  useAutosizeTextArea(textRef.current, text, blockRef.current)
  const [create, { data, error }] = useMutation(CREATE_POST)
  const send = () => {
    if (!text) return
    create({ variables: { owner: myUser?.id, description: text } })
    if (data?.createPost) {
      setText('')
    }
  }
  return (
    <>
      <p className={cl.error}>{error?.message}</p>
      <div ref={blockRef} className={cl.wrapper}>
        <img src={user?.avatar} className={cl.avatar} />
        <textarea
          ref={textRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Что у вас нового?'
        ></textarea>
        <Icon id='add_photo' className={cl.addPhoto} />
        <Icon id='send' onClick={send} />
      </div>
    </>
  )
}
