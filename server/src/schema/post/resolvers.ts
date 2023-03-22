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
    async createPost(parent, { post }) {
      const { owner, description, images } = post
      const postData = await postController.create(owner, description, images)

      return {
        ...postData.post,
        images: postData.images,
      }
    },
    async updatePost(parent, { id, post }) {
      let description, images
      if (post?.description) description = post.description
      if (post?.images) images = post.images
      return await postController.update(id, description, images)
    },
    async removePost(parent, { id }) {
      return await postController.remove(id)
    },
  },
}

export default PostResolvers
