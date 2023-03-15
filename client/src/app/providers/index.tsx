import Feed from '../../pages/feed'
import Friends from '../../pages/friends'
import Profile from '../../pages/profile'
import Registration from '../../pages/registration'
import Signin from '../../pages/signin'
import Signout from '../../pages/signout'

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
