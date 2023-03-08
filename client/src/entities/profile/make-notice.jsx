import { observer } from "mobx-react-lite";
import { useContext, useRef } from "react";
import useAutosizeTextArea from "../../shared/hooks/useAutosizeTextArea";
import Textarea from "../../shared/teaxtarea/ui";
import { profileController } from "../../pages/profile/model";
import cl from "./styles/make-notice.module.css";
import { makeController } from "./models/make-notice";
import { Context } from "../..";
import Icon from "../../shared/icons/icon";
import InputFileImage from "../../shared/inputs/input-file-image";
import Image from "../../shared/hooks/onLoadImage/onLoadImage";
const MakeNotice = () => {
  const { loginStore } = useContext(Context);
  makeController.user_id = loginStore.user.id;
  const textAreaRef = useRef();
  const fullAddRef = useRef();
  const wrapRef = useRef();
  useAutosizeTextArea(
    textAreaRef.current,
    makeController.textarea,
    wrapRef.current
  );
  if (
    profileController.changeID === 0 &&
    loginStore.user.id === profileController.pageID
  ) {
    return (
      <>
        <p className={cl.errMakeNotice}>{makeController.error}</p>
        <div
          ref={wrapRef}
          id={makeController.showMakeFull ? cl.handleBorderBottom : ""}
          className={cl.makeNoticeWrap}
        >
          <Image
            className={cl.avatar}
            src={loginStore.user.avatar}
            alt="anidale"
          />
          <div className={cl.textWrap}>
            <Textarea
              id={cl.textarea}
              onChange={(e) => makeController.setTextarea(e.target.value)}
              placeholder="Впишите ноту..."
              ref={textAreaRef}
              value={makeController.textarea}
            />
          </div>
          <InputFileImage
            id="noticeImages"
            onChange={(e) => makeController.selectFiles(e.target.files)}
          />
          <label className={cl.label} htmlFor="noticeImages">
            <Icon id="addphoto" className={cl.labelSvg} />
          </label>
          <Icon
            disabled={true}
            id="send"
            className={cl.labelSvg}
            onClick={makeController.sendNotice}
          />
        </div>
        {makeController.showMakeFull && (
          <div
            id={makeController.sendLoading ? cl.sendLoading : ""}
            ref={fullAddRef}
            className={cl.showAddFull}
          >
            <div className={cl.wrapAddImages}>
              {makeController.compressImages.map((img, i) => (
                <Image
                  key={i}
                  src={img}
                  onClick={() => {
                    if (!makeController.sendFlag) {
                      makeController.delImages(img);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </>
    );
  } else return;
};

export default observer(MakeNotice);
