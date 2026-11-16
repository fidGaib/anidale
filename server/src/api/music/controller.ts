import { createGraphQLError } from 'graphql-yoga'

import NotificationController from '@/api/notification/controller'
import { storagePath } from '@/config'
import { Music } from '@/db/models/music-model'
import { io } from '@/index'

import { canManageContent, canPublish, canViewCommunity } from '../community/access'
import { canSeePost } from '../post/visibility'
import AudioStorageService from './audio-service'
import { invalidateMusicCache, musicCached } from './cache'

const MAX_PAGE_LIMIT = 50
const MAX_TEXT_LENGTH = 100

const userSelect = { select: { id: true, avatar: true, login: true } }

class MusicController {
  async create(owner: number, title: string, artist: string | undefined, file: File, communityId?: number | null) {
    if (communityId && !(await canPublish(communityId, owner))) {
      throw createGraphQLError('Добавлять музыку в сообщество могут только администраторы и редакторы')
    }
    const cleanTitle = title?.trim().slice(0, MAX_TEXT_LENGTH)
    if (!cleanTitle) throw createGraphQLError('Укажите название трека')
    if (!file) throw createGraphQLError('Загрузите аудиофайл')
    const cleanArtist = artist?.trim().slice(0, MAX_TEXT_LENGTH) || 'Неизвестный исполнитель'

    const storage = new AudioStorageService(storagePath)
    // Файл сохраняем до записи в БД; если запись не удалась, удаляем его, чтобы не копить мусор
    const saved = await storage.save(file)
    try {
      const music = await Music.create({
        data: {
          title: cleanTitle,
          artist: cleanArtist,
          file: saved.file,
          size: saved.size,
          owner,
          communityId: communityId || null,
        },
        include: { user: userSelect },
      })
      // Музыка сообщества в общую ленту не попадает
      await invalidateMusicCache()
      if (!communityId) io.emit('newMusic', { music })
      return music
    } catch (error) {
      await storage.remove(saved.file).catch(() => undefined)
      throw error
    }
  }

  async getMusic(limit: number, page: number, user_id?: number) {
    // Защита от запросов вида limit = 1000000 и отрицательных значений
    const take = Math.min(Math.max(Math.trunc(limit) || 1, 1), MAX_PAGE_LIMIT)
    const skip = Math.max(Math.trunc(page) || 0, 0) * take
    // Личная страница: без треков сообществ, которые загрузил этот человек
    return await musicCached(`user:${user_id ?? 'all'}:${take}:${skip}`, () =>
      Music.findMany({
        take,
        skip,
        where: user_id ? { owner: user_id, communityId: null, postId: null } : { communityId: null, postId: null },
        orderBy: { id: 'desc' },
        include: { user: userSelect },
      }),
    )
  }

  /** Музыка сообщества: новые сверху. Закрытое сообщество показывает её только участникам. */
  async getCommunityMusic(communityId: number, limit: number, page: number, viewerId?: number) {
    if (!(await canViewCommunity(communityId, viewerId))) return []
    const take = Math.min(Math.max(Math.trunc(limit) || 1, 1), MAX_PAGE_LIMIT)
    const skip = Math.max(Math.trunc(page) || 0, 0) * take
    // Доступ уже проверен, поэтому список одинаков для всех, кому сообщество видно
    return await musicCached(`community:${communityId}:${take}:${skip}`, () =>
      Music.findMany({
        take,
        skip,
        where: { communityId, postId: null },
        orderBy: { id: 'desc' },
        include: { user: userSelect },
      }),
    )
  }

