import { useQuery } from '@apollo/client'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { PostActionWrapp, PostDescription, PostImages, PostOwner } from '@/entities/post'
import { PostDropdownMenu } from '@/features/post'
import { Post } from '@/features/profile/types'
import { POSTS, POST_BY_USER } from '@/shared/graphql/schema'
import { usePostStore } from '@/shared/store'
import { Plug } from '@/shared/ui/plug'

import cl from './ui.module.less'

export const Posts = () => {
  const params = useParams()
  const id = parseInt(params.id || '')
  const limit = 10
  const page = 0
  const { data, loading, fetchMore } = useQuery<any>(id ? POST_BY_USER : POSTS, {
    variables: id ? { id, limit, page } : { limit, page },
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  })
  const posts = usePostStore((state) => state.posts)
  const addPosts = usePostStore((state) => state.addPost)
  const removeId = usePostStore((state) => state.removeId)
  const clearPosts = usePostStore((state) => state.clearPosts)
  const fetching = useRef(false)
  const lastPostRef = useRef<HTMLDivElement | null>(null)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    if (!data) return
    addPosts(id ? data.getPostsByUser : data.getPosts)
    return () => clearPosts()
  }, [data])

  useEffect(() => {
    document.addEventListener('scroll', scrollHandler)
    return () => document.removeEventListener('scroll', scrollHandler)
  }, [limit, posts])
  const scrollHandler = (e: any) => {
    if (
      !fetching.current &&
      hasMore &&
      e.target.documentElement.scrollHeight - (e.target.documentElement.scrollTop + window.innerHeight) < 100
    ) {
      fetching.current = true
      fetchMore({
        variables: { limit, page: posts.length },
        updateQuery: (prev, { fetchMoreResult }) => {
          fetching.current = false
          if (!fetchMoreResult) {
            setHasMore(false)
            return prev
          }

          if (id) {
            return {
              ...prev,
              getPostsByUser: [...prev.getPostsByUser, ...fetchMoreResult.getPostsByUser],
            }
          }
          return {
            ...prev,
            getPosts: [...prev.getPosts, ...fetchMoreResult.getPosts],
          }
        },
      })
    }
  }

  return (
    <>
      {posts.length !== 0 &&
        posts?.map((post: Post, index: number) => (
          <div
            key={post.id}
            className={`playground ${cl.wrapper}`}
            id={removeId === post.id ? cl.delShow : ''}
            ref={index === posts.length - 1 ? lastPostRef : null}
          >
            <div className={cl.owner}>
              <PostOwner post={post} />
              <PostDropdownMenu postId={post.id} userId={post.user.id} />
            </div>
            <PostImages images={post.images} />
            <PostDescription description={post.description} />
            <PostActionWrapp />
          </div>
        ))}
      {loading && <Plug />}
    </>
  )
}
