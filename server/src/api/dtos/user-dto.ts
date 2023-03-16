import { User } from '@prisma/client'

export default class UserDto {
  id: number
  email: string
  login: string
  isActivated: boolean
  avatar: string
  createdAt: Date
  constructor(model: User) {
    this.email = model.email
    this.id = model.id
    this.isActivated = model.isActivated
    this.login = model.login
    this.avatar = model.avatar
    this.createdAt = model.createdAt
  }
}
