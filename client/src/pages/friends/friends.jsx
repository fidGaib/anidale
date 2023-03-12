import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { Context } from '../..'
import UserService from '../../services/user-service'
import Content from '../../shared/content/ui'
import Image from '../../shared/hooks/onLoadImage/onLoadImage'
import { useFetching } from '../../shared/hooks/useFetching'
import useTitlePage from '../../shared/hooks/useTitlePage'
import Icon from '../../shared/icons/icon'
import cl from './style.module.css'

const Friends = () => {
  const { loginStore } = useContext(Context)
  useTitlePage('AniDale - Друзья')
  const [users, setUsers] = useState([])
  const [fetching, isLoading, error] = useFetching(async () => {
    const { data } = await UserService.fetchUsers()
    setUsers([...data.users])
  })
  useEffect(() => {
    fetching()
  }, [])

  return (
    <Content>
      <div className={cl.listUsers}>
        {users.map((user) => {
          return (
            <div key={user.id} className={cl.oneUser}>
              <Link to={`/profile/${user.id}`}>
                <div className={cl.wrapAvatar}>
                  <Image src={user.avatar} />
                </div>
                <div className={cl.login}>{user.login}</div>
              </Link>
              <Link
                className={cl.toChat}
                to={`/chat?chat_id=${Math.round(Math.random() * 99999999)}&from=${loginStore.user.id}&to=${user.id}`}
              >
                <Icon className={cl.messUser} id='messages' />
              </Link>
              <Icon className={cl.removeUser} id='remove-user' />
            </div>
          )
        })}
      </div>
    </Content>
  )
}

export default Friends
