import { InputMaybe } from '@schema/resolvers-types'
import { createGraphQLError } from 'graphql-yoga'

import NoticeService from './service'

class NoticeController {
  async create(owner: number, description?: InputMaybe<string>, images?: InputMaybe<File[]>) {
    try {
      if (!owner) throw createGraphQLError('Вы не авторизованы или произошла непредвиденная ошибка')
      if (!description?.trim() && !images?.length) throw createGraphQLError('У вас пустые поля')
      return await NoticeService.create(owner, description ?? null, images ?? null)
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
  async getPosts(limit: number, page: number) {
    try {
      if (limit < 0) return []
      return await NoticeService.findAll(limit, page)
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
  async getPost(id: number, limit: number, page: number) {
    try {
      if (limit < 0) return []
      return await NoticeService.findByUser(id, limit, page)
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
  async remove(id: number) {
    try {
      return await NoticeService.remove(id)
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
  async update(id: number, description: any, images: any) {
    try {
      if (!description?.trim() && !images) throw createGraphQLError('У вас пустые поля')
      if (!description?.trim() && !images?.length) throw createGraphQLError('У вас пустые поля')
      return await NoticeService.update(id, description, images)
    } catch (e: any) {
      throw createGraphQLError(e.message)
    }
  }
}
export default new NoticeController()
