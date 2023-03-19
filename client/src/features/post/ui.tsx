import { useMutation } from '@apollo/client'

import { useViewer } from '@/entities/viewer'
import { REMOVE_POST } from '@/shared/graphql/schema'
import Icon from '@/shared/icons'

import cl from './ui.module.less'

interface PorepsMenu {
  id: number
  userId: number
  setDelShow: React.Dispatch<React.SetStateAction<number>>
}
export const RemovePost = ({ id, userId, setDelShow }: PorepsMenu) => {
  const someUser = useViewer()
  const [remove, {}] = useMutation(REMOVE_POST)
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
              setDelShow(id)
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
