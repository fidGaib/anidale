import { createGraphQLError } from 'graphql-yoga'

import NotificationController from '@/api/notification/controller'
import { storagePath } from '@/config'
import { Music } from '@/db/models/music-model'
import { io } from '@/index'

import AudioStorageService from './audio-service'

const MAX_PAGE_LIMIT = 50
const MAX_TEXT_LENGTH = 100

const userSelect = { select: { id: true, avatar: true, login: true } }

class MusicController {
  async create(owner: number, title: string, artist: string | undefined, file: File) {
    const cleanTitle = title?.trim().slice(0, MAX_TEXT_LENGTH)
    if (!cleanTitle) throw createGraphQLError('Укажите название трека')
    if (!file) throw createGraphQLError('Загрузите аудиофайл')
    const cleanArtist = artist?.trim().slice(0, MAX_TEXT_LENGTH) || 'Неизвестный исполнитель'

    const storage = new AudioStorageService(storagePath)
    // Файл сохраняем до записи в БД; если запись не удалась, удаляем его, чтобы не копить мусор
    const saved = await storage.save(file)
    try {
      const music = await Music.create({
        data: { title: cleanTitle, artist: cleanArtist, file: saved.file, size: saved.size, owner },
        include: { user: userSelect },
      })
      io.emit('newMusic', { music })
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
    return await Music.findMany({
      take,
      skip,
      where: user_id ? { owner: user_id } : undefined,
      orderBy: { id: 'desc' },
      include: { user: userSelect },
    })
  }

  /** Условие выборки треков: только с файлом, при поиске — по названию или исполнителю. */
  private searchWhere(search?: string) {
    return {
      file: { not: '' },
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
    const groups = await Music.groupBy({ by: ['file'], where: this.searchWhere(search) })
    return groups.length
  }

  /** Вся музыка сайта для ленты. Один и тот же файл, добавленный в несколько профилей, показывается один раз. */
  async getAllMusic(limit: number, page: number, search?: string) {
    const take = Math.min(Math.max(Math.trunc(limit) || 1, 1), MAX_PAGE_LIMIT)
    const skip = Math.max(Math.trunc(page) || 0, 0) * take
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
  }

  /** Файлы треков пользователя (без пустых). Потолок защищает от огромного ответа. */
  async getMyFiles(userId: number) {
    const rows = await Music.findMany({
      where: { owner: userId, file: { not: '' } },
      select: { file: true },
      take: 5000,
    })
    return rows.map((row) => row.file)
  }

  /** Копирует чужой трек в профиль пользователя. Файл общий, в хранилище он не дублируется. */
  async addToProfile(id: number, userId: number) {
    const source = await Music.findUnique({ where: { id } })
    if (!source || !source.file) throw createGraphQLError('Трек не найден')
    if (source.owner === userId) throw createGraphQLError('Этот трек уже в вашем профиле')
    const exists = await Music.findFirst({ where: { owner: userId, file: source.file } })
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
    await NotificationController.notify(source.owner, userId, 'track', { text: source.title })
    return added
  }

  async remove(id: number, userId: number) {
    const music = await Music.findUnique({ where: { id } })
    if (!music) throw createGraphQLError('Трек не найден')
    // Удалять можно только свои треки
    if (music.owner !== userId) throw createGraphQLError('Нет доступа')

    await Music.delete({ where: { id } })
    await this.removeFileIfUnused(music.file)
    return true
  }

  /** Убирает из профиля пользователя все записи с этим файлом: и загруженную им, и добавленную копию. */
  async removeMine(file: string, userId: number) {
    if (!file) throw createGraphQLError('Трек не найден')
    const { count } = await Music.deleteMany({ where: { owner: userId, file } })
    if (count === 0) throw createGraphQLError('Трека нет в вашем профиле')
    await this.removeFileIfUnused(file)
    return true
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
