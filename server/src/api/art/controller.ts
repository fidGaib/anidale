import { createGraphQLError } from 'graphql-yoga'

import ArtsService from './service'

class ArtsController {
  async create(owner: number, images: File[]) {
    if (!images?.length) throw createGraphQLError('Загрузите изображение')
    const artsData = await ArtsService.create(owner, images)
    return artsData
  }
  async getArts(limit: number, page: number) {
    return await ArtsService.findAll(limit, page)
  }
  async getArtsByUser(id: number, limit: number, page: number) {
    return await ArtsService.findByUser(id, limit, page)
  }
}
export default new ArtsController()
