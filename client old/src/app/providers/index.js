import Chat from '../../pages/chat/chat'
import Feed from '../../pages/feed/feed'
import Friends from '../../pages/friends/friends'
import Login from '../../pages/login/login'
import Logout from '../../pages/logout/logout'
import Profile from '../../pages/profile/profile'
import Settings from '../../pages/settings/settings'

export const privateRouters = [
  { path: '/feed', element: Feed },
  { path: '/profile/:id', element: Profile },
  { path: '/logout', element: Logout },
  { path: '/friends', element: Friends },
  { path: '/settings', element: Settings },
  { path: '/chat', element: Chat },
]
export const publicRouters = [
  { path: '/feed', element: Feed },
  { path: '/login', element: Login },
]
