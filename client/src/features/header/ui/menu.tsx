import { useQuery } from '@apollo/client'
import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

import { REFRESH } from '@/shared/graphql/schema'
import Icon from '@/shared/icons'

import cl from './styles/index.module.less'

export const MenuHeader = forwardRef((props, ref?: any) => {
  const { data, loading, error } = useQuery(REFRESH)
  if (loading) return <></>
  else
    return (
      <ul className={cl.menu} ref={ref}>
        {data?.refresh ? (
          <>
            <li>
              <Icon id='profile' className={cl.menuSvg} />
              <Link to={`/profile/${data}`}>Профиль</Link>
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
