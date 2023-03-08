import { makeAutoObservable } from "mobx";
import { noticeService } from "../../services/notice-service";

class NController {
  delShow = false;
  delId;
  //выборка
  limit = 10;
  page = 0;
  count = 0;
  isLoading = true;
  //данные из бд
  notices = [];
  avtors = [];
  fetch = true;
  lazyload = false;
  cleanNotice() {
    this.limit = 10;
    this.page = 0;
    this.count = 0;
    this.isLoading = true;
    this.notices = [];
    this.avtors = [];
    this.fetch = true;
    this.lazyload = false;
  }
  constructor() {
    makeAutoObservable(this);
  }
  setDelShow(bool) {
    this.delShow = bool;
  }
  setDelId(num) {
    this.delId = num;
  }
  setLazyload(bool) {
    this.lazyload = bool;
  }
  setFetch(bool) {
    this.fetch = bool;
  }
  setLimit(num) {
    this.limit = num;
  }
  setCount(num) {
    this.count = num;
  }
  setPage(num) {
    this.page = num;
  }
  setNotices(notices) {
    this.notices.push(...notices);
  }
  setAvtors(avtors) {
    this.avtors.push(...avtors);
  }
  setLoading(bool) {
    this.isLoading = bool;
  }
  delNotice() {
    this.notices = [];
  }
  removeNotice = async (index, notice_id, user_id) => {
    const data = await noticeService.remove(notice_id, user_id);
    if (data) {
      this.setDelId(notice_id);
      this.setDelShow(true);
      this.setCount(this.count - 1);
      const delN = this.notices.filter((e) => {
        return e.id !== notice_id;
      });
      setTimeout(() => {
        this.delNotice();
        this.setNotices(delN);
        this.avtors.splice(index, 1);
      }, 1000);
    }
  };
  fetchNotices = async (id) => {
    this.setLoading(true);
    if (this.limit < 1) return this.setLoading(false);
    if (!id) return;
    let data;
    if (id !== "feed")
      data = await noticeService.fetchByUser(id, this.limit, this.page);
    else data = await noticeService.fetchAll(this.limit, this.page);
    this.setNotices(data.notices);
    this.setAvtors(data.users);
    this.setLoading(false);
    this.setFetch(false);
    this.setCount(data.count);
    this.setPage(this.page + this.limit);
  };
  scrollHandler(e) {
    const limit = nController.limit;
    const count = nController.count;
    const notLength = nController.notices.length;
    if (notLength + limit + limit > count) {
      const WARcount = notLength + limit;
      const DELcount = WARcount - count;
      const selectLimit = limit - DELcount;
      nController.setLimit(selectLimit);
    }
    //--
    const height = e.target.documentElement.scrollHeight;
    const currentHeight =
      e.target.documentElement.scrollTop + window.innerHeight;
    if (height - currentHeight < 100 && notLength <= count) {
      nController.setLazyload(true);
    }
  }
}
export const nController = new NController();
