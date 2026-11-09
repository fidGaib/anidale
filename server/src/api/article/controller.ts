import { io } from '@/index'

import { isClosedCommunity } from '../community/access'
import ArticleService from './service'

type CreateInput = Parameters<typeof ArticleService.create>[1]
type EditInput = Parameters<typeof ArticleService.edit>[2]

class ArticleController {
  async create(owner: number, input: CreateInput) {
    const post = await ArticleService.create(owner, input)
    // Остальные клиенты увидят новую статью на стене и в ленте, как любой пост
    // Статьи закрытого сообщества по сокету не рассылаются
    if (post && !(await isClosedCommunity(post.communityId))) io.emit('newPost', { post })
    return post
  }
  async edit(userId: number, id: number, input: EditInput) {
    return await ArticleService.edit(userId, id, input)
  }
  async find(id: number, viewerId?: number) {
    return await ArticleService.find(id, viewerId)
  }
}

export default new ArticleController()
