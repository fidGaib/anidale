import { Link } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { PostActionWrapp, PostImages, PostVideos } from '@/entities/post'
import { PostComments } from '@/features/comments'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { formatDateTime } from '@/shared/lib/time'
import { RichText } from '@/shared/ui/rich-text'

import { PostMenu } from './post-menu'
import { RepostCard } from './repost-card'
import { openShare } from './share-store'
import { ViewMark } from './views'
import { ViewedPost, usePost } from './use-post'
import cl from './ui.module.css'

interface Props {
  postId: number
  /** Показывать картинки поста (в окне поста — да, рядом с просмотром фото — нет, они уже на экране). */
  withImages?: boolean
  /** Ссылка на автора или дату выбрана: окно нужно закрыть. */
  onNavigate?: () => void
  /** Пост удалён из этого окна: окно нужно закрыть. */
  onRemoved?: () => void
}

const Header = ({ post, onNavigate, onRemoved }: { post: ViewedPost; onNavigate?: () => void; onRemoved?: () => void }) => (
  <div className={cl.postHead}>
    <Link to={`/profile/${post.user.id}`} className={cl.author} onClick={onNavigate}>
      <ImageLoading className={cl.avatar} src={useSrcAvatar(post.user.avatar)} />
      <span className={cl.authorText}>
        <span className={cl.login}>{post.user.login}</span>
        <span className={cl.date}>
          {formatDateTime(post.date)}
          {post.editedAt ? ' · изменено' : ''}
        </span>
      </span>
    </Link>
    <PostMenu
      post={{
        id: post.id,
        ownerId: post.user.id,
        description: post.description,
        pinned: post.pinned,
        archived: post.archived,
        bookmarked: post.bookmarked,
      }}
      onRemoved={onRemoved}
    />
  </div>
)

/** Содержимое поста: автор и дата, картинки, текст, лайк и все комментарии. Используется в окне поста и рядом с просмотром фото. */
export const PostBody = ({ postId, withImages = true, onNavigate, onRemoved }: Props) => {
  const myId = useRefreshStore((s) => s.refreshData.id) ?? 0
  const { post, loading, error, toggleLike } = usePost(postId)

  if (loading && !post) return <p className={cl.hint}>Загрузка…</p>
  if (error || !post) return <p className={cl.hint}>{error || 'Пост не найден'}</p>

  return (
    <div className={cl.postBody}>
      <Header post={post} onNavigate={onNavigate} onRemoved={onRemoved} />
      {(post.pinned || post.archived) && (
        <div className={cl.label}>{post.archived ? '🗄 В архиве: виден только вам' : '📌 Закреплённая запись'}</div>
      )}
      {withImages && post.images.length > 0 && <PostImages images={post.images} postId={post.id} ownerId={post.user.id} />}
      {withImages && post.videos.length > 0 && <PostVideos videos={post.videos} ownerId={post.user.id} />}
      {post.description && (
        <div className={cl.text}>
          <RichText text={post.description} />
        </div>
      )}
      <RepostCard source={post.repostOf} deleted={post.repostDeleted} />
      <ViewMark postId={post.id} views={post.views} />
      <PostActionWrapp
        repostsCount={post.repostsCount}
        views={post.views}
        onShare={() => openShare(post.id, post.repostsCount)}
        liked={post.liked}
        likesCount={post.likesCount}
        commentsCount={post.commentsCount}
        commentsOpen
        canLike={myId > 0}
        onLike={() => void toggleLike()}
        onToggleComments={() => undefined}
      />
      <PostComments postId={post.id} postOwnerId={post.user.id} />
    </div>
  )
}
