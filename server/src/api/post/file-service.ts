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
    /*const high = await this.saveFile(file, false)  До лучших времен :(*/
    // medium
    const medium = await this.save(compM, 'webp')
    // small
    const small = await this.save(compS, 'webp')
    // return files
    return { high: '', medium, small, vertical, type }
  }

  async fileToBuffer(file: File): Promise<Buffer> {
    return Buffer.from(await file.arrayBuffer())
  }

  async saveFile(file: File): Promise<Hash> {
    return await this.save(await this.fileToBuffer(file), file.type.split('/')[1])
  }

  async save(buffer: Buffer, type: string): Promise<Hash> {
    const hash = await this.bufferHash(buffer)
    const someDir = hash.slice(0, 2)
    const dirToSave = path.join(this.storagePath, someDir)
    const nameFile = hash + '.' + type
    await fs.mkdir(dirToSave, { recursive: true })

    if (!(await exists(path.join(dirToSave, nameFile)))) {
      await fs.writeFile(path.join(dirToSave, nameFile), buffer)
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
  async removeFile(image: SaveImage): Promise<boolean> {
    // const high = path.join(this.storagePath, image.high + '.' + image.type)
    const medium = path.join(this.storagePath, image.medium + '.' + 'webp')
    const small = path.join(this.storagePath, image.small + '.' + 'webp')
    // fs.unlink(high) 
    await fs.unlink(medium)
    await fs.unlink(small)
    return true
  }
}

export default FileStorageService
