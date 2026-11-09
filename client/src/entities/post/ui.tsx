import { useMutation } from '@apollo/client'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { useDarkModeStore } from '@/app/module'
import { useRefreshStore } from '@/app/providers/routes/model'
import { CommunityAvatar } from '@/entities/community'
import { assetUrl, storageUrl } from '@/shared/config'
import { SAVE_VIDEO } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { openPhotos } from '@/shared/lib/photo-viewer'

import cl from './ui.module.css'

interface PostOwnerData {
  user?: { id?: number | null; login?: string | null; avatar?: string | null } | null
  /** Запись на стене сообщества: автором показывается сообщество. */
  community?: { id: number; name: string; avatar: string } | null
}

export const PostOwner = ({ post }: { post: PostOwnerData }) => {
  const theme = useDarkModeStore((store) => store.theme)
  const avatar = useSrcAvatar(post?.user?.avatar || '')
  if (post.community) {
    return (
      <Link
        to={`/community/${post.community.id}`}
        className={cl.wrappOwner}
        style={{ color: `${theme === 'dark' ? 'gray' : '#000'}` }}
      >
        <CommunityAvatar name={post.community.name} avatar={post.community.avatar} size={40} />
        {post.community.name}
      </Link>
    )
  }
  return (
    <Link
      to={`/profile/${post?.user?.id}`}
      className={cl.wrappOwner}
      style={{ color: `${theme === 'dark' ? 'gray' : '#000'}` }}
    >
      <ImageLoading src={avatar} alt='anidale' />
      {post?.user?.login}
    </Link>
  )
}
interface ActionProps {
  liked: boolean
  likesCount: number
  commentsCount: number
  commentsOpen: boolean
  /** Гость не может ставить лайки: подсказываем и не реагируем на клик. */
  canLike: boolean
  onLike: () => void
  onToggleComments: () => void
  repostsCount?: number
  /** Просмотры: показываются справа, если они есть. */
  views?: number
  /** Нажали «Поделиться»; без обработчика кнопки нет. */
  onShare?: () => void
}
export const PostActionWrapp = ({
  liked,
  likesCount,
  commentsCount,
  commentsOpen,
  canLike,
  onLike,
  onToggleComments,
  repostsCount = 0,
  views = 0,
  onShare,
}: ActionProps) => {
  return (
    <div className={cl.wrappActions}>
      <div
        className={`${cl.icon} ${liked ? cl.liked : ''}`}
        title={canLike ? (liked ? 'Убрать лайк' : 'Нравится') : 'Войдите, чтобы ставить лайки'}
        onClick={canLike ? onLike : undefined}
      >
        <ImageLoading src={assetUrl('icons/like.svg')} alt='anidale like icon' />
        <span className={cl.count}>{likesCount > 0 ? likesCount : ''}</span>
      </div>
      <div className={`${cl.icon} ${commentsOpen ? cl.iconActive : ''}`} title='Комментарии' onClick={onToggleComments}>
        <ImageLoading src={assetUrl('icons/comm.svg')} alt='anidale comments icon' />
        <span className={cl.count}>{commentsCount > 0 ? commentsCount : ''}</span>
      </div>
      {onShare && (
        <div className={cl.icon} title='Поделиться' onClick={onShare}>
          <span className={cl.glyph}>↪</span>
          <span className={cl.count}>{repostsCount > 0 ? repostsCount : ''}</span>
        </div>
      )}
      <div className={`${cl.icon} ${cl.views}`} title='Просмотры'>
        <span className={cl.glyph}>👁</span>
        <span className={cl.count}>{views}</span>
      </div>
    </div>
  )
}
interface PostImagesProps {
  images?:
    | ({
        id?: number | null
        high?: string | null
        small?: string | null
        medium?: string | null
        saved?: boolean | null
      } | null)[]
    | null
  /** Автор поста: чужие картинки можно сохранить в «Сохранённые». */
  ownerId?: number
  /** Пост, которому принадлежат картинки: в просмотре рядом покажутся описание, лайки и комментарии. */
  postId?: number | null
}

interface PostVideosProps {
  videos?:
    | ({
        id?: number | null
        title?: string | null
        file?: string | null
        type?: string | null
        saved?: boolean | null
      } | null)[]
    | null
  /** Автор поста: чужие видео можно сохранить. */
  ownerId?: number
}

/**
 * Плеер ролика. Если файл не загрузился (сервер статики недоступен, файл удалён, формат не поддерживается),
 * вместо чёрного пустого окна показывается причина и кнопка повтора.
 */
