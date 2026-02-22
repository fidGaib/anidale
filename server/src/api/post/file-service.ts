import { createGraphQLError } from 'graphql-yoga'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'path'
import sharp from 'sharp'

export interface SaveImage {
  high: string
  medium: string
  small: string
  vertical: boolean
  type: string
}
interface CompressImage {
  compM: Buffer
  compS: Buffer
  vertical: boolean
  type: string
}

async function exists(path: string) {
  return fs
    .stat(path)
    .then(() => true)
    .catch(() => false)
}

class FileStorageService {
  constructor(private storagePath: string) {}
  private async validate(file: File): Promise<null> {
    if (file.size > 5242880) {
      throw createGraphQLError('размер файла больше 5мб')
    }
    if (file.type.split('/')[0] !== 'image') {
      throw createGraphQLError('Можно загружать только арты')
    }
    return null
  }
  private async compress(file: File): Promise<CompressImage> {
    const comp = sharp(await this.fileToBuffer(file)).resize({ fit: 'cover' })
    const compM = await comp.toFormat('webp').toBuffer()
    const compS = await comp.toFormat('webp', { quality: 1, alphaQuality: 1 }).toBuffer()
    const { width, height } = await comp.metadata()
    const vertical = Boolean(height && width && height > width)
    return { compM, compS, vertical, type: file.type.split('/')[1] }
  }
  async saveImage(file: File, src: string): Promise<SaveImage> {
    await this.validate(file)
    const { compS, vertical, type, compM } = await this.compress(file)
    const medium = await this.save(compM, src, 'webp')
    const small = await this.save(compS, src, 'webp')
    return { high: '', medium, small, vertical, type }
  }

  private async fileToBuffer(file: File): Promise<Buffer> {
    return Buffer.from(await file.arrayBuffer())
  }
  private async save(buffer: Buffer, src: string, type: string): Promise<string> {
    const hash = await this.bufferHash(buffer)
    const someDir = hash.slice(0, 2)
    const dirToSave = path.join(this.storagePath, src, someDir)
    const nameFile = hash + '.' + type
    await fs.mkdir(dirToSave, { recursive: true })

    if (!(await exists(path.join(dirToSave, nameFile)))) {
      await fs.writeFile(path.join(dirToSave, nameFile), buffer)
    }
    return `${src}${someDir}/${hash}`
  }

  async load(hash: string) {
    const filepath = path.join(this.storagePath, hash.slice(0, 2), hash)
    if (!(await exists(filepath))) {
      throw Error(`File '${filepath}' not found`)
    }
    return fs.readFile(filepath)
  }

  private async bufferHash(buffer: Buffer, algorithm = 'md5'): Promise<string> {
    const shasum = createHash(algorithm)

    shasum.setEncoding('hex')

    shasum.write(buffer)

    shasum.end()

    return shasum.read()
  }
  async removeFile(image: SaveImage): Promise<boolean> {
    const medium = path.join(this.storagePath, image.medium + '.' + 'webp')
    const small = path.join(this.storagePath, image.small + '.' + 'webp')
    try {
      await fs.unlink(medium)
      await fs.unlink(small)
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return true
      } else console.log(error)
    }
    return true
  }
  async removeAvatar(avatar: string): Promise<boolean> {
    try {
      await fs.unlink(path.join(this.storagePath, avatar + '.' + 'webp'))
    } catch (error) {
      console.log(error)
    }
    return true
  }
}

export default FileStorageService

// async saveFile(file: File): Promise<Hash> {
//   return await this.save(await this.fileToBuffer(file), file.type.split('/')[1])
// }
