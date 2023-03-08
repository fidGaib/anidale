import $api from "../shared/http";

export default class UserService {
  static fetchUsers() {
    return $api.get("/user/fetch-all");
  }
  static fetchOneUser(id) {
    return $api.post("/user/fetch-one-user", { id });
  }
}
