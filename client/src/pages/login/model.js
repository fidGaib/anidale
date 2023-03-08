import { makeAutoObservable } from "mobx";
import $api, { API_URL } from "../../shared/http/index";
import AuthService from "./AuthService";

export default class LoginStore {
  user = {};
  isAuth = false;
  error = "";
  sendFlag = false;
  re =
    /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
  isLoading = false;
  constructor() {
    makeAutoObservable(this);
  }
  setError(val) {
    this.error = val;
  }
  validate(email, pass) {
    if (!email.trim()) return this.setError("Введите E-mail.");
    else if (!pass) return this.setError("Введите пароль.");
    else if (pass.trim().length < 6)
      return this.setError("Пароль не менее 6 символов.");
    else if (!email.match(this.re)) return this.setError("Некоректный E-mail");
    else return this.setError("");
  }
  setAuth(bool) {
    this.isAuth = bool;
  }
  setUser(user) {
    this.user = user;
  }
  setLoading(bool) {
    this.isLoading = bool;
  }
  async login(e, email, pass) {
    e.preventDefault();
    if (this.sendFlag) return;
    this.validate(email, pass);
    if (!this.error) {
      this.sendFlag = true;
      try {
        this.setError("Обработка данных...");
        const response = await AuthService.login(email, pass);
        localStorage.setItem("token", response.data.accessToken);
        this.setUser(response.data.user);
        this.setAuth(true);
      } catch (e) {
        this.setError(e.response.data.message);
      } finally {
        this.sendFlag = false;
      }
    }
  }
  async registration(e, email, pass) {
    e.preventDefault();
    if (this.sendFlag) return;
    this.validate(email, pass);
    if (!this.error) {
      try {
        this.sendFlag = true;
        this.setError("Обработка данных...");
        const response = await AuthService.registration(email, pass);
        localStorage.setItem("token", response.data.accessToken);
        this.setUser(response.data.user);
        this.setAuth(true);
      } catch (e) {
        this.setError(e.response.data.message);
      } finally {
        this.sendFlag = false;
      }
    }
  }
  async checkAuth() {
    this.setLoading(true);
    try {
      const response = await $api.get(`${API_URL}/user/refresh`, {
        withCredentials: true,
      });
      this.setLoading(false);
      localStorage.setItem("token", response.data.accessToken);
      this.setAuth(true);
      this.setUser(response.data.user);
    } catch (e) {
      console.log(e.response?.data?.message);
    } finally {
      this.setLoading(false);
    }
  }
  async logout() {
    try {
      const response = await AuthService.logout();
      localStorage.removeItem("token");
      this.setAuth(false);
      this.setUser({});
    } catch (e) {
      console.log(e.response?.data?.message);
    }
  }
}
