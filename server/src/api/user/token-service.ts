import UserDto from '@/api/dtos/user-dto'
import jwt from 'jsonwebtoken'

import Token from '@/db/models/token-model'

declare module 'jsonwebtoken' {
    export interface UserIDJwtPayload extends jwt.JwtPayload {
        id: number
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

  async generateTokens(payload: UserDto) {
    const accessToken = jwt.sign(payload, this.accessSecret, { expiresIn: '15m' })
    const refreshToken = jwt.sign(payload, this.refreshSecret, { expiresIn: '14d' })
    return {
      accessToken,
      refreshToken,
    }
  }
  async findToken(refreshToken: string) {
      const tokenData = await Token.findMany({ where: { refreshToken }, include: { user: true } })
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
      const userData = jwt.verify(token, this.accessSecret)
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
}
export default new TokenService()
