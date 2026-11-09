import { useMutation, useQuery } from '@apollo/client'
import { useEffect, useState } from 'react'

import { useRefreshStore } from '@/app/providers/routes/model'
import UserList, { FriendUser } from '@/entities/friends/ui'
import Content from '@/shared/content'
import { GET_FRIENDS, GET_SUBSCRIBERS, GET_USERS, SUBSCRIBE, UNSUBSCRIBE } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import Input from '@/shared/ui/input'

import cl from './ui.module.css'

const PAGE = 30

const tabs = [
  { id: 'friends', text: 'Мои друзья' },
  { id: 'subscribers', text: 'Подписчики' },
  { id: 'all', text: 'Все люди' },
] as const

type Tab = (typeof tabs)[number]['id']

export const Friends = () => {
  const [refreshData] = useRefreshStore((state) => [state.refreshData])
  const id = refreshData.id ?? 0
  document.title = `${refreshData.login} - Друзья`

  const [tab, setTab] = useState<Tab>('friends')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [done, setDone] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [actionId, setActionId] = useState<number | null>(null)

  // Не дёргаем сервер на каждую букву
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setDone(false)
  }, [tab, search, id])

  const friendsQuery = useQuery(GET_FRIENDS, {
    variables: { id, limit: PAGE, offset: 0 },
    skip: tab !== 'friends' || !id,
    fetchPolicy: 'cache-and-network',
  })
  const subscribersQuery = useQuery(GET_SUBSCRIBERS, {
    variables: { id, limit: PAGE, offset: 0 },
    skip: tab !== 'subscribers' || !id,
    fetchPolicy: 'cache-and-network',
  })
  const allQuery = useQuery(GET_USERS, {
    variables: { limit: PAGE, offset: 0, search: search || null },
    skip: tab !== 'all',
    fetchPolicy: 'cache-and-network',
  })

  const [subscribe] = useMutation(SUBSCRIBE)
  const [unsubscribe] = useMutation(UNSUBSCRIBE)

  const users: FriendUser[] =
    tab === 'friends'
      ? (friendsQuery.data?.getFriends ?? [])
      : tab === 'subscribers'
        ? (subscribersQuery.data?.getSubscribers ?? [])
        : (allQuery.data?.getUsers ?? [])
  const loading =
    tab === 'friends' ? friendsQuery.loading : tab === 'subscribers' ? subscribersQuery.loading : allQuery.loading
  const error = tab === 'friends' ? friendsQuery.error : tab === 'subscribers' ? subscribersQuery.error : allQuery.error

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      if (tab === 'friends') {
        const res = await friendsQuery.fetchMore({ variables: { id, limit: PAGE, offset: users.length } })
        if ((res.data?.getFriends?.length ?? 0) < PAGE) setDone(true)
      } else if (tab === 'subscribers') {
        const res = await subscribersQuery.fetchMore({ variables: { id, limit: PAGE, offset: users.length } })
        if ((res.data?.getSubscribers?.length ?? 0) < PAGE) setDone(true)
      } else {
        const res = await allQuery.fetchMore({ variables: { limit: PAGE, offset: users.length, search: search || null } })
        if ((res.data?.getUsers?.length ?? 0) < PAGE) setDone(true)
      }
    } catch {
      setDone(true)
    } finally {
      setLoadingMore(false)
    }
  }

  const removeFriend = async (userId: number) => {
    setActionId(userId)
    try {
      await unsubscribe({ variables: { userId } })
      await friendsQuery.refetch()
    } catch {
      // Текст ошибки покажет состояние активного запроса
    } finally {
      setActionId(null)
    }
  }

  const subscribeBack = async (userId: number) => {
    setActionId(userId)
    try {
      await subscribe({ variables: { userId } })
      await subscribersQuery.refetch()
    } catch {
      // Текст ошибки покажет состояние активного запроса
    } finally {
      setActionId(null)
    }
  }

  const empty =
    tab === 'friends'
      ? 'У вас пока нет друзей'
      : tab === 'subscribers'
        ? 'Подписчиков пока нет'
        : search
          ? 'Никого не нашли'
          : 'Пользователей пока нет'

  return (
    <Content className={cl.content}>
      <div className={cl.meshBlock}>
        {tabs.map((item) => (
          <div
            key={item.id}
            className={`playground ${cl.mesh} ${tab === item.id ? cl.meshActive : ''}`}
            onClick={() => setTab(item.id)}
          >
            <p>{item.text}</p>
          </div>
        ))}
      </div>
      <div className={cl.wrappSeacrh}>
        <ImageLoading src='/icons/search.svg' className={cl.svg} />
        <Input
          type='text'
          placeholder='Найти...'
          className={`input ${cl.search}`}
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value)
            // Поиск ищет среди всех пользователей, поэтому сразу переключаем вкладку
            if (tab !== 'all') setTab('all')
          }}
        />
      </div>
      {error && <p className={cl.error}>{error.message}</p>}
      <UserList
        users={users}
        loading={loading}
        empty={empty}
        renderAction={(user) => {
          if (tab === 'friends') {
            return (
              <button
                type='button'
                className={cl.actionButton}
                disabled={actionId === user.id}
                onClick={() => removeFriend(user.id)}
              >
                Удалить
              </button>
            )
          }
          if (tab === 'subscribers') {
            return (
              <button
                type='button'
                className={cl.actionButton}
                disabled={actionId === user.id}
                onClick={() => subscribeBack(user.id)}
              >
                Подписаться
              </button>
            )
          }
          return null
        }}
      />
      {users.length >= PAGE && !done && (
        <button type='button' className={cl.more} onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Загрузка…' : 'Показать ещё'}
        </button>
      )}
    </Content>
  )
}
