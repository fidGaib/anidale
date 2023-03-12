import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import UserService from '../../services/user-service'
import Image from '../../shared/hooks/onLoadImage/onLoadImage'
import { useFetching } from '../../shared/hooks/useFetching'
import Icon from '../../shared/icons/icon'
import cl from './styles/friends.module.css'

const Fiends = () => {
  const [users, setUsers] = useState([])
  const [fetching, isLoading, error] = useFetching(async () => {
    const { data } = await UserService.fetchUsers()
    setUsers([...data.users])
  })
  useEffect(() => {
    fetching()
  }, [])
  return (
    <div className={cl.wrapUsers}>
      {users.map((user) => (
        <div className={cl.OneUser}>
          <Link to={`/profile/${user.id}`}>
            <Image className={cl.avatar} src={user.avatar} />
            <div className={cl.login}>{user.login}</div>
          </Link>
          <Icon className={cl.messUser} id='messages' />
          <Icon className={cl.removeUser} id='remove-user' />
        </div>
      ))}
    </div>
  )
}

export default Fiends
