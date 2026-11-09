import { describe, expect, it } from 'vitest'

import {
  EditorBlock,
  emptyBlock,
  fromStored,
  hasContent,
  insertAfter,
  moveBlock,
  parseStored,
  readingMinutes,
  removeBlock,
  serializeArticle,
  updateBlock,
  validateImage,
} from './model'

const p = (id: number, text: string): EditorBlock => ({ id, type: 'p', text })
const ids = (blocks: EditorBlock[]) => blocks.map((b) => b.id)

describe('операции над блоками', () => {
  it('новый блок получает свободный id', () => {
    expect(emptyBlock([p(1, 'a'), p(5, 'b')]).id).toBe(6)
    expect(emptyBlock([], 'h')).toMatchObject({ id: 1, type: 'h', text: '' })
  })

  it('insertAfter вставляет после нужного блока, в начало и в конец', () => {
    const blocks = [p(1, 'a'), p(2, 'b')]
    expect(ids(insertAfter(blocks, 1, p(3, 'c')))).toEqual([1, 3, 2])
    expect(ids(insertAfter(blocks, null, p(3, 'c')))).toEqual([3, 1, 2])
    expect(ids(insertAfter(blocks, 99, p(3, 'c')))).toEqual([1, 2, 3])
  })

  it('updateBlock и removeBlock меняют только нужный блок', () => {
    const blocks = [p(1, 'a'), p(2, 'b')]
    expect(updateBlock(blocks, 2, { text: 'x' })[1]).toMatchObject({ text: 'x' })
    expect(updateBlock(blocks, 2, { text: 'x' })[0]).toEqual(blocks[0])
    expect(ids(removeBlock(blocks, 1))).toEqual([2])
  })

  it('moveBlock двигает и не выходит за края', () => {
    const blocks = [p(1, 'a'), p(2, 'b'), p(3, 'c')]
    expect(ids(moveBlock(blocks, 2, -1))).toEqual([2, 1, 3])
    expect(ids(moveBlock(blocks, 2, 1))).toEqual([1, 3, 2])
    expect(moveBlock(blocks, 1, -1)).toBe(blocks)
    expect(moveBlock(blocks, 3, 1)).toBe(blocks)
  })
})

describe('hasContent', () => {
  it('пустые и пробельные блоки не считаются', () => {
    expect(hasContent([p(1, ''), p(2, '  ')])).toBe(false)
    expect(hasContent([p(1, ''), p(2, 'текст')])).toBe(true)
  })
  it('картинка — уже содержимое', () => {
    expect(hasContent([{ id: 1, type: 'image', caption: '', preview: 'x', src: 'a' }])).toBe(true)
  })
})

describe('serializeArticle', () => {
  it('новые картинки нумеруются по порядку, старые остаются по src', () => {
    const f1 = new File(['1'], '1.jpg')
    const f2 = new File(['2'], '2.jpg')
    const { content, images } = serializeArticle([
      p(1, 'Текст'),
      { id: 2, type: 'image', caption: ' первая ', file: f1, preview: 'blob:1' },
      { id: 3, type: 'image', caption: '', src: 'articles/old', preview: 'u' },
      { id: 4, type: 'image', caption: '', file: f2, preview: 'blob:2' },
    ])
    expect(images).toEqual([f1, f2])
    expect(JSON.parse(content)).toEqual([
      { type: 'p', text: 'Текст' },
      { type: 'image', file: 0, caption: 'первая' },
      { type: 'image', src: 'articles/old', caption: '' },
      { type: 'image', file: 1, caption: '' },
    ])
  })

  it('список превращается в пункты без пустых строк', () => {
    const { content } = serializeArticle([{ id: 1, type: 'list', text: 'один\n\n  два \n' }])
    expect(JSON.parse(content)).toEqual([{ type: 'list', items: ['один', 'два'] }])
  })
})

describe('fromStored и parseStored', () => {
  it('возвращают блоки редактора, картинки получают адрес для показа', () => {
    const stored = JSON.stringify([
      { type: 'h', text: 'Глава' },
      { type: 'list', items: ['a', 'b'] },
      { type: 'image', src: 'articles/x', small: 'articles/x-s', caption: 'подпись' },
    ])
    const blocks = fromStored(stored, (path) => `/s/${path}.webp`)
    expect(blocks).toEqual([
      { id: 1, type: 'h', text: 'Глава' },
      { id: 2, type: 'list', text: 'a\nb' },
      { id: 3, type: 'image', src: 'articles/x', caption: 'подпись', preview: '/s/articles/x.webp' },
    ])
  })

  it('сломанное содержимое даёт пустой список', () => {
    expect(fromStored('не json', (x) => x)).toEqual([])
    expect(parseStored('не json')).toEqual([])
    expect(parseStored('{"a":1}')).toEqual([])
  })
})

describe('readingMinutes', () => {
  it('не меньше минуты и растёт с длиной', () => {
    expect(readingMinutes([{ type: 'p', text: 'коротко' }])).toBe(1)
    expect(readingMinutes([{ type: 'p', text: 'слово '.repeat(900) }])).toBe(5)
  })
})

describe('validateImage', () => {
  it('принимает картинки и отклоняет остальное и слишком большое', () => {
    expect(validateImage(new File(['x'], 'a.png', { type: 'image/png' }))).toBe('')
    expect(validateImage(new File(['x'], 'a.txt', { type: 'text/plain' }))).toContain('не картинка')
    const big = new File(['x'], 'big.jpg', { type: 'image/jpeg' })
    Object.defineProperty(big, 'size', { value: 25 * 1024 * 1024 })
    expect(validateImage(big)).toContain('больше')
  })
})
