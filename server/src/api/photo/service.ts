import { createGraphQLError } from 'graphql-yoga'

import { storagePath } from '@/config'
import prisma from '@/db/db'
import Photo from '@/db/models/photo-model'
import { PostImage } from '@/db/models/post-model'
import User from '@/db/models/user-model'

import { canManageContent, canPublish, canViewCommunity } from '../community/access'
import FileStorageService from '../post/file-service'

const MAX_PAGE_LIMIT = 100
const clampLimit = (limit?: number | null) => Math.min(Math.max(limit ?? 30, 1), MAX_PAGE_LIMIT)
const clampOffset = (offset?: number | null) => Math.max(offset ?? 0, 0)

type PhotoSource = 'POST' | 'ALBUM'

interface PhotoView {
  id: number
  source: PhotoSource
  postId: number | null
  ownerId: number
  high: string
  medium: string
  small: string
  vertical: boolean
  type: string
  date: Date
  saved: boolean
  savedAt: Date | null
}

/** Добавляет к фотографиям отметку «сохранено» текущим пользователем. */
const withSaved = async (photos: Omit<PhotoView, 'saved' | 'savedAt'>[], viewerId?: number) => {
  if (!viewerId || photos.length === 0) {
    return photos.map((photo) => ({ ...photo, saved: false, savedAt: null }))
  }
  const postIds = photos.filter((photo) => photo.source === 'POST').map((photo) => photo.id)
  const albumIds = photos.filter((photo) => photo.source === 'ALBUM').map((photo) => photo.id)
  const saved = await prisma.savedPhoto.findMany({
    where: {
      userId: viewerId,
      OR: [
        ...(postIds.length ? [{ postImageId: { in: postIds } }] : []),
        ...(albumIds.length ? [{ photoId: { in: albumIds } }] : []),
      ],
    },
    select: { postImageId: true, photoId: true, date: true },
  })
  const postMap = new Map(
    saved.filter((item) => item.postImageId !== null).map((item) => [item.postImageId, item.date]),
  )
  const albumMap = new Map(saved.filter((item) => item.photoId !== null).map((item) => [item.photoId, item.date]))

  return photos.map((photo) => {
    const savedAt = (photo.source === 'POST' ? postMap.get(photo.id) : albumMap.get(photo.id)) ?? null
    return { ...photo, saved: savedAt !== null, savedAt }
  })
}

class PhotoService {
  private async assertUser(id: number) {
    const user = await User.findUnique({ where: { id }, select: { id: true } })
    if (!user) throw createGraphQLError('Пользователь не найден')
  }

  /** Условие по постам: архив виден только их автору. */
  private postWhere(id: number, viewerId?: number) {
    // Записи сообществ и их альбомы к личной странице не относятся
    return { owner: id, communityId: null, ...(viewerId === id ? {} : { archived: false }) }
  }

  /**
   * Все фото профиля: снимки из постов и отдельный альбом.
   * Файлы не дублируются — постовые фото читаются напрямую из PostImage.
   */
  async list(id: number, limit?: number | null, offset?: number | null, viewerId?: number) {
    await this.assertUser(id)
    const take = clampLimit(limit)
    const skip = clampOffset(offset)
    // Достаточно взять по skip + take из каждого источника, чтобы после сортировки получить нужную страницу
    const perSource = skip + take

    const [postImages, albumPhotos] = await Promise.all([
      PostImage.findMany({
        where: { post: this.postWhere(id, viewerId) },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        take: perSource,
        select: {
          id: true,
          high: true,
          medium: true,
          small: true,
          vertical: true,
          type: true,
          date: true,
          postId: true,
          post: { select: { owner: true } },
        },
      }),
      Photo.findMany({
        where: { userId: id, communityId: null },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        take: perSource,
      }),
    ])

    const photos: Omit<PhotoView, 'saved' | 'savedAt'>[] = [
      ...postImages.map(({ post, ...image }) => ({
        ...image,
        source: 'POST' as const,
        ownerId: post.owner,
      })),
      ...albumPhotos.map((photo) => ({
        ...photo,
        source: 'ALBUM' as const,
        postId: null,
        ownerId: photo.userId,
      })),
    ]

    const page = photos.sort((a, b) => b.date.getTime() - a.date.getTime() || b.id - a.id).slice(skip, skip + take)
    return await withSaved(page, viewerId)
  }

  /** Фото сообщества: снимки из его записей и альбом. Закрытое сообщество показывает их только участникам. */
  async listCommunity(communityId: number, limit?: number | null, offset?: number | null, viewerId?: number) {
    if (!(await canViewCommunity(communityId, viewerId))) return []
    const take = clampLimit(limit)
    const skip = clampOffset(offset)
    const perSource = skip + take
    const [postImages, albumPhotos] = await Promise.all([
      PostImage.findMany({
        where: { post: { communityId, archived: false, suggested: false } },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        take: perSource,
        select: {
          id: true,
          high: true,
          medium: true,
          small: true,
          vertical: true,
          type: true,
          date: true,
          postId: true,
          post: { select: { owner: true } },
        },
      }),
      Photo.findMany({ where: { communityId }, orderBy: [{ date: 'desc' }, { id: 'desc' }], take: perSource }),
    ])
    const photos: Omit<PhotoView, 'saved' | 'savedAt'>[] = [
      ...postImages.map(({ post, ...image }) => ({ ...image, source: 'POST' as const, ownerId: post.owner })),
      ...albumPhotos.map((photo) => ({ ...photo, source: 'ALBUM' as const, postId: null, ownerId: photo.userId })),
    ]
    const page = photos.sort((a, b) => b.date.getTime() - a.date.getTime() || b.id - a.id).slice(skip, skip + take)
    return await withSaved(page, viewerId)
  }

