import React, { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Context } from "../..";
import UserService from "../../services/user-service";
import Content from "../../shared/content/ui";
import Image from "../../shared/hooks/onLoadImage/onLoadImage";
import { useFetching } from "../../shared/hooks/useFetching";
import Icon from "../../shared/icons/icon";
import Textarea from "../../shared/teaxtarea/ui";
import cl from "./styles.module.css";
const Chat = () => {
  const { loginStore } = useContext(Context);
  const [users, setUsers] = useState([]);
  const [fetching, isLoading, error] = useFetching(async () => {
    const { data } = await UserService.fetchUsers();
    setUsers([...data.users]);
  });
  useEffect(() => {
    fetching();
  }, []);
  return (
    <Content id={cl.content}>
      <div className={cl.listUsers}>
        {users.map((user) => {
          return (
            <div key={user.id} className={cl.oneUser}>
              <Link
                to={`/chat?chat_id=${Math.round(
                  Math.random() * 99999999
                )}&from=${loginStore.user.id}&to=${user.id}`}
              >
                <div className={cl.wrapAvatar}>
                  <Image src={user.avatar} />
                </div>
                <div className={cl.login}>{loginStore.user.login}</div>
              </Link>
            </div>
          );
        })}
      </div>
      <div className={cl.messColumn}>
        <div className={cl.infoUser}>
          <div className={cl.wrapAvatar}>
            <Image src={loginStore.user.avatar} />
          </div>
          <div className={cl.login}>{loginStore.user.login}</div>
        </div>
        <div className={cl.bodyMess}>
          <div className={cl.wrapMess}>
            <div className={cl.mess}>
              <div className={cl.wrapAvatar}>
                <Image src={loginStore.user.avatar} />
              </div>

              <div className={cl.wrapBodyMess}>
                <div className={cl.description}>
                  Давно выяснено, что при оценке дизайна и композиции читаемый
                  текст мешает сосредоточиться. Lorem Ipsum используют потому,
                  что тот обеспечивает более или менее стандартное заполнение
                  шаблона, а также реальное распределение.
                </div>
                <div className={cl.date}>18:55</div>
              </div>
            </div>
          </div>
          {/* my */}
          <div className={cl.wrapMess}>
            <div id={cl.my} className={cl.mess}>
              <div className={cl.wrapBodyMess}>
                <div className={cl.description}>
                  Lorem Ipsum используют потому, что тот обеспечивает более или
                  менее стандартное заполнение шаблона
                </div>
                <div className={cl.date}>18:55</div>
              </div>
            </div>
          </div>
        </div>
        <div className={cl.sendForm}>
          <Icon style={{ marginTop: "5px" }} width="40px" id="changeAvatar" />
          <Textarea id={cl.textarea} placeholder={"Message"} />
          <Icon width="30px" id="send" />
        </div>
      </div>
    </Content>
  );
};

export default Chat;
