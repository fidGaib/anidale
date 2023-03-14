import { Resolvers } from '@schema/resolvers-types'

import userControllerGraph from '../../api/user/user-controller-graph'

export const UserResolvers: Resolvers = {
  Query: {
    async getUsers() {
      return await userControllerGraph.fetchMany()
    },
    async getUser(parent, args) {
      return await userControllerGraph.fetchOne(args.id)
    },
  },
  Mutation: {
    async registration(parent, args, ctx) {
      const { req, res } = ctx
      return await userControllerGraph.registration(args.user, req, res)
    },
    async login(parent, args, ctx) {
      const { req, res } = ctx
      return await userControllerGraph.login(args.user, req, res)
    },
    async update(parent, args: any) {
      let { id, user } = args
      return await userControllerGraph.updateUser(id, user)
    },
    async remove(parent, args) {
      let { id } = args
      return await userControllerGraph.remove(id)
    },
    async logout(parent, args) {
      let { refreshToken } = args
      return await userControllerGraph.logout(refreshToken)
    },
    async refresh(parent, args, ctx) {
      const { req, res } = ctx
      return await userControllerGraph.refresh(req, res)
    },
  },
}
