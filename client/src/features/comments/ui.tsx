import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { client } from '@/app/providers/apollo-client'
import { ADD_COMMENT, COMMENTS, REMOVE_COMMENT } from '@/shared/graphql/schema'
import { formatDateTime, toTimestamp } from '@/shared/lib/time'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSocket } from '@/shared/hooks/useSocket'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import ButtonUI from '@/shared/ui/button'

import cl from './ui.module.css'

const PAGE_SIZE = 10
const MAX_LENGTH = 500

interface CommentItem {
  id: number
  text: string
  date: number
  postId: number
  user: { id: number; login: string; avatar: string }
}

interface RawComment {
  id?: number | null
  text?: string | null
  date?: unknown
  postId?: number | null
  user?: { id?: number | null; login?: string | null; avatar?: string | null } | null
}

const toComment = (c: RawComment): CommentItem => ({
  id: c.id ?? 0,
  text: c.text ?? '',
  date: toTimestamp(c.date),
  postId: c.postId ?? 0,
  user: { id: c.user?.id ?? 0, login: c.user?.login ?? '', avatar: c.user?.avatar ?? '' },
})

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Что-то пошло не так')

const Comment = ({
  comment,
  canRemove,
  onRemove,
}: {
  comment: CommentItem
  canRemove: boolean
  onRemove: () => void
}) => (
  <div className={cl.comment}>
    <ImageLoading className={cl.avatar} src={useSrcAvatar(comment.user.avatar)} />
    <div className={cl.body}>
      <div className={cl.meta}>
        <Link to={`/profile/${comment.user.id}`} className={cl.login}>
          {comment.user.login}
        </Link>
        <span className={cl.date}>{formatDateTime(comment.date)}</span>
      </div>
      <div className={cl.text}>{comment.text}</div>
    </div>
    {canRemove && (
      <img
        className={cl.remove}
        src='/icons/close.svg'
        alt='Удалить комментарий'
        title='Удалить комментарий'
        onClick={onRemove}
      />
    )}
  </div>
)

/** Комментарии под постом: список с подгрузкой, ввод нового, удаление, обновление по сокету. */
export const PostComments = ({ postId, postOwnerId }: { postId: number; postOwnerId: number }) => {
  const myId = useRefreshStore((s) => s.refreshData.id)
  const { socket, isConnected } = useSocket()
  const [comments, setComments] = useState<CommentItem[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const nextPage = useRef(0)
  // Защита от гонок: ответы после размонтирования или смены поста игнорируются
  const alive = useRef(true)

  const loadPage = useCallback(
    async (page: number) => {
      setLoading(true)
      try {
        const { data } = await client.query({
          query: COMMENTS,
          variables: { postId, limit: PAGE_SIZE, page },
          fetchPolicy: 'network-only',
        })
        if (!alive.current) return
        const fetched = (data.getComments ?? []).map(toComment)
        nextPage.current = page + 1
        setHasMore(fetched.length === PAGE_SIZE)
        setComments((prev) => {
          const ids = new Set(prev.map((c) => c.id))
          return [...prev, ...fetched.filter((c) => !ids.has(c.id))]
        })
      } catch (e) {
        if (alive.current) setError(errorMessage(e))
      } finally {
        if (alive.current) setLoading(false)
      }
    },
    [postId],
  )

  useEffect(() => {
    alive.current = true
    nextPage.current = 0
    setComments([])
    setError('')
    void loadPage(0)
    return () => {
      alive.current = false
    }
  }, [loadPage])

  // Чужие комментарии появляются без перезагрузки
  useEffect(() => {
    if (!socket || !isConnected) return
    const onNew = ({ comment }: { comment: RawComment }) => {
      if (comment.postId !== postId) return
      const item = toComment(comment)
      setComments((prev) => (prev.some((c) => c.id === item.id) ? prev : [item, ...prev]))
    }
    const onRemoved = ({ postId: pid, id }: { postId: number; id: number }) => {
      if (pid === postId) setComments((prev) => prev.filter((c) => c.id !== id))
    }
    socket.on('newComment', onNew)
    socket.on('removedComment', onRemoved)
    return () => {
      socket.off('newComment', onNew)
      socket.off('removedComment', onRemoved)
    }
  }, [socket, isConnected, postId])

  const send = async () => {
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    setError('')
    try {
      const { data } = await client.mutate({ mutation: ADD_COMMENT, variables: { postId, text: value } })
      if (data?.addComment) {
        const item = toComment(data.addComment)
        setComments((prev) => (prev.some((c) => c.id === item.id) ? prev : [item, ...prev]))
      }
      setText('')
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSending(false)
    }
  }

  const remove = async (id: number) => {
    setError('')
    try {
      await client.mutate({ mutation: REMOVE_COMMENT, variables: { id } })
      setComments((prev) => prev.filter((c) => c.id !== id))
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className={cl.wrapper}>
      {myId ? (
        <div className={cl.form}>
          <textarea
            className={cl.input}
            placeholder='Написать комментарий…'
            value={text}
            maxLength={MAX_LENGTH}
            rows={1}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Enter отправляет, Shift+Enter — перенос строки
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
          />
          <ButtonUI disabled={sending || !text.trim()} onClick={() => void send()}>
            Отправить
          </ButtonUI>
        </div>
      ) : (
        <p className={cl.hint}>Войдите, чтобы оставить комментарий</p>
      )}
      {error && <p className={cl.error}>{error}</p>}
      {comments.map((comment) => (
        <Comment
          key={comment.id}
          comment={comment}
          // Удалить можно свой комментарий или любой под своим постом
          canRemove={!!myId && (comment.user.id === myId || postOwnerId === myId)}
          onRemove={() => void remove(comment.id)}
        />
      ))}
      {!loading && comments.length === 0 && !error && <p className={cl.hint}>Комментариев пока нет</p>}
      {loading && <p className={cl.hint}>Загрузка…</p>}
      {hasMore && !loading && (
        <div className={cl.more}>
          <ButtonUI onClick={() => void loadPage(nextPage.current)}>Показать ещё</ButtonUI>
        </div>
      )}
    </div>
  )
}
