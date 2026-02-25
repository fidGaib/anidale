import { createGraphQLError } from 'graphql-yoga'
import fs from 'node:fs/promises'
import { PassThrough, Readable } from 'node:stream'
import os from 'os'
import path from 'path'
import sharp from 'sharp'
import xxhash from 'xxhashjs'

export interface SaveImage {
  high: string
  medium: string
  small: string
  vertical: boolean
  type: string
}
class FileStorageService {
  constructor(private storagePath: string) {
    sharp.concurrency(os.cpus().length)
  }

  private async saveStream(stream: Readable, src: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      stream.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks)
          const hash = xxhash.h64(buffer, 0xabcd1234).toString(16).padStart(16, '0')
          const dirToSave = path.join(this.storagePath, src, hash.slice(0, 2))
          const filePath = path.join(dirToSave, hash + '.webp')
          await fs.mkdir(dirToSave, { recursive: true })
          await fs.writeFile(filePath, buffer)
          resolve(`${src}${hash.slice(0, 2)}/${hash}`)
        } catch (error) {
          reject(error)
        }
      })
      stream.on('error', reject)
    })
  }
  async saveImage(file: File, src: string): Promise<SaveImage> {
    //Валидация
    if (file.size > 5242880) throw createGraphQLError('размер файла больше 5мб')
    if (file.type.split('/')[0] !== 'image') throw createGraphQLError('Можно загружать только арты')
    //Сжатие
    const buffer = Buffer.from(await file.arrayBuffer())
    let mediumStream, smallStream
    if (src === 'avatars/') {
      // Для аватарок: высокое качество, фиксированный размер
      const compMedium = sharp(buffer) // фиксированный размер для аватарок
        .webp({ quality: 100, alphaQuality: 100 })
      mediumStream = compMedium.pipe(new PassThrough())
      smallStream = Promise.resolve('') // small не нужен для аватарок
    } else {
      const compMedium = sharp(buffer).webp({ quality: 100, alphaQuality: 100 })
      const compSmall = sharp(buffer).webp({ quality: 1, alphaQuality: 1 })
      mediumStream = compMedium.pipe(new PassThrough())
      smallStream = compSmall.pipe(new PassThrough())
    }
    const comp = sharp(buffer).resize({ fit: 'cover' })
    //Сохранение
    const [medium, small, { width, height }] = await Promise.all([
      this.saveStream(mediumStream, src),
      src === 'avatars/' ? Promise.resolve('') : this.saveStream(smallStream, src),
      comp.metadata(),
    ])
    const vertical = Boolean(height && width && height > width)
    const type = file.type.split('/')[1]
    //Возращение путей до изображений
    return { high: '', medium, small, vertical, type }
  }
  async load(hash: string) {
    const filepath = path.join(this.storagePath, hash.slice(0, 2), hash)
    try {
      return await fs.readFile(filepath)
    } catch (error) {
      //@ts-ignore
      if (error?.code === 'ENOENT') throw Error(`File '${filepath}' not found`)
      throw error
    }
  }
  async removeFiles(images: SaveImage | SaveImage[] | string): Promise<boolean> {
    const pathsToRemove: string[] = []
    // Обрабатываем разные типы входных данных
    if (typeof images === 'string') {
      // Случай для removeAvatar: строка — это путь к аватару
      pathsToRemove.push(path.join(this.storagePath, images + '.webp'))
    } else if (Array.isArray(images)) {
      // Если передали массив SaveImage (на будущее)
      for (const image of images) {
        pathsToRemove.push(
          path.join(this.storagePath, image.medium + '.webp'),
          path.join(this.storagePath, image.small + '.webp'),
        )
      }
    } else {
      // Случай для SaveImage: объект с medium и small
      pathsToRemove.push(
        path.join(this.storagePath, images.medium + '.webp'),
        path.join(this.storagePath, images.small + '.webp'),
      )
    }
    // Удаляем все файлы параллельно, игнорируем ошибки ENOENT
    const results = await Promise.allSettled(
      pathsToRemove.map((filePath) =>
        fs.unlink(filePath).catch((error) => {
          if (error?.code !== 'ENOENT') {
            console.log(`Ошибка при удалении файла ${filePath}:`, error)
          }
        }),
      ),
    )
    // Проверяем, были ли критические ошибки (не ENOENT)
    const hasCriticalErrors = results.some(
      (result) => result.status === 'rejected' && (result as PromiseRejectedResult).reason?.code !== 'ENOENT',
    )
    return !hasCriticalErrors
  }
}

export default FileStorageService
