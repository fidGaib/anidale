import { createGraphQLError } from 'graphql-yoga'
import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { detectAudio } from '../music/audio-service'
import FileStorageService from '../post/file-service'

export const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024
export const MAX_ATTACHMENTS = 10
/** Суммарный размер вложений одного сообщения: файлы читаются в память, потолок защищает сервер. */
export const MAX_TOTAL_SIZE = 100 * 1024 * 1024

const ROOT = 'messages'

export type AttachmentKind = 'image' | 'audio' | 'file'

export interface SavedAttachment {
  kind: AttachmentKind
  name: string
  size: number
  /** image: путь medium без расширения; audio/file: путь файла в хранилище. */
  file: string
  thumb: string
  high: string
}

/** Имя файла для показа: без путей и управляющих символов, ограниченной длины. */
export const sanitizeFileName = (name: string) => {
  const clean = name
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '')
    .trim()
    .slice(0, 120)
  return clean || 'file'
}

class AttachmentService {
  constructor(private storagePath: string) {}

  private async writeBuffer(relative: string, buffer: Buffer) {
    await mkdir(path.dirname(path.join(this.storagePath, relative)), { recursive: true })
    await writeFile(path.join(this.storagePath, relative), buffer, { flag: 'wx' })
  }

  /**
   * Тип вложения определяется по содержимому, а не по имени:
   * картинка → конвейер обработки изображений, аудио → проверка сигнатуры,
   * всё остальное → обычный файл, который отдаётся только на скачивание.
   */
  async save(file: File): Promise<SavedAttachment> {
    if (file.size > MAX_ATTACHMENT_SIZE) {
      throw createGraphQLError(`Файл «${sanitizeFileName(file.name)}» больше ${MAX_ATTACHMENT_SIZE / 1024 / 1024} МБ`)
    }
    const name = sanitizeFileName(file.name)

    if (file.type.startsWith('image/')) {
      const image = await new FileStorageService(this.storagePath).saveImage(file, `${ROOT}/images/`)
      return { kind: 'image', name, size: file.size, file: image.medium, thumb: image.small, high: image.high }
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const audio = detectAudio(buffer)
    if (audio) {
      const relative = `${ROOT}/audio/${randomUUID()}.${audio.ext}`
      await this.writeBuffer(relative, buffer)
      return { kind: 'audio', name, size: buffer.length, file: relative, thumb: '', high: '' }
    }

    // Без расширения: сервер не угадает тип по имени, а значит не отдаст файл как html/svg/js
    const relative = `${ROOT}/files/${randomUUID()}`
    await this.writeBuffer(relative, buffer)
    return { kind: 'file', name, size: buffer.length, file: relative, thumb: '', high: '' }
  }

  /** Удаляет файлы вложения. Ошибки не пробрасываются: потерянный файл не должен ломать удаление сообщения. */
  async remove(attachment: Pick<SavedAttachment, 'kind' | 'file' | 'thumb'>) {
    try {
      if (attachment.kind === 'image') {
        await new FileStorageService(this.storagePath).removeFiles({
          medium: attachment.file,
          small: attachment.thumb,
        })
        return
      }
      // Только внутри messages/, чтобы нельзя было выйти из каталога
      const root = path.resolve(this.storagePath, ROOT) + path.sep
      const full = path.resolve(this.storagePath, attachment.file)
      if (!attachment.file.startsWith(`${ROOT}/`) || !full.startsWith(root)) return
      await unlink(full)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Не удалось удалить вложение', attachment.file, error)
      }
    }
  }
}

export default AttachmentService
