import Profile from "../../pages/profile/profile";
import Login from "../../pages/login/login";
import Feed from "../../pages/feed/feed";
import Logout from "../../pages/logout/logout";
import Friends from "../../pages/friends/friends";
import Settings from "../../pages/settings/settings";
import Chat from "../../pages/chat/chat";
export const privateRouters = [
  { path: "/feed", element: Feed },
  { path: "/profile/:id", element: Profile },
  { path: "/logout", element: Logout },
  { path: "/friends", element: Friends },
  { path: "/settings", element: Settings },
  { path: "/chat", element: Chat },
];
export const publicRouters = [
  { path: "/feed", element: Feed },
  { path: "/login", element: Login },
];
