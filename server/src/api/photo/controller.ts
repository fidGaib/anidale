import { createGraphQLError } from 'graphql-yoga'

import PhotoService from './service'

class PhotoController {
  async list(id: number, limit?: number | null, offset?: number | null, viewerId?: number) {
    return await PhotoService.list(id, limit, offset, viewerId)
  }
  async count(id: number, viewerId?: number) {
    return await PhotoService.count(id, viewerId)
  }
  async listSaved(userId: number | undefined, limit?: number | null, offset?: number | null) {
    if (!userId) throw createGraphQLError('Требуется авторизация')
    return await PhotoService.listSaved(userId, limit, offset)
  }
  async create(userId: number | undefined, image: File, communityId?: number | null) {
    if (!userId) throw createGraphQLError('Требуется авторизация')
    return await PhotoService.create(userId, image, communityId)
  }
  async remove(userId: number | undefined, id: number) {
    if (!userId) throw createGraphQLError('Требуется авторизация')
    return await PhotoService.remove(userId, id)
  }
  async save(userId: number | undefined, source: string, id: number, saved: boolean) {
    if (!userId) throw createGraphQLError('Требуется авторизация')
    return await PhotoService.save(userId, source, id, saved)
  }
}

export default new PhotoController()
