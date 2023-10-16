import { useMutation } from '@apollo/client'

import { useViewer } from '@/entities/viewer'
import { REMOVE_POST } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { usePostStore } from '@/shared/store'
import Dropdown from '@/shared/ui/dropdown'

import cl from './ui.module.less'

interface PorepsMenu {
  postId: number
  userId: number
}
export const PostDropdownMenu = ({ postId, userId }: PorepsMenu) => {
  const someUser = useViewer()
  const [remove] = useMutation(REMOVE_POST)
  const setRemoveId = usePostStore((state) => state.setRemoveId)
  const removeFromStore = usePostStore((state) => state.removePost)
  return (
    <Dropdown>
      <Dropdown.Header>
        <ImageLoading className={cl.menuPost} src='/icons/menu_post.svg' />
      </Dropdown.Header>
      {someUser?.id === userId ? (
        <Dropdown.Body>
          <li>Сохранить в закладках</li>
          <li>Редактировать</li>
          <li>Скопировать ссылку</li>
          <li>Архивировать запись</li>
          <li
            onClick={(e) => {
              e.preventDefault()
              remove({
                variables: { id: postId },
                update(cache) {
                  const normalizeId: any = cache.identify({ id: postId, __typename: 'Post' })
                  cache.evict(normalizeId)
                  cache.gc()
                },
              })
              setRemoveId(postId)
              setTimeout(() => {
                removeFromStore(postId)
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
