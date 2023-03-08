import $api from "../../shared/http/index";

export default class AuthService {
  static async login(email, pass) {
    return $api.post("/user/login", { email, pass });
  }
  static async registration(email, pass) {
    return $api.post("/user/registration", { email, pass });
  }
  static async logout() {
    return $api.post("/user/logout");
  }
}
