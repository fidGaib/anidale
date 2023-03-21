import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'path'
import sharp from 'sharp'

type Hash = string

async function exists(path: string) {
  return fs
    .stat(path)
    .then(() => true)
    .catch(() => false)
}

class FileStorageService {
  constructor(private storagePath: string) {}

  async saveImage(file: File): Promise<{ minimize: string; oversize: string; vertical: boolean }> {
    const oversize = await this.saveFile(file)

    const sharpFile = sharp(await this.fileToBuffer(file))

    const { width, height } = await sharpFile.metadata()
    const vertical = Boolean(height && width && height > width)

    const minimize = await this.save(await sharpFile.jpeg({ mozjpeg: true }).toBuffer())

    return { oversize, minimize, vertical }
  }

  async fileToBuffer(file: File) {
    return Buffer.from(await file.arrayBuffer())
  }

  async saveFile(file: File) {
    return await this.save(await this.fileToBuffer(file))
  }

  async save(buffer: Buffer): Promise<Hash> {
    const hash = await this.bufferHash(buffer)

    const dirToSave = path.join(this.storagePath, hash.slice(0, 2))

    await fs.mkdir(dirToSave, { recursive: true })

    if (!(await exists(path.join(dirToSave, hash)))) {
      await fs.writeFile(path.join(dirToSave, hash), buffer)
    }

    return hash
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
