import { observer } from "mobx-react-lite";
import Decoration from "../../entities/settings/decoration";
import EditInfo from "../../entities/settings/edit-info";
import Menu from "../../features/settings/menu";
import Content from "../../shared/content/ui";
import useTitlePage from "../../shared/hooks/useTitlePage";
import { settingController } from "./model";
import cl from "./style.module.css";
const Settings = () => {
  useTitlePage("AniDale - Настройки");
  return (
    <Content id={cl.content}>
      <Menu />
      <div className={cl.wrapp}>
        {settingController.changeID === 0 ? <EditInfo /> : ""}
        {settingController.changeID === 1 ? <Decoration /> : ""}
      </div>
    </Content>
  );
};

export default observer(Settings);
