import { useRef, useState } from 'react'

import MenuHeader from '@/features/header'
import useOutsideClick from '@/shared/hooks/useOutsideClick'
import Icon from '@/shared/icons'

import cl from './styles/header.module.less'

export const Header = () => {
  const [showMenu, setShowMenu] = useState(false)
  const notCloseMenuRef = useRef(null)
  const refMenu = useRef(null)
  const handleMenu = () => {
    setShowMenu(!showMenu)
  }
  const handleClicklInsideClose = () => {
    setShowMenu(false)
  }
  useOutsideClick(refMenu, handleClicklInsideClose, notCloseMenuRef)
  return (
    <header className={cl.wrapper}>
      <Icon id={'logo'} className={cl.logo} />
      <Icon id={'menu_header'} onClick={handleMenu} ref={notCloseMenuRef} className={cl.menuSvg} />
      {showMenu && <MenuHeader ref={refMenu} />}
    </header>
  )
}
