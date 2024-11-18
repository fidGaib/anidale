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
  const { data, loading } = useQuery(REFRESH, { fetchPolicy: 'cache-first' })
  const [refreshData, setRefreshData] = useRefreshStore((state) => [state.refreshData, state.setRefreshData])
  useEffect(() => {
    console.log('render')
    if (data && data.refresh) {
      //@ts-ignore
      setRefreshData(data.refresh)
    }
  }, [data, loading])
  return (
    <Routes>
      {refreshData.id > 0 ? (
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