  async count(id: number, viewerId?: number) {
    await this.assertUser(id)
    const [posts, album] = await Promise.all([
      PostImage.count({ where: { post: this.postWhere(id, viewerId) } }),
      Photo.count({ where: { userId: id, communityId: null } }),
    ])
    return posts + album
  }

  /** Альбом сохранённых фото текущего пользователя. */
  async listSaved(userId: number, limit?: number | null, offset?: number | null) {
    const saved = await prisma.savedPhoto.findMany({
      where: {
        userId,
        OR: [
          // Фото из архивного поста больше не показываем
          { postImageId: { not: null }, postImage: { post: { archived: false } } },
          { photoId: { not: null } },
        ],
      },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: clampLimit(limit),
      skip: clampOffset(offset),
      include: {
        postImage: {
          select: {
            id: true,
            high: true,
            medium: true,
            small: true,
            vertical: true,
            type: true,
            date: true,
            postId: true,
            post: { select: { owner: true } },
          },
        },
        photo: true,
      },
    })

    const result: PhotoView[] = []
    for (const item of saved) {
      if (item.postImage) {
        const { post, ...image } = item.postImage
        result.push({
          ...image,
          source: 'POST',
          ownerId: post.owner,
          saved: true,
          savedAt: item.date,
        })
      } else if (item.photo) {
        result.push({
          ...item.photo,
          source: 'ALBUM',
          postId: null,
          ownerId: item.photo.userId,
          saved: true,
          savedAt: item.date,
        })
      }
    }
    return result
  }

  async create(userId: number, image: File, communityId?: number | null) {
    if (!image) throw createGraphQLError('Выберите фотографию')
    if (communityId && !(await canPublish(communityId, userId))) {
      throw createGraphQLError('Добавлять фото в сообщество могут только администраторы')
    }
    if (!image.type.startsWith('image/')) throw createGraphQLError('Можно загрузить только изображение')

    const storage = new FileStorageService(storagePath)
    const saved = await storage.saveImage(image, 'photos/')
    try {
      const photo = await Photo.create({
        data: {
          userId,
          communityId: communityId || null,
          high: saved.high,
          medium: saved.medium,
          small: saved.small,
          vertical: saved.vertical,
          type: saved.type,
        },
      })
      return { ...photo, source: 'ALBUM' as const, postId: null, ownerId: userId, saved: false, savedAt: null }
    } catch (error) {
      // Файлы сохраняются до записи в БД: при ошибке убираем их, чтобы не копить мусор
      await storage.removeFiles(saved)
      throw error
    }
  }

  /** Удаляет только фото из отдельного альбома. Снимки из постов живут вместе со своими постами. */
  async remove(userId: number, id: number) {
    const photo = await Photo.findUnique({ where: { id } })
    if (!photo) throw createGraphQLError('Фотография не найдена')
    const allowed =
      photo.userId === userId || (!!photo.communityId && (await canManageContent(photo.communityId, userId)))
    if (!allowed) throw createGraphQLError('Нет доступа')

    await Photo.delete({ where: { id } })
    try {
      await new FileStorageService(storagePath).removeFiles({
        high: photo.high,
        medium: photo.medium,
        small: photo.small,
      })
    } catch (error) {
      // Файла может уже не быть — запись в БД всё равно должна удалиться
      console.error('Не удалось удалить файлы фотографии', id, error)
    }
    return true
  }

  /** Сохраняет чужое фото в личный альбом или убирает его оттуда. */
  async save(userId: number, source: string, id: number, saved: boolean) {
    if (source !== 'POST' && source !== 'ALBUM') throw createGraphQLError('Неизвестный источник фотографии')

    if (source === 'POST') {
      const image = await PostImage.findUnique({
        where: { id },
        select: { id: true, post: { select: { owner: true, archived: true } } },
      })
      if (!image) throw createGraphQLError('Фотография не найдена')
      if (image.post.owner === userId) throw createGraphQLError('Своё фото не нужно сохранять')
      if (image.post.archived) throw createGraphQLError('Фотография недоступна')

      if (saved) {
        await prisma.savedPhoto.upsert({
          where: { userId_postImageId: { userId, postImageId: id } },
          create: { userId, postImageId: id },
          update: {},
        })
      } else {
        await prisma.savedPhoto.deleteMany({ where: { userId, postImageId: id } })
      }
      return true
    }

    const photo = await Photo.findUnique({ where: { id }, select: { id: true, userId: true } })
    if (!photo) throw createGraphQLError('Фотография не найдена')
    if (photo.userId === userId) throw createGraphQLError('Своё фото не нужно сохранять')

    if (saved) {
      await prisma.savedPhoto.upsert({
        where: { userId_photoId: { userId, photoId: id } },
        create: { userId, photoId: id },
        update: {},
      })
    } else {
      await prisma.savedPhoto.deleteMany({ where: { userId, photoId: id } })
    }
    return true
  }
}

export default new PhotoService()
