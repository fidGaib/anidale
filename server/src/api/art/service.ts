import { storagePath } from '@/config'
import { Art } from '@/db/models/art-model'
import { io } from '@/index'

import FileStorageService, { SaveImage } from '../post/file-service'

class ArtsService {
  async create(owner: number, images: File[]) {}
  async findAll(limit: number, page: number) {}
  async findByUser(id: number, limit: number, page: number) {}
}
export default new ArtsService()
