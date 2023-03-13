import { compare, hash } from 'bcrypt'
import { v4 } from 'uuid'

import User from '../../db/models/user-model'
import avatar from '../dtos/avatar-random'
import UserDto from '../dtos/user-dto'
import ErrorGraphQL from '../error/GraphQLError'
import ErrorGraphQLMiddleware from '../middleware/ErrorGraphQLMiddleware'
import tokenServiceGraph from './token-service-graph'

interface UpdateUser {
  email: string
  pass: string
  login: string
  avatar: string
  activationLink: string
  isActivated: boolean
}
class UserServiceGraph {
  async registration(email: string, pass: string) {
    try {
      const candidate = await User.findUnique({ where: { email: email.trim() } })
      if (candidate) throw ErrorGraphQL.badRequest('E-mail занят')
      let defaultLogin = Math.round(Math.random() * 99999999)
      const avatar_random = Math.round(Math.random() * avatar.length)
      const hashPass = await hash(pass + process.env.SALT, 5)
      const activationLink = v4()
      const user = await User.create({
        data: {
          email,
          pass: hashPass,
          activationLink,
          isActivated: false,
          login: `bot#` + defaultLogin,
          avatar: avatar[avatar_random],
        },
      })
      const userDto = new UserDto(user)
      const tokens = await tokenServiceGraph.generateTokens({ ...userDto })
      await tokenServiceGraph.saveToken(userDto.id, tokens.refreshToken)
      return {
        ...tokens,
        user: userDto,
      }
    } catch (e) {
      return ErrorGraphQLMiddleware(e)
    }
  }
  async login(email: string, pass: string) {
    try {
      const candidate = await User.findUnique({ where: { email } })
      if (!candidate) throw ErrorGraphQL.badRequest('Пользователь не найден')
      const isPassEquals = await compare(pass + process.env.SALT, candidate.pass)
      if (!isPassEquals) throw ErrorGraphQL.badRequest('Не верный пароль.')
      const userDto = new UserDto(candidate)
      const tokens = await tokenServiceGraph.generateTokens({ ...userDto })
      await tokenServiceGraph.saveToken(userDto.id, tokens.refreshToken)
      return {
        ...tokens,
        user: userDto,
      }
    } catch (e) {
      return ErrorGraphQLMiddleware(e)
    }
  }
  async getUser(id: number) {
    try {
      const user = await User.findUnique({ where: { id } })
      if (!user) throw ErrorGraphQL.badRequest('Пользователь не найден')
      return user
    } catch (e) {
      return ErrorGraphQLMiddleware(e)
    }
  }
  async getUsers() {
    try {
      return await User.findMany()
    } catch (e) {
      return ErrorGraphQLMiddleware(e)
    }
  }
  async update(id: string, user: UpdateUser) {
    try {
      const candidate = await User.findUnique({ where: { id: parseInt(id) } })
      if (!candidate) throw ErrorGraphQL.badRequest('Пользователь не найден')
      if (user.pass) {
        const hashPass = await hash(user.pass + process.env.SALT, 5)
        user.pass = hashPass
      }
      const userData = await User.update({ where: { id: parseInt(id) }, data: user })
      return userData
    } catch (e) {
      return ErrorGraphQLMiddleware(e)
    }
  }
  async remove(id: string) {
    const userData = await User.deleteMany({
      where: {
        id: parseInt(id),
      },
    })
    return userData
  }
  async logout(refreshToken: string) {
    const token = await tokenServiceGraph.removeToken(refreshToken)
    return token
  }
}
export default new UserServiceGraph()
