import { useQuery } from '@apollo/client'
import { Link } from 'react-router-dom'

import { User } from '@/shared/graphql/gql/graphql'
import { GET_USERS } from '@/shared/graphql/schema'

import cl from './ui.module.less'

const CardUser = () => {
  const { data } = useQuery(GET_USERS)
  return (
    <>
      {data?.getUsers?.map(({ id, login, avatar }: User) => (
        <div key={id} className={cl.oneUser}>
          <Link to={`/profile/${id}`}>
            <div className={cl.wrapAvatar}>
              <img src={avatar || ''} alt='anidale' />
            </div>
            <div className={cl.login}>{login}</div>
          </Link>
          <Link className={cl.toChat} to={`/chat?chat_id=${Math.round(Math.random() * 99999999)}&from=${id}&to=${id}`}>
            Написать
          </Link>
        </div>
      ))}
    </>
  )
}

export default CardUser
