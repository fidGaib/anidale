import { Link } from 'react-router-dom'

import { MenuHeader, NotificationHeader } from '@/features/header'

import cl from './ui.module.less'

export const Header = () => {
  return (
    <header className={cl.wrapper}>
      <Link to={'/feed'}>{/* <Icon iconId={'logo'} className={cl.logo} /> */}</Link>
      <NotificationHeader />
      <MenuHeader />
    </header>
  )
}
