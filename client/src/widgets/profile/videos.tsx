import { useMutation, useQuery } from '@apollo/client'
import { useCallback, useEffect, useState } from 'react'

import { useRefreshStore } from '@/app/providers/routes/model'
import { usePostSync } from '@/features/post-viewer'
import { storageUrl } from '@/shared/config'
import { GET_SAVED_VIDEOS, GET_VIDEOS, REMOVE_VIDEO, SAVE_VIDEO } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import ButtonUI from '@/shared/ui/button'

import cl from './videos.module.css'

const PAGE = 24

interface Video {
  id: number
  title: string
  file: string
  size: number
  type: string
  date: unknown
  postId?: number | null
  saved?: boolean | null
  savedAt?: unknown
  user?: { id?: number | null; login?: string | null; avatar?: string | null } | null
}

type Album = 'all' | 'saved'

interface Props {
  id: number
  isOwn: boolean
  /** Открыть окно загрузки нового видео. */
  onAdd: () => void
  /** Изменение числа видео для счётчика профиля: -1 после удаления. */
  onCountChange: (delta: number) => void
}

const videoSrc = (video: Video) => storageUrl(video.file)

/** Вкладка «Видео»: ролики из постов и отдельный альбом, сохранённые, загрузка и полноэкранный просмотр. */
export const ProfileVideos = ({ id, isOwn, onAdd, onCountChange }: Props) => {
  const myId = useRefreshStore((state) => state.refreshData.id) ?? 0
  const [album, setAlbum] = useState<Album>('all')

  const profileQuery = useQuery(GET_VIDEOS, {
    variables: { id, limit: PAGE, offset: 0 },
    skip: !id || album === 'saved',
    fetchPolicy: 'network-only',
  })
  const savedQuery = useQuery(GET_SAVED_VIDEOS, {
    variables: { limit: PAGE, offset: 0 },
    skip: !isOwn || album !== 'saved',
    fetchPolicy: 'network-only',
  })

  const activeQuery = album === 'saved' ? savedQuery : profileQuery
  const videos: Video[] = (album === 'saved' ? savedQuery.data?.getSavedVideos : profileQuery.data?.getVideos) ?? []
  const [removeVideo, removeResult] = useMutation(REMOVE_VIDEO)
  const [saveVideo, saveResult] = useMutation(SAVE_VIDEO)
  const [hasMore, setHasMore] = useState(false)
  const [opened, setOpened] = useState<Video | null>(null)

  useEffect(() => {
    setAlbum('all')
  }, [id])

  // Следующая страница есть, только если текущая пришла целиком
  useEffect(() => {
    setHasMore(videos.length === PAGE)
  }, [album, videos.length])

  const close = useCallback(() => setOpened(null), [])

  // Esc закрывает просмотр, прокрутка страницы под ним блокируется
  useEffect(() => {
    if (!opened) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
      }
    }
    window.addEventListener('keydown', onKey, true)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = previous
    }
  }, [opened, close])

  const remove = async (video: Video) => {
    try {
      await removeVideo({ variables: { id: video.id } })
      // Ролик из поста пропадает и в карточке поста на стене
      if (video.postId) usePostSync.getState().publish({ id: video.postId, removedVideoId: video.id })
      onCountChange(-1)
      await profileQuery.refetch()
    } catch {
      // Текст ошибки берём из состояния мутации
    }
  }

  const toggleSaved = async (video: Video, saved: boolean) => {
    try {
      await saveVideo({ variables: { id: video.id, saved } })
      setOpened((prev) => (prev && prev.id === video.id ? { ...prev, saved } : prev))
      await activeQuery.refetch()
    } catch {
      // Текст ошибки берём из состояния мутации
    }
  }

  const loadMore = async () => {
    const result = await activeQuery.fetchMore({ variables: { offset: videos.length } })
    const page =
      album === 'saved'
        ? (result.data as unknown as typeof savedQuery.data)?.getSavedVideos
        : (result.data as unknown as typeof profileQuery.data)?.getVideos
    setHasMore((page?.length ?? 0) === PAGE)
  }

  const canSave = !!opened && myId > 0 && opened.user?.id !== myId
  const actionError = removeResult.error || saveResult.error
  const actionMessage =
    actionError?.message ||
    activeQuery.error?.message ||
    (removeResult.loading ? 'Удаление...' : '') ||
    (saveResult.loading ? 'Сохранение...' : '')

  return (
    <div className={`playground ${cl.wrap}`}>
      {isOwn && (
        <div className={cl.albums}>
          <button
            type='button'
            className={`${cl.album} ${album === 'all' ? cl.albumActive : ''}`}
            onClick={() => setAlbum('all')}
          >
            Мои видео
          </button>
          <button
            type='button'
            className={`${cl.album} ${album === 'saved' ? cl.albumActive : ''}`}
            onClick={() => setAlbum('saved')}
          >
            Сохранённые
          </button>
        </div>
      )}

      {actionMessage && <p className={cl.message}>{actionMessage}</p>}

      {videos.length === 0 && !activeQuery.loading ? (
        <div className={cl.empty}>
          <ImageLoading src='/icons/video.svg' className={cl.emptyIcon} />
          <p>
            {album === 'saved'
              ? 'Вы ещё не сохранили ни одного видео'
              : isOwn
              ? 'Добавьте видео или опубликуйте пост с роликом'
              : 'Видео пока нет'}
          </p>
        </div>
      ) : (
        <div className={cl.grid}>
          {isOwn && album === 'all' && (
            <>
              <button type='button' className={`${cl.tile} ${cl.add}`} onClick={onAdd} title='Добавить видео'>
                <ImageLoading src='/icons/video.svg' className={cl.addIcon} />
                <span>Добавить видео</span>
              </button>
            </>
          )}

          {videos.map((video) => (
            <div key={video.id} className={cl.tile}>
              <video
                className={cl.preview}
                src={videoSrc(video)}
                preload='metadata'
                muted
                playsInline
                onClick={() => setOpened(video)}
              />
              <button type='button' className={cl.play} title='Смотреть видео' onClick={() => setOpened(video)}>
                ▶
              </button>
              <span className={cl.title}>{video.title}</span>
              {album === 'saved' && (
                <button
                  type='button'
                  className={cl.remove}
                  title='Убрать из сохранённых'
                  onClick={(e) => {
                    e.stopPropagation()
                    void toggleSaved(video, false)
                  }}
                >
                  ×
                </button>
              )}
              {isOwn && album === 'all' && (
                <button
                  type='button'
                  className={cl.remove}
                  title={video.postId === null ? 'Удалить видео' : 'Удалить видео (пост останется)'}
                  onClick={(e) => {
                    e.stopPropagation()
                    void remove(video)
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className={cl.more}>
          <ButtonUI onClick={loadMore} disabled={activeQuery.loading}>
            Показать ещё
          </ButtonUI>
        </div>
      )}

      {opened && (
        <div
          className={cl.overlay}
          role='dialog'
          aria-label='Просмотр видео'
          onMouseDown={(e) => e.target === e.currentTarget && close()}
        >
          <div className={cl.player}>
            <div className={cl.playerHead}>
              <span className={cl.playerTitle}>{opened.title}</span>
              {canSave && (
                <button
                  type='button'
                  className={`${cl.save} ${opened.saved ? cl.saveActive : ''}`}
                  onClick={() => void toggleSaved(opened, !opened.saved)}
                  title={opened.saved ? 'Убрать из сохранённых' : 'Сохранить видео'}
                >
                  {opened.saved ? '★ В сохранённых' : '☆ Сохранить'}
                </button>
              )}
              <a className={cl.download} href={videoSrc(opened)} download title='Скачать'>
                ⭳
              </a>
              <button type='button' className={cl.close} onClick={close} title='Закрыть (Esc)'>
                ✕
              </button>
            </div>
            <video className={cl.fullVideo} src={videoSrc(opened)} controls autoPlay playsInline />
          </div>
        </div>
      )}
    </div>
  )
}
