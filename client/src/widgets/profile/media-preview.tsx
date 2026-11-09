import { useQuery } from '@apollo/client'
import { useState } from 'react'

import { toTrack, useMusicStore } from '@/features/music/module'
import { storageUrl } from '@/shared/config'
import { GET_PHOTOS, GET_VIDEOS, MUSIC_BY_USER } from '@/shared/graphql/schema'
import { openPhotos } from '@/shared/lib/photo-viewer'
import { formatFileSize } from '@/shared/lib/time'

import cl from './media-preview.module.css'
import { PreviewTab, pickPreviewTab } from './preview-tabs'

const TITLES: Record<PreviewTab, string> = { music: 'Музыка', photos: 'Фото', videos: 'Видео' }
const MUSIC_SHOWN = 4
const PHOTOS_SHOWN = 6
const VIDEOS_SHOWN = 4

interface Props {
  /** Чей профиль открыт. */
  id: number
  /** Открыть полную вкладку профиля: «Показать всё» (2 — музыка, 3 — видео, 4 — фото). */
  onShowAll: (layout: number) => void
}

/** Компактный блок над стеной: несколько последних треков, фото и видео, как в ВК. Скрывается, если у человека ничего нет. */
export const MediaPreview = ({ id, onShowAll }: Props) => {
  const [chosen, setChosen] = useState<PreviewTab | null>(null)
  const currentId = useMusicStore((s) => s.currentId)
  const isPlaying = useMusicStore((s) => s.isPlaying)
  const playOne = useMusicStore((s) => s.playOne)

  const music = useQuery(MUSIC_BY_USER, { variables: { id, limit: MUSIC_SHOWN, page: 0 }, skip: !id })
  const photos = useQuery(GET_PHOTOS, { variables: { id, limit: PHOTOS_SHOWN, offset: 0 }, skip: !id })
  const videos = useQuery(GET_VIDEOS, { variables: { id, limit: VIDEOS_SHOWN, offset: 0 }, skip: !id })

  const tracks = (music.data?.getMusic ?? []).map(toTrack)
  const photoList = photos.data?.getPhotos ?? []
  const videoList = videos.data?.getVideos ?? []

  const tab = pickPreviewTab({ music: tracks.length, photos: photoList.length, videos: videoList.length }, chosen)
  if (!tab) return null

  const available = (['music', 'photos', 'videos'] as PreviewTab[]).filter((t) =>
    t === 'music' ? tracks.length : t === 'photos' ? photoList.length : videoList.length,
  )
  const showAllLayout = tab === 'music' ? 2 : tab === 'photos' ? 4 : 3

  const openPhoto = (index: number) =>
    openPhotos(
      photoList.map((photo) => ({ src: storageUrl(`${photo.medium || photo.small || photo.high}.webp`) })),
      index,
    )

  return (
    <section className={`playground ${cl.card}`}>
      <div className={cl.tabs} role='tablist'>
        {available.map((t) => (
          <button
            key={t}
            type='button'
            role='tab'
            aria-selected={tab === t}
            className={`${cl.tab} ${tab === t ? cl.tabActive : ''}`}
            onClick={() => setChosen(t)}
          >
            {TITLES[t]}
          </button>
        ))}
      </div>

      {tab === 'music' && (
        <div className={cl.tracks}>
          {tracks.map((track) => {
            const active = currentId === track.id
            return (
              <button key={track.id} type='button' className={cl.track} onClick={() => playOne(track, tracks)}>
                <span className={`${cl.play} ${active ? cl.playActive : ''}`}>{active && isPlaying ? '❚❚' : '▶'}</span>
                <span className={cl.trackText}>
                  <span className={cl.trackTitle}>{track.title}</span>
                  <span className={cl.trackArtist}>{track.artist}</span>
                </span>
                <span className={cl.trackSize}>{formatFileSize(track.size)}</span>
              </button>
            )
          })}
        </div>
      )}

      {tab === 'photos' && (
        <div className={cl.photos}>
          {photoList.map((photo, index) => (
            <button
              key={`${photo.source}-${photo.id}`}
              type='button'
              className={cl.photo}
              onClick={() => openPhoto(index)}
            >
              <img src={storageUrl(`${photo.small || photo.medium}.webp`)} alt='' loading='lazy' />
            </button>
          ))}
        </div>
      )}

      {tab === 'videos' && (
        <div className={cl.videos}>
          {videoList.map((video) => (
            <button key={video.id} type='button' className={cl.video} onClick={() => onShowAll(3)} title={video.title}>
              <video src={storageUrl(video.file)} preload='metadata' muted playsInline />
              <span className={cl.videoPlay}>▶</span>
              <span className={cl.videoTitle}>{video.title}</span>
            </button>
          ))}
        </div>
      )}

      <button type='button' className={cl.showAll} onClick={() => onShowAll(showAllLayout)}>
        Показать всё
      </button>
    </section>
  )
}
