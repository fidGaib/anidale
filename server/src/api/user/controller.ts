import { createGraphQLError } from 'graphql-yoga'
import http from 'http'

import { Login, Registration, UpdateUser } from '@/schema/resolvers-types'
import { validateEmail } from '@/utils/validator-email'

import passwordService from './password-service'
import UserService from './service'
import tokenService from './token-service'

type AuthedRequest = http.IncomingMessage & { cookies: Record<string, string> }

class UserController {
  async registration({ email, pass, pass2 }: Registration, req: http.IncomingMessage, res: http.ServerResponse) {
    if (!email.trim() || !pass || !pass2) throw createGraphQLError('У вас пустые поля')
    else if (pass !== pass2) throw createGraphQLError('Пароли не совпадают')
    await validateEmail(email.trim())
      .then((result) => {
        if (!result.valid) throw createGraphQLError(`${result.reason}`)
      })
      .catch((err) => {
        throw createGraphQLError(`${err}`)
      })
    // Пароль не обрезаем: пробелы внутри и по краям — часть пароля
    passwordService.assertStrong(pass, { email: email.trim() })
    const { refreshToken, accessToken, user } = await UserService.registration(email.trim(), pass)
    tokenService.setCookie(res, 'refreshToken', refreshToken, { maxAge: 14 * 24 * 60 * 60 * 1000, httpOnly: true })
    tokenService.setCookie(res, 'accessToken', accessToken, { maxAge: 15 * 60 * 1000, httpOnly: true })
    return {
      accessToken,
      refreshToken,
      ...user,
    }
  }
  async login({ email, pass }: Login, req: http.IncomingMessage, res: http.ServerResponse) {
    if (!email.trim() || !pass) throw createGraphQLError('У вас пустые поля')

    await validateEmail(email.trim())
      .then((result) => {
        if (!result.valid) throw createGraphQLError(`${result.reason}`)
      })
      .catch((err) => {
        throw createGraphQLError(`${err}`)
      })
    const { refreshToken, accessToken, user } = await UserService.login(email.trim(), pass)
    tokenService.setCookie(res, 'refreshToken', refreshToken, { maxAge: 14 * 24 * 60 * 60 * 1000, httpOnly: true })
    tokenService.setCookie(res, 'accessToken', accessToken, { maxAge: 15 * 60 * 1000, httpOnly: true })
    return {
      accessToken,
      refreshToken,
      ...user,
    }
  }
  async find(id?: number) {
    return id ? await UserService.find(id) : await UserService.find()
  }
  async list(limit?: number | null, offset?: number | null, search?: string | null) {
    return await UserService.list(limit, offset, search)
  }
  async updateUser(id: number, user?: UpdateUser) {
    if (user === undefined) return
    if (user?.email?.trim()) {
      await validateEmail(user?.email?.trim())
        .then((result) => {
          if (!result.valid) throw createGraphQLError(`${result.reason}`)
        })
        .catch((err) => {
          throw createGraphQLError(`${err}`)
        })
    }
    return await UserService.updateUser(id, user)
  }
  async remove(id: number) {
    return await UserService.remove(id)
  }
  async logout({ cookies: { refreshToken } }: { cookies: Record<string, string> }, res: http.ServerResponse) {
    const result = await UserService.logout(refreshToken)
    tokenService.setCookie(res, 'refreshToken', '', { maxAge: 0, httpOnly: true })
    tokenService.setCookie(res, 'accessToken', '', { maxAge: 0, httpOnly: true })
    return result
  }
  async refresh(res: http.ServerResponse, refreshToken: string) {
    const data = await UserService.refresh(refreshToken)
    return { ...data }
  }
  async resendVerificationEmail(req: AuthedRequest, res: http.ServerResponse) {
    const user = await this.refresh(res, req.cookies.refreshToken)
    return await UserService.resendVerificationEmail(user.id)
  }
  async verifyEmail(token: string) {
    return await UserService.verifyEmail(token)
  }
  async requestPasswordReset(email: string) {
    if (!email.trim()) throw createGraphQLError('Укажите адрес почты')
    await validateEmail(email.trim())
      .then((result) => {
        if (!result.valid) throw createGraphQLError(`${result.reason}`)
      })
      .catch((err) => {
        throw createGraphQLError(`${err}`)
      })
    return await UserService.requestPasswordReset(email)
  }
  async resetPassword(token: string, pass: string, pass2: string) {
    return await UserService.resetPassword(token, pass, pass2)
  }
  async changePassword(
    req: AuthedRequest,
    res: http.ServerResponse,
    oldPass: string,
    pass: string,
    pass2: string,
  ) {
    const user = await this.refresh(res, req.cookies.refreshToken)
    const { refreshToken, accessToken } = await UserService.changePassword(user.id, oldPass, pass, pass2)
    tokenService.setCookie(res, 'refreshToken', refreshToken, { maxAge: 14 * 24 * 60 * 60 * 1000, httpOnly: true })
    tokenService.setCookie(res, 'accessToken', accessToken, { maxAge: 15 * 60 * 1000, httpOnly: true })
    return true
  }
}

export default new UserController()
