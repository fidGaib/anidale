import ReactionController from '@/api/reaction/controller'
import UserController from '@/api/user/controller'
import { Resolvers } from '@/schema/resolvers-types'

const ReactionResolvers: Resolvers = {
  Query: {
    async getComments(_, { postId, limit, page }) {
      return await ReactionController.getComments(postId, limit, page)
    },
  },
  Mutation: {
    async setLike(_, { id, liked }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await ReactionController.setLike(id, user.id, liked)
    },
    async addComment(_, { postId, text }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await ReactionController.addComment(postId, user.id, text)
    },
    async removeComment(_, { id }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await ReactionController.removeComment(id, user.id)
    },
  },
}

export default ReactionResolvers
