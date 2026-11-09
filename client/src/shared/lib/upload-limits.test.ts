import { describe, expect, it } from 'vitest'

import { MAX_REQUEST_BYTES, MAX_VIDEO_BYTES, validateUpload } from './upload-limits'

const MB = 1024 * 1024

/** Файл заданного размера и типа без реального содержимого в памяти. */
const file = (name: string, size: number, type = 'video/mp4') => {
  const f = new File([''], name, { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

describe('validateUpload: проверка размера до отправки', () => {
  it('небольшие файлы проходят', () => {
    expect(validateUpload([file('a.mp4', 10 * MB)])).toBe('')
    expect(validateUpload([])).toBe('')
  })

  it('видео ровно 100 МБ проходит, больше — нет, и в сообщении есть имя файла', () => {
    expect(validateUpload([file('ok.mp4', MAX_VIDEO_BYTES)])).toBe('')
    const message = validateUpload([file('большое.mp4', MAX_VIDEO_BYTES + 1)])
    expect(message).toContain('большое.mp4')
    expect(message).toContain('100 МБ')
  })

  it('ограничение 100 МБ действует только на видео, а не на картинки', () => {
    expect(validateUpload([file('photo.png', 105 * MB, 'image/png')])).toBe('')
  })

  it('общий размер запроса считается вместе с уже выбранными файлами', () => {
    const chosen = [file('one.mp4', 60 * MB)]
    expect(validateUpload([file('two.mp4', 40 * MB)], chosen)).toBe('')
    const message = validateUpload([file('three.mp4', 60 * MB)], chosen)
    expect(message).toContain('110 МБ')
  })

  it('запас на служебные части запроса: ровно 110 МБ уже не принимается', () => {
    const exactly = [file('a.mp4', 100 * MB), file('b.png', MAX_REQUEST_BYTES - 100 * MB, 'image/png')]
    expect(validateUpload(exactly)).not.toBe('')
  })
})