  /** Условие выборки треков: только с файлом, при поиске — по названию или исполнителю. */
  private searchWhere(search?: string) {
    return {
      file: { not: '' },
      communityId: null,
      postId: null,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { artist: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }
  }

  /** Сколько разных треков (по файлу) подходит под поиск. */
  async countAll(search?: string) {
    const key = search?.trim() ?? ''
    return await musicCached(`count:${key}`, async () => {
      const groups = await Music.groupBy({ by: ['file'], where: this.searchWhere(search) })
      return groups.length
    })
  }

  /** Вся музыка сайта для ленты. Один и тот же файл, добавленный в несколько профилей, показывается один раз. */
  async getAllMusic(limit: number, page: number, search?: string) {
    const take = Math.min(Math.max(Math.trunc(limit) || 1, 1), MAX_PAGE_LIMIT)
    const skip = Math.max(Math.trunc(page) || 0, 0) * take
    return await musicCached(`all:${take}:${skip}:${search?.trim() ?? ''}`, async () => {
      const page_ = await Music.findMany({
        take,
        skip,
        // Записи без файла (созданные до появления загрузки аудио) играть нечем
        where: this.searchWhere(search),
        distinct: ['file'],
        orderBy: { id: 'desc' },
        select: { file: true },
      })
      if (page_.length === 0) return []
      // Автор оригинала — самая ранняя запись с этим файлом (остальные — копии, добавленные из ленты)
      const originals = await Music.findMany({
        where: { file: { in: page_.map((row) => row.file) } },
        distinct: ['file'],
        orderBy: { id: 'asc' },
        include: { user: userSelect },
      })
      const byFile = new Map(originals.map((row) => [row.file, row]))
      return page_.flatMap((row) => {
        const original = byFile.get(row.file)
        return original ? [original] : []
      })
    })
  }

  /** Файлы треков пользователя (без пустых). Потолок защищает от огромного ответа. */
  async getMyFiles(userId: number) {
    return await musicCached(`mine:${userId}`, async () => {
      const rows = await Music.findMany({
        where: { owner: userId, communityId: null, postId: null, file: { not: '' } },
        select: { file: true },
        take: 5000,
      })
      return rows.map((row) => row.file)
    })
  }

  /** Копирует чужой трек в профиль пользователя. Файл общий, в хранилище он не дублируется. */
  async addToProfile(id: number, userId: number) {
    const source = await Music.findUnique({ where: { id } })
    if (!source || !source.file) throw createGraphQLError('Трек не найден')
    // Трек сообщества можно взять к себе, если сообщество вам видно
    if (source.communityId && !(await canViewCommunity(source.communityId, userId))) {
      throw createGraphQLError('Трек не найден')
    }
    // Трек из записи можно взять к себе, если запись вам видна
    if (source.postId && !(await canSeePost(source.postId, userId))) throw createGraphQLError('Трек не найден')
    if (source.owner === userId && !source.communityId && !source.postId) {
      throw createGraphQLError('Этот трек уже в вашем профиле')
    }
    const exists = await Music.findFirst({
      where: { owner: userId, communityId: null, postId: null, file: source.file },
    })
    if (exists) throw createGraphQLError('Этот трек уже в вашем профиле')

    const added = await Music.create({
      data: {
        title: source.title,
        artist: source.artist,
        file: source.file,
        size: source.size,
        owner: userId,
      },
      include: { user: userSelect },
    })
    await invalidateMusicCache()
    if (!source.communityId && !source.postId)
      await NotificationController.notify(source.owner, userId, 'track', { text: source.title })
    return added
  }

  async remove(id: number, userId: number) {
    const music = await Music.findUnique({ where: { id } })
    if (!music) throw createGraphQLError('Трек не найден')
    // Удалять можно свои треки, а трек сообщества — ещё и тем, кто ведёт его содержимое
    const allowed =
      music.owner === userId || (!!music.communityId && (await canManageContent(music.communityId, userId)))
    // Трек записи удаляется вместе с записью
    if (music.postId) throw createGraphQLError('Трек прикреплён к записи: удалите запись')
    if (!allowed) throw createGraphQLError('Нет доступа')

    await Music.delete({ where: { id } })
    await invalidateMusicCache()
    await this.removeFileIfUnused(music.file)
    return true
  }

  /** Убирает из профиля пользователя все записи с этим файлом: и загруженную им, и добавленную копию. */
  async removeMine(file: string, userId: number) {
    if (!file) throw createGraphQLError('Трек не найден')
    const { count } = await Music.deleteMany({ where: { owner: userId, communityId: null, postId: null, file } })
    if (count === 0) throw createGraphQLError('Трека нет в вашем профиле')
    await invalidateMusicCache()
    await this.removeFileIfUnused(file)
    return true
  }

  /** Удаляет все треки сообщества вместе с файлами, которые больше нигде не нужны. */
  async removeCommunityTracks(communityId: number) {
    const tracks = await Music.findMany({ where: { communityId }, select: { id: true, file: true } })
    await Music.deleteMany({ where: { communityId } })
    await invalidateMusicCache()
    for (const track of tracks) await this.removeFileIfUnused(track.file)
  }

  /** Удаляет файлы, которые после удаления записи или сообщества больше никому не нужны. */
  async removeFilesIfUnused(files: string[]) {
    for (const file of new Set(files)) await this.removeFileIfUnused(file)
  }

  /** Файл могут использовать копии в других профилях: удаляем его только вместе с последней записью. */
  private async removeFileIfUnused(file: string) {
    if (!file) return
    const stillUsed = await Music.findFirst({ where: { file } })
    if (stillUsed) return
    await new AudioStorageService(storagePath).remove(file).catch((error) => {
      console.error('Не удалось удалить аудиофайл', file, error)
    })
  }
}

export default new MusicController()
