import { lazy } from 'react'

import { Registration } from '@/providers/auth/registration/'

const Feed = lazy(() => import('@/pages/feed'))
const Friends = lazy(() => import('@/pages/friends'))
const Profile = lazy(() => import('@/pages/profile'))
const Signin = lazy(() => import('@/providers/auth/signin'))
const Signout = lazy(() => import('@/providers/auth/signout'))

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
  { path: '/registration', element: Registration },
]
