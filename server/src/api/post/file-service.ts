import { createGraphQLError } from 'graphql-yoga'
import os from 'node:os'

import { createLimiter } from '@/utils/limiter'

import { load, removeFiles, saveImage } from './native/'

// Обработка картинки занимает ядро процессора и держит декодированный кадр в памяти.
// Не больше числа логических процессоров одновременно: остальные ждут в очереди.
const imageLimiter = createLimiter(os.availableParallelism())

export interface SaveImage {
  high: string
  medium: string
  small: string
  vertical: boolean
  type: string
}

class FileStorageService {
  constructor(private storagePath: string) {}

  async saveImage(file: File, src: string): Promise<SaveImage> {
    const buffer = Buffer.from(await file.arrayBuffer())
    try {
      return await imageLimiter(() => saveImage(buffer, this.storagePath, src))
    } catch (error) {
      throw createGraphQLError((error as Error).message)
    }
  }

  async load(hash: string): Promise<Buffer> {
    return load(hash, this.storagePath)
  }

  /** Удаляет файлы картинки. Нужны только пути (medium, small, high): остальные поля SaveImage необязательны. */
  async removeFiles(images: Partial<SaveImage> | Partial<SaveImage>[] | string): Promise<boolean> {
    return removeFiles(images as unknown as Parameters<typeof removeFiles>[0], this.storagePath)
  }
}

export default FileStorageService
