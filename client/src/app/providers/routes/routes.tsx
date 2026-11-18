import { lazy } from 'react'

const Feed = lazy(() => import('@/pages/feed'))
const Friends = lazy(() => import('@/pages/friends'))
const Profile = lazy(() => import('@/pages/profile'))
const Signin = lazy(() => import('@/pages/auth/signin/'))
const Signout = lazy(() => import('@/pages/auth/signout'))
const Registration = lazy(() => import('@/pages/auth/signup/'))
const VerifyEmail = lazy(() => import('@/pages/auth/verify-email'))
const ForgotPassword = lazy(() => import('@/pages/auth/forgot-password'))
const ResetPassword = lazy(() => import('@/pages/auth/reset-password'))
const Settings = lazy(() => import('@/pages/settings'))
const Music = lazy(() => import('@/pages/music'))
const Messages = lazy(() => import('@/pages/messages'))
const Anime = lazy(() => import('@/pages/anime'))
const AnimeCatalog = lazy(() => import('@/pages/anime-catalog'))
const Release = lazy(() => import('@/pages/release'))
const Watch = lazy(() => import('@/pages/watch'))
const AnimeAdmin = lazy(() => import('@/pages/anime-admin'))
const Bookmarks = lazy(() => import('@/pages/bookmarks'))
const Communities = lazy(() => import('@/pages/communities'))
const Community = lazy(() => import('@/pages/community'))
const Article = lazy(() => import('@/pages/article'))
const ArticleEditor = lazy(() => import('@/pages/article-editor'))

// private routes
export const privateRoutes = [
  { path: '/feed', element: Feed },
  { path: '/profile/:id', element: Profile },
  { path: '/signout', element: Signout },
  { path: '/friends', element: Friends },
  { path: '/settings', element: Settings },
  { path: '/music', element: Music },
  { path: '/messages', element: Messages },
  { path: '/messages/:userId', element: Messages },
  { path: '/anime', element: Anime },
  { path: '/anime/catalog', element: AnimeCatalog },
  { path: '/anime/:id', element: Release },
  { path: '/watch/:id', element: Watch },
  { path: '/bookmarks', element: Bookmarks },
  { path: '/communities', element: Communities },
  { path: '/community/:id', element: Community },
  { path: '/admin/anime', element: AnimeAdmin },
  { path: '/article/new', element: ArticleEditor },
  { path: '/article/:id/edit', element: ArticleEditor },
  { path: '/article/:id', element: Article },
  { path: '/verify-email', element: VerifyEmail },
  { path: '/forgot-password', element: ForgotPassword },
  { path: '/reset-password', element: ResetPassword },
]
// public routes
export const publicRoutes = [
  { path: '/feed', element: Feed },
  { path: '/anime', element: Anime },
  { path: '/anime/catalog', element: AnimeCatalog },
  { path: '/anime/:id', element: Release },
  { path: '/watch/:id', element: Watch },
  { path: '/signin', element: Signin },
  { path: '/signup', element: Registration },
  { path: '/verify-email', element: VerifyEmail },
  { path: '/forgot-password', element: ForgotPassword },
  { path: '/reset-password', element: ResetPassword },
]
