import { useQuery } from '@apollo/client'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { RemovePost } from '@/features/profile'
import { POSTS, POST_BY_USER } from '@/shared/graphql/schema'
import Icon from '@/shared/icons'

import cl from './ui.module.less'

interface Props {
  id?: number
  limit: number
  page: number
}

export const Posts = ({ limit, page }: Props) => {
  const { data } = useQuery(POSTS(limit, page), { fetchPolicy: 'network-only' })
  const [posts, setPosts] = useState<any>([])
  useEffect(() => {
    if (data) {
      setPosts((prev: any) => [...data?.getPosts, ...prev])
    }
    return () => setPosts([])
  }, [data])
  const [delShow, setDelShow] = useState(0)
  useEffect(() => {
    if (delShow !== 0) {
      let array = posts.filter((item: any) => item.id !== delShow)
      setTimeout(() => {
        setPosts([...array])
      }, 1000)
    }
  }, [delShow])
  return (
    <>
      {posts?.map((post: any) => (
        <div key={post.id} className={cl.wrapper} id={delShow === post.id ? cl.delShow : ''}>
          <Link to={`/profile/${post.user.id}`} className={cl.wrappOwner}>
            <img src={post.user.avatar} alt='' />
            {post.user.login}
            <RemovePost setDelShow={setDelShow} id={post.id} userId={post.user.id} />
          </Link>
          {post.description ? <div className={cl.text}>{post.description}</div> : ''}
          <div className={cl.wrappActions}>
            <div className={cl.icon}>
              <Icon id='like' />
            </div>
            <div className={cl.icon}>
              <Icon id='comm' />
            </div>
          </div>
        </div>
      ))}
    </>
  )
}
interface PostsByUser {
  id: number
  limit: number
  page: number
  firstPostId: number
  setNewPosts: any
}
export const PostsByUser = ({ id, limit, page }: PostsByUser) => {
  const { data } = useQuery(POST_BY_USER(id, limit, page), { fetchPolicy: 'network-only' })
  const [posts, setPosts] = useState<any>([])
  useEffect(() => {
    if (data) {
      setPosts((prev: any) => [...data?.getPostsByUser, ...prev])
    }
    return () => setPosts([])
  }, [data])
  const [delShow, setDelShow] = useState(0)
  useEffect(() => {
    if (delShow !== 0) {
      let array = posts.filter((item: any) => item.id !== delShow)
      setTimeout(() => {
        setPosts([...array])
      }, 1000)
    }
  }, [delShow])
  return (
    <div className={cl.wrappPosts}>
      {posts?.map((post: any) => (
        <div key={post.id} className={cl.wrapper} id={delShow === post.id ? cl.delShow : ''}>
          <Link to={`/profile/${post.user.id}`} className={cl.wrappOwner}>
            <img src={post.user.avatar} alt='' />
            {post.user.login}
            <RemovePost setDelShow={setDelShow} id={post.id} userId={post.user.id} />
          </Link>
          {post.description ? <div className={cl.text}>{post.description}</div> : ''}
          <div className={cl.wrappActions}>
            <div className={cl.icon}>
              <Icon id='like' />
            </div>
            <div className={cl.icon}>
              <Icon id='comm' />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
