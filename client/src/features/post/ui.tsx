import { useMutation } from '@apollo/client'

import { useViewer } from '@/entities/viewer'
import { REMOVE_POST } from '@/shared/graphql/schema'
import Icon from '@/shared/icons'

import { usePostStore } from '../profile/module'
import cl from './ui.module.less'

interface PorepsMenu {
  id: number
  userId: number
}
export const RemovePost = ({ id, userId }: PorepsMenu) => {
  const someUser = useViewer()
  const [remove, {}] = useMutation(REMOVE_POST)
  const setRemoveId = usePostStore((state) => state.setRemoveId)
  const removeFromStore = usePostStore((state) => state.removePost)
  return (
    <>
      <Icon id='menu_post' className={cl.menuPost} />
      {someUser?.id === userId ? (
        <ul className={cl.menuBody}>
          <li>Сохранить в закладках</li>
          <li>Редактировать</li>
          <li>Скопировать ссылку</li>
          <li>Ахривировать запись</li>
          <li
            onClick={(e) => {
              e.preventDefault()
              remove({ variables: { id } })
              setRemoveId(id)
              setTimeout(() => {
                removeFromStore(id)
              }, 1000)
            }}
          >
            Удалить
          </li>
        </ul>
      ) : (
        <ul className={cl.menuBody}>
          <li>Сохранить в закладках</li>
          <li>Скопировать ссылку</li>
          <li>Пожаловаться</li>
        </ul>
      )}
    </>
  )
}
