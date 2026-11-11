import PhotoController from '@/api/photo/controller'
import UserController from '@/api/user/controller'
import { getOptionalUserId } from '@/api/user/optional-user'
import { requireVerifiedUser } from '@/api/user/require-verified'
import { Resolvers } from '@/schema/resolvers-types'
import { throttle } from '@/utils/rate-limit'

const PhotoResolvers: Resolvers = {
  Query: {
    async getPhotos(_, { id, limit, offset }, { req }) {
      return await PhotoController.list(id, limit, offset, await getOptionalUserId(req))
    },
    async photosCount(_, { id }, { req }) {
      return await PhotoController.count(id, await getOptionalUserId(req))
    },
    async getSavedPhotos(_, { limit, offset }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await PhotoController.listSaved(user.id, limit, offset)
    },
  },
  Mutation: {
    async createPhoto(_, { image, communityId }, { req, res }) {
      const user = await requireVerifiedUser(req, res)
      await throttle('upload', user.id)
      return await PhotoController.create(user.id, image, communityId)
    },
    async removePhoto(_, { id }, { req }) {
      return await PhotoController.remove(await getOptionalUserId(req), id)
    },
    async savePhoto(_, { source, id, saved }, { req }) {
      return await PhotoController.save(await getOptionalUserId(req), source, id, saved)
    },
  },
}

export default PhotoResolvers
