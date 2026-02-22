import { useMutation } from '@apollo/client'
import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { useParams } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { PostActionWrapp, PostDescription, PostImages, PostOwner } from '@/entities/post'
import { PostDropdownMenu } from '@/features/post'
import { Post as TypePost } from '@/features/profile/types'
import { REMOVE_POST } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSocket } from '@/shared/hooks/useSocket'
import { usePostStore } from '@/shared/store'
import Dropdown from '@/shared/ui/dropdown'
import { Plug } from '@/shared/ui/plug'

import cl from './ui.module.less'

export const Posts = () => {
  const profileUrlId = parseInt(useParams().id || '')
  const [fetchPostsFeed, fetchPostsProfile] = usePostStore((state) => [state.fetchPostsFeed, state.fetchPostsProfile])
  const [posts, setPosts] = useState<TypePost[]>([])
  const [skip, setSkip] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [limit] = useState(10)
  const { socket, isConnected } = useSocket()
  const [ref, inView] = useInView({
    threshold: 0,
  })
  useEffect(() => {
    if (!socket || !isConnected) return
    const handleNewPost = ({ post }: { post: TypePost }) => {
      // Добавляем новый пост в начало списка
      setPosts((prev) => [post, ...prev])
    }
    socket.on('newPost', handleNewPost)
    return () => {
      socket.off('newPost', handleNewPost)
    }
  }, [socket, isConnected])
  useEffect(() => {
    if (inView && hasMore && !loading) loadPosts()
  }, [profileUrlId, inView, hasMore])

  const loadPosts = async () => {
    setLoading(true)
    try {
      if (profileUrlId) {
        //@ts-ignore
        const fetchedPosts: TypePost[] = await fetchPostsProfile(profileUrlId, skip, limit)
        if (fetchedPosts.length > 0) {
          //@ts-ignore
          setPosts((prev) => [...prev, ...fetchedPosts])
          setSkip(skip + 1)
        } else setHasMore(false)
      } else {
        //@ts-ignore
        const fetchedPosts: TypePost[] = await fetchPostsFeed(skip, limit)
        if (fetchedPosts.length > 0) {
          //@ts-ignore
          setPosts((prev) => [...prev, ...fetchedPosts])
          setSkip(skip + 1)
          if (fetchedPosts.length < 10) {
            setHasMore(false)
          }
        } else setHasMore(false)
      }
    } catch (e) {
      console.log(e)
    } finally {
      setLoading(false)
    }
  }
  const [remove] = useMutation(REMOVE_POST)
  const [refreshData] = useRefreshStore((state) => [state.refreshData])
  const deletePost = (postId: number) => {
    setPosts(posts.filter((post) => post.id !== postId))
  }
  return (
    <>
      {posts?.map((post: TypePost) => {
        return (
          <div key={post.id} className={`playground ${cl.wrapper}`}>
            <div className={cl.owner}>
              <PostOwner post={post} />
              <Dropdown className={cl.pizdez}>
                <Dropdown.Header>
                  <ImageLoading className={cl.menuPost} src='/icons/menu_post.svg' />
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
            <PostDescription description={post.description} />
            <PostActionWrapp />
          </div>
        )
      })}
      <div ref={ref}>
        {loading && <Plug />}
        {!hasMore && <div style={{ height: '1px' }}></div>}
      </div>
    </>
  )
}
