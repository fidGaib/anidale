import React, { createContext } from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import LoginStore from "./pages/login/model";

const loginStore = new LoginStore();
export const Context = createContext({ loginStore });
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Context.Provider value={{ loginStore }}>
    <App />
  </Context.Provider>
);
