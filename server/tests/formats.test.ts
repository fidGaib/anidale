import { describe, expect, it } from 'vitest'

import { sanitizeFileName } from '@/api/message/attachment-service'
import { detectAudio } from '@/api/music/audio-service'
import { detectVideo, videoTitle } from '@/api/video/video-service'

/** Буфер из заголовка нужной длины: сигнатуры форматов проверяются по первым байтам. */
const buffer = (head: number[] | string, offset = 0, size = 32) => {
  const buf = Buffer.alloc(size)
  if (typeof head === 'string') buf.write(head, offset, 'latin1')
  else Buffer.from(head).copy(buf, offset)
  return buf
}

describe('определение формата видео по содержимому', () => {
  it('узнаёт mp4/mov по ftyp, webm по EBML, ogv по OggS', () => {
    expect(detectVideo(buffer('ftypisom', 4))).toEqual({ ext: 'mp4', type: 'video/mp4' })
    expect(detectVideo(buffer([0x1a, 0x45, 0xdf, 0xa3]))).toEqual({ ext: 'webm', type: 'video/webm' })
    expect(detectVideo(buffer('OggS'))).toEqual({ ext: 'ogv', type: 'video/ogg' })
  })

  it('отвергает html, svg, скрипты и слишком короткие файлы', () => {
    expect(detectVideo(buffer('<html><script>alert(1)</script>'))).toBeNull()
    expect(detectVideo(buffer('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull()
    expect(detectVideo(Buffer.from('ftyp'))).toBeNull()
    expect(detectVideo(Buffer.alloc(0))).toBeNull()
  })

  it('заголовок берёт из имени файла без расширения и не длиннее 120 символов', () => {
    expect(videoTitle(new File([''], 'Отпуск 2025.mp4'))).toBe('Отпуск 2025')
    expect(videoTitle(new File([''], `${'я'.repeat(300)}.mp4`))).toHaveLength(120)
    expect(videoTitle(new File([''], '.mp4'))).toBe('Видео')
  })
})

describe('определение формата аудио по содержимому', () => {
  it('узнаёт основные форматы', () => {
    expect(detectAudio(buffer('ID3'))?.ext).toBe('mp3')
    expect(detectAudio(buffer('OggS'))?.ext).toBe('ogg')
    expect(detectAudio(buffer('fLaC'))?.ext).toBe('flac')
    expect(detectAudio(buffer('WAVE', 8))?.ext).toBe(undefined)
    const wav = buffer('RIFF')
    wav.write('WAVE', 8, 'latin1')
    expect(detectAudio(wav)?.ext).toBe('wav')
    expect(detectAudio(buffer('ftypM4A ', 4))?.ext).toBe('m4a')
    expect(detectAudio(buffer([0x1a, 0x45, 0xdf, 0xa3]))?.ext).toBe('weba')
    expect(detectAudio(buffer([0xff, 0xfb, 0x90]))?.ext).toBe('mp3')
  })

  it('не принимает не-аудио', () => {
    expect(detectAudio(buffer('<html>'))).toBeNull()
    expect(detectAudio(Buffer.from('ID3'))).toBeNull()
  })
})

describe('имя вложения', () => {
  it('убирает путь, управляющие символы и запрещённые знаки', () => {
    expect(sanitizeFileName('a/b\\c:d*e?.txt')).toBe('abcde.txt')
    expect(sanitizeFileName('<script>x</script>.png')).toBe('scriptxscript.png')
    expect(sanitizeFileName('\u0000\u0007name')).toBe('name')
  })

  it('пустое имя заменяет на «file», длинное обрезает до 120', () => {
    expect(sanitizeFileName('   ')).toBe('file')
    expect(sanitizeFileName('x'.repeat(500))).toHaveLength(120)
  })
})
