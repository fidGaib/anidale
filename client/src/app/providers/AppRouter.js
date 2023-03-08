import { observer } from "mobx-react-lite";
import { Route, Routes } from "react-router-dom";
import { privateRouters, publicRouters } from ".";
import Login from "../../pages/login/login";
import { Context } from "../..";
import { useContext } from "react";
import Feed from "../../pages/feed/feed";
const AppRouter = () => {
  const { loginStore } = useContext(Context);
  return loginStore.isAuth ? (
    <Routes>
      {privateRouters.map((route) => (
        <Route key={route.path} element={<route.element />} path={route.path} />
      ))}
      <Route path="*" element={<Feed />} />
    </Routes>
  ) : (
    <Routes>
      {publicRouters.map((route) => (
        <Route key={route.path} element={<route.element />} path={route.path} />
      ))}
      <Route path="*" element={<Login />} />
    </Routes>
  );
};
export default observer(AppRouter);
