import postController from '@/api/post/controller'
import UserController from '@/api/user/controller'
import { getOptionalUserId } from '@/api/user/optional-user'
import { requireVerifiedUser } from '@/api/user/require-verified'
import { Resolvers } from '@/schema/resolvers-types'
import { throttle } from '@/utils/rate-limit'

const PostResolvers: Resolvers = {
  Query: {
    async getPosts(_, args, { req }) {
      const { limit, page } = args
      return await postController.getPosts(limit, page, await getOptionalUserId(req))
    },
    async getPost(_, { id }, { req }) {
      return await postController.getPost(id, await getOptionalUserId(req))
    },
    async getBookmarks(_, { limit, page }, { req, res }) {
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await postController.getBookmarks(user.id, limit, page)
    },
    async getPostsByUser(_, args, { req }) {
      const { id, limit, page, search, kind } = args
      return await postController.getPostsByUser(id, limit, page, await getOptionalUserId(req), search, kind)
    },
  },
  Mutation: {
    async createPost(_, { post }, ctx) {
      const { req, res } = ctx
      const user = await requireVerifiedUser(req, res)
      await throttle('post', user.id)
      const { description, images, videos, communityId, music, musicIds, videoIds } = post
      const postData = await postController.create(
        user.id,
        description,
        images,
        videos,
        communityId,
        music,
        musicIds,
        videoIds,
      )

      return {
        ...postData.post,
        images: postData.images,
        videos: postData.videos,
        likesCount: 0,
        commentsCount: 0,
        liked: false,
      }
    },
    async editPost(_, { id, description }, ctx) {
      const user = await requireVerifiedUser(ctx.req, ctx.res)
      return await postController.edit(user.id, id, description)
    },
    async pinPost(_, { id, pinned }, ctx) {
      const user = await UserController.refresh(ctx.res, ctx.req.cookies.refreshToken)
      return await postController.pin(user.id, id, pinned)
    },
    async archivePost(_, { id, archived }, ctx) {
      const user = await UserController.refresh(ctx.res, ctx.req.cookies.refreshToken)
      return await postController.archive(user.id, id, archived)
    },
    async bookmarkPost(_, { id, bookmarked }, ctx) {
      const user = await UserController.refresh(ctx.res, ctx.req.cookies.refreshToken)
      return await postController.bookmark(user.id, id, bookmarked)
    },
    async reportPost(_, { id, reason }, ctx) {
      const user = await UserController.refresh(ctx.res, ctx.req.cookies.refreshToken)
      return await postController.report(user.id, id, reason)
    },
    async repostPost(_, { id, comment }, ctx) {
      const user = await requireVerifiedUser(ctx.req, ctx.res)
      await throttle('post', user.id)
      return await postController.repost(user.id, id, comment)
    },
    async viewPosts(_, { ids }, ctx) {
      const user = await UserController.refresh(ctx.res, ctx.req.cookies.refreshToken)
      return await postController.view(user.id, ids)
    },
    async removePost(_, post, ctx) {
      const { req, res } = ctx
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await postController.remove(post.id, user.id)
    },
  },
}

export default PostResolvers
