import { useQuery } from '@apollo/client'
import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'

import { REFRESH } from '@/shared/graphql/schema'

import { privateRouters, publicRouters } from './routes'

const Signin = lazy(() => import('@/providers/auth/signin'))
const Feed = lazy(() => import('@/pages/feed'))

const AppRouter = () => {
  const { data, loading, error } = useQuery(REFRESH)
  if (data?.refresh) {
    return (
      <Routes>
        {privateRouters.map((route) => (
          <Route key={route.path} element={<route.element />} path={route.path} />
        ))}
        <Route element={<Feed />} path={'/*'} />
      </Routes>
    )
  } else {
    return (
      <Routes>
        {publicRouters.map((route) => (
          <Route key={route.path} element={<route.element />} path={route.path} />
        ))}
        <Route element={<Signin />} path={'/*'} />
      </Routes>
    )
  }
}
export default AppRouter
