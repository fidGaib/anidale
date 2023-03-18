import { useQuery } from '@apollo/client'
import { useEffect, useRef, useState } from 'react'

import { ViewerVar } from '@/entities/viewer'
import MenuHeader from '@/features/header'
import { REFRESH } from '@/shared/graphql/schema'
import useOutsideClick from '@/shared/hooks/useOutsideClick'
import Icon from '@/shared/icons'

import cl from './ui.module.less'

export const Header = () => {
  const { data } = useQuery(REFRESH, { fetchPolicy: 'network-only' })

  useEffect(() => {
    if (data?.refresh.user) {
      ViewerVar(data?.refresh.user)
    } else ViewerVar(null)
  }, [data?.refresh.user])
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
