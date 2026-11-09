import { useMutation } from '@apollo/client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { useParams } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { PostActionWrapp, PostImages, PostOwner, PostVideos } from '@/entities/post'
import { PostMenu, RepostCard, ViewMark, openShare, useOpenPost, usePostSync } from '@/features/post-viewer'
import { Post } from '@/features/profile/types'
import { SET_LIKE } from '@/shared/graphql/schema'
import { useSocket } from '@/shared/hooks/useSocket'
import { formatDateTime, toTimestamp } from '@/shared/lib/time'
import { usePostStore } from '@/shared/store'
import ButtonUI from '@/shared/ui/button'
import { Plug } from '@/shared/ui/plug'
import { RichText } from '@/shared/ui/rich-text'

import cl from './ui.module.css'

const POSTS_PAGE_SIZE = 10

/** Добавляет только новые посты: защита от дублей при гонках и socket-событиях. */
const appendUniquePosts = (prev: Post[], next: Post[]) => {
  const ids = new Set(prev.map((post) => post.id))
  const unique = next.filter((post) => !ids.has(post.id))
  return unique.length ? [...prev, ...unique] : prev
}

export const Posts = ({ mode }: { mode?: 'bookmarks' }) => {
  const profileUrlId = parseInt(useParams().id || '')
  const fetchPostsFeed = usePostStore((state) => state.fetchPostsFeed)
  const fetchPostsProfile = usePostStore((state) => state.fetchPostsProfile)
  const fetchBookmarks = usePostStore((state) => state.fetchBookmarks)
  const [posts, setPosts] = useState<Post[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const { socket, isConnected } = useSocket()
  const [ref, inView] = useInView({
    threshold: 0,
  })

  // Номер следующей страницы (page в API начинается с 0) храним в ref:
  // он не участвует в разметке, а обычный state давал stale-замыкание
  // и повторную загрузку одной и той же страницы.
  const pageRef = useRef(0)
  // Не даёт запустить два запроса одновременно.
  const fetchingRef = useRef(false)
  // Меняется при смене профиля/размонтировании — ответы старых запросов игнорируются.
  const requestRef = useRef(0)

  const loadPosts = useCallback(async () => {
    if (fetchingRef.current) return

    fetchingRef.current = true
    setLoading(true)
    setError(false)

    const requestId = requestRef.current
    const page = pageRef.current

    try {
      const fetchedPosts =
        mode === 'bookmarks'
          ? await fetchBookmarks(page, POSTS_PAGE_SIZE)
          : profileUrlId
          ? await fetchPostsProfile(profileUrlId, page, POSTS_PAGE_SIZE)
          : await fetchPostsFeed(page, POSTS_PAGE_SIZE)

      // Пользователь уже ушёл на другой профиль — результат не нужен.
      if (requestId !== requestRef.current) return

      if (fetchedPosts.length === 0) {
        setHasMore(false)
        return
      }

      pageRef.current = page + 1
      setPosts((prev) => appendUniquePosts(prev, fetchedPosts))

      if (fetchedPosts.length < POSTS_PAGE_SIZE) setHasMore(false)
    } catch (err) {
      if (requestId !== requestRef.current) return
      console.error('Не удалось загрузить посты', err)
      // Не крутим автоповтор бесконечно — показываем кнопку «Повторить».
      setError(true)
    } finally {
      if (requestId === requestRef.current) {
        fetchingRef.current = false
        setLoading(false)
      }
    }
  }, [fetchPostsFeed, fetchPostsProfile, fetchBookmarks, profileUrlId, mode])

  // Сброс и загрузка первой страницы при смене профиля/ленты и при монтировании.
  useEffect(() => {
    requestRef.current += 1
    pageRef.current = 0
    fetchingRef.current = false
    setPosts([])
    setHasMore(true)
    setError(false)
    setLoading(false)
    void loadPosts()

    return () => {
      requestRef.current += 1
    }
  }, [loadPosts])

  // Подгрузка следующей страницы, когда низ списка попал во вьюпорт.
  useEffect(() => {
    if (!inView || !hasMore || loading || error || fetchingRef.current) return
    void loadPosts()
  }, [inView, hasMore, loading, error, loadPosts])

  // Посты, пришедшие по сокету в ленте: показываем по кнопке, чтобы список не «прыгал».
  const [pendingPosts, setPendingPosts] = useState<Post[]>([])
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setPendingPosts([])
  }, [profileUrlId])

  const prependPost = useCallback((post: Post) => {
    setPosts((prev) => (prev.some((item) => item.id === post.id) ? prev : [post, ...prev]))
  }, [])

  useEffect(() => {
    if (!socket || !isConnected) return
    const handleNewPost = ({ post }: { post: Post }) => {
      if (mode === 'bookmarks') return
      if (profileUrlId) {
        // Профиль: интересны только посты его владельца, они появляются сразу.
        if (post.user?.id === profileUrlId) prependPost(post)
        return
      }
      // Лента: копим новые посты и предлагаем показать.
      setPendingPosts((prev) => (prev.some((item) => item.id === post.id) ? prev : [post, ...prev]))
    }
    socket.on('newPost', handleNewPost)
    return () => {
      socket.off('newPost', handleNewPost)
    }
  }, [socket, isConnected, profileUrlId, prependPost])

  // Собственный пост, созданный в профиле: добавляем сразу по ответу мутации,
  // не дожидаясь сокета (дубль по id отсекается).
  const createdPost = usePostStore((state) => state.createdPost)
  const clearCreatedPost = usePostStore((state) => state.clearCreatedPost)
  useEffect(() => {
    if (!createdPost) return
    if (profileUrlId && createdPost.user.id === profileUrlId) prependPost(createdPost)
    clearCreatedPost()
  }, [createdPost, profileUrlId, prependPost, clearCreatedPost])

  const showNewPosts = () => {
    setPosts((prev) => {
      const ids = new Set(prev.map((post) => post.id))
      return [...pendingPosts.filter((post) => !ids.has(post.id)), ...prev]
    })
    setPendingPosts([])
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const [setLikeMutation] = useMutation(SET_LIKE)
  const refreshData = useRefreshStore((state) => state.refreshData)

  // Счётчики лайков и комментариев приходят всем клиентам (liked — личное, из события не берём)
  useEffect(() => {
    if (!socket || !isConnected) return
    const handleStats = ({ postId, likesCount, commentsCount }: Partial<Post> & { postId: number }) => {
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                likesCount: likesCount ?? post.likesCount,
                commentsCount: commentsCount ?? post.commentsCount,
              }
            : post,
        ),
      )
    }
    socket.on('postStats', handleStats)
    return () => {
      socket.off('postStats', handleStats)
    }
  }, [socket, isConnected])

  const patchPost = (postId: number, patch: Partial<Post>) =>
    setPosts((prev) => prev.map((post) => (post.id === postId ? { ...post, ...patch } : post)))

  const toggleLike = async (post: Post) => {
    const liked = !post.liked
    // Оптимистично: интерфейс реагирует сразу, при ошибке возвращаем как было
    const optimistic = { liked, likesCount: Math.max(post.likesCount + (liked ? 1 : -1), 0) }
    patchPost(post.id, optimistic)
    usePostSync.getState().publish({ id: post.id, ...optimistic })
    try {
      const { data } = await setLikeMutation({ variables: { id: post.id, liked } })
      if (data?.setLike) {
        const real = { liked: data.setLike.liked, likesCount: data.setLike.likesCount }
        patchPost(post.id, real)
        usePostSync.getState().publish({ id: post.id, ...real })
      }
    } catch (err) {
      console.error('Не удалось поставить лайк', err)
      patchPost(post.id, { liked: post.liked, likesCount: post.likesCount })
      usePostSync.getState().publish({ id: post.id, liked: post.liked, likesCount: post.likesCount })
    }
  }

  // Лайк или комментарий, сделанный в окне поста или просмотре фото, сразу виден и в ленте
  const syncPatch = usePostSync((s) => s.patch)
  const syncVersion = usePostSync((s) => s.version)
  useEffect(() => {
    if (!syncPatch) return
    const { id, removed, ...rest } = syncPatch
    // В закладках пост пропадает, когда его убрали из закладок
    if (removed || (rest.archived && !profileUrlId) || (mode === 'bookmarks' && rest.bookmarked === false)) {
      // Удалён, или убран в архив в ленте: в ленте архивных постов нет
      setPosts((prev) => prev.filter((post) => post.id !== id))
      return
    }
    // Закрепить можно один пост: у остальных закреп снимается, а закреплённый поднимается наверх
    if (rest.pinned) {
      setPosts((prev) => {
        const target = prev.find((post) => post.id === id)
        if (!target) return prev
        return [
          { ...target, ...rest },
          ...prev.filter((post) => post.id !== id).map((post) => ({ ...post, pinned: false })),
        ]
      })
      return
    }
    patchPost(id, Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)))
  }, [syncPatch, syncVersion])

  const openPost = useOpenPost()

  return (
    <>
      <div ref={topRef} />
      {pendingPosts.length > 0 && (
        <div className={cl.newPosts}>
          <ButtonUI onClick={showNewPosts}>Показать новые посты ({pendingPosts.length})</ButtonUI>
        </div>
      )}
      {posts?.map((post: Post) => {
        return (
          <div key={post.id} className={`playground ${cl.wrapper}`}>
            <div className={cl.owner}>
              <PostOwner post={post} />
              <span className={cl.dateLink} onClick={() => openPost(post.id)} title='Открыть пост'>
                {post.pinned ? '📌 ' : ''}
                {post.archived ? '🗄 В архиве · ' : ''}
                {formatDateTime(toTimestamp(post.date))}
                {post.editedAt ? ' · изменено' : ''}
              </span>
              <PostMenu
                post={{
                  id: post.id,
                  ownerId: post.user.id,
                  description: post.description,
                  pinned: !!post.pinned,
                  archived: !!post.archived,
                  bookmarked: !!post.bookmarked,
                }}
              />
            </div>
            <PostImages images={post.images} postId={post.id} ownerId={post.user.id} />
            <PostVideos videos={post.videos} ownerId={post.user.id} />
            {post.description ? (
              <div
                className={`${cl.text} ${cl.clickable}`}
                onClick={(e) => (e.target as HTMLElement).closest('a') || openPost(post.id)}
              >
                <RichText text={post.description} />
              </div>
            ) : (
              <></>
            )}
            <RepostCard source={post.repostOf} deleted={post.repostDeleted} />
            <ViewMark postId={post.id} views={post.views ?? 0} />
            <PostActionWrapp
              repostsCount={post.repostsCount}
              views={post.views}
              onShare={() => openShare(post.id, post.repostsCount ?? 0)}
              liked={post.liked}
              likesCount={post.likesCount}
              commentsCount={post.commentsCount}
              commentsOpen={false}
              canLike={!!refreshData.id}
              onLike={() => void toggleLike(post)}
              onToggleComments={() => openPost(post.id)}
            />
          </div>
        )
      })}
      {mode === 'bookmarks' && !loading && !error && posts.length === 0 && (
        <p className={cl.empty}>Здесь появятся записи, которые вы сохранили в закладки</p>
      )}
      <div ref={ref}>
        {loading && <Plug />}
        {error && (
          <div className={cl.retry}>
            <ButtonUI onClick={() => void loadPosts()}>Повторить</ButtonUI>
          </div>
        )}
        {!hasMore && <div style={{ height: '1px' }}></div>}
      </div>
    </>
  )
}
