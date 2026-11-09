import prisma from '@/db/db'
import { io } from '@/index'

const MAX_PAGE_LIMIT = 50
const SNIPPET_LENGTH = 120

export type NotificationType = 'like' | 'comment' | 'track' | 'repost'

const actorSelect = { select: { id: true, avatar: true, login: true } }

interface DbNotification {
  id: number
  type: string
  text: string
  date: Date
  readAt: Date | null
  postId: number | null
  actor: { id: number; avatar: string; login: string }
}

/** Вид для GraphQL и сокета: read вместо даты прочтения. */
const toView = (n: DbNotification) => ({
  id: n.id,
  type: n.type,
  text: n.text,
  date: n.date,
  read: n.readAt !== null,
  postId: n.postId,
  actor: n.actor,
})

class NotificationController {
  /**
   * Создаёт уведомление и сразу отправляет его адресату по сокету.
   * О собственных действиях не уведомляем. Повторный лайк того же человека к тому же посту не дублируется.
   */
  async notify(userId: number, actorId: number, type: NotificationType, data: { postId?: number; text?: string } = {}) {
    if (userId === actorId) return
    try {
      if (type === 'like') {
        const exists = await prisma.notification.findFirst({
          where: { userId, actorId, type, postId: data.postId ?? null },
          select: { id: true },
        })
        if (exists) return
      }
      const created = await prisma.notification.create({
        data: {
          userId,
          actorId,
          type,
          postId: data.postId ?? null,
          text: (data.text ?? '').trim().slice(0, SNIPPET_LENGTH),
        },
        include: { actor: actorSelect },
      })
      io.to(`user:${userId}`).emit('notification', { notification: toView(created) })
    } catch (error) {
      // Уведомление вторично: ошибка не должна ломать лайк или комментарий
      console.error('Не удалось создать уведомление', error)
    }
  }

  /** Лайк сняли: уведомление о нём больше не нужно. */
  async withdrawLike(userId: number, actorId: number, postId: number) {
    try {
      await prisma.notification.deleteMany({ where: { userId, actorId, postId, type: 'like' } })
    } catch (error) {
      console.error('Не удалось убрать уведомление о лайке', error)
    }
  }

  async list(me: number, limit: number, beforeId?: number) {
    const take = Math.min(Math.max(Math.trunc(limit) || 1, 1), MAX_PAGE_LIMIT)
    const rows = await prisma.notification.findMany({
      where: { userId: me, ...(beforeId ? { id: { lt: beforeId } } : {}) },
      orderBy: { id: 'desc' },
      take,
      include: { actor: actorSelect },
    })
    return rows.map(toView)
  }

  async unreadCount(me: number) {
    return await prisma.notification.count({ where: { userId: me, readAt: null } })
  }

  async markAllRead(me: number) {
    await prisma.notification.updateMany({ where: { userId: me, readAt: null }, data: { readAt: new Date() } })
    // Остальные вкладки сбросят счётчик
    io.to(`user:${me}`).emit('notificationsRead', {})
    return true
  }
}

export default new NotificationController()
