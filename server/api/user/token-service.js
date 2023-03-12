import jwt from 'jsonwebtoken'

import Token from '../../db/models/token-model'

class tokenService {
  generateTokens(payload) {
    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: '10m' })
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '14d' })
    return {
      accessToken,
      refreshToken,
    }
  }
  async saveToken(userId, refreshToken) {
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
  }
  async removeToken(refreshToken) {
    const tokenData = await Token.deleteMany({
      where: {
        refreshToken,
      },
    })
    return tokenData
  }
  async findToken(refreshToken) {
    const tokenData = await Token.findMany({ where: { refreshToken } })
    return tokenData[0]
  }
  validateAccessToken(token) {
    try {
      const userData = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
      return userData
    } catch (e) {
      return null
    }
  }
  validateRefreshToken(token) {
    try {
      const userData = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
      return userData
    } catch (e) {
      return null
    }
  }
}

export default new tokenService()
