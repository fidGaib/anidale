import ArticleController from '@/api/article/controller'
import UserController from '@/api/user/controller'
import { getOptionalUserId } from '@/api/user/optional-user'
import { Resolvers } from '@/schema/resolvers-types'

const ArticleResolvers: Resolvers = {
  Query: {
    async getArticle(_, { id }, { req }) {
      return (await ArticleController.find(id, await getOptionalUserId(req))) as never
    },
  },
  Mutation: {
    async createArticle(_, { article }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return (await ArticleController.create(user.id, article)) as never
    },
    async editArticle(_, { article }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      const { id, ...input } = article
      return (await ArticleController.edit(user.id, id, input)) as never
    },
  },
}

export default ArticleResolvers
