import { useMutation, useQuery } from '@apollo/client'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { useRefreshStore } from '@/app/providers/routes/model'
import { ProfileMusicList } from '@/features/music'
import { MakePost } from '@/features/profile'
import { useStoriesStore } from '@/features/stories'
import { assetUrl } from '@/shared/config'
import { PROFILE, SUBSCRIBE, UNSUBSCRIBE } from '@/shared/graphql/schema'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'
import { openPhotos } from '@/shared/lib/photo-viewer'
import { toTimestamp } from '@/shared/lib/time'
import ButtonUI from '@/shared/ui/button'
import { ContextMenu, ContextMenuItem } from '@/shared/ui/context-menu'

import Posts from '../post'
import { ProfilePhotos } from './photos'
import cl from './ui.module.css'
import { ProfileVideos } from './videos'

const tabs = [
  { icon: assetUrl('icons/arts.svg'), text: 'Стена', layout: 1 },
  { icon: assetUrl('icons/add_photo.svg'), text: 'Фото', layout: 4 },
  { icon: assetUrl('icons/music.svg'), text: 'Музыка', layout: 2 },
  { icon: assetUrl('icons/video.svg'), text: 'Видео', layout: 3 },
]

type RelationStatus = 'NONE' | 'FRIEND' | 'SUBSCRIBED' | 'SUBSCRIBER'

interface FriendStateData {
  status: string
  friendsCount: number
  subscribersCount: number
}

