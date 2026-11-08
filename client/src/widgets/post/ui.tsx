import { useMutation } from '@apollo/client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { useParams } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { PostActionWrapp, PostImages, PostOwner } from '@/entities/post'
import { Post } from '@/features/profile/types'
import { assetUrl } from '@/shared/config'
import { PostComments } from '@/features/comments'
import { REMOVE_POST, SET_LIKE } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSocket } from '@/shared/hooks/useSocket'
import { usePostStore } from '@/shared/store'
import ButtonUI from '@/shared/ui/button'
import Dropdown from '@/shared/ui/dropdown'
import { Plug } from '@/shared/ui/plug'

import cl from './ui.module.css'

const POSTS_PAGE_SIZE = 10

/** Добавляет только новые посты: защита от дублей при гонках и socket-событиях. */
const appendUniquePosts = (prev: Post[], next: Post[]) => {
  const ids = new Set(prev.map((post) => post.id))
  const unique = next.filter((post) => !ids.has(post.id))
  return unique.length ? [...prev, ...unique] : prev
}

export const Posts = () => {
  const profileUrlId = parseInt(useParams().id || '')
  const fetchPostsFeed = usePostStore((state) => state.fetchPostsFeed)
  const fetchPostsProfile = usePostStore((state) => state.fetchPostsProfile)
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
      const fetchedPosts = profileUrlId
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
  }, [fetchPostsFeed, fetchPostsProfile, profileUrlId])

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

  const [remove] = useMutation(REMOVE_POST)
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
    patchPost(post.id, { liked, likesCount: Math.max(post.likesCount + (liked ? 1 : -1), 0) })
    try {
      const { data } = await setLikeMutation({ variables: { id: post.id, liked } })
      if (data?.setLike) patchPost(post.id, { liked: data.setLike.liked, likesCount: data.setLike.likesCount })
    } catch (err) {
      console.error('Не удалось поставить лайк', err)
      patchPost(post.id, { liked: post.liked, likesCount: post.likesCount })
    }
  }

  // Какие посты сейчас с раскрытыми комментариями
  const [openComments, setOpenComments] = useState<number[]>([])
  const toggleComments = (postId: number) =>
    setOpenComments((prev) => (prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]))
  const deletePost = (postId: number) => {
    setPosts((prev) => prev.filter((post) => post.id !== postId))
  }
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
          <div
            key={post.id}
            className={`playground ${cl.wrapper} ${openComments.includes(post.id) ? cl.wrapperOpen : ''}`}
          >
            <div className={cl.owner}>
              <PostOwner post={post} />
              <Dropdown className={cl.pizdez}>
                <Dropdown.Header>
                  <ImageLoading className={cl.menuPost} src={assetUrl('icons/menu_post.svg')} />
                </Dropdown.Header>
                {refreshData.id === post.user.id ? (
                  <Dropdown.Body>
                    <div className='playground' style={{ padding: '0' }}>
                      <li>Сохранить в закладках</li>
                      <li>Редактировать</li>
                      <li>Скопировать ссылку</li>
                      <li>Архивировать запись</li>
                      <li
                        onClick={() => {
                          remove({
                            variables: { id: post.id },
                          })
                          deletePost(post.id)
                        }}
                      >
                        Удалить
                      </li>
                    </div>
                  </Dropdown.Body>
                ) : (
                  <Dropdown.Body>
                    <li>Сохранить в закладках</li>
                    <li>Скопировать ссылку</li>
                    <li>Пожаловаться</li>
                  </Dropdown.Body>
                )}
              </Dropdown>
            </div>
            <PostImages images={post.images} />
            {post.description ? <div className={cl.text}>{post.description}</div> : <></>}
            <PostActionWrapp
              liked={post.liked}
              likesCount={post.likesCount}
              commentsCount={post.commentsCount}
              commentsOpen={openComments.includes(post.id)}
              canLike={!!refreshData.id}
              onLike={() => void toggleLike(post)}
              onToggleComments={() => toggleComments(post.id)}
            />
            {openComments.includes(post.id) && <PostComments postId={post.id} postOwnerId={post.user.id} />}
          </div>
        )
      })}
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
