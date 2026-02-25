import UserController from '@/api/user/controller'
import { Resolvers } from '@/schema/resolvers-types'

const UserResolvers: Resolvers = {
  Query: {
    //@ts-ignore
    async getUsers() {
      return await UserController.find()
    },
    //@ts-ignore
    async getUser(_, { id }) {
      return await UserController.find(id)
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
      return await UserController.registration(args.user, req, res)
    },
    async login(_, args, { req, res }) {
      return await UserController.login(args.user, req, res)
    },
    //@ts-ignore
    async updateUser(_, { user }, { req, res }) {
      const tokienData = await UserController.refresh(res, req.cookies.refreshToken)
      return await UserController.updateUser(tokienData.id, user)
    },
    async remove(_, __, { req, res }) {
      const tokienData = await UserController.refresh(res, req.cookies.refreshToken)
      return await UserController.remove(tokienData.id)
    },
  },
}

export default UserResolvers
