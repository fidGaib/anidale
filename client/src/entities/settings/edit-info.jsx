import { observer } from "mobx-react-lite";
import { useContext, useEffect, useState } from "react";
import { Context } from "../..";
import Image from "../../shared/hooks/onLoadImage/onLoadImage";
import Icon from "../../shared/icons/icon";
import { editProfile } from "./models/edit-info";
import cl from "./styles/edit-info.module.css";

const EditInfo = () => {
  const { loginStore } = useContext(Context);
  useEffect(() => {
    editProfile.setEmail(loginStore.user.email);
    editProfile.setLogin(loginStore.user.login);
  }, []);
  return (
    <>
      <h1>Аватар</h1>
      <div className={cl.wrapAvatar}>
        <Image
          src={
            editProfile.avatar.length
              ? URL.createObjectURL(editProfile.avatar[0])
              : loginStore.user.avatar
          }
        />
        <div className={cl.wrapUpload}>
          <label htmlFor="upl" className={cl.upload}>
            <Icon className={cl.changeAvatar} id="changeAvatar" />
          </label>
          <input
            onChange={(e) => {
              editProfile.addAvatar(e.target.files);
            }}
            id={"upl"}
            type="file"
            hidden
            accept="image/*"
          />
        </div>
        <div>
          <button>Редактировать</button>
          <button>Сохранить</button>
        </div>
      </div>
      <h1>Информация</h1>
      <div className={cl.wrappInfo}>
        <input
          className={cl.input}
          type="email"
          value={editProfile.email}
          onChange={(e) => editProfile.setEmail(e.target.value)}
        />
        <input
          className={cl.input}
          type="text"
          value={editProfile.login}
          onChange={(e) => editProfile.setLogin(e.target.value)}
        />
        <button onClick={editProfile.sendInfo}>Сохранить</button>
      </div>
    </>
  );
};

export default observer(EditInfo);
