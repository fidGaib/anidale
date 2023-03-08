const { User } = require("../../db/models/user-model")
const { avatar } = require("../dtos/avatar-random")
const UserDto = require("../dtos/user-dto")
const ApiError = require("../error/ApiError")
const tokenService = require("./token-service")
const bcrypt = require('bcrypt')
const uuid = require('uuid')

class userService {
    async registration (email, pass) {
        try {
            if (!email) throw ApiError.badRequest( 'Введите email.' ) 
            if (!pass) throw ApiError.badRequest( 'Введите пароль.' ) 
            const candidate = await User.findOne( { where: { email } } )
            if ( candidate ) throw ApiError.badRequest( 'Такой пользователь уже существует.' ) 
            let defaultLogin = Math.round( Math.random()*99999999 )
            const avatar_random = Math.round(Math.random()*avatar.length)
            const hashPass = await bcrypt.hash(pass, 10)
            const activationLink = uuid.v4()
            const user = await User.create( { email, pass: hashPass, activationLink, login: `bot#`+defaultLogin, avatar: avatar[avatar_random] } )
            const userDto = new UserDto(user)
            const tokens = tokenService.generateTokens({...userDto})
            await tokenService.saveToken(userDto.id, tokens.refreshToken)
            return {
                ...tokens,
                user: userDto
            }
        }
        catch (e) { throw ApiError.badRequest( e.message ) }
    }
    async login (email, pass) {
        try {
            if (!email) throw ApiError.badRequest( 'Введите email.' ) 
            if (!pass) throw ApiError.badRequest( 'Введите пароль.' ) 
            const candidate = await User.findOne( { where: { email } } )
            if ( !candidate ) throw ApiError.badRequest( 'Такого пользователя не существует.' ) 
            const isPassEquals = await bcrypt.compare(pass, candidate.pass)
            if ( !isPassEquals ) throw ( ApiError.badRequest( 'Не верный пароль.' ) )
            const userDto = new UserDto(candidate)
            const tokens = tokenService.generateTokens({...userDto})
            await tokenService.saveToken(userDto.id, tokens.refreshToken)
            return { ...tokens, user: userDto }
        }
        catch (e) { throw ApiError.badRequest( e.message ) }
    }
    async logout(refreshToken) {
        try {
            const token = await tokenService.removeToken(refreshToken)
            return token
        }
        catch (e) {
            throw ApiError.UnathorizedError(  )
        }
    }
    async refresh(refreshToken) {
        try {
            if(!refreshToken) throw ApiError.UnathorizedError()
        
            const userData = tokenService.validateRefreshToken(refreshToken)
            const tokenFromDb = await tokenService.findToken(refreshToken)
            if(!userData || !tokenFromDb) throw ApiError.UnathorizedError() 
            const user = await User.findByPk(userData.id)
            const userDto = new UserDto(user)
            const tokens = tokenService.generateTokens({...userDto}) 
            await tokenService.saveToken(userDto.id, tokens.refreshToken)
    
            return {
                ...tokens,
                user: userDto
            }
        }
        catch (e) { throw ApiError.badRequest(e.message) }
    }
    async fetchOne (id) {
        try {
            const user = await User.findOne( { where: { id } } )
            const userDto = new UserDto(user)
            return {user: userDto}
        }   
        catch (e) { throw ApiError.badRequest( e.message ) }
    }
    async fetchAll () {
        try {
            const users = await User.findAll()
            return {users}
        }   
        catch (e) { throw ApiError.badRequest( e.message ) }
    }
}
module.exports = new userService()