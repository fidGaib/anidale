import { observer } from 'mobx-react-lite'
import { useContext } from 'react'
import { Route, Routes } from 'react-router-dom'

import { privateRouters, publicRouters } from '.'
import { Context } from '../..'
import Feed from '../../pages/feed/feed'
import Login from '../../pages/login/login'

const AppRouter = () => {
  const { loginStore } = useContext(Context)
  return loginStore.isAuth ? (
    <Routes>
      {privateRouters.map((route) => (
        <Route key={route.path} element={<route.element />} path={route.path} />
      ))}
      <Route path='*' element={<Feed />} />
    </Routes>
  ) : (
    <Routes>
      {publicRouters.map((route) => (
        <Route key={route.path} element={<route.element />} path={route.path} />
      ))}
      <Route path='*' element={<Login />} />
    </Routes>
  )
}
export default observer(AppRouter)
