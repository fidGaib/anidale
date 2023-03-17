import { User } from '@prisma/client'

export default class UserDto {
  id: number
  constructor(model: User) {
    this.id = model.id
  }
}
