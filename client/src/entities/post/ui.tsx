import { Link } from 'react-router-dom'

import { RemovePost } from '@/features/post'
import Icon from '@/shared/icons'

import cl from './ui.module.less'

interface PostAction {
  post: any
  setDelShow: React.Dispatch<any>
}
interface Description {
  description?: string
}
export const PostOwner = ({ post, setDelShow }: PostAction) => {
  return (
    <Link to={`/profile/${post.user.id}`} className={cl.wrappOwner}>
      <img src={post.user.avatar} alt='' />
      {post.user.login}
      <RemovePost setDelShow={setDelShow} id={post.id} userId={post.user.id} />
    </Link>
  )
}
export const PostDescription = ({ description }: Description) => {
  return <>{description && <div className={cl.text}>{description}</div>}</>
}
export const PostActionWrapp = () => {
  return (
    <div className={cl.wrappActions}>
      <div className={cl.icon}>
        <Icon id='like' />
      </div>
      <div className={cl.icon}>
        <Icon id='comm' />
      </div>
    </div>
  )
}
