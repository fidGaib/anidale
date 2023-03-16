import { gql, useQuery } from '@apollo/client'
import { Link } from 'react-router-dom'

import cl from '@/pages/friends/ui/styles/index.module.less'

import { GET_USERS } from '../../schema'

const GetUsers = () => {
  const { loading, error, data } = useQuery(GET_USERS)
  if (loading) return <p>Loading...</p>
  if (error) return <p>Error : {error.message}</p>
  return data.getUsers.map(({ id, login, avatar }: { id: number; login: string; avatar: string }) => (
    <div key={id} className={cl.oneUser}>
      <Link to={`/profile/${id}`}>
        <div className={cl.wrapAvatar}>
          <img src={avatar} alt='anidale' />
        </div>
        <div className={cl.login}>{login}</div>
      </Link>
      <Link className={cl.toChat} to={`/chat?chat_id=${Math.round(Math.random() * 99999999)}&from=${id}&to=${id}`}>
        Написать
      </Link>
    </div>
  ))
}

export default GetUsers
