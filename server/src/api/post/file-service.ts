import { createGraphQLError } from 'graphql-yoga'
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'path'
import sharp from 'sharp'

type Hash = string
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
  async validate(file: File): Promise<null> {
    if (file.size > 5242880) {
      throw createGraphQLError('размер файла больше 5мб')
    }
    if (file.type.split('/')[0] !== 'image') {
      throw createGraphQLError('Можно загружать только арты')
    }
    return null
  }
  async compress(file: File): Promise<CompressImage> {
    const comp = sharp(await this.fileToBuffer(file)).resize({ fit: 'cover' })
    const compM = await comp.toFormat('webp').toBuffer()
    const compS = await comp.toFormat('webp', { quality: 1, alphaQuality: 1 }).toBuffer()
    // // get width and high
    const { width, height } = await comp.metadata()
    // // get vertical
    const vertical = Boolean(height && width && height > width)
    return { compM, compS, vertical, type: file.type.split('/')[1] }
  }
  async saveImage(file: File): Promise<SaveImage> {
    await this.validate(file)
    // sharp compress
    const { compS, vertical, type, compM } = await this.compress(file)
    // high
    /*const high = await this.saveFile(file)  До лучших времен :(*/
    // medium
    const medium = await this.save(compM)
    // small
    const small = await this.save(compS)
    // return files
    return { high: '', medium, small, vertical, type }
  }

  async fileToBuffer(file: File): Promise<Buffer> {
    return Buffer.from(await file.arrayBuffer())
  }

  async saveFile(file: File): Promise<Hash> {
    return await this.save(await this.fileToBuffer(file))
  }

  async save(buffer: Buffer): Promise<Hash> {
    const hash = await this.bufferHash(buffer)
    const someDir = hash.slice(0, 2)
    const dirToSave = path.join(this.storagePath, hash.slice(0, 2))
    await fs.mkdir(dirToSave, { recursive: true })

    if (!(await exists(path.join(dirToSave, hash)))) {
      await fs.writeFile(path.join(dirToSave, hash), buffer)
    }

    return `${someDir}/${hash}`
  }

  async load(hash: Hash) {
    const filepath = path.join(this.storagePath, hash.slice(0, 2), hash)
    if (!(await exists(filepath))) {
      throw Error(`File '${filepath}' not found`)
    }
    return fs.readFile(filepath)
  }

  async bufferHash(buffer: Buffer, algorithm = 'md5'): Promise<string> {
    const shasum = createHash(algorithm)

    shasum.setEncoding('hex')

    shasum.write(buffer)

    shasum.end()

    return shasum.read()
  }
}

export default FileStorageService
