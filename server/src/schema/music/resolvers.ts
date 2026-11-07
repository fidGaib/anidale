import MusicController from '@/api/music/controller'
import UserController from '@/api/user/controller'
import { Resolvers } from '@/schema/resolvers-types'

const PostResolvers: Resolvers = {
  Query: {
    async getMusic(_, { id, limit, page }) {
      return await MusicController.getMusic(limit, page, id)
    },
  },
  Mutation: {
    async createMusic(_, { music }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      const { title, image } = music
      const data = await MusicController.create(user.id, title, image)
      return {
        ...data,
      }
    },
    async removeMusic(_, post, { req, res }) {
      await UserController.refresh(res, req.cookies.refreshToken)
      return await MusicController.remove(post.id)
    },
  },
}

export default PostResolvers
