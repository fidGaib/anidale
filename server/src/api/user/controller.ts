import { createGraphQLError } from 'graphql-yoga'
import http from 'http'

import { Login, Registration, UpdateUser } from '@/schema/resolvers-types'
import { validateEmail } from '@/utils/validator-email'

import UserService from './service'

class UserController {
  async registration({ email, pass, pass2 }: Registration, req: any, res: http.ServerResponse) {
    if (!email.trim() || !pass.trim() || !pass2.trim()) {
      throw createGraphQLError('У вас пустые поля')
    } else if (pass.trim() !== pass2.trim()) {
      throw createGraphQLError('Пароли не совпадают')
    }
    await validateEmail(email.trim())
      .then((result) => {
        if (!result.valid) throw createGraphQLError(`${result.reason}`)
      })
      .catch((err) => {
        throw createGraphQLError(`${err}`)
      })
    const { refreshToken, accessToken, user } = await UserService.registration(email.trim(), pass2.trim())
    setCookie(res, 'refreshToken', refreshToken, { maxAge: 14 * 24 * 60 * 60 * 1000, httpOnly: true })
    setCookie(res, 'accessToken', accessToken, { maxAge: 15 * 60 * 1000, httpOnly: true })
    return {
      accessToken,
      refreshToken,
      ...user,
    }
  }
  async login({ email, pass }: Login, req: any, res: http.ServerResponse) {
    if (!email.trim() || !pass.trim()) {
      throw createGraphQLError('У вас пустые поля')
    }
    await validateEmail(email.trim())
      .then((result) => {
        if (!result.valid) throw createGraphQLError(`${result.reason}`)
      })
      .catch((err) => {
        throw createGraphQLError(`${err}`)
      })
    const { refreshToken, accessToken, user } = await UserService.login(email.trim(), pass.trim())
    setCookie(res, 'refreshToken', refreshToken, { maxAge: 14 * 24 * 60 * 60 * 1000, httpOnly: true })
    setCookie(res, 'accessToken', accessToken, { maxAge: 15 * 60 * 1000, httpOnly: true })
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
    setCookie(res, 'refreshToken', '', { maxAge: 0, httpOnly: true })
    setCookie(res, 'accessToken', '', { maxAge: 0, httpOnly: true })
    return result
  }
  async refresh(res: http.ServerResponse, refreshToken: string) {
    const data = await UserService.refresh(refreshToken)
    return { ...data }
  }
}
export default new UserController()

export const setCookie = (
  res: http.ServerResponse,
  name: string,
  value: string,
  options: {
    maxAge?: number
    path?: string
    httpOnly?: boolean
    secure?: boolean
    sameSite?: 'Strict' | 'Lax' | 'None'
  } = {},
) => {
  const { maxAge, path = '/', httpOnly, secure, sameSite } = options
  const parts: string[] = []

  // Имя и значение
  parts.push(`${name}=${encodeURIComponent(value)}`)

  // Время жизни (в секундах)
  if (maxAge !== undefined) {
    const maxAgeSeconds = Math.floor(maxAge / 1000)
    parts.push(`Max-Age=${maxAgeSeconds}`)
  }

  // Путь
  parts.push(`Path=${path}`)

  // Флаги безопасности
  if (httpOnly) parts.push('HttpOnly')
  if (secure) parts.push('Secure')
  if (sameSite) parts.push(`SameSite=${sameSite}`)

  const cookieString = parts.join('; ')

  // Получаем текущие куки или создаём пустой массив
  const existingCookies = res.getHeader('Set-Cookie') || []
  let newCookies: string[]

  if (!Array.isArray(existingCookies)) {
    newCookies = [existingCookies as string, cookieString]
  } else {
    newCookies = [...existingCookies, cookieString]
  }

  res.setHeader('Set-Cookie', newCookies)
}
