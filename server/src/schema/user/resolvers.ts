import UserController from '@/api/user/controller'
import { Resolvers } from '@/schema/resolvers-types'

const UserResolvers: Resolvers = {
  Query: {
    async getUsers() {
      return await UserController.fetchMany()
    },
    async getUser(_, { id }) {
      return await UserController.fetchOne(id)
    },
    async logout(_, __, { req, res }) {
      return await UserController.logout(req, res)
    },
    async refresh(_, __, { req, res }) {
      return await UserController.refresh(res, req.cookies.refreshToken, req.cookies.accessToken)
    },
  },
  Mutation: {
    async registration(_, args, { req, res }) {
      return await UserController.registration(args.user, req, res)
    },
    async login(_, args, { req, res }) {
      return await UserController.login(args.user, req, res)
    },
    async update(_, { user }, { req, res }) {
      const tokienData = await UserController.refresh(res, req.cookies.refreshToken, req.cookies.accessToken)
      return await UserController.updateUser(tokienData.id, user)
    },
    async remove(_, __, { req, res }) {
      const tokienData = await UserController.refresh(res, req.cookies.refreshToken, req.cookies.accessToken)
      return await UserController.remove(tokienData.id)
    },
  },
}

export default UserResolvers
