import { Link } from 'react-router-dom'

import cl from './index.module.less'

const MenuHeader = () => {
  return (
    <ul className={cl.menu}>
      <li>
        <Link to={'/feed'}>Лента</Link>
      </li>
      <li>
        <Link to={'/profile/0'}>Профиль</Link>
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
      <li>
        <Link to={'/signin'}>Войти</Link>
      </li>
      <li>
        <Link to={'/registration'}>Регистрация</Link>
      </li>
    </ul>
  )
}

export default MenuHeader
