import { useMutation, useQuery } from '@apollo/client'
import { useEffect, useState } from 'react'

import { CommunityListItem, CommunityRow } from '@/entities/community'
import Content from '@/shared/content'
import { COMMUNITIES, JOIN_COMMUNITY, LEAVE_COMMUNITY } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import Input from '@/shared/ui/input'
import { CreateCommunityDialog } from '@/widgets/community'

import cl from './ui.module.css'

const PAGE = 30

const tabs = [
  { id: 'mine', text: 'Мои сообщества' },
  { id: 'managed', text: 'Управление' },
  { id: 'all', text: 'Все сообщества' },
] as const

type Tab = (typeof tabs)[number]['id']

interface Row extends CommunityListItem {
  isMember: boolean
  isAdmin: boolean
  isOwner: boolean
  isClosed: boolean
}

/** Список сообществ: мои, которыми управляю, все; поиск по названию, подписка и создание. */
export const Communities = () => {
  document.title = 'AniDale - Сообщества'
  const [tab, setTab] = useState<Tab>('mine')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [done, setDone] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [creating, setCreating] = useState(false)
  const [actionId, setActionId] = useState<number | null>(null)
  // Заявки, поданные на этой странице: в списке закрытых сообществ сервер их не отдаёт
  const [requested, setRequested] = useState<number[]>([])

  // Не дёргаем сервер на каждую букву
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setDone(false)
  }, [tab, search])

  const { data, loading, error, fetchMore, refetch } = useQuery(COMMUNITIES, {
    variables: { search: search || null, filter: tab, limit: PAGE, offset: 0 },
    fetchPolicy: 'cache-and-network',
  })
  const [join] = useMutation(JOIN_COMMUNITY)
  const [leave] = useMutation(LEAVE_COMMUNITY)
  const rows: Row[] = data?.getCommunities ?? []

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const res = await fetchMore({ variables: { offset: rows.length } })
      if ((res.data?.getCommunities?.length ?? 0) < PAGE) setDone(true)
    } catch {
      setDone(true)
    } finally {
      setLoadingMore(false)
    }
  }

  const toggle = async (community: Row) => {
    setActionId(community.id)
    try {
      if (community.isMember) await leave({ variables: { id: community.id } })
      else {
        const res = await join({ variables: { id: community.id } })
        if (res.data?.joinCommunity.hasRequested) setRequested((all) => [...all, community.id])
      }
      // «Мои» после выхода или вступления меняются, остальные вкладки обновит кэш
      if (tab === 'mine') await refetch()
    } catch {
      // Текст ошибки не нужен: кнопка просто вернётся в прежнее состояние
    } finally {
      setActionId(null)
    }
  }

  const empty = search
    ? 'Ничего не нашли'
    : tab === 'mine'
    ? 'Вы пока не состоите ни в одном сообществе. Найдите его во вкладке «Все сообщества» или создайте своё'
    : tab === 'managed'
    ? 'Вы пока ничем не управляете'
    : 'Сообществ пока нет'

  return (
    <Content className={cl.content}>
      <div className={cl.top}>
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
        <button type='button' className={cl.create} onClick={() => setCreating(true)}>
          ＋ Создать сообщество
        </button>
      </div>

      <div className={cl.wrappSearch}>
        <ImageLoading src='/icons/search.svg' className={cl.svg} />
        <Input
          type='text'
          placeholder='Найти сообщество...'
          className={`input ${cl.search}`}
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value)
            // Поиск ищет среди всех сообществ
            if (tab !== 'all') setTab('all')
          }}
        />
      </div>

      {error && <p className={cl.error}>{error.message}</p>}
      {loading && rows.length === 0 && <p className={cl.empty}>Загрузка…</p>}
      {!loading && rows.length === 0 && !error && <p className={cl.empty}>{empty}</p>}
      {rows.map((community) => (
        <CommunityRow
          key={community.id}
          community={community}
          action={
            // Создатель из своего сообщества выйти не может
            community.isOwner ? (
              <span className={cl.owner}>Вы создатель</span>
            ) : (
              <button
                type='button'
                className={`${cl.action} ${community.isMember ? cl.actionOn : ''}`}
                disabled={actionId === community.id || requested.includes(community.id)}
                onClick={() => void toggle(community)}
              >
                {community.isMember
                  ? 'Отписаться'
                  : requested.includes(community.id)
                  ? 'Заявка отправлена'
                  : community.isClosed
                  ? 'Подать заявку'
                  : 'Подписаться'}
              </button>
            )
          }
        />
      ))}
      {rows.length >= PAGE && !done && (
        <button type='button' className={cl.more} onClick={() => void loadMore()} disabled={loadingMore}>
          {loadingMore ? 'Загрузка…' : 'Показать ещё'}
        </button>
      )}
      {creating && <CreateCommunityDialog onClose={() => setCreating(false)} />}
    </Content>
  )
}
