import { useReactiveVar } from '@apollo/client'
import { Link } from 'react-router-dom'

import { useDarkModeStore } from '@/app/module'
import { VarAuthData } from '@/app/providers/routes/AppRouter'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import { useSrcAvatar } from '@/shared/hooks/useSrcAvatar'

import cl from './ui.module.less'

export const MenuHeader = () => {
  const AuthData = useReactiveVar(VarAuthData)
  const setTheme = useDarkModeStore((store) => store.setTheme)
  return (
    <>
      <button className={cl.focusBtn}>
        <ImageLoading className={cl.headerMenuSvg} src='/icons/menu.svg' alt='anidale menu icon' />
      </button>
      <ul className={cl.menu}>
        {AuthData.id > 0 ? (
          <>
            <div className='playground'>
              <li>
                <ImageLoading className={cl.menuSvg} src='/icons/profile.svg' alt='anidale profile icon' />
                <Link to={`/profile/${AuthData.id}`}>Профиль</Link>
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
                <ImageLoading className={cl.menuSvg} src='/icons/turn.svg' alt='anidale settings icon' />
                <Link onClick={setTheme} to={'#'}>
                  Темный режим
                </Link>
              </li>
              <li>
                <ImageLoading className={cl.menuSvg} src='/icons/logout.svg' alt='anidale logout icon' />
                <Link to={'/signout'}>Выйти</Link>
              </li>
            </div>
          </>
        ) : (
          <>
            <div className='playground'>
              <li>
                <ImageLoading className={cl.menuSvg} src='/icons/feed.svg' alt='anidale feed icon' />
                <Link to={'/feed'}>Лента</Link>
              </li>
              <li>
                <ImageLoading className={cl.menuSvg} src='/icons/turn.svg' alt='anidale settings icon' />
                <Link onClick={setTheme} to={'#'}>
                  Темный режим
                </Link>
              </li>
              <li>
                <ImageLoading className={cl.menuSvg} src='/icons/sigin.svg' alt='anidale sigin icon' />
                <Link to={'/signin'}>Войти</Link>
              </li>
            </div>
          </>
        )}
      </ul>
      {AuthData.id > 0 ? (
        <Link to={`/profile/${AuthData.id}`} className={cl.userAvatar}>
          <ImageLoading src={useSrcAvatar(AuthData.avatar)} />
        </Link>
      ) : (
        <></>
      )}
    </>
  )
}
export const NotificationHeader = () => {
  const AuthData = useReactiveVar(VarAuthData)
  return (
    <>
      {AuthData.id === 0 ? (
        <div style={{ marginLeft: 'auto' }}></div>
      ) : (
        <>
          <button className={cl.notification}>
            <ImageLoading
              className={cl.notificationSvg}
              src='/icons/notification.svg'
              alt='anidale notification icon'
            />
          </button>
          <div className={cl.notificationWrapper}>
            <div className='playground'>
              <div className={cl.item}>
                <ImageLoading src={useSrcAvatar(AuthData.avatar)} className={cl.itemAvatar} />
                <div className={cl.body}>
                  <p className={cl.title}>{AuthData.login ? AuthData.login : 'Акигава'}</p>
                  <p className={cl.description}>Привет! Как твои дела?</p>
                </div>
              </div>
              <div className={cl.item}>
                <ImageLoading src={useSrcAvatar(AuthData.avatar)} className={cl.itemAvatar} />
                <div className={cl.body}>
                  <p className={cl.title}>{AuthData.login ? AuthData.login : 'Акигава'}</p>
                  <p className={cl.description}>Привет! Как твои дела?</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
