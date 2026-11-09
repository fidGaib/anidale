import { useMutation, useQuery } from '@apollo/client'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useRefreshStore } from '@/app/providers/routes/model'
import { storageUrl } from '@/shared/config'
import { CREATE_VIDEO, GET_SAVED_VIDEOS, GET_VIDEOS, REMOVE_VIDEO, SAVE_VIDEO } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { UploadProgressEvent, toPercent } from '@/shared/lib/progress-fetch'
import { validateUpload } from '@/shared/lib/upload-limits'
import ButtonUI from '@/shared/ui/button'
import { UploadProgress } from '@/shared/ui/progress'

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
  /** Изменение числа видео для счётчика профиля: +1 после загрузки, -1 после удаления. */
  onCountChange: (delta: number) => void
}

const videoSrc = (video: Video) => storageUrl(video.file)

/** Вкладка «Видео»: ролики из постов и отдельный альбом, сохранённые, загрузка и полноэкранный просмотр. */
export const ProfileVideos = ({ id, isOwn, onCountChange }: Props) => {
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
  const [createVideo, createResult] = useMutation(CREATE_VIDEO)
  const [removeVideo, removeResult] = useMutation(REMOVE_VIDEO)
  const [saveVideo, saveResult] = useMutation(SAVE_VIDEO)
  const [hasMore, setHasMore] = useState(false)
  const [uploading, setUploading] = useState(false)
  // Сколько видео в очереди и сколько процентов текущего отправлено
  const [progress, setProgress] = useState<{ index: number; total: number; percent: number; name: string } | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [opened, setOpened] = useState<Video | null>(null)
  const input = useRef<HTMLInputElement>(null)

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

  /** Грузит видео по одному (каждое отдельным запросом, поэтому лимит 110 МБ на запрос не мешает набору). */
  const upload = async (files: File[]) => {
    setUploadError('')
    const failed: string[] = []
    const queue: File[] = []
    for (const file of files) {
      const problem = validateUpload([file])
      if (problem) failed.push(problem)
      else queue.push(file)
    }
    setUploading(true)
    let uploaded = 0
    for (const [index, file] of queue.entries()) {
      setProgress({ index: index + 1, total: queue.length, percent: 0, name: file.name })
      try {
        await createVideo({
          variables: { file },
          context: {
            fetchOptions: {
              onProgress: (event: UploadProgressEvent) =>
                setProgress({ index: index + 1, total: queue.length, percent: toPercent(event), name: file.name }),
            },
          },
        })
        uploaded += 1
        onCountChange(1)
      } catch (error) {
        failed.push(`«${file.name}»: ${error instanceof Error ? error.message : 'не удалось загрузить'}`)
      }
    }
    setProgress(null)
    setUploading(false)
    if (failed.length) setUploadError(failed.join('\n'))
    if (uploaded) await profileQuery.refetch()
  }

  const remove = async (videoId: number) => {
    try {
      await removeVideo({ variables: { id: videoId } })
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
  const actionError = createResult.error || removeResult.error || saveResult.error
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

      {progress && (
        <UploadProgress
          percent={progress.percent}
          label={`Загрузка ${progress.index} из ${progress.total}: ${progress.name}`}
        />
      )}
      {uploadError && <p className={`${cl.message} ${cl.messageError}`}>{uploadError}</p>}
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
              <input
                ref={input}
                type='file'
                accept='video/*'
                multiple
                hidden
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? [])
                  e.target.value = ''
                  if (files.length) void upload(files)
                }}
              />
              <button
                type='button'
                className={`${cl.tile} ${cl.add}`}
                onClick={() => input.current?.click()}
                disabled={uploading}
                title='Добавить видео'
              >
                <ImageLoading src='/icons/video.svg' className={cl.addIcon} />
                <span>{uploading ? 'Загрузка...' : 'Добавить видео'}</span>
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
              {isOwn && album === 'all' && video.postId === null && (
                <button
                  type='button'
                  className={cl.remove}
                  title='Удалить видео'
                  onClick={(e) => {
                    e.stopPropagation()
                    void remove(video.id)
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
