import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/** Имя параметра адреса, по которому пост открывается окном: ?post=<id>. */
export const POST_PARAM = 'post'

/** Постоянная ссылка на пост: открывается поверх ленты. */
export const postLink = (postId: number) => `${window.location.origin}/feed?${POST_PARAM}=${postId}`

/** Id поста из адреса (?post=123); 0, если пост не открыт. */
export const useOpenedPostId = () => {
  const { search } = useLocation()
  const id = Number(new URLSearchParams(search).get(POST_PARAM))
  return Number.isInteger(id) && id > 0 ? id : 0
}

/**
 * Открывает пост поверх текущей страницы, как в ВК: адрес получает ?post=<id>,
 * кнопка «назад» закрывает окно, а ссылку можно отправить другому человеку.
 */
export const useOpenPost = () => {
  const navigate = useNavigate()
  const location = useLocation()
  return useCallback(
    (postId: number) => {
      const params = new URLSearchParams(location.search)
      params.set(POST_PARAM, String(postId))
      navigate({ pathname: location.pathname, search: `?${params.toString()}` }, { state: { postModal: true } })
    },
    [navigate, location.pathname, location.search],
  )
}
