import { Link } from 'react-router-dom'

import { PostVideos } from '@/entities/post'
import { storageUrl } from '@/shared/config'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { openPhotos } from '@/shared/lib/photo-viewer'
import { formatDateTime } from '@/shared/lib/time'
import { RichText } from '@/shared/ui/rich-text'

import { useOpenPost } from './post-link'
import cl from './ui.module.css'

export interface RepostSourceView {
  id: number
  description: string
  date: number
  user: { id: number; login: string; avatar: string }
  images: { id: number; high?: string; small: string; medium: string }[]
  videos?: { id: number; title: string; file: string; size: number; type: string }[]
}

/**
 * Исходный пост внутри репоста: автор, дата, текст и картинки. Клик открывает исходный пост.
 * Если оригинал удалён, показывается подпись.
 */
export const RepostCard = ({ source, deleted }: { source?: RepostSourceView | null; deleted?: boolean }) => {
  const openPost = useOpenPost()
  const avatar = useSrcAvatar(source?.user.avatar ?? '')
  if (!source) return deleted ? <div className={`${cl.repost} ${cl.repostGone}`}>Исходный пост удалён</div> : null

  const photos = source.images.flatMap((i) => {
    const path = i.high || i.medium
    return path ? [{ src: storageUrl(`${path}.webp`) }] : []
  })

  return (
    <div className={cl.repost} onClick={(e) => !(e.target as HTMLElement).closest('a') && openPost(source.id)}>
      <Link to={`/profile/${source.user.id}`} className={cl.repostAuthor} onClick={(e) => e.stopPropagation()}>
        <ImageLoading className={cl.repostAvatar} src={avatar} />
        <span>
          <span className={cl.login}>{source.user.login}</span>
          <span className={cl.date}>{formatDateTime(source.date)}</span>
        </span>
      </Link>
      {source.description && (
        <div className={cl.repostText}>
          <RichText text={source.description} />
        </div>
      )}
      {source.images.length > 0 && (
        <div className={cl.repostImages}>
          {source.images.map((image, index) => (
            <img
              key={image.id}
              src={storageUrl(`${image.small}.webp`)}
              alt=''
              loading='lazy'
              onClick={(e) => {
                e.stopPropagation()
                openPhotos(photos, index, source.id)
              }}
            />
          ))}
        </div>
      )}
      {source.videos && source.videos.length > 0 && <PostVideos videos={source.videos} ownerId={source.user.id} />}
    </div>
  )
}
