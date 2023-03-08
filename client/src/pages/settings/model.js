import { makeAutoObservable } from "mobx";

class SettingController {
  changeID = 0;
  listSett = [
    { id: 0, active: true, body: "Профиль" },
    { id: 1, active: false, body: "Оформление" },
  ];
  constructor() {
    makeAutoObservable(this);
  }
  handleSett(id) {
    this.changeID = id;
    this.listSett.map((list) => {
      if (id === list.id) return (list.active = true);
      else return (list.active = false);
    });
  }
}

export const settingController = new SettingController();
