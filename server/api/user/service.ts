import { compare, hash } from 'bcrypt'
import { createGraphQLError } from 'graphql-yoga'
import { v4 } from 'uuid'

import Token from '../../db/models/token-model'
import User from '../../db/models/user-model'
import avatar from '../dtos/avatar-random'
import UserDto from '../dtos/user-dto'
import tokenServiceGraph from './token-service-graph'

interface UpdateUser {
  email?: string
  pass?: string
  login?: string
  avatar?: string
  activationLink?: string
  isActivated?: boolean
}
class UserService {
  async registration(email: string, pass: string) {
    try {
      const candidate = await User.findUnique({ where: { email: email.trim() } })
      if (candidate) throw createGraphQLError('E-mail занят')
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
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
  async login(email: string, pass: string) {
    try {
      const candidate = await User.findUnique({ where: { email } })
      if (!candidate) throw createGraphQLError('Пользователь не найден')
      const isPassEquals = await compare(pass + process.env.SALT, candidate.pass)
      if (!isPassEquals) throw createGraphQLError('Не верный пароль.')
      const userDto = new UserDto(candidate)
      const tokens = await tokenServiceGraph.generateTokens({ ...userDto })
      await tokenServiceGraph.saveToken(userDto.id, tokens.refreshToken)
      return {
        ...tokens,
        user: userDto,
      }
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
  async getUser(id: number) {
    const user = await User.findUnique({ where: { id } })
    if (!user) throw createGraphQLError('Пользователь не найден')
    return user
  }
  async getUsers() {
    return await User.findMany()
  }
  async update(id: number, user: UpdateUser) {
    try {
      const candidate = await User.findUnique({ where: { id } })
      if (!candidate) throw createGraphQLError('Пользователь не найден')
      if (candidate.email !== user.email?.trim() && user.email?.trim()) {
        const email = await User.findUnique({ where: { email: user.email?.trim() } })
        if (email) throw createGraphQLError('E-mail занят')
      }
      if (user.pass) {
        const hashPass = await hash(user.pass + process.env.SALT, 5)
        user.pass = hashPass
      }
      const userData = await User.update({ where: { id }, data: user })
      return userData
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
  async remove(id: number) {
    try {
      const user = await User.findUnique({
        where: {
          id,
        },
      })
      if (!user) throw createGraphQLError('Пользователь не найден')
      await Token.deleteMany({
        where: {
          userId: id,
        },
      })
      await User.delete({
        where: {
          id,
        },
      })
      return true
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
  async logout(refreshToken: string) {
    const token = await tokenServiceGraph.removeToken(refreshToken)
    return token
  }
  async refresh(refreshToken: any) {
    try {
      if (!refreshToken) throw createGraphQLError('НЕ АВТОРИЗОВАН')
      const userData = tokenServiceGraph.validateRefreshToken(refreshToken)
      const tokenFromDb = await tokenServiceGraph.findToken(refreshToken)

      if (!userData || !tokenFromDb) throw createGraphQLError('НЕ АВТОРИЗОВАН')
      const user = await User.findUnique({ where: { id: userData.id } })
      const userDto = new UserDto(user)
      const tokens = await tokenServiceGraph.generateTokens({ ...userDto })

      await tokenServiceGraph.saveToken(userDto.id, tokens.refreshToken)

      return {
        ...tokens,
        user: userDto,
      }
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
}
export default new UserService()
