import tokenControllerGraph from '../../api/user/token-controller-graph'

export const TokenResolver = {
  Query: {
    async getToken(parent: any, args: any, contextValue: any, info: any) {
      return await tokenControllerGraph.find(args.refreshToken)
    },
  },
  // Mutation: {}
}
