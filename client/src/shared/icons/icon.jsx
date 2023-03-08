import { forwardRef } from "react";
import AddPhoto from "./ui/addPhoto";
import Arts from "./ui/art";
import ChangeAvatar from "./ui/changeAvatar";
import Comm from "./ui/comm";
import Feed from "./ui/feed";
import Friends from "./ui/friends";
import Groups from "./ui/groups";
import Like from "./ui/like";
import Login from "./ui/login";
import Logo from "./ui/logo";
import Logout from "./ui/logout";
import MenuHeaderIcon from "./ui/menu-header";
import MenuNotice from "./ui/menu-notice";
import Message from "./ui/message";
import Music from "./ui/music";
import Notification from "./ui/notification";
import Profile from "./ui/profile";
import RemoveUser from "./ui/remove-user";
import Send from "./ui/send";
import Settings from "./ui/settings";
import Video from "./ui/video";

const Icon = forwardRef((props, ref) => {
  switch (props.id) {
    case "remove-user":
      return <RemoveUser {...props} />;
    case "logo":
      return <Logo {...props} />;
    case "changeAvatar":
      return <ChangeAvatar {...props} />;
    case "new-notice":
      return <Notification {...props} />;
    case "menu-notice":
      return <MenuNotice {...props} />;
    case "send":
      return <Send {...props} />;
    case "addphoto":
      return <AddPhoto {...props} />;
    case "comm":
      return <Comm {...props} />;
    case "like":
      return <Like {...props} />;
    case "settings":
      return <Settings {...props} />;
    case "logout":
      return <Logout {...props} />;
    case "login":
      return <Login {...props} />;
    case "profile":
      return <Profile {...props} />;
    case "messages":
      return <Message {...props} />;
    case "feed":
      return <Feed {...props} />;
    case "art":
      return <Arts {...props} />;
    case "video":
      return <Video {...props} />;
    case "music":
      return <Music {...props} />;
    case "friends":
      return <Friends {...props} />;
    case "groups":
      return <Groups {...props} />;
    case "menu":
      return <MenuHeaderIcon ref={ref} {...props} />;
    default:
      break;
  }
});

export default Icon;
