import { useMutation } from '@apollo/client'
import { useCallback, useEffect, useRef, useState } from 'react'

import { PostBody } from '@/features/post-viewer'
import { SAVE_PHOTO } from '@/shared/graphql/schema'
import { usePhotoViewer } from '@/shared/lib/photo-viewer'

import cl from './ui.module.css'

/** Свайп короче этого расстояния (px) не считается листанием. */
const SWIPE_MIN = 50

const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

/**
 * Полноэкранный просмотр изображений, как в ВК: тёмный фон, листание стрелками, клавишами ← → и свайпом,
 * счётчик «2 из 5», клик по фото — следующее, клик по фону или Esc — закрыть.
 * Для картинок поста справа показываются автор, описание, лайки и комментарии.
 */
export const PhotoViewerHost = () => {
  const open = usePhotoViewer((s) => s.open)
  const photos = usePhotoViewer((s) => s.photos)
  const index = usePhotoViewer((s) => s.index)
  const postId = usePhotoViewer((s) => s.postId)
  const close = usePhotoViewer((s) => s.close)
  const go = usePhotoViewer((s) => s.go)

  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({})
  const [savePhoto, saveResult] = useMutation(SAVE_PHOTO)
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  // Новая картинка: снова показываем индикатор загрузки
  useEffect(() => {
    setLoaded(false)
    setFailed(false)
  }, [index, photos])

  // После закрытия локальные отметки «сохранено» не нужны
  useEffect(() => {
    if (!open) setSavedMap({})
  }, [open])

  // Клавиатура и блокировка прокрутки страницы под просмотром
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
        return
      }
      // В поле комментария стрелки двигают курсор, а не листают фото
      if (isTyping(e.target)) return
      if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    // capture: Esc должен закрыть просмотр раньше, чем окно поста под ним
    window.addEventListener('keydown', onKey, true)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = previous
    }
  }, [open, close, go])

  // Соседние картинки подгружаются заранее, чтобы листание было мгновенным
  useEffect(() => {
    if (!open || photos.length < 2) return
    for (const delta of [1, -1]) {
      const neighbour = photos[(index + delta + photos.length) % photos.length]
      if (neighbour) new Image().src = neighbour.src
    }
  }, [open, photos, index])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStart.current
      touchStart.current = null
      if (!start) return
      const dx = e.changedTouches[0].clientX - start.x
      const dy = e.changedTouches[0].clientY - start.y
      // Горизонтальный жест листает, вертикальный вниз закрывает
      if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1)
      else if (dy > SWIPE_MIN * 2 && Math.abs(dy) > Math.abs(dx)) close()
    },
    [go, close],
  )

  if (!open || photos.length === 0) return null
  const photo = photos[index]
  const many = photos.length > 1
  const save = photo.save
  const saveKey = save ? `${save.source}-${save.id}` : ''
  const saved = save ? savedMap[saveKey] ?? save.saved : false

  const toggleSaved = async () => {
    if (!save) return
    const next = !saved
    try {
      await savePhoto({ variables: { source: save.source, id: save.id, saved: next } })
      setSavedMap((prev) => ({ ...prev, [saveKey]: next }))
      // Галерея профиля перезапрашивает список, чтобы новая отметка была видна сразу
      window.dispatchEvent(
        new CustomEvent('saved-photos-changed', { detail: { source: save.source, id: save.id, saved: next } }),
      )
    } catch {
      // Ошибку покажет подпись кнопки ниже
    }
  }

  return (
    <div className={cl.overlay} role='dialog' aria-label='Просмотр изображений'>
      <div
        className={cl.stage}
        // Клик по тёмному фону вне картинки и кнопок закрывает просмотр
        onMouseDown={(e) => e.target === e.currentTarget && close()}
        onTouchStart={(e) => (touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={onTouchEnd}
      >
        <div className={cl.topBar}>
          <span className={cl.counter}>{many ? `${index + 1} из ${photos.length}` : ''}</span>
          <span className={cl.spacer} />
          {save && (
            <button
              type='button'
              className={`${cl.topButton} ${cl.saveButton} ${saved ? cl.saveActive : ''}`}
              onClick={() => void toggleSaved()}
              disabled={saveResult.loading}
              title={saved ? 'Убрать из сохранённых' : 'Сохранить фото'}
            >
              {saved ? '★ В сохранённых' : '☆ Сохранить'}
            </button>
          )}
          <a
            className={cl.topButton}
            href={photo.src}
            download={photo.name || 'image.webp'}
            target='_blank'
            rel='noreferrer'
            title='Скачать'
          >
            ⭳
          </a>
          <button type='button' className={cl.topButton} onClick={close} title='Закрыть (Esc)'>
            ✕
          </button>
        </div>

        {many && (
          <button type='button' className={`${cl.arrow} ${cl.arrowPrev}`} onClick={() => go(-1)} title='Назад (←)'>
            ‹
          </button>
        )}

        {!loaded && !failed && <div className={cl.spinner} />}
        {failed ? (
          <p className={cl.error}>Не удалось загрузить изображение</p>
        ) : (
          <img
            key={`${index}-${photo.src}`}
            className={`${cl.image} ${loaded ? cl.imageLoaded : ''}`}
            src={photo.src}
            alt={photo.name || ''}
            draggable={false}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            onClick={() => (many ? go(1) : close())}
          />
        )}

        {many && (
          <button type='button' className={`${cl.arrow} ${cl.arrowNext}`} onClick={() => go(1)} title='Вперёд (→)'>
            ›
          </button>
        )}
      </div>

      {postId !== null && (
        <aside className={`playground ${cl.side}`}>
          <PostBody key={postId} postId={postId} withImages={false} onNavigate={close} />
        </aside>
      )}
    </div>
  )
}
