import { useQuery } from '@apollo/client'
import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'

import { REFRESH } from '@/shared/graphql/schema'

import { privateRouters, publicRouters } from './routes'

const Signin = lazy(() => import('@/pages/signin'))
const Feed = lazy(() => import('@/pages/feed'))

const AppRouter = () => {
  const { data, loading, error } = useQuery(REFRESH)
  if (error) {
    return (
      <Routes>
        {publicRouters.map((route) => (
          <Route key={route.path} element={<route.element />} path={route.path} />
        ))}
        <Route element={<Signin />} path={'/*'} />
      </Routes>
    )
  }
  return (
    <Routes>
      {privateRouters.map((route) => (
        <Route key={route.path} element={<route.element />} path={route.path} />
      ))}
      <Route element={<Feed />} path={'/*'} />
    </Routes>
  )
}
export default AppRouter
