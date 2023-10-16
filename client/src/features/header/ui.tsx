import { Link } from 'react-router-dom'

import { useViewer } from '@/entities/viewer'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'

import cl from './ui.module.less'

export const MenuHeader = () => {
  const viewer = useViewer()
  return (
    <>
      <button className={cl.focusBtn}>
        <ImageLoading className={cl.headerMenuSvg} src='/icons/menu.svg' alt='anidale menu icon' />
      </button>
      <ul className={cl.menu}>
        {viewer.id !== 0 ? (
          <>
            <li>
              <ImageLoading className={cl.menuSvg} src='/icons/profile.svg' alt='anidale profile icon' />
              <Link to={`/profile/${viewer.id}`}>Профиль</Link>
            </li>
            <li>
              <ImageLoading className={cl.menuSvg} src='/icons/feed.svg' alt='anidale feed icon' />
              <Link to={'/feed'}>Лента</Link>
            </li>
            <li>
              <ImageLoading className={cl.menuSvg} src='/icons/chat.svg' alt='anidale chat icon' />
              <Link to={'/messages'}>Мессенджер</Link>
            </li>
            <li>
              <ImageLoading className={cl.menuSvg} src='/icons/friends.svg' alt='anidale friends icon' />
              <Link to={'/friends'}>Друзья</Link>
            </li>
            <li>
              <ImageLoading className={cl.menuSvg} src='/icons/groups.svg' alt='anidale groups icon' />
              <Link to={'/groups'}>Сообщества</Link>
            </li>
            <li>
              <ImageLoading className={cl.menuSvg} src='/icons/music.svg' alt='anidale music icon' />
              <Link to={'/music'}>Музыка</Link>
            </li>
            <li>
              <ImageLoading className={cl.menuSvg} src='/icons/settings.svg' alt='anidale settings icon' />
              <Link to={'/settings'}>Настройки</Link>
            </li>
            <li>
              <ImageLoading className={cl.menuSvg} src='/icons/logout.svg' alt='anidale logout icon' />
              <Link to={'/signout'}>Выйти</Link>
            </li>
          </>
        ) : (
          <>
            <li>
              <ImageLoading className={cl.menuSvg} src='/icons/feed.svg' alt='anidale feed icon' />
              <Link to={'/feed'}>Лента</Link>
            </li>
            <li>
              <ImageLoading className={cl.menuSvg} src='/icons/sigin.svg' alt='anidale sigin icon' />
              <Link to={'/signin'}>Войти</Link>
            </li>
          </>
        )}
      </ul>
      {viewer.id !== 0 ? (
        <Link to={`/profile/${viewer?.id}`} className={cl.userAvatar}>
          <ImageLoading src={useSrcAvatar(viewer.avatar)} alt={viewer.login} />
        </Link>
      ) : (
        <></>
      )}
    </>
  )
}
export const NotificationHeader = () => {
  const viewer = useViewer()
  if (viewer.id === 0) return <div style={{ marginLeft: 'auto' }}></div>
  return (
    <>
      <button className={cl.notification}>
        <ImageLoading className={cl.notificationSvg} src='/icons/notification.svg' alt='anidale notification icon' />
      </button>
      <div className={cl.notificationWrapper}>
        {/* item */}
        <div className={cl.item}>
          <img src={useSrcAvatar(viewer.avatar)} alt='' />
          <div className={cl.body}>
            <div className={cl.title}>{viewer.login}</div>
            <div className={cl.description}>Lorem ipsum dolor sit amet.</div>
          </div>
        </div>
        {/* /item */}
        {/* item */}
        <div className={cl.item}>
          <img src={useSrcAvatar(viewer.avatar)} alt='' />
          <div className={cl.body}>
            <div className={cl.title}>{viewer.login}</div>
            <div className={cl.description}>Lorem ipsum dolor sit amet.</div>
          </div>
        </div>
        {/* /item */}
      </div>
    </>
  )
}
