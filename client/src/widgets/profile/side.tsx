import { useQuery } from '@apollo/client'
import { Link } from 'react-router-dom'

import { CommunityAvatar } from '@/entities/community'
import { AddStory, useStoriesStore } from '@/features/stories'
import { storageUrl } from '@/shared/config'
import { GET_FRIENDS, GET_FRIENDS_ONLINE, GET_SUBSCRIPTIONS, USER_COMMUNITIES } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { formatShort } from '@/shared/lib/time'

import cl from './side.module.css'

/** Сколько человек показывать в блоках друзей. */
const FRIENDS_SHOWN = 4
const ONLINE_SHOWN = 4
const SUBSCRIPTIONS_SHOWN = 3
const COMMUNITIES_SHOWN = 3
/** Как часто обновлять «Друзья онлайн». */
const ONLINE_REFRESH_MS = 60_000

interface Person {
  id: number
  login: string
  avatar: string
}

const PersonRow = ({ person }: { person: Person }) => (
  <Link to={`/profile/${person.id}`} className={cl.row}>
    <ImageLoading className={cl.rowAvatar} src={useSrcAvatar(person.avatar)} />
    <span className={cl.rowName}>{person.login}</span>
  </Link>
)

const PersonItem = ({ person, online }: { person: Person; online?: boolean }) => (
  <Link to={`/profile/${person.id}`} className={cl.person} title={person.login}>
    <span className={cl.personAvatarWrap}>
      <ImageLoading className={cl.personAvatar} src={useSrcAvatar(person.avatar)} />
      {online && <span className={cl.onlineDot} />}
    </span>
    <span className={cl.personName}>{person.login}</span>
  </Link>
)

const Card = ({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) => (
  <section className={`playground ${cl.card}`}>
    <h3 className={cl.title}>
      {title}
      {count !== undefined && <span className={cl.count}>{count}</span>}
    </h3>
    {children}
  </section>
)

interface Props {
  /** Чей профиль открыт. */
  id: number
  isOwn: boolean
  /** Сколько всего друзей (из счётчиков профиля). */
  friendsCount: number
  /** На сколько человек он подписан, не считая друзей. */
  subscriptionsCount: number
}

/** Правая колонка профиля: моменты (истории), друзья онлайн и друзья. */
export const ProfileSide = ({ id, isOwn, friendsCount, subscriptionsCount }: Props) => {
  const group = useStoriesStore((state) => state.groups.find((g) => g.user.id === id))
  const openStory = useStoriesStore((state) => state.open)

  const friends = useQuery(GET_FRIENDS, {
    variables: { id, limit: FRIENDS_SHOWN },
    skip: !id || friendsCount === 0,
    fetchPolicy: 'network-only',
  })
  const online = useQuery(GET_FRIENDS_ONLINE, {
    variables: { id, limit: ONLINE_SHOWN },
    skip: !id || friendsCount === 0,
    fetchPolicy: 'network-only',
    pollInterval: ONLINE_REFRESH_MS,
  })

  const subscriptions = useQuery(GET_SUBSCRIPTIONS, {
    variables: { id, limit: SUBSCRIPTIONS_SHOWN },
    skip: !id || subscriptionsCount === 0,
    fetchPolicy: 'network-only',
  })

  const communities = useQuery(USER_COMMUNITIES, {
    variables: { userId: id, limit: COMMUNITIES_SHOWN },
    skip: !id,
    fetchPolicy: 'network-only',
  })
  const communityList = communities.data?.getUserCommunities.items ?? []
  const communitiesTotal = communities.data?.getUserCommunities.total ?? 0

  const friendList: Person[] = (friends.data?.getFriends ?? []).map((u) => ({
    id: u.id,
    login: u.login,
    avatar: u.avatar,
  }))
  const onlineList: Person[] = (online.data?.getFriendsOnline ?? []).map((u) => ({
    id: u.id,
    login: u.login,
    avatar: u.avatar,
  }))
  const subscriptionList: Person[] = (subscriptions.data?.getSubscriptions ?? []).map((u) => ({
    id: u.id,
    login: u.login,
    avatar: u.avatar,
  }))
  const stories = group?.stories ?? []

  return (
    <>
      {(stories.length > 0 || isOwn) && (
        <Card title='Моменты' count={stories.length || undefined}>
          {stories.length > 0 && (
            <div className={cl.stories}>
              {stories.map((story) => (
                <button
                  key={story.id}
                  type='button'
                  className={cl.story}
                  title={story.text || 'Смотреть момент'}
                  onClick={() => openStory(id, story.id)}
                >
                  <span className={`${cl.storyRing} ${story.seen ? cl.storyRingSeen : ''}`}>
                    <img className={cl.storyImage} src={`${storageUrl(story.src)}.webp`} alt='' loading='lazy' />
                  </span>
                  <span className={cl.storyLabel}>{story.text || formatShort(story.date)}</span>
                </button>
              ))}
            </div>
          )}
          {isOwn && (
            <AddStory>
              {(openPicker, uploading) => (
                <button type='button' className={cl.wideButton} onClick={openPicker} disabled={uploading}>
                  {uploading ? 'Загрузка…' : 'Создать момент'}
                </button>
              )}
            </AddStory>
          )}
        </Card>
      )}

      {onlineList.length > 0 && (
        <Card title='Друзья онлайн' count={onlineList.length}>
          <div className={cl.people}>
            {onlineList.map((person) => (
              <PersonItem key={person.id} person={person} online />
            ))}
          </div>
        </Card>
      )}

      {friendsCount > 0 && (
        <Card title='Друзья' count={friendsCount}>
          <div className={cl.people}>
            {friendList.map((person) => (
              <PersonItem key={person.id} person={person} />
            ))}
          </div>
        </Card>
      )}

      {communityList.length > 0 && (
        <Card title='Сообщества' count={communitiesTotal}>
          <div className={cl.rows}>
            {communityList.map((community) => (
              <Link key={community.id} to={`/community/${community.id}`} className={cl.row}>
                <CommunityAvatar name={community.name} avatar={community.avatar} size={36} />
                <span className={cl.rowName}>{community.name}</span>
              </Link>
            ))}
          </div>
          {isOwn && (
            <Link to='/communities' className={cl.wideButton}>
              Все сообщества
            </Link>
          )}
        </Card>
      )}

      {subscriptionsCount > 0 && (
        <Card title='Подписки' count={subscriptionsCount}>
          <div className={cl.rows}>
            {subscriptionList.map((person) => (
              <PersonRow key={person.id} person={person} />
            ))}
          </div>
        </Card>
      )}
    </>
  )
}
