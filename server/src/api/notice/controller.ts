import { createGraphQLError } from 'graphql-yoga'

import { InputMaybe } from '@/schema/resolvers-types'

import NoticeService from './service'

class NoticeController {
  async create(owner: number, description?: InputMaybe<string>, images?: InputMaybe<File[]>) {
    try {
      if (!owner) throw createGraphQLError('Вы не авторизованы или произошла непредвиденная ошибка')
      if (!description?.trim() && !images?.length) throw createGraphQLError('У вас пустые поля')
      return await NoticeService.create(owner, description ?? null, images ?? null)
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
  async getPosts(limit: number, page: number) {
    try {
      if (limit < 0) return []
      return await NoticeService.findAll(limit, page)
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
  async getPostsByUser(id: number, limit: number, page: number) {
    try {
      if (limit < 0) return []
      return await NoticeService.findByUser(id, limit, page)
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
  async remove(id: number) {
    try {
      return await NoticeService.remove(id)
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
  async update(id: number, description?: string, images?: File[]) {
    try {
      if (!description?.trim() && !images?.length) throw createGraphQLError('У вас пустые поля')
      return await NoticeService.update(id, description, images)
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
}
export default new NoticeController()
