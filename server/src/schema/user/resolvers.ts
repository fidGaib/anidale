import UserController from '@/api/user/controller'
import { Resolvers, TypeUpdateUser, User } from '@/schema/resolvers-types'
import { clientIp, resetLimit, throttle } from '@/utils/rate-limit'

const UserResolvers: Resolvers = {
  Query: {
    async getUsers(_, { limit, offset, search }) {
      return (await UserController.list(limit, offset, search)) as unknown as User[]
    },
    async getUser(_, { id }) {
      return (await UserController.find(id)) as unknown as User
    },
    async logout(_, __, { req, res }) {
      return await UserController.logout(req, res)
    },
    async refresh(_, __, { req, res }) {
      return await UserController.refresh(res, req.cookies.refreshToken)
    },
  },
  Mutation: {
    async registration(_, args, { req, res }) {
      await throttle('registration', clientIp(req))
      return await UserController.registration(args.user, req, res)
    },
    async login(_, args, { req, res }) {
      const ip = clientIp(req)
      const email = String(args.user.email ?? '')
        .trim()
        .toLowerCase()
      // Подбор пароля: ограничиваем и попытки под одной почтой, и общий поток с одного адреса
      await throttle('login', `${ip}:${email}`)
      await throttle('loginIp', ip)
      const result = await UserController.login(args.user, req, res)
      // Успешный вход: счётчик этой почты начинается заново
      await resetLimit('login', `${ip}:${email}`)
      return result
    },
    async updateUser(_, { user }, { req, res }) {
      const tokienData = await UserController.refresh(res, req.cookies.refreshToken)
      return (await UserController.updateUser(tokienData.id, user)) as unknown as TypeUpdateUser
    },
    async remove(_, __, { req, res }) {
      const tokienData = await UserController.refresh(res, req.cookies.refreshToken)
      return await UserController.remove(tokienData.id)
    },
    async verifyEmail(_, { token }) {
      return await UserController.verifyEmail(token)
    },
    async resendVerificationEmail(_, __, { req, res }) {
      await throttle('emailSend', clientIp(req))
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      await throttle('emailResend', user.id)
      return await UserController.resendVerificationEmail(req, res)
    },
    async requestPasswordReset(_, { email }, { req }) {
      const normalized = String(email ?? '')
        .trim()
        .toLowerCase()
      await throttle('emailSend', clientIp(req))
      await throttle('passwordReset', normalized)
      return await UserController.requestPasswordReset(email)
    },
    async resetPassword(_, { token, pass, pass2 }, { req }) {
      await throttle('passwordReset', clientIp(req))
      return await UserController.resetPassword(token, pass, pass2)
    },
    async changePassword(_, { oldPass, pass, pass2 }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      await throttle('passwordChange', user.id)
      return await UserController.changePassword(req, res, oldPass, pass, pass2)
    },
  },
}

export default UserResolvers
