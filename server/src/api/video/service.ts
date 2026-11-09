import { createGraphQLError } from 'graphql-yoga'

import { storagePath } from '@/config'
import prisma from '@/db/db'
import Video from '@/db/models/video-model'
import User from '@/db/models/user-model'

import VideoStorageService from './video-service'

const MAX_PAGE_LIMIT = 100
const clampLimit = (limit?: number | null) => Math.min(Math.max(limit ?? 30, 1), MAX_PAGE_LIMIT)
const clampOffset = (offset?: number | null) => Math.max(offset ?? 0, 0)

const userSelect = { select: { id: true, login: true, avatar: true } }

/** Достаёт отметки «сохранено» для списка видео текущего пользователя. */
const withSaved = async <T extends { id: number }>(videos: T[], viewerId?: number) => {
  if (!viewerId || videos.length === 0) return videos.map((video) => ({ ...video, saved: false, savedAt: null }))
  const saved = await prisma.savedVideo.findMany({
    where: { userId: viewerId, videoId: { in: videos.map((video) => video.id) } },
    select: { videoId: true, date: true },
  })
  const map = new Map(saved.map((item) => [item.videoId, item.date]))
  return videos.map((video) => ({ ...video, saved: map.has(video.id), savedAt: map.get(video.id) ?? null }))
}

class VideoService {
  private async assertUser(id: number) {
    const user = await User.findUnique({ where: { id }, select: { id: true } })
    if (!user) throw createGraphQLError('Пользователь не найден')
  }

  /** Видео профиля: ролики из постов и отдельный альбом. Архивные посты видны только владельцу. */
  async list(id: number, limit?: number | null, offset?: number | null, viewerId?: number) {
    await this.assertUser(id)
    const videos = await Video.findMany({
      where: {
        ownerId: id,
        // Гостю и другим пользователям архивные посты не показываем
        ...(viewerId === id ? {} : { OR: [{ postId: null }, { post: { archived: false } }] }),
      },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: clampLimit(limit),
      skip: clampOffset(offset),
      include: { user: userSelect },
    })
    return await withSaved(videos, viewerId)
  }

  /** Видео всех пользователей для ленты. Ролики из архивных постов скрыты даже от автора: лента публичная. */
  async listAll(limit?: number | null, offset?: number | null, viewerId?: number) {
    const videos = await Video.findMany({
      where: { OR: [{ postId: null }, { post: { archived: false } }] },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: clampLimit(limit),
      skip: clampOffset(offset),
      include: { user: userSelect },
    })
    return await withSaved(videos, viewerId)
  }

  async count(id: number, viewerId?: number) {
    await this.assertUser(id)
    return await Video.count({
      where: {
        ownerId: id,
        ...(viewerId === id ? {} : { OR: [{ postId: null }, { post: { archived: false } }] }),
      },
    })
  }

  /** Альбом сохранённых видео текущего пользователя. */
  async listSaved(userId: number, limit?: number | null, offset?: number | null) {
    const saved = await prisma.savedVideo.findMany({
      where: {
        userId,
        // Архивный пост автора исчезает и из сохранённого: он был виден только автору
        video: { OR: [{ postId: null }, { post: { archived: false } }] },
      },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: clampLimit(limit),
      skip: clampOffset(offset),
      include: { video: { include: { user: userSelect } } },
    })
    return saved.map((item) => ({ ...item.video, saved: true, savedAt: item.date }))
  }

  /** Загрузка видео в свой альбом. Публикации поста при этом не происходит. */
  async create(userId: number, file: File, title?: string | null) {
    if (!file) throw createGraphQLError('Выберите видео')
    const storage = new VideoStorageService(storagePath)
    const saved = await storage.save(file)
    try {
      return await Video.create({
        data: {
          ownerId: userId,
          title: title?.trim().slice(0, 120) || saved.title,
          file: saved.file,
          size: saved.size,
          type: saved.type,
        },
        include: { user: userSelect },
      })
    } catch (error) {
      // Файл сохраняется до записи в БД: при ошибке убираем его, чтобы не копить мусор
      await storage.remove(saved.file)
      throw error
    }
  }

  /** Удалить можно только отдельно загруженное видео: ролики из постов живут вместе с постами. */
  async remove(userId: number, id: number) {
    const video = await Video.findUnique({ where: { id } })
    if (!video) throw createGraphQLError('Видео не найдено')
    if (video.ownerId !== userId) throw createGraphQLError('Нет доступа')
    if (video.postId !== null) throw createGraphQLError('Видео из поста удаляется вместе с постом')

    await Video.delete({ where: { id } })
    try {
      await new VideoStorageService(storagePath).remove(video.file)
    } catch (error) {
      // Файла может уже не быть — запись в БД всё равно должна удалиться
      console.error('Не удалось удалить файл видео', id, error)
    }
    return true
  }

  /** Сохраняет чужое видео в личный альбом или убирает его оттуда. */
  async save(userId: number, id: number, saved: boolean) {
    const video = await Video.findUnique({
      where: { id },
      select: { id: true, ownerId: true, postId: true, post: { select: { archived: true } } },
    })
    if (!video) throw createGraphQLError('Видео не найдено')
    if (video.ownerId === userId) throw createGraphQLError('Своё видео не нужно сохранять')
    if (video.post?.archived) throw createGraphQLError('Видео недоступно')

    if (saved) {
      await prisma.savedVideo.upsert({
        where: { userId_videoId: { userId, videoId: id } },
        create: { userId, videoId: id },
        update: {},
      })
    } else {
      await prisma.savedVideo.deleteMany({ where: { userId, videoId: id } })
    }
    return true
  }
}

export default new VideoService()
