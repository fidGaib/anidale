import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'

import { privateRouters, publicRouters } from './routes'

const Signin = lazy(() => import('@/pages/signin'))
const Feed = lazy(() => import('@/pages/feed'))

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
