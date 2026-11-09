import PhotoController from '@/api/photo/controller'
import { getOptionalUserId } from '@/api/user/optional-user'
import UserController from '@/api/user/controller'
import { Resolvers } from '@/schema/resolvers-types'

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
    async createPhoto(_, { image }, { req }) {
      return await PhotoController.create(await getOptionalUserId(req), image)
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
