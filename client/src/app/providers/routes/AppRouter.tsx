import { lazy, useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'

import NotFound from '@/pages/not-found'

import { privateRoutes, publicRoutes } from './routes'
import { useQuery, useReactiveVar } from '@apollo/client'
import { REFRESH } from '@/shared/graphql/schema'
import { makeVar } from '@apollo/client'
const Signin = lazy(() => import('@/pages/auth/signin'))
const Feed = lazy(() => import('@/pages/feed'))

export const VarAuthData = makeVar({
  id: 0,
  avatar: '',
  login: ''
})

const AppRouter = () => {
  const {data, loading} = useQuery(REFRESH, {fetchPolicy: 'network-only' })
  const AuthData = useReactiveVar(VarAuthData)
  useEffect(() => {
    if(data && data.refresh) {
      VarAuthData(data.refresh)
    }
  }, [data, loading])
  return (
    <Routes>
      {AuthData.id > 0 ? (
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
