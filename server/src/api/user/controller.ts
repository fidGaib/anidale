import { Request, Response } from 'express'
import { createGraphQLError } from 'graphql-yoga'

import { Login, Registration, UpdateUser } from '@/schema/resolvers-types'

import UserService from './service'

const emailRegex =
  /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i
class UserController {
  async registration({ email, pass, pass2 }: Registration, req: Request, res: Response) {
    const EmailTrim = email.trim()
    const PassTrim = pass.trim()
    const Pass2Trim = pass2.trim()
    if (!EmailTrim || !PassTrim || !Pass2Trim) {
      throw createGraphQLError('У вас пустые поля')
    } else if (!email.match(emailRegex)) {
      throw createGraphQLError('Некорректный E-mail')
    } else if (pass !== pass2) {
      throw createGraphQLError('Пароли не совпадают')
    }
    const { refreshToken, accessToken, user } = await UserService.registration(EmailTrim, Pass2Trim)

    this.setCookie(res, refreshToken, accessToken)
    return {
      accessToken,
      refreshToken,
      ...user,
    }
  }
  async login({ email, pass }: Login, req: Request, res: Response) {
    const EmailTrim = email.trim()
    const PassTrim = pass.trim()
    if (!EmailTrim || !PassTrim) {
      throw createGraphQLError('У вас пустые поля')
    } else if (!email.match(emailRegex)) {
      throw createGraphQLError('Некорректный E-mail')
    }
    const { refreshToken, accessToken, user } = await UserService.login(EmailTrim, PassTrim)
    this.setCookie(res, refreshToken, accessToken)
    return {
      accessToken,
      refreshToken,
      ...user,
    }
  }
  async fetchOne(id: number) {
    return await UserService.getUser(id)
  }
  async fetchMany() {
    return await UserService.getUsers()
  }
  async updateUser(id: number, user?: UpdateUser) {
    if (!user) throw Error('User not found')
    if (user.email && !user.email.match(emailRegex)) {
      throw createGraphQLError('Некорректный E-mail')
    }

    return await UserService.update(id, user)
  }
  async remove(id: number) {
    return await UserService.remove(id)
  }
  async logout({ cookies: { refreshToken } }: Request, res: Response) {
    
    return await UserService.logout(refreshToken)
  }
  async refresh (res: Response, refreshToken: string, accessToken: string) {
    const data = await UserService.refresh(refreshToken, accessToken)
    return {
      ...data
    }
  }
  async setCookie(res: Response, refreshToken?: string, accessToken?: string) {
      res.cookie('refreshToken', refreshToken, {
        maxAge: 14 * 24 * 60 * 60 * 1000,
        httpOnly: true,
      })
      res.cookie('accessToken', accessToken, {
        maxAge: 15 * 60 * 1000,
        httpOnly: true,
      })
  }
}
export default new UserController()
