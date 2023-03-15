import { createGraphQLError } from 'graphql-yoga'

import noticeServiceGraphql from './service'

class NoticeController {
  async create(owner: number, description: any, images: any) {
    try {
      if (!owner) throw createGraphQLError('Вы не авторизованы или произошла непредвиденная ошибка')
      if (!description?.trim() && !images) throw createGraphQLError('У вас пустые поля')
      if (!description?.trim() && !images?.length) throw createGraphQLError('У вас пустые поля')
      return await noticeServiceGraphql.create(owner, description, images)
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
  async getPosts(limit: number, page: number) {
    try {
      if (limit < 0) return []
      return await noticeServiceGraphql.findAll(limit, page)
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
  async getPost(id: number, limit: number, page: number) {
    try {
      if (limit < 0) return []
      return await noticeServiceGraphql.findByUser(id, limit, page)
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
  async remove(id: number) {
    try {
      return await noticeServiceGraphql.remove(id)
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
  async update(id: number, description: any, images: any) {
    try {
      if (!description?.trim() && !images) throw createGraphQLError('У вас пустые поля')
      if (!description?.trim() && !images?.length) throw createGraphQLError('У вас пустые поля')
      return await noticeServiceGraphql.update(id, description, images)
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
}
export default new NoticeController()
