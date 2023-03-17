import { makeVar, useReactiveVar } from '@apollo/client'
import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'

import { privateRouters, publicRouters } from './routes'

const Signin = lazy(() => import('@/providers/auth/signin'))
const Feed = lazy(() => import('@/pages/feed'))
export const isAuth = makeVar(false)

const AppRouter = () => {
  const changeAuth = useReactiveVar(isAuth)
  return (
    <>
      {changeAuth ? (
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
