import { useQuery } from '@apollo/client'
import { Link } from 'react-router-dom'

import { GET_USERS } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import Icon from '@/shared/icons'

import cl from './ui.module.less'

interface UserType {
  id: number
  login: string
  avatar: string
}
const CardUser = () => {
  const { data } = useQuery(GET_USERS)
  return (
    <>
      {data?.getUsers?.map(({ id, login, avatar }: UserType) => (
        <div key={id} className={cl.oneUser}>
          <Link to={`/profile/${id}`}>
            <ImageLoading className={cl.wrapAvatar} src={useSrcAvatar(avatar)} alt='anidale' />
            <div className={cl.login}>{login}</div>
          </Link>
          <Link className={cl.toChat} to={`/chat?chat_id=${Math.round(Math.random() * 99999999)}&from=${id}&to=${id}`}>
            <Icon iconId='chat' />
          </Link>
          <Icon iconId='unsubscribe_user' />
        </div>
      ))}
    </>
  )
}

export default CardUser
