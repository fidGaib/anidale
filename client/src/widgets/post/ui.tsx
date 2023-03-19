import { useQuery } from '@apollo/client'
import { useEffect, useState } from 'react'

import { PostActionWrapp, PostDescription, PostOwner } from '@/entities/post'
import { POSTS, POST_BY_USER } from '@/shared/graphql/schema'

import cl from './ui.module.less'

interface Props {
  id?: number
  limit: number
  page: number
}
interface PostAction {
  id?: number
  data: any
  posts: any
  setPosts: React.Dispatch<any>
  delShow: number
}
const usePostAction = ({ id, data, posts, setPosts, delShow }: PostAction) => {
  useEffect(() => {
    if (data && id) {
      setPosts((prev: any) => [...data?.getPostsByUser, ...prev])
    } else if (data) setPosts((prev: any) => [...data?.getPosts, ...prev])
    return () => setPosts([])
  }, [data])
  useEffect(() => {
    if (delShow !== 0) {
      let array = posts.filter((item: any) => item.id !== delShow)
      setTimeout(() => {
        setPosts([...array])
      }, 1000)
    }
  }, [delShow])
}
export const Posts = ({ id, limit, page }: Props) => {
  const schemaPosts = () => POSTS(limit, page)
  const schemaPostsByUser = () => POST_BY_USER(id!, limit, page)
  const { data } = useQuery(id ? schemaPostsByUser() : schemaPosts(), { fetchPolicy: 'no-cache' })
  const [posts, setPosts] = useState<any>([])
  const [delShow, setDelShow] = useState(0)
  usePostAction({ id, data, posts, setPosts, delShow })
  return (
    <>
      {posts?.map((post: any) => (
        <div key={post.id} className={cl.wrapper} id={delShow === post.id ? cl.delShow : ''}>
          <PostOwner setDelShow={setDelShow} post={post} />
          <PostDescription description={post?.description} />
          <PostActionWrapp />
        </div>
      ))}
    </>
  )
}
