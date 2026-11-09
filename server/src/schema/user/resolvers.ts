import UserController from '@/api/user/controller'
import { Resolvers, TypeUpdateUser, User } from '@/schema/resolvers-types'

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
      return await UserController.registration(args.user, req, res)
    },
    async login(_, args, { req, res }) {
      return await UserController.login(args.user, req, res)
    },
    async updateUser(_, { user }, { req, res }) {
      const tokienData = await UserController.refresh(res, req.cookies.refreshToken)
      return (await UserController.updateUser(tokienData.id, user)) as unknown as TypeUpdateUser
    },
    async remove(_, __, { req, res }) {
      const tokienData = await UserController.refresh(res, req.cookies.refreshToken)
      return await UserController.remove(tokienData.id)
    },
  },
}

export default UserResolvers
