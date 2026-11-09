import { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'

import cl from './ui.module.css'

export interface FriendUser {
  id: number
  login: string
  avatar: string
}

interface UserCardProps {
  user: FriendUser
  action?: ReactNode
}

const UserCard = ({ user, action }: UserCardProps) => (
  <div className={`playground ${cl.oneUser}`}>
    <Link to={`/profile/${user.id}`}>
      <ImageLoading className={cl.wrapAvatar} src={useSrcAvatar(user.avatar)} alt={user.login} />
      <div className={cl.login}>{user.login}</div>
    </Link>
    {action}
    <Link
      className={`${cl.toChat} ${action ? cl.toChatWithAction : ''}`}
      to={`/messages/${user.id}`}
      title='Написать сообщение'
    >
      <ImageLoading src='/icons/chat.svg' alt='anidale chat icon' className={cl.svg} />
    </Link>
  </div>
)

interface UserListProps {
  users: FriendUser[]
  loading?: boolean
  empty: string
  renderAction?: (user: FriendUser) => ReactNode
}

const UserList = ({ users, loading, empty, renderAction }: UserListProps) => {
  if (loading && users.length === 0) return <p className={cl.empty}>Загрузка…</p>
  if (users.length === 0) return <p className={cl.empty}>{empty}</p>
  return (
    <>
      {users.map((user) => (
        <UserCard key={user.id} user={user} action={renderAction?.(user)} />
      ))}
    </>
  )
}

export default UserList
