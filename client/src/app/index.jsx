import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { Suspense, useContext, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { Context } from "..";
import Header from "../widgets/header/ui";
import Loader from "../shared/loader/ui";
import AppRouter from "./providers/AppRouter";
function App() {
  const { loginStore } = useContext(Context);
  useEffect(() => {
    if (localStorage.getItem("token")) {
      loginStore.checkAuth();
    }
  }, []);
  if (loginStore.isLoading) {
    return <Loader />;
  } else {
    return (
      <BrowserRouter>
        <Suspense fallback={<Loader />}>
          <Header />
          <AppRouter />
        </Suspense>
      </BrowserRouter>
    );
  }
}

export default observer(App);
