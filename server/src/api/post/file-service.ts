import { createGraphQLError } from 'graphql-yoga'

import { load, removeFiles, saveImage } from './native/'

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
      return await saveImage(buffer, this.storagePath, src)
    } catch (error) {
      throw createGraphQLError((error as Error).message)
    }
  }

  async load(hash: string): Promise<Buffer> {
    return load(hash, this.storagePath)
  }

  async removeFiles(images: SaveImage | SaveImage[] | string): Promise<boolean> {
    return removeFiles(images as any, this.storagePath)
  }
}

export default FileStorageService
