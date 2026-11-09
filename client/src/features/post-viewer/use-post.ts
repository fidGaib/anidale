import { useCallback, useEffect, useRef, useState } from 'react'

import { client } from '@/app/providers/apollo-client'
import { GET_POST, SET_LIKE } from '@/shared/graphql/schema'
import { useSocket } from '@/shared/hooks/useSocket'
import { toTimestamp } from '@/shared/lib/time'

import { usePostSync } from './sync'

export interface ViewedPost {
  id: number
  description: string
  /** Миллисекунды. */
  date: number
  user: { id: number; login: string; avatar: string }
  images: { id: number; high: string; small: string; medium: string; type: string; saved: boolean }[]
  videos: {
    id: number
    title: string
    file: string
    size: number
    type: string
    postId: number | null
    saved: boolean
  }[]
  likesCount: number
  liked: boolean
  commentsCount: number
  editedAt: number
  pinned: boolean
  archived: boolean
  views: number
  repostsCount: number
  bookmarked: boolean
  repostDeleted: boolean
  repostOf: {
    id: number
    description: string
    date: number
    user: { id: number; login: string; avatar: string }
    images: { id: number; high: string; small: string; medium: string }[]
    videos: { id: number; title: string; file: string; size: number; type: string; postId: number | null }[]
  } | null
}

/**
 * Загружает один пост и держит его счётчики актуальными:
 * чужие лайки и комментарии приходят по сокету, свои действия из других окон — через usePostSync.
 */
export const usePost = (postId: number) => {
  const { socket, isConnected } = useSocket()
  const [post, setPost] = useState<ViewedPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    setPost(null)
    setError('')
    setLoading(true)
    void (async () => {
      try {
        const { data } = await client.query({ query: GET_POST, variables: { id: postId }, fetchPolicy: 'network-only' })
        if (!alive.current) return
        const p = data.getPost
        if (!p) {
          setError('Пост не найден или был удалён')
          return
        }
        setPost({
          id: p.id ?? postId,
          description: p.description ?? '',
          date: toTimestamp(p.date),
          user: { id: p.user?.id ?? 0, login: p.user?.login ?? '', avatar: p.user?.avatar ?? '' },
          images: (p.images ?? []).flatMap((i) =>
            i
              ? [
                  {
                    id: i.id ?? 0,
                    high: i.high ?? '',
                    small: i.small ?? '',
                    medium: i.medium ?? '',
                    type: i.type ?? '',
                    saved: !!i.saved,
                  },
                ]
              : [],
          ),
          videos: (p.videos ?? []).flatMap((v) =>
            v
              ? [
                  {
                    id: v.id,
                    title: v.title,
                    file: v.file,
                    size: v.size,
                    type: v.type,
                    postId: v.postId ?? null,
                    saved: !!v.saved,
                  },
                ]
              : [],
          ),
          likesCount: p.likesCount ?? 0,
          liked: !!p.liked,
          commentsCount: p.commentsCount ?? 0,
          editedAt: toTimestamp(p.editedAt),
          pinned: !!p.pinned,
          archived: !!p.archived,
          views: p.views ?? 0,
          repostsCount: p.repostsCount ?? 0,
          bookmarked: !!p.bookmarked,
          repostDeleted: !!p.repostDeleted,
          repostOf: p.repostOf
            ? {
                id: p.repostOf.id ?? 0,
                description: p.repostOf.description ?? '',
                date: toTimestamp(p.repostOf.date),
                user: {
                  id: p.repostOf.user?.id ?? 0,
                  login: p.repostOf.user?.login ?? '',
                  avatar: p.repostOf.user?.avatar ?? '',
                },
                images: (p.repostOf.images ?? []).flatMap((i) =>
                  i ? [{ id: i.id ?? 0, high: i.high ?? '', small: i.small ?? '', medium: i.medium ?? '' }] : [],
                ),
                videos: (p.repostOf.videos ?? []).flatMap((v) =>
                  v
                    ? [{ id: v.id, title: v.title, file: v.file, size: v.size, type: v.type, postId: v.postId ?? null }]
                    : [],
                ),
              }
            : null,
        })
      } catch (e) {
        if (alive.current) setError(e instanceof Error ? e.message : 'Не удалось загрузить пост')
      } finally {
        if (alive.current) setLoading(false)
      }
    })()
    return () => {
      alive.current = false
    }
  }, [postId])

  // Счётчики от других пользователей
  useEffect(() => {
    if (!socket || !isConnected) return
    const onStats = ({
      postId: id,
      likesCount,
      commentsCount,
    }: {
      postId: number
      likesCount?: number
      commentsCount?: number
    }) => {
      if (id !== postId) return
      setPost((prev) =>
        prev
          ? { ...prev, likesCount: likesCount ?? prev.likesCount, commentsCount: commentsCount ?? prev.commentsCount }
          : prev,
      )
    }
    socket.on('postStats', onStats)
    return () => {
      socket.off('postStats', onStats)
    }
  }, [socket, isConnected, postId])

  // Лайк, поставленный в ленте или в соседнем окне
  const patch = usePostSync((s) => s.patch)
  const version = usePostSync((s) => s.version)
  useEffect(() => {
    if (!patch || patch.id !== postId) return
    const { removed, ...changes } = patch
    if (removed) {
      setPost(null)
      setError('Пост удалён')
      return
    }
    // Берём только заданные поля: undefined не должен затирать текущие значения
    const defined = Object.fromEntries(Object.entries(changes).filter(([k, v]) => k !== 'id' && v !== undefined))
    setPost((prev) => (prev ? { ...prev, ...defined } : prev))
    // version нужен, чтобы реагировать на каждое изменение, даже если объект патча равен прежнему по значению
  }, [patch, version, postId])

  const toggleLike = useCallback(async () => {
    if (!post) return
    const liked = !post.liked
    const optimistic = { liked, likesCount: Math.max(post.likesCount + (liked ? 1 : -1), 0) }
    // Сразу показываем результат; при ошибке возвращаем как было
    setPost((prev) => (prev ? { ...prev, ...optimistic } : prev))
    usePostSync.getState().publish({ id: post.id, ...optimistic })
    try {
      const { data } = await client.mutate({ mutation: SET_LIKE, variables: { id: post.id, liked } })
      if (data?.setLike) {
        const real = { liked: data.setLike.liked, likesCount: data.setLike.likesCount }
        setPost((prev) => (prev ? { ...prev, ...real } : prev))
        usePostSync.getState().publish({ id: post.id, ...real })
      }
    } catch {
      const back = { liked: post.liked, likesCount: post.likesCount }
      setPost((prev) => (prev ? { ...prev, ...back } : prev))
      usePostSync.getState().publish({ id: post.id, ...back })
    }
  }, [post])

  return { post, loading, error, toggleLike }
}
