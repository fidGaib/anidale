import { useQuery } from '@apollo/client'
import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'

import NotFound from '@/pages/not-found'
import { REFRESH } from '@/shared/graphql/schema'

import { useRefreshStore } from './model'
import { privateRoutes, publicRoutes } from './routes'

const Signin = lazy(() => import('@/pages/auth/signin'))
const Feed = lazy(() => import('@/pages/feed'))

const AppRouter = () => {
  const [refreshData, setRefreshData] = useRefreshStore((state) => [state.refreshData, state.setRefreshData])
  const {} = useQuery(REFRESH, {
    fetchPolicy: 'network-only',
    onCompleted: (fetchedData) => {
      if (fetchedData.refresh) {
        setRefreshData(fetchedData.refresh)
      }
    },
  })
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
