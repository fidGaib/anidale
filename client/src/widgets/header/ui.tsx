import { Link } from 'react-router-dom'

import { useDarkModeStore } from '@/app/module'
import { FindAnime, MenuHeader, NotificationHeader } from '@/features/header'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'

import cl from './ui.module.less'

export const Header = () => {
  const darkMode = useDarkModeStore((store) => store.theme)
  return (
    <header className={cl.wrapper}>
      <Link to={'/feed'}>
        <ImageLoading
          className={cl.logo}
          src={darkMode === 'dark' ? '/logo.png' : 'http://localhost:5173/src/assets/images/logo.png'}
        />
      </Link>
      <NotificationHeader />
      <FindAnime />
      <MenuHeader />
    </header>
  )
}
