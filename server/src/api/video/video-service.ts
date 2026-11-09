import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { createGraphQLError } from 'graphql-yoga'

export const MAX_VIDEO_SIZE = 100 * 1024 * 1024
const VIDEO_DIR = 'videos'

export interface VideoFormat {
  /** Расширение, под которым файл сохраняется (по нему serveStatic выбирает Content-Type). */
  ext: string
  type: string
}

const startsWith = (buf: Buffer, text: string, offset = 0) =>
  buf.length >= offset + text.length && buf.toString('latin1', offset, offset + text.length) === text

/**
 * Формат определяется по содержимому, а не по имени и MIME от клиента: их можно подделать.
 * Расширение выбирает сервер, поэтому под видом видео нельзя положить html/svg/js.
 */
export const detectVideo = (buf: Buffer): VideoFormat | null => {
  if (buf.length < 12) return null
  // ISO BMFF: mp4 и mov, оба начинаются с ftyp на смещении 4
  if (startsWith(buf, 'ftyp', 4)) return { ext: 'mp4', type: 'video/mp4' }
  // WebM/Matroska: сигнатура EBML
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return { ext: 'webm', type: 'video/webm' }
  }
  // Ogg с видео-потоком
  if (startsWith(buf, 'OggS')) return { ext: 'ogv', type: 'video/ogg' }
  return null
}

/** Заголовок видео: имя файла без расширения, обрезанное до разумной длины. */
export const videoTitle = (file: File) => {
  const name = file.name.replace(/\.[^.]+$/, '').trim().slice(0, 120)
  return name || 'Видео'
}

class VideoStorageService {
  constructor(private storagePath: string) {}

  /** Сохраняет видео и возвращает путь относительно хранилища, например `videos/<uuid>.mp4`. */
  async save(file: File): Promise<{ file: string; size: number; type: string; title: string }> {
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

  /** Удаляет файл. Принимает только пути внутри `videos/`, чтобы нельзя было выйти из каталога. */
  async remove(relative: string): Promise<void> {
    if (!relative.startsWith(`${VIDEO_DIR}/`)) return
    const full = path.resolve(this.storagePath, relative)
    if (!full.startsWith(path.resolve(this.storagePath, VIDEO_DIR) + path.sep)) return
    try {
      await unlink(full)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
}

export default VideoStorageService
