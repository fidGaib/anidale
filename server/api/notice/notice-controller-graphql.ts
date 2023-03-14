import { createGraphQLError } from 'graphql-yoga'

import noticeService from './notice-service-graphql'

class NoticeControllerGraphql {
  async getPosts(limit: number, page: number) {
    try {
      if (limit < 0) return []
      return await noticeService.findAll(limit, page)
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
  async getPost(id: number, limit: number, page: number) {
    try {
      if (limit < 0) return []
      return await noticeService.findByUser(id, limit, page)
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
}
export default new NoticeControllerGraphql()
