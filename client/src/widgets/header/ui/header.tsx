import { makeVar, useQuery } from '@apollo/client'
import { useEffect, useRef, useState } from 'react'

import { isAuth } from '@/app/providers/AppRouter'
import MenuHeader from '@/features/header'
import { REFRESH } from '@/shared/graphql/schema'
import useOutsideClick from '@/shared/hooks/useOutsideClick'
import Icon from '@/shared/icons'

import cl from './styles/header.module.less'

interface UserType {
  id?: number
  login?: string
  avatar?: string
}
export const Me = makeVar<UserType>({})
export const Header = () => {
  const { data } = useQuery(REFRESH, { fetchPolicy: 'network-only' })
  const [userData, setUserData] = useState<UserType>({})
  useEffect(() => {
    if (data?.refresh.user) {
      Me(data?.refresh.user)
      setUserData(Me())
      isAuth(true)
    } else isAuth(false)
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
      {showMenu && <MenuHeader id={userData?.id} ref={refMenu} />}
    </header>
  )
}
