import { useMutation, useQuery } from '@apollo/client'
import { useRef, useState } from 'react'

import { storageUrl } from '@/shared/config'
import { COMMUNITY_PHOTOS, COMMUNITY_VIDEOS, CREATE_COMMUNITY_PHOTO } from '@/shared/graphql/schema'
import { ViewerPhoto, openPhotos } from '@/shared/lib/photo-viewer'
import { Btn } from '@/shared/ui/btn'
import { Empty, FormError } from '@/shared/ui/notice'

import cl from './media.module.css'

const PAGE = 30

interface Photo {
  id: number
  source: string
  postId?: number | null
  medium: string
  small: string
  high: string
}

const photoSrc = (photo: Photo) => storageUrl(`${photo.medium || photo.small || photo.high}.webp`)

/** Вкладка «Фото» сообщества: снимки из записей и альбом; администратор добавляет фото в альбом. */
export const CommunityPhotos = ({ id, canAdd }: { id: number; canAdd: boolean }) => {
  const { data, loading, error, fetchMore, refetch } = useQuery(COMMUNITY_PHOTOS, {
    variables: { id, limit: PAGE, offset: 0 },
    fetchPolicy: 'network-only',
  })
  const [upload, uploadState] = useMutation(CREATE_COMMUNITY_PHOTO)
  const [done, setDone] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const photos = (data?.getCommunityPhotos ?? []) as Photo[]

  const add = async (files: FileList | null) => {
    for (const image of Array.from(files ?? [])) {
      try {
        await upload({ variables: { image, communityId: id } })
      } catch {
        // Текст ошибки показывает состояние мутации
      }
    }
    await refetch()
  }

  const open = (index: number) => {
    const items: ViewerPhoto[] = photos.map((photo) => ({
      src: photoSrc(photo),
      name: `photo-${photo.id}`,
    }))
    openPhotos(items, index)
  }

  return (
    <div className={`playground ${cl.wrap}`}>
      {canAdd && (
        <div className={cl.toolbar}>
          <Btn variant='primary' disabled={uploadState.loading} onClick={() => input.current?.click()}>
            {uploadState.loading ? 'Загрузка…' : '＋ Добавить фото'}
          </Btn>
          <input
            ref={input}
            type='file'
            accept='image/*'
            multiple
            hidden
            onChange={(e) => {
              void add(e.target.files)
              e.target.value = ''
            }}
          />
        </div>
      )}
      {(error || uploadState.error) && <FormError>{(error || uploadState.error)?.message}</FormError>}
      {!loading && photos.length === 0 && <Empty>Фотографий пока нет</Empty>}
      <div className={cl.photoGrid}>
        {photos.map((photo, index) => (
          <button key={`${photo.source}-${photo.id}`} type='button' className={cl.photo} onClick={() => open(index)}>
            <img src={storageUrl(`${photo.small || photo.medium}.webp`)} alt='' loading='lazy' />
          </button>
        ))}
      </div>
      {photos.length >= PAGE && !done && (
        <button
          type='button'
          className={cl.more}
          onClick={async () => {
            const res = await fetchMore({ variables: { offset: photos.length } })
            if ((res.data?.getCommunityPhotos?.length ?? 0) < PAGE) setDone(true)
          }}
        >
          Показать ещё
        </button>
      )}
    </div>
  )
}

/** Вкладка «Видео» сообщества: альбом и ролики из записей. Добавляет администратор через окно загрузки. */
export const CommunityVideos = ({ id, canAdd, onAdd }: { id: number; canAdd: boolean; onAdd: () => void }) => {
  const { data, loading, error, fetchMore } = useQuery(COMMUNITY_VIDEOS, {
    variables: { id, limit: PAGE, offset: 0 },
    fetchPolicy: 'network-only',
  })
  const [done, setDone] = useState(false)
  const videos = data?.getCommunityVideos ?? []

  return (
    <div className={`playground ${cl.wrap}`}>
      {canAdd && (
        <div className={cl.toolbar}>
          <Btn variant='primary' onClick={onAdd}>
            ＋ Добавить видео
          </Btn>
        </div>
      )}
      {error && <FormError>{error.message}</FormError>}
      {!loading && videos.length === 0 && <Empty>Видео пока нет</Empty>}
      <div className={cl.videoGrid}>
        {videos.map((video) => (
          <figure key={video.id} className={cl.video}>
            <video src={storageUrl(video.file)} controls preload='metadata' playsInline />
            <figcaption>{video.title}</figcaption>
          </figure>
        ))}
      </div>
      {videos.length >= PAGE && !done && (
        <button
          type='button'
          className={cl.more}
          onClick={async () => {
            const res = await fetchMore({ variables: { offset: videos.length } })
            if ((res.data?.getCommunityVideos?.length ?? 0) < PAGE) setDone(true)
          }}
        >
          Показать ещё
        </button>
      )}
    </div>
  )
}
