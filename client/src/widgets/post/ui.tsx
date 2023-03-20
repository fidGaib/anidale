import { useQuery } from '@apollo/client'
import { useEffect } from 'react'

import { PostActionWrapp, PostDescription, PostOwner } from '@/entities/post'
import { usePostStore } from '@/features/profile/module'
import { Post } from '@/features/profile/types'
import { POSTS, POST_BY_USER } from '@/shared/graphql/schema'

import cl from './ui.module.less'

interface Props {
  id?: number
  limit: number
  page: number
}
interface DataQueryPost {
  getPostsByUser: Post[]
  getPosts: Post[]
}
export const Posts = ({ id, limit, page }: Props) => {
  const schemaPosts = () => POSTS(limit, page)
  const schemaPostsByUser = () => POST_BY_USER(id!, limit, page)
  const { data } = useQuery<DataQueryPost>(id ? schemaPostsByUser() : schemaPosts(), { fetchPolicy: 'no-cache' })
  const posts = usePostStore((state) => state.posts)
  const addPosts = usePostStore((state) => state.addPost)
  const removeId = usePostStore((state) => state.removeId)
  const clearPosts = usePostStore((state) => state.clearPosts)
  useEffect(() => {
    if (data && id) addPosts(data.getPostsByUser)
    if (data && !id) addPosts(data.getPosts)
    return () => clearPosts()
  }, [data])
  return (
    <>
      {posts?.map((post: Post) => (
        <div key={post.id} className={cl.wrapper} id={removeId === post.id ? cl.delShow : ''}>
          <PostOwner post={post} />
          {post.description && <PostDescription description={post.description} />}
          <PostActionWrapp />
        </div>
      ))}
    </>
  )
}
