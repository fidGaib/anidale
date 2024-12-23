import { lazy } from 'react'

const Feed = lazy(() => import('@/pages/feed'))
const Friends = lazy(() => import('@/pages/friends'))
const Profile = lazy(() => import('@/pages/profile'))
const Signin = lazy(() => import('@/pages/auth/signin/'))
const Signout = lazy(() => import('@/pages/auth/signout'))
const Registration = lazy(() => import('@/pages/auth/signup/'))
const Settings = lazy(() => import('@/pages/settings'))
const Music = lazy(() => import('@/pages/music'))
const Anime = lazy(() => import('@/pages/anime'))
const Watch = lazy(() => import('@/pages/watch'))

// private routes
export const privateRoutes = [
  { path: '/feed', element: Feed },
  { path: '/profile/:id', element: Profile },
  { path: '/signout', element: Signout },
  { path: '/friends', element: Friends },
  { path: '/settings', element: Settings },
  { path: '/music', element: Music },
  { path: '/anime', element: Anime },
  { path: '/watch', element: Watch },
]
// public routes
export const publicRoutes = [
  { path: '/feed', element: Feed },
  { path: '/signin', element: Signin },
  { path: '/signup', element: Registration },
]
