import { useMutation, useQuery } from '@apollo/client'
import { useEffect, useRef, useState } from 'react'

import { useRefreshStore } from '@/app/providers/routes/model'
import { storageUrl } from '@/shared/config'
import { CREATE_PHOTO, GET_PHOTOS, GET_SAVED_PHOTOS, REMOVE_PHOTO, SAVE_PHOTO } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { ViewerPhoto, openPhotos } from '@/shared/lib/photo-viewer'
import ButtonUI from '@/shared/ui/button'

import cl from './photos.module.css'

const PAGE = 24

interface Photo {
  id: number
  source: string
  postId?: number | null
  ownerId: number
  high: string
  medium: string
  small: string
  vertical: boolean
  type: string
  date: unknown
  saved: boolean
  savedAt?: unknown
}

type Album = 'all' | 'saved'

interface Props {
  id: number
  isOwn: boolean
  /** Изменение числа фотографий для счётчика профиля: +1 после загрузки, -1 после удаления. */
  onCountChange: (delta: number) => void
}

const photoSrc = (photo: Photo) => storageUrl(`${photo.medium || photo.small || photo.high}.webp`)
const photoKey = (photo: Photo) => `${photo.source}-${photo.id}`

/** Данные для кнопки «Сохранить» в полноэкранном просмотре: свои фото сохранять не нужно. */
const saveMeta = (photo: Photo, myId: number): ViewerPhoto['save'] => {
  if (!myId || photo.ownerId === myId) return undefined
  return { source: photo.source, id: photo.id, postId: photo.postId, ownerId: photo.ownerId, saved: photo.saved }
}

/** Альбом фотографий в профиле: сетка, сохранённые чужие снимки, загрузка своих и полноэкранный просмотр. */
export const ProfilePhotos = ({ id, isOwn, onCountChange }: Props) => {
  const myId = useRefreshStore((state) => state.refreshData.id) ?? 0
  const [album, setAlbum] = useState<Album>('all')

  const profileQuery = useQuery(GET_PHOTOS, {
    variables: { id, limit: PAGE, offset: 0 },
    skip: !id || album === 'saved',
    fetchPolicy: 'network-only',
  })
  const savedQuery = useQuery(GET_SAVED_PHOTOS, {
    variables: { limit: PAGE, offset: 0 },
    skip: !isOwn || album !== 'saved',
    fetchPolicy: 'network-only',
  })

  const activeQuery = album === 'saved' ? savedQuery : profileQuery
  const photos: Photo[] = (album === 'saved' ? savedQuery.data?.getSavedPhotos : profileQuery.data?.getPhotos) ?? []
  const [createPhoto, createResult] = useMutation(CREATE_PHOTO)
  const [removePhoto, removeResult] = useMutation(REMOVE_PHOTO)
  const [savePhoto, saveResult] = useMutation(SAVE_PHOTO)
  const [hasMore, setHasMore] = useState(false)
  const [uploading, setUploading] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setAlbum('all')
  }, [id])

  // Следующая страница есть, только если текущая пришла целиком
  useEffect(() => {
    setHasMore(photos.length === PAGE)
  }, [album, photos.length])

  // Сохранение из полноэкранного просмотра: обновляем сетку, чтобы отметка была видна сразу
  useEffect(() => {
    const refresh = () => void activeQuery.refetch()
    window.addEventListener('saved-photos-changed', refresh)
    return () => window.removeEventListener('saved-photos-changed', refresh)
  }, [activeQuery])

  const upload = async (file: File) => {
    setUploading(true)
    try {
      await createPhoto({ variables: { image: file } })
      onCountChange(1)
      await profileQuery.refetch()
    } catch {
      // Текст ошибки берём из состояния мутации
    } finally {
      setUploading(false)
    }
  }

  const remove = async (photoId: number) => {
    try {
      await removePhoto({ variables: { id: photoId } })
      onCountChange(-1)
      await profileQuery.refetch()
    } catch {
      // Текст ошибки берём из состояния мутации
    }
  }

  const unsave = async (photo: Photo) => {
    try {
      await savePhoto({ variables: { source: photo.source, id: photo.id, saved: false } })
      await activeQuery.refetch()
    } catch {
      // Текст ошибки берём из состояния мутации
    }
  }

  const loadMore = async () => {
    const result = await activeQuery.fetchMore({ variables: { offset: photos.length } })
    const page =
      album === 'saved'
        ? (result.data as unknown as typeof savedQuery.data)?.getSavedPhotos
        : (result.data as unknown as typeof profileQuery.data)?.getPhotos
    setHasMore((page?.length ?? 0) === PAGE)
  }

  const open = (index: number) => {
    const items: ViewerPhoto[] = photos.map((photo) => ({
      src: photoSrc(photo),
      name: `${photoKey(photo)}.webp`,
      save: saveMeta(photo, myId),
    }))
    openPhotos(items, index)
  }

  const actionError = createResult.error || removeResult.error || saveResult.error
  const actionMessage =
    actionError?.message ||
    activeQuery.error?.message ||
    (createResult.loading || uploading ? 'Загрузка фотографии...' : '') ||
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
            Фото
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

      {photos.length === 0 && !activeQuery.loading ? (
        <div className={cl.empty}>
          <ImageLoading src='/icons/add_photo.svg' className={cl.emptyIcon} />
          <p>
            {album === 'saved'
              ? 'Вы ещё не сохранили ни одного фото'
              : isOwn
              ? 'Добавьте фото или опубликуйте пост с картинкой'
              : 'Фотографий пока нет'}
          </p>
        </div>
      ) : (
        <div className={cl.grid}>
          {isOwn && album === 'all' && (
            <>
              <input
                ref={input}
                type='file'
                accept='image/*'
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) void upload(file)
                }}
              />
              <button
                type='button'
                className={`${cl.tile} ${cl.add}`}
                onClick={() => input.current?.click()}
                disabled={uploading}
                title='Добавить фотографию'
              >
                <ImageLoading src='/icons/add_photo.svg' className={cl.addIcon} />
                <span>{uploading ? 'Загрузка...' : 'Добавить фото'}</span>
              </button>
            </>
          )}

          {photos.map((photo, index) => (
            <div key={photoKey(photo)} className={cl.tile}>
              <ImageLoading className={cl.image} src={photoSrc(photo)} alt='Фотография' onClick={() => open(index)} />
              {photo.source === 'POST' && <span className={cl.badge}>из поста</span>}
              {album === 'saved' && (
                <button
                  type='button'
                  className={cl.remove}
                  title='Убрать из сохранённых'
                  onClick={(e) => {
                    e.stopPropagation()
                    void unsave(photo)
                  }}
                >
                  ×
                </button>
              )}
              {isOwn && album === 'all' && photo.source === 'ALBUM' && (
                <button
                  type='button'
                  className={cl.remove}
                  title='Удалить фотографию'
                  onClick={(e) => {
                    e.stopPropagation()
                    void remove(photo.id)
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
    </div>
  )
}
