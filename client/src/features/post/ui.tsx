import { useMutation } from '@apollo/client'

import { useViewer } from '@/entities/viewer'
import { REMOVE_POST } from '@/shared/graphql/schema'
import Icon from '@/shared/icons'
import { usePostStore } from '@/shared/store'
import Dropdown from '@/shared/ui/dropdown'

import cl from './ui.module.less'

interface PorepsMenu {
  id: number
  userId: number
}
export const PostDropdownMenu = ({ id, userId }: PorepsMenu) => {
  const someUser = useViewer()
  const [remove] = useMutation(REMOVE_POST)
  const setRemoveId = usePostStore((state) => state.setRemoveId)
  const removeFromStore = usePostStore((state) => state.removePost)
  return (
    <Dropdown>
      <Dropdown.Header>
        <Icon iconId='menu_post' className={cl.menuPost} />
      </Dropdown.Header>
      {someUser?.id === userId ? (
        <Dropdown.Body>
          <li>Сохранить в закладках</li>
          <li>Редактировать</li>
          <li>Скопировать ссылку</li>
          <li>Ахривировать запись</li>
          <li
            onClick={(e) => {
              e.preventDefault()
              remove({
                variables: { id },
                update(cache) {
                  const normalizeId: any = cache.identify({ id, __typename: 'Post' })
                  cache.evict(normalizeId)
                  cache.gc()
                },
              })
              setRemoveId(id)
              setTimeout(() => {
                removeFromStore(id)
              }, 1000)
            }}
          >
            Удалить
          </li>
        </Dropdown.Body>
      ) : (
        <Dropdown.Body>
          <li>Сохранить в закладках</li>
          <li>Скопировать ссылку</li>
          <li>Пожаловаться</li>
        </Dropdown.Body>
      )}
    </Dropdown>
  )
}
