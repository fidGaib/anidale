import { observer } from "mobx-react-lite";
import React from "react";
import cl from "./style.module.css";
const Content = (props) => {
  return (
    <div className={cl.content} {...props}>
      {props.children}
    </div>
  );
};

export default observer(Content);
