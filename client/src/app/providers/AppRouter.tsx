import { Route, Routes } from 'react-router-dom'

import { privateRouters, publicRouters } from '.'
import Feed from '../../pages/feed'
import Signin from '../../pages/signin'

const AppRouter = () => {
  return true ? (
    <Routes>
      {privateRouters.map((route) => (
        <Route key={route.path} element={<route.element />} path={route.path} />
      ))}
      <Route element={<Feed />} path={'/*'} />
    </Routes>
  ) : (
    <Routes>
      {publicRouters.map((route) => (
        <Route key={route.path} element={<route.element />} path={route.path} />
      ))}
      <Route element={<Signin />} path={'/*'} />
    </Routes>
  )
}
export default AppRouter
