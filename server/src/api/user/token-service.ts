
import jwt from 'jsonwebtoken'

import Token from '@/db/models/token-model'
import http from 'http'

declare module 'jsonwebtoken' {
    export interface UserIDJwtPayload extends jwt.JwtPayload {
        id: number
        accsessToken: string
        refreshToken: string
    }
}

class TokenService {
  private accessSecret: string
  private refreshSecret: string

  constructor() {
    if (!process.env.JWT_ACCESS_SECRET  || !process.env.JWT_REFRESH_SECRET) {
      throw Error('No jwt secrets found')
    }
    this.accessSecret = process.env.JWT_ACCESS_SECRET
    this.refreshSecret = process.env.JWT_REFRESH_SECRET
  }

  async generateTokens({avatar, id,login}: any) {
    const accessToken = jwt.sign({avatar, id,login}, this.accessSecret, { expiresIn: '15m' })
    const refreshToken = jwt.sign({avatar, id,login}, this.refreshSecret, { expiresIn: '14d' })
    return {
      accessToken,
      refreshToken,
    }
  }
  async findToken(refreshToken: string) {
      const tokenData = await Token.findMany({ where: { refreshToken }, include: { user: {select:{
          id: true,
          avatar: true,
          email: true,
          login: true
      }} } })
      return tokenData[0]
  }
  async saveToken(userId: number, refreshToken: string) {
    const tokenData = await Token.findMany({ where: { userId } })
    if (tokenData.length > 0) {
      return Token.update({
        where: { id: tokenData[0].id },
        data: {
          refreshToken,
        },
      })
    }
    return await Token.create({ data: { userId, refreshToken } })
  }
  async removeToken(refreshToken: string) {
    await Token.deleteMany({
      where: {
        refreshToken,
      },
    })
    return true
  }
  validateAccessToken(token: string) {
    try {

      const userData = <jwt.UserIDJwtPayload>jwt.verify(token, this.accessSecret)
      return userData
    } catch (e) {
      return null 
    }
  }
  validateRefreshToken(token: string) {
    try {
      const userData = <jwt.UserIDJwtPayload>jwt.verify(token, this.refreshSecret)
      return userData
    } catch (e) {
      return null
    }
  }
  setCookie (
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
)  {
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
}
export default new TokenService()
