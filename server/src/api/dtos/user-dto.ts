import type { User } from '@prisma/client'

export default class UserDto {
  id: number
  email: string
  login: string
  constructor(model: User) {
    this.id = model.id
    this.email = model.email
    this.login = model.login
  }
}
