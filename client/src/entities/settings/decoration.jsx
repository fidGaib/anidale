import { useState } from "react";
import Image from "../../shared/hooks/onLoadImage/onLoadImage";
import Icon from "../../shared/icons/icon";
import cl from "./styles/decor.module.css";
const Decoration = () => {
  const [previewDecor, setPreviewDecor] = useState("");
  const wrappBack = (e) => {
    const file = e.target.files;
    setPreviewDecor(URL.createObjectURL(file[0]));
  };
  return (
    <>
      <h1>Оформление сайта</h1>
      <div className={cl.wrappBack}>
        <Image
          src={
            previewDecor
              ? previewDecor
              : "http://mobimg.b-cdn.net/v3/fetch/dc/dc7a53998e5f94c7143166046c48e41d.jpeg"
          }
        />
      </div>
      <div className={cl.wrapUpload}>
        <label htmlFor="upl" className={cl.upload}>
          <Icon className={cl.changeAvatar} id="changeAvatar" />
        </label>
        <input onChange={wrappBack} id={"upl"} type="file" hidden />
      </div>
    </>
  );
};

export default Decoration;
