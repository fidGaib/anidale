import { Link } from 'react-router-dom'

import { useViewer } from '@/entities/viewer'
import Icon from '@/shared/icons'

import cl from './ui.module.less'

export const MenuHeader = () => {
  const viewer = useViewer()
  return (
    <>
      <button className={cl.focusBtn}>
        <Icon iconId={'menu_header'} className={cl.headerMenuSvg} />
      </button>
      <ul className={cl.menu}>
        {viewer.id !== 0 ? (
          <>
            <li>
              <Icon iconId='profile' className={cl.menuSvg} />
              <Link to={`/profile/${viewer.id}`}>Профиль</Link>
            </li>
            <li>
              <Icon iconId='feed' className={cl.menuSvg} />
              <Link to={'/feed'}>Лента</Link>
            </li>
            <li>
              <Icon iconId='chat' className={cl.menuSvg} />
              <Link to={'/messages'}>Мессенджер</Link>
            </li>
            <li>
              <Icon iconId='friends' className={cl.menuSvg} />
              <Link to={'/friends'}>Друзья</Link>
            </li>
            <li>
              <Icon iconId='groups' className={cl.menuSvg} />
              <Link to={'/groups'}>Сообщества</Link>
            </li>
            <li>
              <Icon iconId='music' className={cl.menuSvg} />
              <Link to={'/music'}>Музыка</Link>
            </li>
            <li>
              <Icon iconId='settings' className={cl.menuSvg} />
              <Link to={'/settings'}>Настройки</Link>
            </li>
            <li>
              <Icon iconId='signout' className={cl.menuSvg} />
              <Link to={'/signout'}>Выйти</Link>
            </li>
          </>
        ) : (
          <>
            <li>
              <Icon iconId='feed' className={cl.menuSvg} />
              <Link to={'/feed'}>Лента</Link>
            </li>
            <li>
              <Icon iconId='signin' className={cl.menuSvg} />
              <Link to={'/signin'}>Войти</Link>
            </li>
          </>
        )}
      </ul>
    </>
  )
}
export const NotificationHeader = () => {
  const viewer = useViewer()
  if (viewer.id === 0) return <div style={{ marginLeft: 'auto' }}></div>
  return (
    <>
      <button className={cl.notification}>
        <Icon iconId='notification' className={cl.notificationSvg} />
      </button>
      <div className={cl.notificationWrapper}>
        {/* item */}
        <div className={cl.item}>
          <img src={viewer.avatar} alt='' />
          <div className={cl.body}>
            <div className={cl.title}>{viewer.login}</div>
            <div className={cl.description}>Lorem ipsum dolor sit amet.</div>
          </div>
        </div>
        {/* /item */}
        {/* item */}
        <div className={cl.item}>
          <img src={viewer.avatar} alt='' />
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