export const VideoPlayer = ({ file }: { file: string }) => {
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)
  const src = storageUrl(file)
  if (failed) {
    return (
      <div className={cl.videoError}>
        <span>Не удалось загрузить видео</span>
        <span>
          <button
            type='button'
            className={cl.saveVideo}
            onClick={() => {
              setFailed(false)
              setAttempt((n) => n + 1)
            }}
          >
            Повторить
          </button>{' '}
          <a className={cl.saveVideo} href={src} target='_blank' rel='noreferrer'>
            Открыть файл
          </a>
        </span>
      </div>
    )
  }
  return (
    <video
      key={attempt}
      className={cl.video}
      src={src}
      controls
      preload='metadata'
      playsInline
      onError={() => setFailed(true)}
    />
  )
}

/** Кнопка «Сохранить» под чужим видео поста. */
export const SaveVideoButton = ({ id, saved }: { id: number; saved: boolean }) => {
  const [state, setState] = useState(saved)
  const [save, { loading, error }] = useMutation(SAVE_VIDEO)
  const toggle = async () => {
    const next = !state
    try {
      await save({ variables: { id, saved: next } })
      setState(next)
    } catch {
      // Текст ошибки показывается под кнопкой
    }
  }
  return (
    <>
      <button
        type='button'
        className={`${cl.saveVideo} ${state ? cl.saveVideoActive : ''}`}
        disabled={loading}
        onClick={() => void toggle()}
      >
        {state ? '★ В сохранённых' : '☆ Сохранить'}
      </button>
      {error && <span className={cl.saveVideoError}>{error.message}</span>}
    </>
  )
}

/** Видео, прикреплённые к посту: проигрываются прямо в ленте. */
export const PostVideos = ({ videos, ownerId }: PostVideosProps) => {
  const myId = useRefreshStore((state) => state.refreshData.id) ?? 0
  if (!videos?.length) return <></>

  return (
    <div className={cl.wrappVideos}>
      {videos.map((video, index) =>
        video?.file ? (
          <div key={`${video.id ?? index}-${video.file}`} className={cl.videoCard}>
            <VideoPlayer file={video.file} />
            {video.title ? <span className={cl.videoTitle}>{video.title}</span> : null}
            {myId > 0 && ownerId !== undefined && ownerId !== myId && video.id ? (
              <SaveVideoButton id={video.id} saved={!!video.saved} />
            ) : null}
          </div>
        ) : null,
      )}
    </div>
  )
}

export const PostImages = ({ images, postId, ownerId }: PostImagesProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const myId = useRefreshStore((state) => state.refreshData.id) ?? 0
  // Сохранение в просмотре меняет отметку и здесь: иначе при повторном открытии кнопка покажет старое состояние
  const [savedOverride, setSavedOverride] = useState<Record<number, boolean>>({})
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ source?: string; id?: number; saved?: boolean }>).detail
      if (detail?.source === 'POST' && detail.id !== undefined && detail.saved !== undefined) {
        setSavedOverride((prev) => ({ ...prev, [detail.id as number]: detail.saved as boolean }))
      }
    }
    window.addEventListener('saved-photos-changed', onChange)
    return () => window.removeEventListener('saved-photos-changed', onChange)
  }, [])

  if (!images?.length) return <></>

  const scrollByPage = (direction: 1 | -1) => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollBy({ left: direction * scroller.clientWidth, behavior: 'smooth' })
  }

  // В просмотр уходит лучшее качество, какое есть
  const photos = images.flatMap((image) => {
    const path = image?.high || image?.medium
    if (!path) return []
    const canSave = myId > 0 && ownerId !== undefined && ownerId !== myId && !!image?.id
    return [
      {
        src: storageUrl(`${path}.webp`),
        ...(canSave
          ? {
              save: {
                source: 'POST',
                id: image?.id as number,
                postId: postId ?? null,
                ownerId: ownerId as number,
                saved: savedOverride[image?.id as number] ?? !!image?.saved,
              },
            }
          : {}),
      },
    ]
  })

  return (
    <div className={cl.wrappImages}>
      <div className={cl.scroller} ref={scrollerRef}>
        {images.map((image, index) => (
          <div
            key={`${image?.id ?? index}-${image?.medium ?? ''}`}
            className={cl.imageSlide}
            onClick={() => openPhotos(photos, index, postId ?? null)}
          >
            <ImageLoading className={cl.small} src={storageUrl(`${image?.small ?? ''}.webp`)} />
            <ImageLoading className={cl.medium} src={storageUrl(`${image?.medium ?? ''}.webp`)} />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <>
          <button
            type='button'
            aria-label='Предыдущее изображение'
            className={`${cl.navButton} ${cl.navPrev}`}
            onClick={() => scrollByPage(-1)}
          >
            ‹
          </button>
          <button
            type='button'
            aria-label='Следующее изображение'
            className={`${cl.navButton} ${cl.navNext}`}
            onClick={() => scrollByPage(1)}
          >
            ›
          </button>
        </>
      )}
    </div>
  )
}
