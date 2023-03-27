import { Link } from 'react-router-dom'

import { useViewer } from '@/entities/viewer'
import { MenuHeader, NotificationHeader } from '@/features/header'
import ImageLoading from '@/shared/hooks/onLoadImage/onLoadImage'
import Icon from '@/shared/icons'

import cl from './ui.module.less'

export const Header = () => {
  const viewer = useViewer()
  return (
    <header className={cl.wrapper}>
      <Link to={'/feed'}>
        <Icon iconId={'logo'} className={cl.logo} />
      </Link>
      <NotificationHeader />
      <MenuHeader />
      {viewer ? (
        <Link to={`/profile/${viewer?.id}`} className={cl.userAvatar}>
          <ImageLoading src={viewer?.avatar} alt={viewer?.login} />
        </Link>
      ) : (
        ''
      )}
    </header>
  )
}
