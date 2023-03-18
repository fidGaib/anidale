import { useReactiveVar } from '@apollo/client'
import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'

import { isAuthVar } from '@/shared/store/state'

import { privateRouters, publicRouters } from './routes'

const Signin = lazy(() => import('@/providers/auth/signin'))
const Feed = lazy(() => import('@/pages/feed'))

const AppRouter = () => {
  const isAuth = useReactiveVar(isAuthVar)
  return (
    <>
      {isAuth ? (
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
      )}
    </>
  )
}
export default AppRouter
