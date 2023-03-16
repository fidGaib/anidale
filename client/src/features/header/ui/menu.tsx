import { useQuery } from '@apollo/client'
import { forwardRef } from 'react'
import { Link } from 'react-router-dom'

import { REFRESH } from '@/shared/graphql/schema'

import cl from './styles/index.module.less'

export const MenuHeader = forwardRef((props, ref?: any) => {
  const { data, loading, error } = useQuery(REFRESH)
  return (
    <ul className={cl.menu} ref={ref}>
      <li>
        <Link to={'/feed'}>Лента</Link>
      </li>
      {error ? (
        <>
          <li>
            <Link to={'/signin'}>Войти</Link>
          </li>
          <li>
            <Link to={'/registration'}>Регистрация</Link>
          </li>
        </>
      ) : (
        <>
          <li>
            <Link to={`/profile/${data}`}>Профиль</Link>
          </li>
          <li>
            <Link to={'/friends'}>Друзья</Link>
          </li>
          <li>
            <Link to={'/messages'}>Мессенджер</Link>
          </li>
          <li>
            <Link to={'/settings'}>Настройки</Link>
          </li>
          <li>
            <Link to={'/signout'}>Выйти</Link>
          </li>
        </>
      )}
    </ul>
  )
})
