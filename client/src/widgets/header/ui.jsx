import { observer } from 'mobx-react-lite'
import { useContext, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { Context } from '../..'
import Menu from '../../shared/header/menu'
import Image from '../../shared/hooks/onLoadImage/onLoadImage'
import useOutsideClick from '../../shared/hooks/useOutsideClick'
import Icon from '../../shared/icons/icon'
import cl from './styles.module.css'

const Header = () => {
  const { loginStore } = useContext(Context)
  const notCloseMenuRef = useRef(null)
  const [showMenu, setShowMenu] = useState(false)
  function handleMenu() {
    setShowMenu(!showMenu)
  }
  const refMenu = useRef(null)
  const handleClicklInsideClose = () => {
    setShowMenu(false)
  }
  useOutsideClick(refMenu, handleClicklInsideClose, notCloseMenuRef)
  return (
    <header className={cl.header}>
      <Icon className={cl.logo} id='logo' />
      <input placeholder='поиск...' type='text' className={cl.search} />

      <Icon onClick={handleMenu} ref={notCloseMenuRef} className={cl.menu_handle} id='menu' />
      {loginStore.user.avatar && (
        <Link className={cl.hrefMenuAvatar} to={`/profile/${loginStore.user.id}`}>
          <Image className={cl.menuAvatar} src={loginStore.user.avatar} alt='anidale' />
        </Link>
      )}
      {showMenu && <Menu ref={refMenu} />}
    </header>
  )
}
export default observer(Header)
