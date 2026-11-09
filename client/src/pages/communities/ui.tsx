import { useMutation, useQuery } from '@apollo/client'
import { useEffect, useState } from 'react'

import { CommunityListItem, CommunityRow } from '@/entities/community'
import Content from '@/shared/content'
import { COMMUNITIES, JOIN_COMMUNITY, LEAVE_COMMUNITY } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { Btn } from '@/shared/ui/btn'
import Input from '@/shared/ui/input'
import { Empty, FormError, Hint } from '@/shared/ui/notice'
import { Tabs } from '@/shared/ui/tabs'
import { CreateCommunityDialog } from '@/widgets/community'

import cl from './ui.module.css'

const PAGE = 30

type Tab = 'mine' | 'managed' | 'all'

const tabs: { id: Tab; title: string }[] = [
  { id: 'mine', title: 'Мои сообщества' },
  { id: 'managed', title: 'Управление' },
  { id: 'all', title: 'Все сообщества' },
]

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
        <Tabs items={tabs} value={tab} onChange={setTab} />
        <Btn variant='primary' onClick={() => setCreating(true)}>
          ＋ Создать сообщество
        </Btn>
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

      <FormError>{error?.message}</FormError>
      {loading && rows.length === 0 && <Empty>Загрузка…</Empty>}
      {!loading && rows.length === 0 && !error && <Empty>{empty}</Empty>}
      {rows.map((community) => (
        <CommunityRow
          key={community.id}
          community={community}
          action={
            // Создатель из своего сообщества выйти не может
            community.isOwner ? (
              <Hint>Вы создатель</Hint>
            ) : (
              <Btn
                variant={community.isMember ? 'secondary' : 'primary'}
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
              </Btn>
            )
          }
        />
      ))}
      {rows.length >= PAGE && !done && (
        <Btn onClick={() => void loadMore()} disabled={loadingMore}>
          {loadingMore ? 'Загрузка…' : 'Показать ещё'}
        </Btn>
      )}
      {creating && <CreateCommunityDialog onClose={() => setCreating(false)} />}
    </Content>
  )
}
