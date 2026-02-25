import { useMutation } from '@apollo/client'

import { useRefreshStore } from '@/app/providers/routes/model'
import { REMOVE_POST } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import Dropdown from '@/shared/ui/dropdown'

import cl from './ui.module.css'

interface PorepsMenu {
  postId: number
  userId: number
}
export const PostDropdownMenu = ({ postId, userId }: PorepsMenu) => {
  const [remove] = useMutation(REMOVE_POST)
  const [refreshData] = useRefreshStore((state) => [state.refreshData])
  return (
    <Dropdown className={cl.pizdez}>
      <Dropdown.Header>
        <ImageLoading className={cl.menuPost} src='/icons/menu_post.svg' />
      </Dropdown.Header>
      {refreshData.id === userId ? (
        <Dropdown.Body>
          <div className='playground' style={{ padding: '0' }}>
            <li>Сохранить в закладках</li>
            <li>Редактировать</li>
            <li>Скопировать ссылку</li>
            <li>Архивировать запись</li>
            <li
              onClick={(e) => {
                e.preventDefault()
                remove({
                  variables: { id: postId },
                })
              }}
            >
              Удалить
            </li>
          </div>
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
