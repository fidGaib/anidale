import { createGraphQLError } from 'graphql-yoga'

import { io } from '@/index'

import PostService from './service'

class PostController {
  async create(owner: number, description?: string, images?: File[]) {
    if (!description?.trim() && !images?.length) throw createGraphQLError('У вас пустые поля')
    const postData = await PostService.create(owner, description || '', images)
    // Остальные клиенты узнают о новом посте: лента покажет кнопку, профиль автора добавит пост
    io.emit('newPost', {
      post: { ...postData.post, images: postData.images, likesCount: 0, commentsCount: 0, liked: false },
    })
    return postData
  }
  async getPosts(limit: number, page: number, viewerId?: number) {
    return await PostService.find(limit, page, undefined, viewerId)
  }
  async getPostsByUser(id: number, limit: number, page: number, viewerId?: number) {
    return await PostService.find(limit, page, id, viewerId)
  }
  async remove(post_id: number, userId: number) {
    return await PostService.remove(post_id, userId)
  }
}
export default new PostController()
