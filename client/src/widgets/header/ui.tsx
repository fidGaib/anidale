import { Link } from 'react-router-dom'

import { MenuHeader, NotificationHeader } from '@/features/header'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'

import cl from './ui.module.less'

export const Header = ({ themeToggler }: { themeToggler: any }) => {
  return (
    <header className={cl.wrapper}>
      <Link to={'/feed'}>
        <ImageLoading className={cl.logo} src='http://localhost:5173/src/assets/images/logo.png' />
      </Link>
      <NotificationHeader />
      <MenuHeader themeToggler={themeToggler} />
    </header>
  )
}
