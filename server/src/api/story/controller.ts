import { createGraphQLError } from 'graphql-yoga'

import { storagePath } from '@/config'
import prisma from '@/db/db'
import { io } from '@/index'

import FileStorageService from '../post/file-service'

/** Сколько живёт история. */
export const STORY_TTL_MS = 24 * 60 * 60 * 1000
const MAX_TEXT = 200
const userSelect = { select: { id: true, avatar: true, login: true } }

class StoryController {
  /** Удаляет истории с истёкшим сроком вместе с файлами. Вызывается при чтении ленты, отдельный планировщик не нужен. */
  private async cleanup() {
    const expired = await prisma.story.findMany({ where: { expiresAt: { lte: new Date() } } })
    if (expired.length === 0) return
    await prisma.story.deleteMany({ where: { id: { in: expired.map((s) => s.id) } } })
    const storage = new FileStorageService(storagePath)
    for (const story of expired) {
      try {
        await storage.removeFiles({ high: story.high, medium: story.medium, small: story.small })
      } catch (error) {
        console.error('Не удалось удалить файлы истории', story.id, error)
      }
    }
  }

  async create(userId: number, image: File, text?: string | null) {
    if (!image) throw createGraphQLError('Выберите изображение')
    if (!image.type.startsWith('image/')) throw createGraphQLError('В историю можно добавить только изображение')
    const clean = (text ?? '').trim().slice(0, MAX_TEXT)
    const saved = await new FileStorageService(storagePath).saveImage(image, 'stories/')
    try {
      const story = await prisma.story.create({
        data: {
          userId,
          high: saved.high,
          medium: saved.medium,
          small: saved.small,
          vertical: saved.vertical,
          type: saved.type,
          text: clean,
          expiresAt: new Date(Date.now() + STORY_TTL_MS),
        },
      })
      io.emit('newStory', { userId })
      return this.view(story, userId, true)
    } catch (error) {
      await new FileStorageService(storagePath).removeFiles(saved)
      throw error
    }
  }

  /** Вид истории для клиента: seen — смотрел ли её просматривающий; число зрителей видит только автор. */
  private view(
    story: {
      id: number
      medium: string
      small: string
      high: string
      text: string
      date: Date
      expiresAt: Date
      userId: number
    },
    viewerId: number | undefined,
    seen: boolean,
    viewsCount?: number,
  ) {
    return {
      id: story.id,
      medium: story.medium,
      small: story.small,
      high: story.high,
      text: story.text,
      date: story.date,
      expiresAt: story.expiresAt,
      seen,
      viewsCount: viewerId === story.userId ? (viewsCount ?? 0) : null,
    }
  }

  /**
   * Ленты историй по людям. Сначала группы с непросмотренными (у каждого свежие выше),
   * потом полностью просмотренные. Свои истории идут первыми.
   */
  async feed(viewerId?: number) {
    await this.cleanup()
    const stories = await prisma.story.findMany({
      where: { expiresAt: { gt: new Date() } },
      orderBy: { id: 'asc' },
      include: {
        user: userSelect,
        _count: { select: { views: true } },
        ...(viewerId ? { views: { where: { userId: viewerId }, select: { id: true }, take: 1 } } : {}),
      },
    })
    const groups = new Map<
      number,
      {
        user: { id: number; avatar: string; login: string }
        stories: ReturnType<StoryController['view']>[]
        lastId: number
      }
    >()
    for (const story of stories) {
      const seen = viewerId === story.userId || ((story as { views?: { id: number }[] }).views?.length ?? 0) > 0
      const group = groups.get(story.userId) ?? { user: story.user, stories: [], lastId: 0 }
      group.stories.push(this.view(story, viewerId, seen, story._count.views))
      group.lastId = story.id
      groups.set(story.userId, group)
    }
    return [...groups.values()]
      .map((g) => ({ user: g.user, stories: g.stories, allSeen: g.stories.every((s) => s.seen), lastId: g.lastId }))
      .sort(
        (x, y) =>
          Number(y.user.id === viewerId) - Number(x.user.id === viewerId) ||
          Number(x.allSeen) - Number(y.allSeen) ||
          y.lastId - x.lastId,
      )
  }

  /** Отмечает просмотр. Свои истории и повторные просмотры не считаются. */
  async markViewed(userId: number, storyId: number) {
    const story = await prisma.story.findUnique({ where: { id: storyId }, select: { userId: true, expiresAt: true } })
    if (!story || story.expiresAt <= new Date()) throw createGraphQLError('История не найдена')
    if (story.userId === userId) return true
    await prisma.storyView.upsert({
      where: { storyId_userId: { storyId, userId } },
      create: { storyId, userId },
      update: {},
    })
    return true
  }

  /** Кто смотрел историю: только её автор, новые просмотры сверху. */
  async viewers(userId: number, storyId: number) {
    const story = await prisma.story.findUnique({ where: { id: storyId }, select: { userId: true } })
    if (!story) throw createGraphQLError('История не найдена')
    if (story.userId !== userId) throw createGraphQLError('Нет доступа')
    const rows = await prisma.storyView.findMany({
      where: { storyId },
      orderBy: { id: 'desc' },
      take: 200,
      include: { user: userSelect },
    })
    return rows.map((row) => ({ user: row.user, date: row.date }))
  }

  async remove(userId: number, storyId: number) {
    const story = await prisma.story.findUnique({ where: { id: storyId } })
    if (!story) throw createGraphQLError('История не найдена')
    if (story.userId !== userId) throw createGraphQLError('Нет доступа')
    await prisma.story.delete({ where: { id: storyId } })
    try {
      await new FileStorageService(storagePath).removeFiles({
        high: story.high,
        medium: story.medium,
        small: story.small,
      })
    } catch (error) {
      console.error('Не удалось удалить файлы истории', storyId, error)
    }
    io.emit('storyRemoved', { userId, storyId })
    return true
  }
}

export default new StoryController()
