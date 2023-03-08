import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { Context } from "../..";
import { nController } from "../../entities/notices/model";
import Icon from "../../shared/icons/icon";
import cl from "./style.module.css";
const Menu = ({ index, userId, notId }) => {
  const { loginStore } = useContext(Context);
  const del = () => {
    nController.removeNotice(index, notId, loginStore.user.id);
  };
  return (
    <>
      <Icon className={cl.menuNotice} id="menu-notice" />
      {loginStore.user.id === userId ? (
        <ul className={cl.listNotice}>
          <li>Сохранить в закладках</li>
          <li>Редактировать</li>
          <li>Скопировать ссылку</li>
          <li>Ахривировать запись</li>
          <li onClick={del}>Удалить</li>
        </ul>
      ) : (
        <ul className={cl.listNotice}>
          <li>Сохранить в закладках</li>
          <li>Скопировать ссылку</li>
          <li>Пожаловаться</li>
        </ul>
      )}
    </>
  );
};

export default observer(Menu);
