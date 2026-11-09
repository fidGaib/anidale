import { getOptionalUserId } from '@/api/user/optional-user'
import UserController from '@/api/user/controller'
import VideoController from '@/api/video/controller'
import { Resolvers } from '@/schema/resolvers-types'

const VideoResolvers: Resolvers = {
  Query: {
    async getVideos(_, { id, limit, offset }, { req }) {
      return await VideoController.list(id, limit, offset, await getOptionalUserId(req))
    },
    async getAllVideos(_, { limit, offset }, { req }) {
      return await VideoController.listAll(limit, offset, await getOptionalUserId(req))
    },
    async videosCount(_, { id }, { req }) {
      return await VideoController.count(id, await getOptionalUserId(req))
    },
    async getSavedVideos(_, { limit, offset }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await VideoController.listSaved(user.id, limit, offset)
    },
  },
  Mutation: {
    async createVideo(_, { file, title }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await VideoController.create(user.id, file, title)
    },
    async removeVideo(_, { id }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await VideoController.remove(user.id, id)
    },
    async saveVideo(_, { id, saved }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await VideoController.save(user.id, id, saved)
    },
  },
}

export default VideoResolvers
