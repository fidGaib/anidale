import userControllerGraph from '../../api/user/user-controller-graph'
import { Login, Registration, UpdateUser, UserQuery } from './types'

export const UserResolvers = {
  Query: {
    async getUsers(parent: any, args: UserQuery) {
      return await userControllerGraph.fetchMany()
    },
    async getUser(parent: any, args: UserQuery) {
      let id = parseInt(args.id)
      return await userControllerGraph.fetchOne(id)
    },
  },
  Mutation: {
    async registration(parent: any, args: Registration) {
      return await userControllerGraph.registration(args.user)
    },
    async login(parent: any, args: Login) {
      return await userControllerGraph.login(args.user)
    },
    async update(parent: any, args: UpdateUser) {
      let { id, user } = args
      return await userControllerGraph.updateUser(id, user)
    },
  },
}
