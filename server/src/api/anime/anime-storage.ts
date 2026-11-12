import { createGraphQLError } from 'graphql-yoga'
import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

import FileStorageService, { SaveImage } from '../post/file-service'
import { MAX_VIDEO_SIZE, detectVideo, videoTitle } from '../video/video-service'

const ANIME_DIR = 'anime'
const VIDEO_DIR = `${ANIME_DIR}/videos`

export type AnimeImage = SaveImage

/**
 * Файлы каталога аниме лежат в `anime/` и открыты всем: каталог публичный, поэтому
 * постеры, кадры и серии не проходят проверку «виден ли объект» из storage/access.ts.
 * Пишет сюда только администратор.
 */
class AnimeStorageService {
  private images: FileStorageService

  constructor(private storagePath: string) {
    this.images = new FileStorageService(storagePath)
  }

  /** Постер или кадр серии: картинка проверяется и перекодируется в webp (как фото постов). */
  async saveImage(file: File, kind: 'posters' | 'previews'): Promise<AnimeImage> {
    if (!file) throw createGraphQLError('Выберите изображение')
    return await this.images.saveImage(file, `${ANIME_DIR}/${kind}/`)
  }

  /** Видео серии: формат определяется по содержимому, расширение выбирает сервер. */
  async saveVideo(file: File): Promise<{ file: string; size: number; type: string; title: string }> {
    if (!file) throw createGraphQLError('Выберите видеофайл')
    if (file.size > MAX_VIDEO_SIZE) {
      throw createGraphQLError(`Размер видео больше ${MAX_VIDEO_SIZE / 1024 / 1024} МБ`)
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    const format = detectVideo(buffer)
    if (!format) throw createGraphQLError('Можно загружать только видео (mp4, webm, ogv)')

    const relative = `${VIDEO_DIR}/${randomUUID()}.${format.ext}`
    await mkdir(path.join(this.storagePath, VIDEO_DIR), { recursive: true })
    await writeFile(path.join(this.storagePath, relative), buffer, { flag: 'wx' })
    return { file: relative, size: buffer.length, type: format.type, title: videoTitle(file) }
  }

  async removeImage(image: Partial<SaveImage> | string) {
    try {
      await this.images.removeFiles(image)
    } catch (error) {
      console.error('Не удалось удалить изображение аниме', error)
    }
  }

  /** Принимает только пути внутри `anime/videos/`, чтобы нельзя было выйти из каталога. */
  async removeVideo(relative: string) {
    if (!relative) return
    const full = path.resolve(this.storagePath, relative)
    if (!full.startsWith(path.resolve(this.storagePath, VIDEO_DIR) + path.sep)) return
    try {
      await unlink(full)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Не удалось удалить видео аниме', relative, error)
      }
    }
  }
}

export default AnimeStorageService
