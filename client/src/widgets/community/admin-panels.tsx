import { useMutation, useQuery } from '@apollo/client'
import { Link } from 'react-router-dom'

import {
  COMMUNITY_BANS,
  COMMUNITY_REQUESTS,
  RESOLVE_COMMUNITY_REQUEST,
  REVIEW_SUGGESTED_POST,
  SUGGESTED_POSTS,
  UNBAN_COMMUNITY_MEMBER,
} from '@/shared/graphql/schema'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { formatDateTime, toTimestamp } from '@/shared/lib/time'
import { RichText } from '@/shared/ui/rich-text'

import cl from './dialogs.module.css'
import media from './media.module.css'

const LIMIT = 50

const Person = ({
  user,
  sub,
}: {
  user: { id?: number | null; login?: string | null; avatar?: string | null }
  sub?: string
}) => (
  <Link to={`/profile/${user.id}`}>
    <img src={useSrcAvatar(user.avatar || '')} alt='' />
    <span>
      {user.login}
      {sub && <small>{sub}</small>}
    </span>
  </Link>
)

/** Заявки на вступление в закрытое сообщество: принять или отклонить. */
export const RequestsPanel = ({ id, onChanged }: { id: number; onChanged: () => void }) => {
  const { data, loading, error, refetch } = useQuery(COMMUNITY_REQUESTS, {
    variables: { id, limit: LIMIT, offset: 0 },
    fetchPolicy: 'network-only',
  })
  const [resolve, state] = useMutation(RESOLVE_COMMUNITY_REQUEST)
  const requests = data?.getCommunityRequests ?? []

  const decide = async (userId: number, accept: boolean) => {
    try {
      await resolve({ variables: { id, userId, accept } })
      await refetch()
      onChanged()
    } catch {
      // Текст ошибки показывает состояние мутации
    }
  }

  return (
    <div className={`playground ${media.wrap}`}>
      {(error || state.error) && <p className={media.error}>{(error || state.error)?.message}</p>}
      {!loading && requests.length === 0 && <p className={media.empty}>Новых заявок нет</p>}
      {requests.map((request) => (
        <div key={request.user.id} className={cl.requestRow}>
          <Person user={request.user} />
          <button
            type='button'
            className={cl.primary}
            disabled={state.loading}
            onClick={() => void decide(request.user.id ?? 0, true)}
          >
            Принять
          </button>
          <button
            type='button'
            className={cl.secondary}
            disabled={state.loading}
            onClick={() => void decide(request.user.id ?? 0, false)}
          >
            Отклонить
          </button>
        </div>
      ))}
    </div>
  )
}

/** Чёрный список сообщества: причина и кнопка «Разблокировать». */
export const BansPanel = ({ id }: { id: number }) => {
  const { data, loading, error, refetch } = useQuery(COMMUNITY_BANS, {
    variables: { id, limit: LIMIT, offset: 0 },
    fetchPolicy: 'network-only',
  })
  const [unban, state] = useMutation(UNBAN_COMMUNITY_MEMBER)
  const bans = data?.getCommunityBans ?? []

  return (
    <div className={`playground ${media.wrap}`}>
      {(error || state.error) && <p className={media.error}>{(error || state.error)?.message}</p>}
      {!loading && bans.length === 0 && <p className={media.empty}>Чёрный список пуст</p>}
      {bans.map((ban) => (
        <div key={ban.user.id} className={cl.requestRow}>
          <Person user={ban.user} sub={ban.reason || 'Без причины'} />
          <button
            type='button'
            className={cl.secondary}
            disabled={state.loading}
            onClick={async () => {
              await unban({ variables: { id, userId: ban.user.id ?? 0 } })
              await refetch()
            }}
          >
            Разблокировать
          </button>
        </div>
      ))}
    </div>
  )
}

/** Предложенные записи: администратор принимает (они появятся на стене) или отклоняет (удаляются). */
export const SuggestedPanel = ({ id, onChanged }: { id: number; onChanged: () => void }) => {
  const { data, loading, error, refetch } = useQuery(SUGGESTED_POSTS, {
    variables: { id, limit: 20, page: 0 },
    fetchPolicy: 'network-only',
  })
  const [review, state] = useMutation(REVIEW_SUGGESTED_POST)
  const posts = data?.getSuggestedPosts ?? []

  const decide = async (postId: number, approve: boolean) => {
    try {
      await review({ variables: { postId, approve } })
      await refetch()
      onChanged()
    } catch {
      // Текст ошибки показывает состояние мутации
    }
  }

  return (
    <div className={media.wrap}>
      {(error || state.error) && <p className={media.error}>{(error || state.error)?.message}</p>}
      {!loading && posts.length === 0 && <p className={`playground ${media.empty}`}>Предложенных записей нет</p>}
      {posts.map((post) => (
        <div key={post.id} className={`playground ${media.wrap}`}>
          <div className={cl.requestRow}>
            {post.user && <Person user={post.user} sub={formatDateTime(toTimestamp(post.date))} />}
          </div>
          {post.article && (
            <p>
              <b>Статья:</b> {post.article.title}
            </p>
          )}
          {post.description && !post.article && (
            <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              <RichText text={post.description} />
            </p>
          )}
          {(post.images?.length ?? 0) > 0 && <p className={cl.hint}>Фото: {post.images?.length}</p>}
          {(post.videos?.length ?? 0) > 0 && <p className={cl.hint}>Видео: {post.videos?.length}</p>}
          <div className={cl.row}>
            <button
              type='button'
              className={cl.primary}
              disabled={state.loading}
              onClick={() => void decide(post.id ?? 0, true)}
            >
              Опубликовать
            </button>
            <button
              type='button'
              className={cl.secondary}
              disabled={state.loading}
              onClick={() => void decide(post.id ?? 0, false)}
            >
              Отклонить
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
