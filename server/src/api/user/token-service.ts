import { randomUUID } from 'node:crypto'
import http from 'http'
import jwt from 'jsonwebtoken'

import Token from '@/db/models/token-model'

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
    if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw Error('No jwt secrets found')
    }
    this.accessSecret = process.env.JWT_ACCESS_SECRET
    this.refreshSecret = process.env.JWT_REFRESH_SECRET
  }

  async generateTokens({ avatar, id, login }: { avatar: string; id: number; login: string }) {
    // jti делает каждый токен уникальным: два входа в одну секунду не должны совпасть
    const accessToken = jwt.sign({ avatar, id, login }, this.accessSecret, { expiresIn: '15m', jwtid: randomUUID() })
    const refreshToken = jwt.sign({ avatar, id, login }, this.refreshSecret, { expiresIn: '14d', jwtid: randomUUID() })
    return {
      accessToken,
      refreshToken,
    }
  }
  async findToken(refreshToken: string) {
    return await Token.findFirst({
      where: { refreshToken },
      include: {
        user: {
          select: {
            id: true,
            avatar: true,
            email: true,
            login: true,
            isActivated: true,
            role: true,
          },
        },
      },
    })
  }
  /**
   * Каждый вход — отдельная сессия. Раньше запись обновлялась, и человек мог быть
   * авторизован только в одном браузере. Теперь устройства не выбивают друг друга.
   */
  async saveToken(userId: number, refreshToken: string) {
    // Изредка чистим сессии старше срока жизни refresh-токена (14 дней)
    if (Math.random() < 0.02) {
      void Token.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } } }).catch(
        () => undefined,
      )
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
  /** Завершает все сессии пользователя (смена или сброс пароля). */
  async removeAllForUser(userId: number) {
    await Token.deleteMany({ where: { userId } })
  }
  validateAccessToken(token: string) {
    try {
      const userData = jwt.verify(token, this.accessSecret) as jwt.UserIDJwtPayload
      return userData
    } catch (e) {
      return null
    }
  }
  validateRefreshToken(token: string) {
    try {
      const userData = jwt.verify(token, this.refreshSecret) as jwt.UserIDJwtPayload
      return userData
    } catch (e) {
      return null
    }
  }
  setCookie(
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
  ) {
    // По умолчанию Lax: куку не отправят при межсайтовых запросах, которые меняют данные (защита от CSRF).
    // Secure включается в продакшене, где сайт работает по HTTPS.
    const { maxAge, path = '/', httpOnly, secure = process.env.NODE_ENV === 'production', sameSite = 'Lax' } = options
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
