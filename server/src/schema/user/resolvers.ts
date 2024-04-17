import UserController from '@/api/user/controller'
import { Resolvers } from '@/schema/resolvers-types'

const UserResolvers: Resolvers = {
  Query: {
    async getUsers() {
      return await UserController.fetchMany()
    },
    async getUser(_, args) {
      return await UserController.fetchOne(args.id)
    },
    async logout(_, __, ctx) {
      const { req, res } = ctx
      return await UserController.logout(req, res)
    },
    async refresh (_, __, ctx) {
      const {req, res} = ctx
      return await UserController.refresh(res, req.cookies.refreshToken, req.cookies.accessToken)
    },
  },
  Mutation: {
    async registration(_, args, ctx) {
      const { req, res } = ctx
      return await UserController.registration(args.user, req, res)
    },
    async login(_, args, ctx) {
      const { req, res } = ctx
      return await UserController.login(args.user, req, res)
    },
    async update(_, args) {
      const { id, user } = args
      return await UserController.updateUser(id, user)
    },
    async remove(_, args) {
      const { id } = args
      return await UserController.remove(id)
    },
  },
}

export default UserResolvers
