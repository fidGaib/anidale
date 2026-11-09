import { useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { usePhotoViewer } from '@/shared/lib/photo-viewer'

import { PostBody } from './post-body'
import { POST_PARAM, useOpenedPostId } from './post-link'
import cl from './ui.module.css'

const PARAM = POST_PARAM

/** Окно поста поверх любой страницы. Монтируется один раз в корне приложения. */
export const PostModalHost = () => {
  const postId = useOpenedPostId()
  const navigate = useNavigate()
  const location = useLocation()

  const close = useCallback(() => {
    // Окно открыли мы: возвращаемся на шаг назад. Зашли по ссылке: просто убираем параметр
    if ((location.state as { postModal?: boolean } | null)?.postModal) {
      navigate(-1)
      return
    }
    const params = new URLSearchParams(location.search)
    params.delete(PARAM)
    const search = params.toString()
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true })
  }, [navigate, location.pathname, location.search, location.state])

  useEffect(() => {
    if (!postId) return
    const onKey = (e: KeyboardEvent) => {
      // Esc сначала закрывает просмотр фото поверх окна поста
      if (e.key === 'Escape' && !usePhotoViewer.getState().open) close()
    }
    window.addEventListener('keydown', onKey)
    // Страница под окном не должна прокручиваться
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [postId, close])

  if (!postId) return null

  return (
    <div className={cl.overlay} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className={`playground ${cl.card}`} role='dialog' aria-label='Пост'>
        <button type='button' className={cl.close} onClick={close} title='Закрыть (Esc)'>
          ✕
        </button>
        <PostBody key={postId} postId={postId} onNavigate={() => undefined} onRemoved={close} />
      </div>
    </div>
  )
}
