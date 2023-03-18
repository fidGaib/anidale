import { useQuery } from '@apollo/client'
import { Link } from 'react-router-dom'

import { POSTS, POST_BY_USER } from '@/shared/graphql/schema'
import Icon from '@/shared/icons'

import cl from './ui.module.less'

interface Props {
  id?: number
  limit: number
  page: number
}

export const Posts = ({ limit, page }: Props) => {
  const { data } = useQuery(POSTS(limit, page))
  return (
    <>
      {data?.getPosts.map((post: any) => (
        <div key={post.id} className={cl.wrapper}>
          <Link to={`/profile/${post.user.id}`} className={cl.wrappOwner}>
            <img src={post.user.avatar} alt='' />
            {post.user.login}
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
}
export const PostsByUser = ({ id, limit, page }: PostsByUser) => {
  const { data } = useQuery(POST_BY_USER(id, limit, page))
  return (
    <>
      {data?.getPostsByUser.map((post: any) => (
        <div key={post.id} className={cl.wrapper}>
          <Link to={`/profile/${post.user.id}`} className={cl.wrappOwner}>
            <img src={post.user.avatar} alt='' />
            {post.user.login}
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
