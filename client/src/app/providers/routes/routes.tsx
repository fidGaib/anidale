import { lazy } from 'react'

const Feed = lazy(() => import('@/pages/feed'))
const Friends = lazy(() => import('@/pages/friends'))
const Profile = lazy(() => import('@/pages/profile'))
const Signin = lazy(() => import('@/pages/auth/signin/'))
const Signout = lazy(() => import('@/pages/auth/signout'))
const Registration = lazy(() => import('@/pages/auth/signup/'))

// private routers
export const privateRouters = [
  { path: '/feed', element: Feed },
  { path: '/profile/:id', element: Profile },
  { path: '/signout', element: Signout },
  { path: '/friends', element: Friends },
]
// public routers
export const publicRouters = [
  { path: '/feed', element: Feed },
  { path: '/signin', element: Signin },
  { path: '/signup', element: Registration },
]
