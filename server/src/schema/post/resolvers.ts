import postController from '@/api/post/controller'
import UserController from '@/api/user/controller'
import { getOptionalUserId } from '@/api/user/optional-user'
import { Resolvers } from '@/schema/resolvers-types'

const PostResolvers: Resolvers = {
  Query: {
    async getPosts(_, args, { req }) {
      const { limit, page } = args
      return await postController.getPosts(limit, page, await getOptionalUserId(req))
    },
    async getPostsByUser(_, args, { req }) {
      const { id, limit, page } = args
      return await postController.getPostsByUser(id, limit, page, await getOptionalUserId(req))
    },
  },
  Mutation: {
    async createPost(_, { post }, ctx) {
      const { req, res } = ctx
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      const { description, images } = post
      const postData = await postController.create(user.id, description, images)

      return {
        ...postData.post,
        images: postData.images,
        likesCount: 0,
        commentsCount: 0,
        liked: false,
      }
    },
    async removePost(_, post, ctx) {
      const { req, res } = ctx
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await postController.remove(post.id, user.id)
    },
  },
}

export default PostResolvers
