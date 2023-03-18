import { useReactiveVar } from '@apollo/client'
import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

import Icon from '@/shared/icons'

import cl from './styles/index.module.less'
import { isAuthVar } from '@/shared/store/state'

interface Props {
  id?: number
}
export const MenuHeader = forwardRef((props: Props, ref?: any) => {
  const isAuth = useReactiveVar(isAuthVar)
  return (
    <ul className={cl.menu} ref={ref}>
      {isAuth ? (
        <>
          <li>
            <Icon id='profile' className={cl.menuSvg} />
            <Link to={`/profile/${props.id}`}>Профиль</Link>
          </li>
          <li>
            <Icon id='feed' className={cl.menuSvg} />
            <Link to={'/feed'}>Лента</Link>
          </li>
          <li>
            <Icon id='chat' className={cl.menuSvg} />
            <Link to={'/messages'}>Мессенджер</Link>
          </li>
          <li>
            <Icon id='friends' className={cl.menuSvg} />
            <Link to={'/friends'}>Друзья</Link>
          </li>
          <li>
            <Icon id='groups' className={cl.menuSvg} />
            <Link to={'/groups'}>Сообщества</Link>
          </li>
          <li>
            <Icon id='settings' className={cl.menuSvg} />
            <Link to={'/settings'}>Настройки</Link>
          </li>
          <li>
            <Icon id='signout' className={cl.menuSvg} />
            <Link to={'/signout'}>Выйти</Link>
          </li>
        </>
      ) : (
        <>
          <li>
            <Icon id='feed' className={cl.menuSvg} />
            <Link to={'/feed'}>Лента</Link>
          </li>
          <li>
            <Icon id='signin' className={cl.menuSvg} />
            <Link to={'/signin'}>Войти</Link>
          </li>
        </>
      )}
    </ul>
  )
})
