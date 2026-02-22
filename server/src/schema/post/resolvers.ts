import postController from '@/api/post/controller'
import UserController from '@/api/user/controller'
import { Resolvers } from '@/schema/resolvers-types'

const PostResolvers: Resolvers = {
  Query: {
    async getPosts(_, args) {
      const { limit, page } = args
      return await postController.getPosts(limit, page)
    },
    async getPostsByUser(_, args) {
      const { id, limit, page } = args
      return await postController.getPostsByUser(id, limit, page)
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
      }
    },
    async updatePost(_, { post }, ctx) {
      const { req, res } = ctx
      const user = await UserController.refresh(res, req.cookies.refreshToken)
      return await postController.update(user.id, post!.description, post!.images)
    },
    async removePost(_, post, ctx) {
      const { req, res } = ctx
      await UserController.refresh(res, req.cookies.refreshToken)
      return await postController.remove(post.id)
    },
  },
}

export default PostResolvers
