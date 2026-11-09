import CommunityService from '@/api/community/service'
import PhotoService from '@/api/photo/service'
import UserController from '@/api/user/controller'
import { getOptionalUserId } from '@/api/user/optional-user'
import VideoService from '@/api/video/service'
import { Resolvers } from '@/schema/resolvers-types'

const CommunityResolvers: Resolvers = {
  Query: {
    async getCommunities(_, args, { req }) {
      return await CommunityService.list(await getOptionalUserId(req), args)
    },
    async getCommunity(_, { id }, { req }) {
      return await CommunityService.find(id, await getOptionalUserId(req))
    },
    async getCommunityMembers(_, { id, limit, offset }, { req }) {
      return (await CommunityService.members(id, limit, offset, await getOptionalUserId(req))) as never
    },
    async getCommunityPosts(_, { id, limit, page }, { req }) {
      return (await CommunityService.posts(id, limit, page, await getOptionalUserId(req))) as never
    },
    async getSuggestedPosts(_, { id, limit, page }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return (await CommunityService.suggested(user.id, id, limit, page)) as never
    },
    async getCommunityRequests(_, { id, limit, offset }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return (await CommunityService.requests(user.id, id, limit, offset)) as never
    },
    async getCommunityBans(_, { id, limit, offset }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return (await CommunityService.bans(user.id, id, limit, offset)) as never
    },
    async getUserCommunities(_, { userId, limit }, { req }) {
      return await CommunityService.ofUser(userId, await getOptionalUserId(req), limit)
    },
    async getCommunityVideos(_, { id, limit, offset }, { req }) {
      return (await VideoService.listCommunity(id, limit, offset, await getOptionalUserId(req))) as never
    },
    async getCommunityPhotos(_, { id, limit, offset }, { req }) {
      return (await PhotoService.listCommunity(id, limit, offset, await getOptionalUserId(req))) as never
    },
  },
  Mutation: {
    async createCommunity(_, { name, description, avatar, isClosed }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await CommunityService.create(user.id, { name, description, avatar, isClosed })
    },
    async updateCommunity(_, { id, ...input }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await CommunityService.update(user.id, id, input)
    },
    async joinCommunity(_, { id }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await CommunityService.join(user.id, id)
    },
    async leaveCommunity(_, { id }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await CommunityService.leave(user.id, id)
    },
    async setCommunityLinks(_, { id, links }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await CommunityService.setLinks(user.id, id, links)
    },
    async resolveCommunityRequest(_, { id, userId, accept }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await CommunityService.resolveRequest(user.id, id, userId, accept)
    },
    async inviteToCommunity(_, { id, userId }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await CommunityService.invite(user.id, id, userId)
    },
    async banCommunityMember(_, { id, userId, reason }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await CommunityService.ban(user.id, id, userId, reason)
    },
    async unbanCommunityMember(_, { id, userId }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await CommunityService.unban(user.id, id, userId)
    },
    async reviewSuggestedPost(_, { postId, approve }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await CommunityService.review(user.id, postId, approve)
    },
    async setCommunityAdmin(_, { id, userId, admin }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await CommunityService.setAdmin(user.id, id, userId, admin)
    },
    async removeCommunity(_, { id }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await CommunityService.remove(user.id, id)
    },
  },
}

export default CommunityResolvers
