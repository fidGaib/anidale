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
      const user = await UserController.refresh(res, req.cookies.refreshToken, req.cookies.accessToken)
      const { description, images } = post
      const postData = await postController.create(user.id, description, images)

      return {
        ...postData.post,
        images: postData.images,
      }
    },
    async updatePost(_, { post }, ctx) {
      const { req, res } = ctx
      const user = await UserController.refresh(res, req.cookies.refreshToken, req.cookies.accessToken)
      let description, images
      if (post?.description) description = post.description
      if (post?.images) images = post.images
      return await postController.update(user.id, description, images)
    },
    async removePost(_, __, ctx) {
      const { req, res } = ctx
      const user = await UserController.refresh(res, req.cookies.refreshToken, req.cookies.accessToken)
      return await postController.remove(user.id)
    },
  },
}

export default PostResolvers
