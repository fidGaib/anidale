import { createGraphQLError } from 'graphql-yoga'

import NotificationController from '@/api/notification/controller'
import { io } from '@/index'

import { notifyAdmins } from '../community/notify'
import PostService, { WALL_KINDS } from './service'

class PostController {
  async create(owner: number, description?: string, images?: File[], videos?: File[], communityId?: number | null) {
    if (!description?.trim() && !images?.length && !videos?.length) throw createGraphQLError('У вас пустые поля')
    const postData = await PostService.create(owner, description || '', images, videos, communityId)
    if (postData.post.suggested && postData.post.communityId) {
      // Предложка: пост видят только администраторы, и им приходит уведомление
      await notifyAdmins(postData.post.communityId, owner, 'community_suggest', { postId: postData.post.id })
      return postData
    }
    // Остальные клиенты узнают о новом посте: лента покажет кнопку, профиль автора добавит пост
    io.emit('newPost', {
      post: {
        ...postData.post,
        images: postData.images,
        videos: postData.videos,
        likesCount: 0,
        commentsCount: 0,
        liked: false,
      },
    })
    return postData
  }
  async getPosts(limit: number, page: number, viewerId?: number) {
    return await PostService.find(limit, page, undefined, viewerId)
  }
  async getPost(id: number, viewerId?: number) {
    return await PostService.findOne(id, viewerId)
  }
  async getPostsByUser(
    id: number,
    limit: number,
    page: number,
    viewerId?: number,
    search?: string | null,
    kind?: string | null,
  ) {
    // Неизвестный вид стены трактуем как «Главная»
    const wall = WALL_KINDS.find((k) => k === kind) ?? 'all'
    return await PostService.find(limit, page, id, viewerId, search?.trim().slice(0, 100) || undefined, wall)
  }
  async getBookmarks(viewerId: number, limit: number, page: number) {
    return await PostService.findBookmarked(viewerId, limit, page)
  }
  async edit(userId: number, id: number, description: string) {
    return await PostService.edit(userId, id, description)
  }
  async pin(userId: number, id: number, pinned: boolean) {
    return await PostService.pin(userId, id, pinned)
  }
  async archive(userId: number, id: number, archived: boolean) {
    return await PostService.archive(userId, id, archived)
  }
  async bookmark(userId: number, id: number, bookmarked: boolean) {
    return await PostService.bookmark(userId, id, bookmarked)
  }
  async report(userId: number, id: number, reason: string) {
    return await PostService.report(userId, id, reason)
  }
  async view(userId: number, ids: number[]) {
    return await PostService.view(userId, ids)
  }
  /** Репост: новый пост на странице пользователя. Автору оригинала приходит уведомление. */
  async repost(userId: number, id: number, comment?: string | null) {
    const { post, rootOwner, rootId } = await PostService.repost(userId, id, comment)
    if (post) io.emit('newPost', { post })
    await NotificationController.notify(rootOwner, userId, 'repost', { postId: rootId, text: comment ?? '' })
    return post
  }
  async remove(post_id: number, userId: number) {
    return await PostService.remove(post_id, userId)
  }
}
export default new PostController()
