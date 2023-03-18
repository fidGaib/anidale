import { compare, hash } from 'bcrypt'
import { createGraphQLError } from 'graphql-yoga'
import { v4 } from 'uuid'

import Feed from '@/db/models/feed-model'
import Token from '@/db/models/token-model'
import User from '@/db/models/user-model'
import { UpdateUser } from '@/schema/resolvers-types'

import avatar from '../dtos/avatar-random'
import UserDto from '../dtos/user-dto'
import tokenServiceGraph from './token-service-graph'

class UserService {
  async registration(email: string, pass: string) {
    try {
      const candidate = await User.findUnique({ where: { email: email.trim() } })
      if (candidate) throw createGraphQLError('E-mail занят')
      const defaultLogin = Math.round(Math.random() * 99999999)
      const avatar_random = Math.round(Math.random() * avatar.length)
      const hashPass = await hash(pass + process.env.PASS_PEPPER, 10)
      const activationLink = v4()

      const feed = await Feed.create({ data: {} })

      const user = await User.create({
        data: {
          email,
          pass: hashPass,
          activationLink,
          isActivated: false,
          login: `bot#` + defaultLogin,
          avatar: avatar[avatar_random],
          feedId: feed.id,
        },
        include: { feed: { include: { posts: true } }, friends: true },
      })

      Feed.update({ where: { id: feed.id }, data: { userId: user.id } })

      const tokens = await tokenServiceGraph.generateTokens(user)
      await tokenServiceGraph.saveToken(user.id, tokens.refreshToken)
      return {
        ...tokens,
        user,
      }
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
  async login(email: string, pass: string) {
    try {
      const candidate = await User.findUnique({
        where: { email },
        include: { feed: { include: { posts: true } }, friends: true },
      })
      if (!candidate) throw createGraphQLError('Пользователь не найден')
      const isPassEquals = await compare(pass + process.env.PASS_PEPPER, candidate.pass)
      if (!isPassEquals) throw createGraphQLError('Не верный пароль.')
      const tokens = await tokenServiceGraph.generateTokens(candidate)
      await tokenServiceGraph.saveToken(candidate.id, tokens.refreshToken)
      return {
        ...tokens,
        user: candidate,
      }
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
  async getUser(id: number) {
    const user = await User.findUnique({
      where: { id },
      include: { feed: { include: { posts: true } }, friends: true },
    })
    if (!user) throw createGraphQLError('Пользователь не найден')
    return user
  }
  async getUsers() {
    return await User.findMany({ include: { feed: { include: { posts: true } }, friends: true } })
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
        const hashPass = await hash(user.pass + process.env.PASS_PEPPER, 10)
        user.pass = hashPass
      }
      const userData = await User.update({
        where: { id },
        data: user,
        include: { feed: { include: { posts: true } }, friends: true },
      })
      return userData
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
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
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
  async logout(refreshToken: string) {
    const token = await tokenServiceGraph.removeToken(refreshToken)
    return token
  }
  async refresh(refreshToken?: string) {
    try {
      if (!refreshToken) throw createGraphQLError('НЕ АВТОРИЗОВАН')
      const userData = tokenServiceGraph.validateRefreshToken(refreshToken)
      const tokenFromDb = await tokenServiceGraph.findToken(refreshToken)

      if (!userData || !tokenFromDb) throw createGraphQLError('НЕ АВТОРИЗОВАН')
      const user = await User.findUnique({
        where: { id: userData.id },
        include: { feed: { include: { posts: true } }, friends: true },
      })

      if (!user) {
        throw Error('User not found')
      }

      const tokens = await tokenServiceGraph.generateTokens({ ...user })

      await tokenServiceGraph.saveToken(user.id, tokens.refreshToken)

      return {
        ...tokens,
        user,
      }
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
}
export default new UserService()
