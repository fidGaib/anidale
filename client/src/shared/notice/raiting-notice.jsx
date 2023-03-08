import Icon from "../icons/icon";
import cl from "./styles/raiting.module.css";

const RaitingNotice = (props) => {
  return (
    <div className={cl.wrapLikeCommDislike}>
      <div className={cl.like}>
        <Icon className={cl.wrapLikeCommLikeSvg} id="like" />
        <div className={cl.count}>{props.CountLike || 0}</div>
      </div>
      <div className={cl.comm}>
        <Icon className={cl.wrapLikeCommLikeSvg} id="comm" />
        <div className={cl.count}>{props.CountComm || 0}</div>
      </div>
    </div>
  );
};

export default RaitingNotice;
