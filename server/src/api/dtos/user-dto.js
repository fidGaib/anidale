export default class userDto {
  email
  login
  isActivated
  avatar
  createdAt
  constructor(model) {
    this.email = model.email
    this.id = model.id
    this.isActivated = model.isActivated
    this.login = model.login
    this.avatar = model.avatar
    this.createdAt = model.createdAt
  }
}
