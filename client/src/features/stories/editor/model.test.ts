import { describe, expect, it } from 'vitest'

import {
  NO_ADJUST,
  canPublish,
  filterCss,
  hitItem,
  moveItem,
  newSticker,
  newText,
  nextId,
  patchItem,
  removeItem,
} from './model'

describe('filterCss', () => {
  it('без настроек ничего не применяет', () => {
    expect(filterCss('none', NO_ADJUST)).toBe('none')
  })
  it('складывает пресет и ручные настройки', () => {
    const css = filterCss('bw', { brightness: 120, contrast: 100, saturate: 50 })
    expect(css).toBe('grayscale(1) brightness(1.2) saturate(0.5)')
  })
  it('неизвестный пресет игнорируется', () => {
    expect(filterCss('нет-такого', NO_ADJUST)).toBe('none')
  })
})

describe('элементы на холсте', () => {
  it('id всегда новый', () => {
    const a = newText([])
    const b = newSticker([a], '🔥')
    expect(a.id).toBe(1)
    expect(b.id).toBe(2)
    expect(nextId([a, b])).toBe(3)
  })

  it('moveItem не выпускает элемент за холст', () => {
    const items = [newText([])]
    const moved = moveItem(items, 1, 1.4, -0.2)
    expect(moved[0].x).toBe(1)
    expect(moved[0].y).toBe(0)
  })

  it('patchItem и removeItem меняют только нужный', () => {
    const a = newText([])
    const b = newSticker([a], '🔥')
    const patched = patchItem([a, b], 1, { text: 'Привет' })
    expect(patched[0]).toMatchObject({ text: 'Привет' })
    expect(patched[1]).toEqual(b)
    expect(removeItem(patched, 2)).toHaveLength(1)
  })

  it('hitItem выбирает верхний из перекрывающихся и промахивается мимо', () => {
    const a = newSticker([], '🔥')
    const b = { ...newSticker([a], '🎉'), id: 2 }
    expect(hitItem([a, b], 0.5, 0.5)?.id).toBe(2)
    expect(hitItem([a, b], 0.02, 0.02)).toBeNull()
  })

  it('длинный текст шире короткого', () => {
    const short = { ...newText([], 'a'), x: 0.5 }
    const long = { ...newText([], 'очень длинная надпись'), x: 0.5 }
    expect(hitItem([short], 0.8, 0.5)).toBeNull()
    expect(hitItem([long], 0.8, 0.5)).not.toBeNull()
  })
})

describe('canPublish', () => {
  it('с фото можно всегда', () => {
    expect(canPublish(true, false, [], [])).toBe(true)
  })
  it('пустой фон публиковать нельзя', () => {
    expect(canPublish(false, true, [], [])).toBe(false)
    expect(canPublish(false, true, [newText([], '  ')], [])).toBe(false)
  })
  it('фон с текстом, наклейкой или рисунком — можно', () => {
    expect(canPublish(false, true, [newText([], 'Привет')], [])).toBe(true)
    expect(canPublish(false, true, [newSticker([], '🔥')], [])).toBe(true)
    expect(canPublish(false, true, [], [{ color: '#fff', width: 8, points: [[0, 0]] }])).toBe(true)
  })
  it('без основы нельзя', () => {
    expect(canPublish(false, false, [newText([], 'Привет')], [])).toBe(false)
  })
})
