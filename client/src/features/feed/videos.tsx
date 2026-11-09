import { useQuery } from '@apollo/client'
import { Link } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { SaveVideoButton, VideoPlayer } from '@/entities/post'
import { ALL_VIDEOS } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { formatDateTime, toTimestamp } from '@/shared/lib/time'
import ButtonUI from '@/shared/ui/button'

import cl from './videos.module.css'

const PAGE = 12

const Author = ({ id, login, avatar }: { id: number; login: string; avatar: string }) => (
  <Link to={`/profile/${id}`} className={cl.author}>
    <ImageLoading className={cl.avatar} src={useSrcAvatar(avatar)} />
    <span>{login}</span>
  </Link>
)

/** Вкладка «видео» в ленте: ролики всех пользователей из постов и альбомов, новые сверху. */
export const FeedVideos = () => {
  const myId = useRefreshStore((state) => state.refreshData.id) ?? 0
  const { data, loading, error, fetchMore } = useQuery(ALL_VIDEOS, {
    variables: { limit: PAGE, offset: 0 },
    fetchPolicy: 'network-only',
  })
  const videos = data?.getAllVideos ?? []
  // Следующая страница есть, пока предыдущая приходила целиком
  const hasMore = videos.length > 0 && videos.length % PAGE === 0

  return (
    <div className={cl.wrap}>
      {error && <p className={cl.message}>{error.message}</p>}
      {!loading && !error && videos.length === 0 && <p className={cl.message}>Видео пока нет</p>}
      <div className={cl.grid}>
        {videos.map((video) => (
          <div key={video.id} className={`playground ${cl.card}`}>
            <VideoPlayer file={video.file} />
            <div className={cl.title}>{video.title}</div>
            <div className={cl.meta}>
              <Author id={video.user.id ?? 0} login={video.user.login ?? ''} avatar={video.user.avatar ?? ''} />
              <span className={cl.date}>{formatDateTime(toTimestamp(video.date))}</span>
            </div>
            {myId > 0 && video.user.id !== myId && <SaveVideoButton id={video.id} saved={!!video.saved} />}
          </div>
        ))}
      </div>
      {hasMore && (
        <div className={cl.more}>
          <ButtonUI disabled={loading} onClick={() => void fetchMore({ variables: { offset: videos.length } })}>
            Показать ещё
          </ButtonUI>
        </div>
      )}
    </div>
  )
}
