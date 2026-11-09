import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { dayKey, formatDay, formatFileSize, formatLastSeen, toTimestamp } from './time'

describe('toTimestamp: дата с сервера в миллисекунды', () => {
  it('число (GraphQL) возвращает как есть', () => {
    expect(toTimestamp(1_700_000_000_000)).toBe(1_700_000_000_000)
  })

  it('строка ISO (сокет) разбирает в миллисекунды', () => {
    expect(toTimestamp('2026-01-01T00:00:00.000Z')).toBe(Date.parse('2026-01-01T00:00:00.000Z'))
  })

  it('число в строке тоже число', () => {
    expect(toTimestamp('1700000000000')).toBe(1_700_000_000_000)
  })

  it('пусто, null, мусор и неподходящие типы дают 0', () => {
    expect(toTimestamp(null)).toBe(0)
    expect(toTimestamp(undefined)).toBe(0)
    expect(toTimestamp('')).toBe(0)
    expect(toTimestamp({})).toBe(0)
    expect(toTimestamp(true)).toBe(0)
  })
})

describe('даты в переписке', () => {
  // Фиксируем «сейчас»: 15 июня 2026, 12:00 по местному времени
  const now = new Date(2026, 5, 15, 12, 0, 0)

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(now)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('dayKey: одинаков для одного календарного дня и различается между днями', () => {
    const morning = new Date(2026, 5, 15, 0, 5).getTime()
    const evening = new Date(2026, 5, 15, 23, 55).getTime()
    const nextDay = new Date(2026, 5, 16, 0, 5).getTime()
    expect(dayKey(morning)).toBe(dayKey(evening))
    expect(dayKey(evening)).not.toBe(dayKey(nextDay))
  })

  it('formatDay: «Сегодня», «Вчера», дальше дата, год — только если он не текущий', () => {
    expect(formatDay(new Date(2026, 5, 15, 8).getTime())).toBe('Сегодня')
    expect(formatDay(new Date(2026, 5, 14, 23).getTime())).toBe('Вчера')
    const older = formatDay(new Date(2026, 4, 1).getTime())
    expect(older).toContain('мая')
    expect(older).not.toContain('2026')
    expect(formatDay(new Date(2025, 11, 31).getTime())).toContain('2025')
    expect(formatDay(0)).toBe('')
  })

  it('formatLastSeen: в сети, минуты назад, сегодня, вчера, давно', () => {
    expect(formatLastSeen(true, 0)).toBe('в сети')
    expect(formatLastSeen(false, 0)).toBe('был(а) давно')
    expect(formatLastSeen(false, now.getTime() - 20_000)).toBe('был(а) только что')
    expect(formatLastSeen(false, now.getTime() - 5 * 60_000)).toBe('был(а) 5 мин. назад')
    expect(formatLastSeen(false, new Date(2026, 5, 15, 8, 30).getTime())).toMatch(/^был\(а\) сегодня в 08:30$/)
    expect(formatLastSeen(false, new Date(2026, 5, 14, 22, 10).getTime())).toMatch(/^был\(а\) вчера в 22:10$/)
    expect(formatLastSeen(false, new Date(2026, 4, 1).getTime())).toContain('мая')
  })
})

describe('formatFileSize', () => {
  it('байты, килобайты и мегабайты', () => {
    expect(formatFileSize(512)).toBe('512 Б')
    expect(formatFileSize(2048)).toBe('2 КБ')
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 МБ')
  })
})
