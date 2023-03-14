import { Resolvers } from '@schema/resolvers-types'
import { GraphQLScalarType } from 'graphql'

import userControllerGraph from '../../api/user/user-controller-graph'
import { dateScalarConfig } from '../scalars/date'

const dateScalar = new GraphQLScalarType(dateScalarConfig)
export const UserResolvers: Resolvers = {
  Date: dateScalar,
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
