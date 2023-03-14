import { Resolvers } from '@schema/resolvers-types'

import noticeControllerGraphql from '../../api/notice/notice-controller-graphql'

const PostResolvers: Resolvers = {
  Query: {
    async getPosts(parent, args) {
      const { limit, page } = args
      return await noticeControllerGraphql.getPosts(limit, page)
    },
    async getPostByUser(parent, args) {
      const { id, limit, page } = args
      return await noticeControllerGraphql.getPost(id, limit, page)
    },
  },
  //   Mutation: {},
}

export default PostResolvers
