import { createGraphQLError } from 'graphql-yoga'

import { storagePath } from '@/config'
import { Music } from '@/db/models/music-model'
import { io } from '@/index'

import FileStorageService from '../post/file-service'

class MusicController {
  async create(owner: number, title: string, image: File) {
    if (!title && !image) throw createGraphQLError('Загрузите изображение и название')
    const dataDB = await Music.create({ data: { title, image: '', owner } })
    io.emit('newMusic', {
      music: {
        ...dataDB,
      },
    })
    return dataDB
  }
  async getMusic(limit: number, page: number, user_id?: number) {
    const skip = page * limit
    const whereCondition = user_id ? { owner: user_id } : undefined
    const dataDB = await Music.findMany({
      take: limit,
      skip: skip,
      where: whereCondition,
      orderBy: { id: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            avatar: true,
            login: true,
          },
        },
      },
    })
    return dataDB
  }
  async remove(id: number) {
    const storageService = new FileStorageService(storagePath)
    const dataDB = await Music.findUnique({
      where: { id },
    })
    if (!dataDB) throw createGraphQLError('Пост не найден')
    try {
      await storageService.removeFiles(dataDB.image)
      await Music.delete({
        where: { id },
      })
      return true
    } catch (error) {
      console.log(error)
      throw createGraphQLError('Ошибка на сервере: ', error!)
    }
  }
}

export default new MusicController()
