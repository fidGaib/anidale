import MusicController from '@/api/music/controller'
import UserController from '@/api/user/controller'
import { getOptionalUserId } from '@/api/user/optional-user'
import { Resolvers } from '@/schema/resolvers-types'
import { throttle } from '@/utils/rate-limit'

const PostResolvers: Resolvers = {
  Query: {
    async getMusic(_, { id, limit, page }) {
      return await MusicController.getMusic(limit, page, id)
    },
    async getCommunityMusic(_, { id, limit, page }, { req }) {
      return await MusicController.getCommunityMusic(id, limit, page, await getOptionalUserId(req))
    },
    async getAllMusic(_, { limit, page }) {
      return await MusicController.getAllMusic(limit, page)
    },
    async myMusicFiles(_, __, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await MusicController.getMyFiles(user.id)
    },
  },
  Mutation: {
    async addMusic(_, { id }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await MusicController.addToProfile(id, user.id)
    },
    async createMusic(_, { music }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      await throttle('upload', user.id)
      const { title, artist, file, communityId } = music
      return await MusicController.create(user.id, title, artist ?? undefined, file, communityId)
    },
    async removeMyMusic(_, { file }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await MusicController.removeMine(file, user.id)
    },
    async removeMusic(_, { id }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await MusicController.remove(id, user.id)
    },
  },
}

export default PostResolvers
