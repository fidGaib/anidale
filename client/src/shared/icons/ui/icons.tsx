import { forwardRef } from 'react'

import AddPhotoIcon from './icons/add-photo'
import CommIcon from './icons/comm'
import FeedIcon from './icons/feed'
import FriendsIcon from './icons/friends'
import GroupsIcon from './icons/groups'
import LikeIcon from './icons/like'
import LoginIcon from './icons/login'
import Logo from './icons/logo'
import LogoutIcon from './icons/logout'
import MenuHeaderIcon from './icons/menu-header'
import MenuNoticeIcon from './icons/menu-notice'
import MessageIcon from './icons/message'
import ProfileIcon from './icons/profile'
import ReloadIcon from './icons/reload'
import SendIcon from './icons/send'
import SettingsIcon from './icons/settings'

const icons = {
  logo: (props: any, ref: any) => <Logo {...props} />,
  menu_header: (props: any, ref: any) => <MenuHeaderIcon {...props} ref={ref} />,
  // menu header icons
  profile: (props: any, ref: any) => <ProfileIcon {...props} />,
  feed: (props: any, ref: any) => <FeedIcon {...props} />,
  chat: (props: any, ref: any) => <MessageIcon {...props} />,
  groups: (props: any, ref: any) => <GroupsIcon {...props} />,
  friends: (props: any, ref: any) => <FriendsIcon {...props} />,
  settings: (props: any, ref: any) => <SettingsIcon {...props} />,
  signin: (props: any, ref: any) => <LoginIcon {...props} />,
  signout: (props: any, ref: any) => <LogoutIcon {...props} />,
  registration: (props: any, ref: any) => <LoginIcon {...props} />,
  comm: (props: any, ref: any) => <CommIcon {...props} />,
  send: (props: any, ref: any) => <SendIcon {...props} />,
  add_photo: (props: any, ref: any) => <AddPhotoIcon {...props} />,
  like: (props: any, ref: any) => <LikeIcon {...props} />,
  menu_post: (props: any, ref: any) => <MenuNoticeIcon {...props} />,
  reload: (props: any, ref: any) => <ReloadIcon {...props} />,
  //
}
interface PropsType {
  id: keyof typeof icons
  className?: string
  onClick?: any
  ref?: any
  type?: string
}
export const Icon = forwardRef((props: PropsType, ref: any) => {
  return icons[props.id](props, ref)
})
