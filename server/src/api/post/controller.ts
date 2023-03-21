import { createGraphQLError } from 'graphql-yoga'

import PostService from './service'

class PostController {
  async create(owner: number, description?: string, images?: File[]) {
    if (!owner) throw createGraphQLError('Вы не авторизованы или произошла непредвиденная ошибка')
    if (!description?.trim() && !images?.length) throw createGraphQLError('У вас пустые поля')
    return await PostService.create(owner, description || '', images)
  }
  async getPosts(limit: number, page: number) {
    if (limit < 0) return []
    return await PostService.findAll(limit, page)
  }
  async getPostsByUser(id: number, limit: number, page: number) {
    if (limit < 0) return []
    return await PostService.findByUser(id, limit, page)
  }
  async remove(id: number) {
    return await PostService.remove(id)
  }
  async update(id: number, description?: string, images?: File[]) {
    if (!description?.trim() && !images?.length) throw createGraphQLError('У вас пустые поля')
    return await PostService.update(id, description, images)
  }
}
export default new PostController()
