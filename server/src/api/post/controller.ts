import { createGraphQLError } from 'graphql-yoga'

import PostService from './service'

class PostController {
  async create(owner: number, description?: string, images?: File[]) {
    if (!description?.trim() && !images?.length) throw createGraphQLError('У вас пустые поля')
    const postData = await PostService.create(owner, description || '', images)
    return postData
  }
  async getPosts(limit: number, page: number) {
    if (limit < 0) return []
    return await PostService.find(limit, page)
  }
  async getPostsByUser(id: number, limit: number, page: number) {
    if (limit < 0) return []
    return await PostService.find(limit, page, id)
  }
  async remove(post_id: number) {
    return await PostService.remove(post_id)
  }
  async update(id: number, description?: string, images?: File[]) {
    if (!description?.trim() && !images?.length) throw createGraphQLError('У вас пустые поля')
    return await PostService.update(id, description, images)
  }
}
export default new PostController()
