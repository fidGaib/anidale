import { makeAutoObservable } from 'mobx'

class EditProfile {
  avatar = []
  email = ''
  login = ''
  constructor() {
    makeAutoObservable(this)
  }
  setAvatar(obj) {
    this.avatar = []
    this.avatar.push(obj)
  }
  addAvatar(objFile) {
    let file = Array.from(objFile)
    file = file[0]
    this.setAvatar(file)
  }
  setEmail(val) {
    this.email = val
  }
  setLogin(val) {
    this.login = val
  }
  async validate() {
    if (!this.email || !this.login) return 0
    else return 1
  }
  async sendInfo() {
    const validate = await editProfile.validate()
    if (validate) {
    } else return
  }
}
export const editProfile = new EditProfile()
