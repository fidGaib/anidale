import { sign, verify } from 'jsonwebtoken'

import Token from '../../db/models/token-model'
import ErrorGraphQLMiddleware from '../middleware/ErrorGraphQLMiddleware'

class TokenServiceGraph {
  async generateTokens(payload: any) {
    if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) return
    const accessToken = sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.JWT_ACCESS_LIFE })
    const refreshToken = sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_LIFE })
    return {
      accessToken,
      refreshToken,
    }
  }
  async findToken(refreshToken: string) {
    try {
      const tokenData = await Token.findMany({ where: { refreshToken }, include: { user: true } })
      return tokenData[0]
    } catch (e) {
      return ErrorGraphQLMiddleware(e)
    }
  }
  async saveToken(userId: number, refreshToken: any) {
    try {
      const tokenData = await Token.findMany({ where: { userId } })
      if (tokenData.length > 0) {
        return Token.update({
          where: { id: tokenData[0].id },
          data: {
            refreshToken,
          },
        })
      }
      const token = await Token.create({ data: { userId, refreshToken } })
      return token
    } catch (e) {
      return ErrorGraphQLMiddleware(e)
    }
  }
  async removeToken(refreshToken: string) {
    try {
      const tokenData = await Token.deleteMany({
        where: {
          refreshToken,
        },
      })
      return tokenData
    } catch (e) {
      return ErrorGraphQLMiddleware(e)
    }
  }
  validateAccessToken(token: string) {
    try {
      if (!process.env.JWT_ACCESS_SECRET) return
      const userData = verify(token, process.env.JWT_ACCESS_SECRET)
      return userData
    } catch (e) {
      return null
    }
  }
  validateRefreshToken(token: string) {
    try {
      if (!process.env.JWT_REFRESH_SECRET) return
      const userData = verify(token, process.env.JWT_REFRESH_SECRET)
      return userData
    } catch (e) {
      return null
    }
  }
}
export default new TokenServiceGraph()
