import { ForwardedRef, ImgHTMLAttributes, SVGAttributes, forwardRef } from 'react'

import AddPhotoIcon from './icons/add-photo'
import ArtsIcon from './icons/art'
import Close from './icons/close'
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
import MusicIcon from './icons/music'
import ProfileIcon from './icons/profile'
import ReloadIcon from './icons/reload'
import SendIcon from './icons/send'
import SettingsIcon from './icons/settings'
import VideoIcon from './icons/video'

const icons = {
  logo: (props: ImgHTMLAttributes<HTMLImageElement>) => <Logo {...props} />,
  menu_header: (props: SVGAttributes<SVGElement>, ref: ForwardedRef<SVGElement | any>) => (
    <MenuHeaderIcon {...props} ref={ref} />
  ),
  // menu header icons
  profile: (props: SVGAttributes<SVGElement>) => <ProfileIcon {...props} />,
  feed: (props: SVGAttributes<SVGElement>) => <FeedIcon {...props} />,
  chat: (props: SVGAttributes<SVGElement>) => <MessageIcon {...props} />,
  groups: (props: SVGAttributes<SVGElement>) => <GroupsIcon {...props} />,
  friends: (props: SVGAttributes<SVGElement>) => <FriendsIcon {...props} />,
  settings: (props: SVGAttributes<SVGElement>) => <SettingsIcon {...props} />,
  signin: (props: SVGAttributes<SVGElement>) => <LoginIcon {...props} />,
  signout: (props: SVGAttributes<SVGElement>) => <LogoutIcon {...props} />,
  registration: (props: SVGAttributes<SVGElement>) => <LoginIcon {...props} />,
  comm: (props: SVGAttributes<SVGElement>) => <CommIcon className={props.className} />,
  send: (props: SVGAttributes<SVGElement>) => <SendIcon className={props.className} onClick={props.onClick} />,
  add_photo: (props: SVGAttributes<SVGElement>) => <AddPhotoIcon className={props.className} />,
  like: (props: SVGAttributes<SVGElement>) => <LikeIcon className={props.className} />,
  menu_post: (props: SVGAttributes<SVGElement>) => <MenuNoticeIcon className={props.className} />,
  reload: (props: SVGAttributes<SVGElement>) => <ReloadIcon className={props.className} />,
  close: (props: SVGAttributes<SVGElement>) => <Close className={props.className} onClick={props.onClick} />,
  art: (props: SVGAttributes<SVGElement>) => <ArtsIcon className={props.className} onClick={props.onClick} />,
  music: (props: SVGAttributes<SVGElement>) => <MusicIcon className={props.className} onClick={props.onClick} />,
  video: (props: SVGAttributes<SVGElement>) => <VideoIcon className={props.className} onClick={props.onClick} />,
  //
}
interface PropsType extends SVGAttributes<SVGElement | any> {
  iconId: keyof typeof icons
}
export const Icon = forwardRef<SVGElement, PropsType>(function Icon(props, ref) {
  const { iconId, ...rest } = props
  return icons[iconId](rest, ref)
})
