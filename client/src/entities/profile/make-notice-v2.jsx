import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { useParams } from "react-router-dom";
import { Context } from "../..";
import { profileController } from "../../pages/profile/model";
import Image from "../../shared/hooks/onLoadImage/onLoadImage";
import Icon from "../../shared/icons/icon";
import InputFileImage from "../../shared/inputs/input-file-image";
import Textarea from "../../shared/teaxtarea/ui";
import { makeNoticeController } from "./models/make-notice-v2";
import cl from "./styles/make-notice.module.css";
const MakeBoticeV2 = () => {
  const { loginStore } = useContext(Context);
  makeNoticeController.user_id = loginStore.user.id;
  const params = useParams();
  if (
    profileController.changeID === 0 &&
    loginStore.user.id === parseInt(params.id)
  ) {
    return (
      <>
        <p className={cl.errMakeNotice}>{makeNoticeController.error}</p>
        <div
          id={makeNoticeController.images.length ? cl.handleBorderBottom : ""}
          className={cl.makeNoticeWrap}
        >
          <Image
            className={cl.avatar}
            src={loginStore.user.avatar}
            alt="anidale"
          />
          <div className={cl.textWrap}>
            <Textarea
              value={makeNoticeController.textarea}
              onChange={(e) => {
                makeNoticeController.setTextarea(e.target.value);
              }}
              id={cl.textarea}
              placeholder="Впишите ноту..."
            />
          </div>
          <InputFileImage
            id="noticeImages"
            onChange={(e) => {
              makeNoticeController.addFiles(e.target.files);
            }}
          />
          <label className={cl.label} htmlFor="noticeImages">
            <Icon id="addphoto" className={cl.labelSvg} />
          </label>
          <Icon
            id="send"
            className={cl.labelSvg}
            onClick={makeNoticeController.sendNotice}
          />
        </div>
        {makeNoticeController.images.length ? (
          <div className={cl.showAddFull}>
            <div className={cl.wrapAddImages}>
              {makeNoticeController.images.map((image, i) => (
                <Image
                  key={i}
                  src={URL.createObjectURL(image)}
                  onClick={() => {
                    makeNoticeController.delImages(image);
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          ""
        )}
      </>
    );
  }
};

export default observer(MakeBoticeV2);
