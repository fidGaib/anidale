import { forwardRef, useContext } from "react";
import { Link } from "react-router-dom";
import { Context } from "../..";
import Icon from "../icons/icon";
import cl from "./menu.module.css";
const Menu = forwardRef((props, ref) => {
  const { loginStore } = useContext(Context);
  return (
    <ul ref={ref} className={cl.menu}>
      <li>
        <Icon id="feed" className={cl.menuSvg} />
        <Link to={"/feed"}>Лента</Link>
      </li>
      <li>
        <Icon id="profile" className={cl.menuSvg} />
        <Link to={`/profile/${loginStore.user.id}`}>Профиль</Link>
      </li>
      <li>
        <Icon id="friends" className={cl.menuSvg} />
        <Link to={`/friends`}>Друзья</Link>
      </li>
      <li>
        <Icon id="messages" className={cl.menuSvg} />
        <Link to={`/messages`}>Мессенджер</Link>
      </li>
      <li>
        <Icon id="settings" className={cl.menuSvg} />
        <Link to={`/settings`}>Настройки</Link>
      </li>
      {loginStore.isAuth ? (
        <li>
          <Icon id="logout" className={cl.menuSvg} />
          <Link to={`/logout`}>Выйти</Link>
        </li>
      ) : (
        <li>
          <Icon id="login" className={cl.menuSvg} />
          <Link to={`/login`}>Войти</Link>
        </li>
      )}
    </ul>
  );
});
export default Menu;
