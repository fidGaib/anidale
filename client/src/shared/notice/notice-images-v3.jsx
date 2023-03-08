import Image from "../hooks/onLoadImage/onLoadImage";
import cl from "./styles/notice-images-v3.module.css";
import "./styles/notice-images-v3.css";
import { useEffect, useRef, useState } from "react";
import { useOutsideClickModal } from "../hooks/useOutsideClick";
import Icon from "../icons/icon";

const NoticeImages = ({ images }) => {
  const url = "http://localhost:5000/api/uploads/";
  const [slider, setSlider] = useState(false);
  const [over, setOver] = useState("");
  const [minimal, setMinimal] = useState("");
  const [modal, setModal] = useState(false);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    images.forEach((el) => {
      if (images.length > 2 && el.vertical) setSlider(true);
      if (images.length === 1 && el.vertical) setSlider(true);
    });
  }, []);
  const modalRef = useRef(null);
  const hanlderOutsise = () => {
    setModal(false);
  };
  useOutsideClickModal(modalRef, hanlderOutsise);
  return (
    <>
      {/* images */}
      <div
        className={cl.wrapper}
        id={slider ? "images-length-1" : `images-length-${images.length}`}
      >
        {/* not slider */}
        {!slider &&
          images.map((image, index) => (
            <div key={image.id} id="wrapperList">
              <Image
                id={"item"}
                src={url + image.minimize}
                onClick={() => {
                  setModal(true);
                  setMinimal(url + image.minimize);
                  setOver(url + image.oversize);
                  setIndex(index);
                }}
              />
            </div>
          ))}
        {slider && (
          <div key={images[index].id} id="wrapperList">
            <Image
              id={"item"}
              src={url + images[index].minimize}
              onClick={() => {
                setModal(true);
                setMinimal(url + images[index].minimize);
                setOver(url + images[index].oversize);
              }}
            />
            <Image id={"blur"} src={url + images[index].minimize} />
          </div>
        )}
      </div>
      {/* slider */}
      {slider && images.length > 1 ? (
        <div className={cl.slider}>
          {images.map((image, index) => (
            <Image
              key={image.id}
              className={cl.sliderItem}
              src={url + image.minimize}
              onClick={() => {
                setIndex(index);
              }}
            />
          ))}
        </div>
      ) : (
        ""
      )}
      {/* modal */}
      {modal ? (
        <div key={images[index].id} className={cl.modal}>
          <div ref={modalRef} className={cl.bodyModal}>
            <Image className={cl.modalImage} src={over} />
            <Image className={cl.blurImageModal} src={minimal} />
            <div className={cl.funcBlockModal}>
              <div className={cl.like}>
                <Icon id="like" />
              </div>
              <div className={cl.comm}>
                <Icon id="comm" />
              </div>
              <a href={over} download>
                Скачать
              </a>
            </div>
          </div>
        </div>
      ) : (
        ""
      )}
    </>
  );
};

export default NoticeImages;
