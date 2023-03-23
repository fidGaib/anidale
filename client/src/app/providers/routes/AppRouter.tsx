import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'

import { useAuthentication } from '@/processes/auth'

import { privateRoutes, publicRoutes } from './routes'

const Signin = lazy(() => import('@/pages/auth/signin'))
const Feed = lazy(() => import('@/pages/feed'))

const AppRouter = () => {
  const { isAuth, isAuthenticating } = useAuthentication()

  if (isAuthenticating) {
    return <></>
  }

  console.log('UPDATE STATE', { isAuth, isAuthenticating })

  return (
    <>
      {isAuth ? (
        <Routes>
          {privateRoutes.map((route) => (
            <Route key={route.path} element={<route.element />} path={route.path} />
          ))}
          <Route element={<Feed />} path={'/*'} />
        </Routes>
      ) : (
        <Routes>
          {publicRoutes.map((route) => (
            <Route key={route.path} element={<route.element />} path={route.path} />
          ))}
          <Route element={<Signin />} path={'/*'} />
        </Routes>
      )}
    </>
  )
}
export default AppRouter
