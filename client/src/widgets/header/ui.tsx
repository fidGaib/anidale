import { Link } from 'react-router-dom'

import darkLogo from '@/assets/images/dark_logo.png'
import lightLogo from '@/assets/images/ligth_logo.png'
import { useDarkModeStore } from '@/app/module'
import { FindAnime, MenuHeader, NotificationHeader } from '@/features/header'
import Content from '@/shared/content'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'

import cl from './ui.module.css'

export const Header = () => {
  const darkMode = useDarkModeStore((store) => store.theme)
  return (
    <Content id={cl.wrapper}>
      <Link to={'/feed'}>
        <ImageLoading
          className={cl.logo}
          src={darkMode === 'dark' ? darkLogo : lightLogo}
        />
      </Link>
      <NotificationHeader />
      <FindAnime />
      <MenuHeader />
    </Content>
  )
}