export const ArtWork = () => {
  const params = useParams()
  const id = parseInt(params.id || '')
  const navigate = useNavigate()
  const { data } = useQuery(PROFILE, { variables: { id }, fetchPolicy: 'network-only' })
  const user = {
    login: data?.getUser?.login,
    avatar: data?.getUser?.avatar,
    status: data?.getUser?.status,
    city: data?.getUser?.city,
    birthDate: data?.getUser?.birthDate,
    backgroundImage: data?.getUser?.backgroundImage,
  }
  if (user.login) document.title = `${user.login} - Профиль`

  const [refreshData] = useRefreshStore((state) => [state.refreshData])
  const isOwn = refreshData.id === id

  // Отношения с профилем: локальное состояние поверх ответа getFriendState,
  // чтобы кнопка и счётчики обновлялись сразу после подписки/отписки.
  const [relation, setRelation] = useState<FriendStateData | null>(null)
  const [subscribe, subscribeResult] = useMutation(SUBSCRIBE)
  const [unsubscribe, unsubscribeResult] = useMutation(UNSUBSCRIBE)
  useEffect(() => {
    setRelation(null)
  }, [id])

  const friendState = relation ?? data?.getFriendState ?? null
  const relationStatus = (friendState?.status ?? 'NONE') as RelationStatus
  const isFriend = relationStatus === 'FRIEND'
  const isFollowing = relationStatus === 'SUBSCRIBED' || isFriend

  // Счётчик фото меняется сразу после загрузки/удаления, не дожидаясь повторного запроса профиля
  const [photosDelta, setPhotosDelta] = useState(0)
  useEffect(() => {
    setPhotosDelta(0)
  }, [id])
  // Так же поступает счётчик видео
  const [videosDelta, setVideosDelta] = useState(0)
  useEffect(() => {
    setVideosDelta(0)
  }, [id])
  const counters = [
    { label: 'друзья', value: friendState?.friendsCount ?? 0 },
    { label: 'подписчики', value: friendState?.subscribersCount ?? 0 },
    { label: 'фото', value: Math.max(0, (data?.photosCount ?? 0) + photosDelta) },
    { label: 'видео', value: Math.max(0, (data?.videosCount ?? 0) + videosDelta) },
  ]

  const toggleSubscription = async () => {
    try {
      if (isFollowing) {
        const res = await unsubscribe({ variables: { userId: id } })
        if (res.data?.unsubscribe) setRelation(res.data.unsubscribe)
      } else {
        const res = await subscribe({ variables: { userId: id } })
        if (res.data?.subscribe) setRelation(res.data.subscribe)
      }
    } catch {
      // Текст ошибки берём из состояния мутации
    }
  }

  const actionError = subscribeResult.error || unsubscribeResult.error
  const actionLoading = subscribeResult.loading || unsubscribeResult.loading

  // Меню «⋯»: те же действия, что и кнопками, плюс копирование ссылки на профиль
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const copyProfileLink = () => {
    void navigator.clipboard?.writeText(window.location.href).catch(() => undefined)
  }
  const menuItems: ContextMenuItem[] = [
    ...(isOwn
      ? [
          { label: 'Редактировать профиль', onClick: () => navigate('/settings'), svg: '/icons/edit.svg' },
          { label: 'Изменить обложку', onClick: () => navigate('/settings'), svg: '/icons/add_photo.svg' },
        ]
      : [
          { label: 'Написать сообщение', onClick: () => navigate(`/messages/${id}`), svg: '/icons/chat.svg' },
          {
            label: isFriend ? 'Удалить из друзей' : isFollowing ? 'Отписаться' : 'Подписаться',
            onClick: () => void toggleSubscription(),
            svg: isFollowing ? '/icons/unsubscribe_use.svg' : '/icons/friends.svg',
          },
        ]),
    { label: 'Скопировать ссылку', onClick: copyProfileLink, svg: '/icons/copy.svg' },
  ]

  const avatar = useSrcAvatar(user.avatar || '')
  const cover = useSrcAvatar(user.backgroundImage || '')
  const birthTimestamp = toTimestamp(user.birthDate)
  const birthLabel = birthTimestamp
    ? new Date(birthTimestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  // Есть ли у человека активная история: тогда клик по аватару открывает её, а вокруг аватара цветная обводка
  const storyGroup = useStoriesStore((state) => state.groups.find((g) => g.user.id === id))
  const loadStories = useStoriesStore((state) => state.load)
  const openStory = useStoriesStore((state) => state.open)
  useEffect(() => {
    void loadStories()
  }, [loadStories, id])

  const [layout, isLayout] = useState(1)

  return (
    <>
      <div className={`playground ${cl.card}`}>
        <div className={cl.cover}>
          <div className={cl.coverGradient} />
          {cover && <ImageLoading className={cl.coverImage} src={cover} />}
          {isOwn && (
            <Link to='/settings' className={cl.coverButton}>
              Изменить обложку
            </Link>
          )}
        </div>

        <div className={cl.head}>
          <ImageLoading
            onClick={() => {
              if (storyGroup) openStory(id)
              else if (avatar) openPhotos([{ src: avatar, name: user.login || 'avatar' }])
            }}
            title={storyGroup ? 'Смотреть историю' : undefined}
            className={`${cl.avatar} ${storyGroup ? (storyGroup.allSeen ? cl.storySeen : cl.storyNew) : ''}`}
            src={avatar}
          />

          <div className={cl.identity}>
            <h1 className={cl.name}>
              {user.login || 'not found :('}
              {isOwn && (
                <Link to='/settings' className={cl.nameEdit} title='Редактировать профиль'>
                  <ImageLoading src={assetUrl('icons/edit.svg')} className={cl.editIcon} />
                </Link>
              )}
            </h1>
            {user.status ? (
              <p className={cl.status}>{user.status}</p>
            ) : isOwn ? (
              <Link to='/settings' className={cl.status}>
                Добавить статус
              </Link>
            ) : (
              <span className={cl.statusMuted}>Без статуса</span>
            )}
            {(user.city || birthLabel) && (
              <div className={cl.meta}>
                {user.city && <span>{user.city}</span>}
                {birthLabel && <span>{birthLabel}</span>}
              </div>
            )}
          </div>

          <div className={cl.actions}>
            {isOwn ? (
              <Link to='/settings'>
                <ButtonUI>Редактировать профиль</ButtonUI>
              </Link>
            ) : (
              <>
                <Link to={`/messages/${id}`}>
                  <ButtonUI>Написать сообщение</ButtonUI>
                </Link>
                <ButtonUI onClick={toggleSubscription} disabled={actionLoading}>
                  {isFriend ? 'Удалить из друзей' : isFollowing ? 'Отписаться' : 'Подписаться'}
                </ButtonUI>
              </>
            )}
            <button
              className={cl.moreButton}
              title='Действия'
              aria-haspopup='menu'
              onClick={(e) => {
                if (menu) {
                  setMenu(null)
                  return
                }
                const rect = e.currentTarget.getBoundingClientRect()
                setMenu({ x: rect.left, y: rect.bottom + 4 })
              }}
            >
              ⋯
            </button>
            {actionError && <p className={cl.actionError}>{actionError.message}</p>}
          </div>
        </div>

        <div className={cl.counters}>
          {counters.map((counter) => (
            <div key={counter.label} className={cl.counter}>
              <b>{counter.value}</b>
              <span>{counter.label}</span>
            </div>
          ))}
        </div>

        <nav className={cl.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.layout}
              className={`${cl.tab} ${layout === tab.layout ? cl.tabActive : ''}`}
              onClick={() => isLayout(tab.layout)}
            >
              <ImageLoading src={tab.icon} className={cl.tabIcon} />
              <span>{tab.text}</span>
            </button>
          ))}
        </nav>
      </div>

      {layout === 1 && (
        <>
          <MakePost />
          <Posts />
        </>
      )}
      {layout === 2 && <ProfileMusicList scope={id} canAdd={isOwn} />}
      {layout === 4 && (
        <ProfilePhotos id={id} isOwn={isOwn} onCountChange={(delta) => setPhotosDelta((value) => value + delta)} />
      )}
      {layout === 3 && (
        <ProfileVideos id={id} isOwn={isOwn} onCountChange={(delta) => setVideosDelta((value) => value + delta)} />
      )}
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}
    </>
  )
}
