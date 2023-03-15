import MenuHeader from '../../features/header'
import Icon from '../../shared/icons'
import cl from './styles/header.module.less'

const Header = () => {
  return (
    <header className={cl.wrapper}>
      <Icon id={'logo'} className={cl.logo} />
      <MenuHeader />
    </header>
  )
}

export default Header
