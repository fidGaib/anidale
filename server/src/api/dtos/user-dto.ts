import type { User } from '@prisma/client'

export default class UserDto {
  id: number
  avatar: string
  email: string
  login: string
  constructor(model: User) {
    this.id = model.id
    this.avatar = model.avatar
    this.login = model.login
    this.email = model.email
  }
}
