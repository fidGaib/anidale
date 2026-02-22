import { useQuery } from '@apollo/client'
import { lazy, useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'

import NotFound from '@/pages/not-found'
import { REFRESH } from '@/shared/graphql/schema'

import { useRefreshStore } from './model'
import { privateRoutes, publicRoutes } from './routes'

const Signin = lazy(() => import('@/pages/auth/signin'))
const Feed = lazy(() => import('@/pages/feed'))

const AppRouter = () => {
  const [refreshData, setRefreshData, reset] = useRefreshStore((state) => [
    state.refreshData,
    state.setRefreshData,
    state.reset,
  ])
  const { data, error, loading } = useQuery(REFRESH, {
    fetchPolicy: 'network-only',
  })
  useEffect(() => {
    handleRefresh()
  }, [loading, data, error])
  const handleRefresh = () => {
    if (loading) return
    if (error) reset()
    if (data?.refresh?.id) setRefreshData(data?.refresh)
  }
  return (
    <Routes>
      {refreshData.id ? (
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
