import { compare, hash } from 'bcrypt'
import { v4 } from 'uuid'

import User from '@/db/models/user-model'

import avatar from '../dtos/avatar-random'
import UserDto from '../dtos/user-dto'
import ApiError from '../error/ApiError'
import tokenService from './token-service'

class userService {
  async registration(email, pass) {
    try {
      if (!email) throw ApiError.badRequest('Введите email.')
      if (!pass) throw ApiError.badRequest('Введите пароль.')
      const candidate = await User.findUnique({ where: { email } })
      if (candidate) throw ApiError.badRequest('Такой пользователь уже существует.')
      let defaultLogin = Math.round(Math.random() * 99999999)
      const avatar_random = Math.round(Math.random() * avatar.length)
      const hashPass = await hash(pass, 10)
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
      const tokens = tokenService.generateTokens({ ...userDto })
      await tokenService.saveToken(userDto.id, tokens.refreshToken)
      return {
        ...tokens,
        user: userDto,
      }
    } catch (e) {
      throw ApiError.badRequest(e instanceof Error ? e.message : '')
    }
  }
  async login(email, pass) {
    try {
      if (!email) throw ApiError.badRequest('Введите email.')
      if (!pass) throw ApiError.badRequest('Введите пароль.')
      const candidate = await User.findUnique({ where: { email } })
      if (!candidate) throw ApiError.badRequest('Такого пользователя не существует.')
      const isPassEquals = await compare(pass, candidate.pass)
      if (!isPassEquals) throw ApiError.badRequest('Не верный пароль.')
      const userDto = new UserDto(candidate)
      const tokens = tokenService.generateTokens({ ...userDto })
      await tokenService.saveToken(userDto.id, tokens.refreshToken)
      return { ...tokens, user: userDto }
    } catch (e) {
      throw ApiError.badRequest(e instanceof Error ? e.message : '')
    }
  }
  async logout(refreshToken) {
    try {
      const token = await tokenService.removeToken(refreshToken)
      return token
    } catch (e) {
      throw ApiError.UnathorizedError()
    }
  }
  async refresh(refreshToken) {
    try {
      if (!refreshToken) throw ApiError.UnathorizedError()

      const userData = tokenService.validateRefreshToken(refreshToken)
      const tokenFromDb = await tokenService.findToken(refreshToken)
      if (!userData || !tokenFromDb) throw ApiError.UnathorizedError()
      const user = await User.findUnique({ where: { id: userData.id } })
      const userDto = new UserDto(user)
      const tokens = tokenService.generateTokens({ ...userDto })
      await tokenService.saveToken(userDto.id, tokens.refreshToken)

      return {
        ...tokens,
        user: userDto,
      }
    } catch (e) {
      throw ApiError.badRequest(e instanceof Error ? e.message : '')
    }
  }
  async fetchOne(id) {
    try {
      const user = await User.findUnique({ where: { id } })
      const userDto = new UserDto(user)
      return { user: userDto }
    } catch (e) {
      throw ApiError.badRequest(e instanceof Error ? e.message : '')
    }
  }
  async fetchAll() {
    try {
      const users = await User.findMany()
      return { users }
    } catch (e) {
      throw ApiError.badRequest(e instanceof Error ? e.message : '')
    }
  }
}
export default new userService()
