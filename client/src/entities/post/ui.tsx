import { Link } from 'react-router-dom'

import { RemovePost } from '@/features/post'
import { Post } from '@/shared/graphql/gql/graphql'
import Icon from '@/shared/icons'

import cl from './ui.module.less'

export const PostOwner = ({ post }: { post: Post }) => {
  return (
    <Link to={`/profile/${post?.user?.id}`} className={cl.wrappOwner}>
      <img src={post?.user?.avatar!} alt='' />
      {post?.user?.login}
      <RemovePost id={post?.id!} userId={post?.user?.id!} />
    </Link>
  )
}
export const PostDescription = ({ description }: Post) => {
  return <>{description && <div className={cl.text}>{description}</div>}</>
}
export const PostActionWrapp = () => {
  return (
    <div className={cl.wrappActions}>
      <div className={cl.icon}>
        <Icon iconId='like' />
      </div>
      <div className={cl.icon}>
        <Icon iconId='comm' />
      </div>
    </div>
  )
}
export const PostImages = ({ images }: Post) => {
  return (
    <div className={cl.wrappImages}>
      {images?.map((image) => {
        return (
          <>
            <img
              key={`${image.small! + image.id}`}
              className={cl.small}
              src={`http://localhost:5000/storage/${image.small}.webp`}
              alt=''
            />
            <img
              key={image.small}
              className={cl.medium}
              src={`http://localhost:5000/storage/${image.small}.webp`}
              alt=''
            />
          </>
        )
      })}
    </div>
  )
}
