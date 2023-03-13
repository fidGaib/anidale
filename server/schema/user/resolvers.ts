import userControllerGraph from '../../api/user/user-controller-graph'
import { Login, Registration, UpdateUser, UserQuery } from './types'

interface Ctx {
  req: Request
  res: Response
}
export const UserResolvers = {
  Query: {
    async getUsers(parent: any, args: UserQuery, ctx: Ctx, info: any) {
      return await userControllerGraph.fetchMany()
    },
    async getUser(parent: any, args: UserQuery, ctx: Ctx, info: any) {
      let id = parseInt(args.id)
      return await userControllerGraph.fetchOne(id)
    },
  },
  Mutation: {
    async registration(parent: any, args: Registration, ctx: Ctx, info: any) {
      return await userControllerGraph.registration(args.user, ctx.req, ctx.res)
    },
    async login(parent: any, args: Login, ctx: Ctx, info: any) {
      return await userControllerGraph.login(args.user)
    },
    async update(parent: any, args: UpdateUser, ctx: Ctx, info: any) {
      let { id, user } = args
      return await userControllerGraph.updateUser(id, user)
    },
  },
}
