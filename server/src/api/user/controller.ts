import { createGraphQLError } from 'graphql-yoga'
import http from 'http'

import { Login, Registration, UpdateUser } from '@/schema/resolvers-types'
import { validateEmail } from '@/utils/validator-email'

import UserService from './service'
import tokenService from './token-service'

class UserController {
  async registration({ email, pass, pass2 }: Registration, req: any, res: http.ServerResponse) {
    if (!email.trim() || !pass.trim() || !pass2.trim()) throw createGraphQLError('У вас пустые поля')
    else if (pass.trim() !== pass2.trim()) throw createGraphQLError('Пароли не совпадают')
    await validateEmail(email.trim())
      .then((result) => {
        if (!result.valid) throw createGraphQLError(`${result.reason}`)
      })
      .catch((err) => {
        throw createGraphQLError(`${err}`)
      })
    const { refreshToken, accessToken, user } = await UserService.registration(email.trim(), pass2.trim())
    tokenService.setCookie(res, 'refreshToken', refreshToken, { maxAge: 14 * 24 * 60 * 60 * 1000, httpOnly: true })
    tokenService.setCookie(res, 'accessToken', accessToken, { maxAge: 15 * 60 * 1000, httpOnly: true })
    return {
      accessToken,
      refreshToken,
      ...user,
    }
  }
  async login({ email, pass }: Login, req: any, res: http.ServerResponse) {
    if (!email.trim() || !pass.trim()) throw createGraphQLError('У вас пустые поля')

    await validateEmail(email.trim())
      .then((result) => {
        if (!result.valid) throw createGraphQLError(`${result.reason}`)
      })
      .catch((err) => {
        throw createGraphQLError(`${err}`)
      })
    const { refreshToken, accessToken, user } = await UserService.login(email.trim(), pass.trim())
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
  async logout({ cookies: { refreshToken } }: any, res: http.ServerResponse) {
    const result = await UserService.logout(refreshToken)
    tokenService.setCookie(res, 'refreshToken', '', { maxAge: 0, httpOnly: true })
    tokenService.setCookie(res, 'accessToken', '', { maxAge: 0, httpOnly: true })
    return result
  }
  async refresh(res: http.ServerResponse, refreshToken: string) {
    const data = await UserService.refresh(refreshToken)
    return { ...data }
  }
}

export default new UserController()
