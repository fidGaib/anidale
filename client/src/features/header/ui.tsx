import { Link } from 'react-router-dom'

import { useDarkModeStore } from '@/app/module'
import { useRefreshStore } from '@/app/providers/routes/model'
import { useMessagesStore } from '@/features/messages'
import { NotificationBell } from '@/features/notifications'
import { assetUrl } from '@/shared/config'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'

import cl from './ui.module.css'

export const MenuHeader = () => {
  const [refreshData] = useRefreshStore((state) => [state.refreshData])
  const setTheme = useDarkModeStore((store) => store.setTheme)
  const unread = useMessagesStore((s) => s.conversations.reduce((sum, c) => sum + (c.muted ? 0 : c.unread), 0))
  const linksAuth = [
    { link: `/profile/${refreshData.id}`, text: 'Профиль', icon: 'profile.svg' },
    { link: `/feed`, text: 'Лента', icon: 'feed.svg' },
    { link: `/messages`, text: 'Мессенджер', icon: 'chat.svg' },
    { link: `/friends`, text: 'Друзья', icon: 'friends.svg' },
    { link: `/groups`, text: 'Сообщества', icon: 'groups.svg' },
    { link: `/bookmarks`, text: 'Закладки', icon: 'note.svg' },
    { link: `/music`, text: 'Музыка', icon: 'music.svg' },
    { link: `/anime`, text: 'Аниме', icon: 'manga.svg' },
    { link: `/settings`, text: 'Настройки', icon: 'settings.svg' },
  ]
  const linksNotAuth = [{ link: `/feed`, text: 'Лента', icon: assetUrl('icons/feed.svg') }]
  return (
    <>
      <button className={cl.focusBtn}>
        <ImageLoading className={cl.headerMenuSvg} src={assetUrl('icons/menu.svg')} alt='anidale menu icon' />
      </button>
      <ul className={`playground ${cl.menu}`}>
        {refreshData.id! > 0 ? (
          <>
            {linksAuth.map((item) => {
              return (
                <li key={item.text}>
                  <ImageLoading
                    className={cl.menuSvg}
                    src={assetUrl('icons/' + item.icon)}
                    alt={`anidale ${item.text}`}
                  />
                  <Link to={item.link}>
                    {item.text}
                    {item.link === '/messages' && unread > 0 ? (
                      <span
                        style={{
                          marginLeft: 6,
                          padding: '1px 6px',
                          borderRadius: 10,
                          background: 'brown',
                          color: '#fff',
                          fontSize: 12,
                        }}
                      >
                        {unread > 99 ? '99+' : unread}
                      </span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
            <li>
              <ImageLoading className={cl.menuSvg} src={assetUrl('icons/turn.svg')} alt='anidale settings icon' />
              <Link onClick={setTheme} to={'#'}>
                Темный режим
              </Link>
            </li>
            <li>
              <ImageLoading className={cl.menuSvg} src={assetUrl('icons/logout.svg')} alt='anidale logout icon' />
              <Link to={'/signout'}>Выйти</Link>
            </li>
          </>
        ) : (
          <>
            {linksNotAuth.map((item) => {
              return (
                <li key={item.text}>
                  <ImageLoading className={cl.menuSvg} src={item.icon} alt={`anidale ${item.text}`} />
                  <Link to={item.link}>{item.text}</Link>
                </li>
              )
            })}
            <li>
              <ImageLoading className={cl.menuSvg} src={assetUrl('icons/turn.svg')} alt='anidale settings icon' />
              <Link onClick={setTheme} to={'#'}>
                Темный режим
              </Link>
            </li>
            <li>
              <ImageLoading className={cl.menuSvg} src={assetUrl('icons/sigin.svg')} alt='anidale sigin icon' />
              <Link to={'/signin'}>Войти</Link>
            </li>
          </>
        )}
      </ul>
      {refreshData.id! > 0 ? (
        <Link to={`/profile/${refreshData.id}`} className={cl.userAvatar}>
          <ImageLoading src={useSrcAvatar(refreshData.avatar || '')} />
        </Link>
      ) : (
        <></>
      )}
    </>
  )
}
export const NotificationHeader = () => {
  const [refreshData] = useRefreshStore((state) => [state.refreshData])
  // Гостю уведомления не нужны; пустой блок сохраняет прижатие поиска и меню к правому краю
  return refreshData.id === 0 ? <div style={{ marginLeft: 'auto' }}></div> : <NotificationBell />
}
