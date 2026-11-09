import { describe, expect, it } from 'vitest'

import {
  ARTICLE_LIMITS,
  Block,
  cleanTitle,
  makeExcerpt,
  parseContent,
  storedImages,
  usedFileIndexes,
} from '@/api/article/content'

const json = (blocks: unknown) => JSON.stringify(blocks)

describe('cleanTitle', () => {
  it('убирает лишние пробелы и переносы', () => {
    expect(cleanTitle('  Моя   первая\nстатья ')).toBe('Моя первая статья')
  })
  it('пустой и слишком длинный заголовок отклоняются', () => {
    expect(() => cleanTitle('   ')).toThrow('Введите заголовок')
    expect(() => cleanTitle(undefined)).toThrow('Введите заголовок')
    expect(() => cleanTitle('а'.repeat(ARTICLE_LIMITS.title + 1))).toThrow('длиннее')
  })
})

describe('parseContent', () => {
  it('принимает абзацы, заголовок, цитату и список; пустое отбрасывает', () => {
    const blocks = parseContent(
      json([
        { type: 'h', text: ' Глава ' },
        { type: 'p', text: '' },
        { type: 'p', text: 'Текст\r\nвторая строка' },
        { type: 'quote', text: 'Цитата' },
        { type: 'list', items: ['один', '  ', 'два'] },
        { type: 'list', items: [] },
      ]),
      0,
    )
    expect(blocks).toEqual([
      { type: 'h', text: 'Глава' },
      { type: 'p', text: 'Текст\nвторая строка' },
      { type: 'quote', text: 'Цитата' },
      { type: 'list', items: ['один', 'два'] },
    ])
  })

  it('ничего не содержащая статья отклоняется', () => {
    expect(() => parseContent(json([{ type: 'p', text: '  ' }]), 0)).toThrow('пуста')
    expect(() => parseContent(json([]), 0)).toThrow('пуста')
  })

  it('мусор вместо JSON и неизвестные блоки отклоняются', () => {
    expect(() => parseContent('не json', 0)).toThrow('прочитать')
    expect(() => parseContent(json({ a: 1 }), 0)).toThrow('прочитать')
    expect(() => parseContent(json(['строка']), 0)).toThrow('прочитать')
    expect(() => parseContent(json([{ type: 'script', text: 'x' }]), 0)).toThrow('Неизвестный')
  })

  it('картинка ссылается на загруженный файл по номеру', () => {
    const blocks = parseContent(
      json([
        { type: 'image', file: 1, caption: ' подпись ' },
        { type: 'p', text: 'a' },
      ]),
      2,
    )
    expect(blocks[0]).toEqual({ type: 'image', file: 1, caption: 'подпись' })
    expect(usedFileIndexes(blocks)).toEqual([1])
  })

  it('номер файла за пределами и повтор файла отклоняются', () => {
    expect(() => parseContent(json([{ type: 'image', file: 2 }]), 2)).toThrow('не найдена')
    expect(() => parseContent(json([{ type: 'image', file: -1 }]), 2)).toThrow('не найдена')
    expect(() =>
      parseContent(
        json([
          { type: 'image', file: 0 },
          { type: 'image', file: 0 },
        ]),
        1,
      ),
    ).toThrow('дважды')
  })

  it('старая картинка берётся только из уже имеющихся в статье', () => {
    const existing = [{ src: 'articles/aa/bb', small: 'articles/aa/bb-s' }]
    const ok = parseContent(json([{ type: 'image', src: 'articles/aa/bb' }]), 0, existing)
    expect(ok[0]).toEqual({ type: 'image', src: 'articles/aa/bb', small: 'articles/aa/bb-s', caption: '' })
    expect(() => parseContent(json([{ type: 'image', src: 'avatars/чужая' }]), 0, existing)).toThrow(
      'не найдена в статье',
    )
  })

  it('лимиты: длинный абзац, много блоков, много картинок', () => {
    expect(() => parseContent(json([{ type: 'p', text: 'а'.repeat(ARTICLE_LIMITS.text + 1) }]), 0)).toThrow('длинный')
    const many = Array.from({ length: ARTICLE_LIMITS.blocks + 1 }, () => ({ type: 'p', text: 'a' }))
    expect(() => parseContent(json(many), 0)).toThrow('слишком длинная')
    const pics = Array.from({ length: ARTICLE_LIMITS.images + 1 }, (_, file) => ({ type: 'image', file }))
    expect(() => parseContent(json(pics), pics.length)).toThrow('картинок')
  })
})

describe('makeExcerpt', () => {
  it('берёт первый абзац и сжимает пробелы', () => {
    const blocks: Block[] = [
      { type: 'h', text: 'Заголовок' },
      { type: 'p', text: 'Первая   строка\nвторая' },
    ]
    expect(makeExcerpt(blocks)).toBe('Первая строка вторая')
  })
  it('длинное начало обрезается многоточием', () => {
    const excerpt = makeExcerpt([{ type: 'p', text: 'слово '.repeat(100) }])
    expect(excerpt.length).toBeLessThanOrEqual(ARTICLE_LIMITS.excerpt)
    expect(excerpt.endsWith('…')).toBe(true)
  })
  it('без текста — пустая строка', () => {
    expect(makeExcerpt([{ type: 'image', src: 'a', small: 'b', caption: '' }])).toBe('')
  })
})

describe('storedImages', () => {
  it('достаёт картинки из сохранённого содержимого и не падает на мусоре', () => {
    const blocks: Block[] = [
      { type: 'p', text: 'x' },
      { type: 'image', src: 'articles/a', small: 'articles/a-s', caption: '' },
    ]
    expect(storedImages(JSON.stringify(blocks))).toEqual([{ src: 'articles/a', small: 'articles/a-s' }])
    expect(storedImages('сломано')).toEqual([])
  })
})
