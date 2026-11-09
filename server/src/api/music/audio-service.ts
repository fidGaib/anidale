import { createGraphQLError } from 'graphql-yoga'
import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const MAX_AUDIO_SIZE = 15 * 1024 * 1024
const MUSIC_DIR = 'music'

export interface AudioFormat {
  /** Расширение, под которым файл сохраняется (по нему nginx/serveStatic выбирают Content-Type). */
  ext: string
}

const startsWith = (buf: Buffer, text: string, offset = 0) =>
  buf.length >= offset + text.length && buf.toString('latin1', offset, offset + text.length) === text

/**
 * Определяет формат по содержимому, а не по имени и MIME-типу от клиента (их можно подделать).
 * Расширение выбирает сервер, поэтому под видом аудио нельзя положить html/svg/js.
 */
export const detectAudio = (buf: Buffer): AudioFormat | null => {
  if (buf.length < 12) return null
  if (startsWith(buf, 'ID3')) return { ext: 'mp3' }
  if (startsWith(buf, 'OggS')) return { ext: 'ogg' }
  if (startsWith(buf, 'fLaC')) return { ext: 'flac' }
  if (startsWith(buf, 'RIFF') && startsWith(buf, 'WAVE', 8)) return { ext: 'wav' }
  if (startsWith(buf, 'ftyp', 4)) return { ext: 'm4a' }
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return { ext: 'weba' }
  // MPEG-аудио или AAC ADTS: синхрослово 11 бит единиц; у ADTS биты layer равны 00
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) {
    return (buf[1] & 0x06) === 0 ? { ext: 'aac' } : { ext: 'mp3' }
  }
  return null
}

class AudioStorageService {
  constructor(private storagePath: string) {}

  /** Сохраняет файл и возвращает путь относительно хранилища, например `music/<uuid>.mp3`. */
  async save(file: File): Promise<{ file: string; size: number }> {
    if (file.size > MAX_AUDIO_SIZE) {
      throw createGraphQLError(`Размер файла больше ${MAX_AUDIO_SIZE / 1024 / 1024} МБ`)
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    const format = detectAudio(buffer)
    if (!format) throw createGraphQLError('Можно загружать только аудио (mp3, ogg, wav, flac, m4a, aac, webm)')

    const relative = `${MUSIC_DIR}/${randomUUID()}.${format.ext}`
    await mkdir(path.join(this.storagePath, MUSIC_DIR), { recursive: true })
    await writeFile(path.join(this.storagePath, relative), buffer, { flag: 'wx' })
    return { file: relative, size: buffer.length }
  }

  /** Удаляет файл. Принимает только пути внутри `music/`, чтобы нельзя было выйти из каталога. */
  async remove(relative: string): Promise<void> {
    if (!relative.startsWith(`${MUSIC_DIR}/`)) return
    const full = path.resolve(this.storagePath, relative)
    if (!full.startsWith(path.resolve(this.storagePath, MUSIC_DIR) + path.sep)) return
    try {
      await unlink(full)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
}

export default AudioStorageService
