export interface UserQuery {
  id: string
  email: string
  pass: string
  login: string
  avatar: string
  activationLink: string
  isActivated: boolean
  createdAt: Date
  //   notices   :  Notice[]
  //   tokens   :   Token[]
}
export interface UpdateUser {
  id: string
  user: {
    email: string
    pass: string
    login: string
    avatar: string
    activationLink: string
    isActivated: boolean
  }
}
export interface Registration {
  user: {
    email: string
    pass: string
    pass2: string
  }
}
export interface Login {
  user: {
    email: string
    pass: string
  }
}
