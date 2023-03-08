const jwt = require('jsonwebtoken')
const { Token } = require('../../db/models/token-model')

class tokenService {
    generateTokens(payload) {
        const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {expiresIn: '10m'})
        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {expiresIn: '14d'})
        return {
            accessToken,
            refreshToken
        }
    }
    async saveToken(userId, refreshToken) {
        const tokenData = await Token.findOne({  where: {user: userId} })
        if(tokenData) {
            tokenData.refreshToken = refreshToken
            return tokenData.save()
        }
        const token = await Token.create({ user: userId, refreshToken })
        return token
    }
    async removeToken(refreshToken) {
        const tokenData = await Token.destroy({
            where: {
                refreshToken
            }
        })
        return tokenData
    }
    async findToken(refreshToken) {
        const tokenData = await Token.findOne( { where: { refreshToken } })
        return tokenData
    }
    validateAccessToken(token) {
        try {
            const userData = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
            return userData
        }
        catch (e) {
            return null
        }
    }
    validateRefreshToken(token) {
        try {
            const userData = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
            return userData
        }
        catch (e) {
            return null
        }
    }
}

module.exports = new tokenService()