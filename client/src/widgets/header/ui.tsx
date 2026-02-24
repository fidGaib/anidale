import { Link } from 'react-router-dom'

import { useDarkModeStore } from '@/app/module'
import { FindAnime, MenuHeader, NotificationHeader } from '@/features/header'
import Content from '@/shared/content'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'

import cl from './ui.module.less'

export const Header = () => {
  const darkMode = useDarkModeStore((store) => store.theme)
  return (
    <Content id={cl.wrapper}>
      <Link to={'/feed'}>
        <ImageLoading
          className={cl.logo}
          src={
            darkMode === 'dark'
              ? 'http://localhost:5173/src/assets/images/dark_logo.png'
              : 'http://localhost:5173/src/assets/images/ligth_logo.png'
          }
        />
      </Link>
      <NotificationHeader />
      <FindAnime />
      <MenuHeader />
    </Content>
  )
}
