import { Resolvers } from '../../../schema/resolvers-types'
import UserController from '../../api/user/controller'

const UserResolvers: Resolvers = {
  Query: {
    async getUsers() {
      return await UserController.fetchMany()
    },
    async getUser(parent, args) {
      return await UserController.fetchOne(args.id)
    },
    async refresh(parent: any, args: any, ctx: any) {
      const { req, res } = ctx
      return await UserController.refresh(req, res)
    },
  },
  Mutation: {
    async registration(parent, args, ctx) {
      const { req, res } = ctx
      return await UserController.registration(args.user, req, res)
    },
    async login(parent, args, ctx) {
      const { req, res } = ctx
      return await UserController.login(args.user, req, res)
    },
    async update(parent, args) {
      const { id, user } = args
      return await UserController.updateUser(id, user)
    },
    async remove(parent, args) {
      const { id } = args
      return await UserController.remove(id)
    },
    async logout(parent, args) {
      const { refreshToken } = args
      return await UserController.logout(refreshToken)
    },
  },
}

export default UserResolvers
