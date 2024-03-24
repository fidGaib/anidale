import UserController from '@/api/user/controller'
import { Resolvers } from '@/schema/resolvers-types'

const UserResolvers: Resolvers = {
  Query: {
    async getUsers() {
      return await UserController.fetchMany()
    },
    async getUser(parent, args) {
      return await UserController.fetchOne(args.id)
    },
    async refresh(parent, args, ctx) {
      const { req, res } = ctx
      return await UserController.refresh(req, res)
    },
    async logout(parent, args, ctx) {
      const { req, res } = ctx
      console.log("sss")
      return await UserController.logout(req, res)
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
  },
}

export default UserResolvers
