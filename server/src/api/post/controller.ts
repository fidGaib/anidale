import { createGraphQLError } from 'graphql-yoga'

import PostService from './service'

class PostController {
  async create(owner: number, description?: string, images?: File[]) {
    try {
      if (!owner) throw createGraphQLError('Вы не авторизованы или произошла непредвиденная ошибка')
      if (!description?.trim() && !images?.length) throw createGraphQLError('У вас пустые поля')
      return await PostService.create(owner, description || '', images)
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
  async getPosts(limit: number, page: number) {
    try {
      if (limit < 0) return []
      return await PostService.findAll(limit, page)
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
  async getPostsByUser(id: number, limit: number, page: number) {
    try {
      if (limit < 0) return []
      return await PostService.findByUser(id, limit, page)
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
  async remove(id: number) {
    try {
      return await PostService.remove(id)
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
  async update(id: number, description?: string, images?: File[]) {
    try {
      if (!description?.trim() && !images?.length) throw createGraphQLError('У вас пустые поля')
      return await PostService.update(id, description, images)
    } catch (e: unknown) {
      throw createGraphQLError(e instanceof Error ? e.message : String(e))
    }
  }
}
export default new PostController()
