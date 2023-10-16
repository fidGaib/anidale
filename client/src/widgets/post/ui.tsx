import { useQuery } from '@apollo/client'
import { useEffect } from 'react'
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
  const { data, loading } = useQuery<any>(id ? POST_BY_USER : POSTS, {
    variables: id ? { id, limit, page } : { limit, page },
    fetchPolicy: 'cache-and-network',
  })
  const posts = usePostStore((state) => state.posts)
  const addPosts = usePostStore((state) => state.addPost)
  const removeId = usePostStore((state) => state.removeId)
  const clearPosts = usePostStore((state) => state.clearPosts)

  useEffect(() => {
    if (!data) return
    addPosts(id ? data.getPostsByUser : data.getPosts)
    return () => clearPosts()
  }, [data])
  if (loading) return <Plug />
  else
    return (
      <>
        {posts &&
          posts?.map((post: Post) => (
            <div key={post.id} className={cl.wrapper} id={removeId === post.id ? cl.delShow : ''}>
              <div className='row align-center'>
                <PostOwner post={post} />
                <PostDropdownMenu postId={post.id} userId={post.user.id} />
              </div>
              <PostDescription description={post.description} />
              <PostImages images={post.images} />
              <PostActionWrapp />
            </div>
          ))}
      </>
    )
}
