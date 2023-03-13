import { Resolvers } from '@schema/resolvers-types'

import tokenControllerGraph from '../../api/user/token-controller-graph'

export const TokenResolver: Resolvers = {
  Query: {
    async getToken(parent: any, args: any, contextValue: any, info: any) {
      return await tokenControllerGraph.find(args.refreshToken)
    },
  },
  // Mutation: {}
}
