import { Resolvers } from '@schema/resolvers-types'
import { createGraphQLError } from 'graphql-yoga'

import noticeController from '../../api/notice/controller'

const PostResolvers: Resolvers = {
  Query: {
    async getPosts(parent, args) {
      const { limit, page } = args
      return await noticeController.getPosts(limit, page)
    },
    async getPostByUser(parent, args) {
      const { id, limit, page } = args
      return await noticeController.getPost(id, limit, page)
    },
  },
  Mutation: {
    async createPost(parent, args) {
      const { owner, description, images } = args.post
      return await noticeController.create(owner, description, images)
    },
    async updatePost(parent, args) {
      const { id } = args
      let description, images
      if (args.post?.description) description = args.post.description
      if (args.post?.images) images = args.post.images
      return await noticeController.update(id, description, images)
    },
    async removePost(parent, args) {
      const { id } = args
      return await noticeController.remove(id)
    },
  },
}

export default PostResolvers
