import { useQuery } from '@apollo/client'
import { Link, useParams } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { articleImageUrl } from '@/entities/article'
import { ViewMark, useOpenPost } from '@/features/post-viewer'
import { GET_ARTICLE } from '@/shared/graphql/schema'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { formatDateTime, toTimestamp } from '@/shared/lib/time'

import { ArticleBody } from './body'
import { parseStored, readingMinutes } from './model'
import cl from './reader.module.css'

/** Страница статьи: обложка, название, автор, текст; обсуждение открывается окном поста. */
export const ArticleReader = () => {
  const id = parseInt(useParams().id || '')
  const myId = useRefreshStore((s) => s.refreshData.id) ?? 0
  const openPost = useOpenPost()
  const { data, loading, error } = useQuery(GET_ARTICLE, { variables: { id }, skip: !id, fetchPolicy: 'network-only' })
  const article = data?.getArticle
  const avatar = useSrcAvatar(article?.user.avatar ?? '')

  if (loading && !article) return <div className={`playground ${cl.page}`}>Загрузка…</div>
  if (error || !article) {
    return (
      <div className={`playground ${cl.page}`}>
        <p className={cl.hint}>{error?.message || 'Статья не найдена или недоступна'}</p>
      </div>
    )
  }
  document.title = `${article.title} - AniDale`

  const blocks = parseStored(article.content)
  const edited = toTimestamp(article.editedAt)

  return (
    <article className={`playground ${cl.page}`}>
      {article.cover && <img className={cl.cover} src={articleImageUrl(article.cover)} alt='' />}
      <h1 className={cl.title}>{article.title}</h1>
      <div className={cl.meta}>
        <Link to={`/profile/${article.user.id}`} className={cl.author}>
          <img className={cl.avatar} src={avatar} alt='' />
          {article.user.login}
        </Link>
        <span className={cl.muted}>
          {formatDateTime(toTimestamp(article.date))}
          {edited ? ' · изменено' : ''}
        </span>
        <span className={cl.muted}>{readingMinutes(blocks)} мин чтения</span>
      </div>

      <ArticleBody blocks={blocks} />
      <ViewMark postId={article.postId} />

      <div className={cl.actions}>
        <button type='button' className={cl.button} onClick={() => openPost(article.postId)}>
          Комментарии и реакции
        </button>
        {myId === article.user.id && (
          <Link to={`/article/${article.id}/edit`} className={`${cl.button} ${cl.buttonGhost}`}>
            Редактировать
          </Link>
        )}
      </div>
    </article>
  )
}
