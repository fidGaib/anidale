import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'

import NotFound from '@/pages/not-found'
import { useAuthentication } from '@/processes/auth'

import { privateRoutes, publicRoutes } from './routes'

const Signin = lazy(() => import('@/pages/auth/signin'))
const Feed = lazy(() => import('@/pages/feed'))

const AppRouter = () => {
  const { isAuth, isAuthenticating } = useAuthentication()

  if (isAuthenticating) {
    return <></>
  }

  return (
    <Routes>
      {isAuth ? (
        <>
          {privateRoutes.map((route) => (
            <Route key={route.path} element={<route.element />} path={route.path} />
          ))}
          <Route element={<Feed />} path='/' />
        </>
      ) : (
        <>
          {publicRoutes.map((route) => (
            <Route key={route.path} element={<route.element />} path={route.path} />
          ))}
          <Route element={<Signin />} path='/' />
        </>
      )}
      <Route element={<NotFound />} path='*' />
    </Routes>
  )
}
export default AppRouter
