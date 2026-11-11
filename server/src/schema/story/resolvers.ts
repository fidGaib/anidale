import StoryController from '@/api/story/controller'
import UserController from '@/api/user/controller'
import { getOptionalUserId } from '@/api/user/optional-user'
import { requireVerifiedUser } from '@/api/user/require-verified'
import { Resolvers } from '@/schema/resolvers-types'
import { throttle } from '@/utils/rate-limit'

const StoryResolvers: Resolvers = {
  Query: {
    async getStories(_, __, { req }) {
      return await StoryController.feed(await getOptionalUserId(req))
    },
    async getCommunityStories(_, { id }, { req }) {
      return await StoryController.communityStories(id, await getOptionalUserId(req))
    },
    async storyViewers(_, { id }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await StoryController.viewers(user.id, id)
    },
  },
  Mutation: {
    async createStory(_, { image, text, communityId }, { req, res }) {
      const user = await requireVerifiedUser(req, res)
      await throttle('upload', user.id)
      return await StoryController.create(user.id, image, text, communityId)
    },
    async viewStory(_, { id }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await StoryController.markViewed(user.id, id)
    },
    async deleteStory(_, { id }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await StoryController.remove(user.id, id)
    },
  },
}

export default StoryResolvers
