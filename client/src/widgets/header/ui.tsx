import MenuHeader from '@/features/header'
import Icon from '@/shared/icons'

import cl from './ui.module.less'

export const Header = () => {
  return (
    <header className={cl.wrapper}>
      <Icon iconId={'logo'} className={cl.logo} />
      <MenuHeader />
    </header>
  )
}
