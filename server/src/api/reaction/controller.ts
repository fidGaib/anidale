import { createGraphQLError } from 'graphql-yoga'

import { Comment, Like } from '@/db/models/reaction-model'
import { Post } from '@/db/models/post-model'
import NotificationController from '@/api/notification/controller'
import { io } from '@/index'

const MAX_PAGE_LIMIT = 50
const MAX_COMMENT_LENGTH = 500

const userSelect = { select: { id: true, avatar: true, login: true } }

class ReactionController {
  private async ensurePost(postId: number) {
    const post = await Post.findUnique({ where: { id: postId }, select: { id: true, owner: true } })
    if (!post) throw createGraphQLError('Пост не найден')
    return post
  }

  /** Идемпотентно: повторный вызов с тем же значением ничего не ломает (двойной клик, гонки). */
  async setLike(postId: number, userId: number, liked: boolean) {
    const post = await this.ensurePost(postId)
    if (liked) {
      await Like.upsert({
        where: { userId_postId: { userId, postId } },
        create: { userId, postId },
        update: {},
      })
      await NotificationController.notify(post.owner, userId, 'like', { postId })
    } else {
      await Like.deleteMany({ where: { userId, postId } })
      await NotificationController.withdrawLike(post.owner, userId, postId)
    }
    const likesCount = await Like.count({ where: { postId } })
    io.emit('postStats', { postId, likesCount })
    return { liked, likesCount }
  }

  async getComments(postId: number, limit: number, page: number) {
    const take = Math.min(Math.max(Math.trunc(limit) || 1, 1), MAX_PAGE_LIMIT)
    const skip = Math.max(Math.trunc(page) || 0, 0) * take
    return await Comment.findMany({
      where: { postId },
      take,
      skip,
      orderBy: { id: 'desc' },
      include: { user: userSelect },
    })
  }

  async addComment(postId: number, userId: number, text: string) {
    const clean = text?.trim()
    if (!clean) throw createGraphQLError('Комментарий пустой')
    if (clean.length > MAX_COMMENT_LENGTH) {
      throw createGraphQLError(`Комментарий длиннее ${MAX_COMMENT_LENGTH} символов`)
    }
    const post = await this.ensurePost(postId)
    const comment = await Comment.create({
      data: { postId, userId, text: clean },
      include: { user: userSelect },
    })
    const commentsCount = await Comment.count({ where: { postId } })
    await NotificationController.notify(post.owner, userId, 'comment', { postId, text: clean })
    io.emit('newComment', { comment })
    io.emit('postStats', { postId, commentsCount })
    return comment
  }

  async removeComment(id: number, userId: number) {
    const comment = await Comment.findUnique({ where: { id }, include: { post: { select: { owner: true } } } })
    if (!comment) throw createGraphQLError('Комментарий не найден')
    // Удалить может автор комментария или автор поста
    if (comment.userId !== userId && comment.post.owner !== userId) throw createGraphQLError('Нет доступа')
    await Comment.delete({ where: { id } })
    const commentsCount = await Comment.count({ where: { postId: comment.postId } })
    io.emit('removedComment', { postId: comment.postId, id })
    io.emit('postStats', { postId: comment.postId, commentsCount })
    return true
  }
}

export default new ReactionController()
