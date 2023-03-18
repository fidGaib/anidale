import postController from '@/api/post/controller'
import { Resolvers } from '@/schema/resolvers-types'

const PostResolvers: Resolvers = {
  Query: {
    async getPosts(parent, args) {
      const { limit, page } = args
      return await postController.getPosts(limit, page)
    },
    async getPostsByUser(parent, args) {
      const { id, limit, page } = args
      return await postController.getPostsByUser(id, limit, page)
    },
  },
  Mutation: {
    async createPost(parent, args) {
      const { owner, description, images } = args.post
      return await postController.create(owner, description, images)
    },
    async updatePost(parent, args) {
      const { id } = args
      let description, images
      if (args.post?.description) description = args.post.description
      if (args.post?.images) images = args.post.images
      return await postController.update(id, description, images)
    },
    async removePost(parent, args) {
      const { id } = args
      return await postController.remove(id)
    },
  },
}

export default PostResolvers
