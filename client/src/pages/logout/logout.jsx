import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { Context } from "../..";

const Logout = () => {
  const { loginStore } = useContext(Context);
  loginStore.logout();
  return <h1> LOGOUT {<Navigate to="/login" replace={false} />} </h1>;
};

export default Logout;
