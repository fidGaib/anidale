import { useQuery } from '@apollo/client'
import { Link } from 'react-router-dom'

import Content from '@/shared/content'
import { GET_USERS } from '@/shared/graphql/schema'

import cl from './ui.module.less'

export const Friends = () => {
  const { data } = useQuery(GET_USERS)
  return (
    <Content id={cl.content}>
      {data?.getUsers.map(({ id, login, avatar }: { id: number; login: string; avatar: string }) => (
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
      ))}
    </Content>
  )
}
