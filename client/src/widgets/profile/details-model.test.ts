import { describe, expect, it } from 'vitest'

import { buildDetails, safeLink } from './details-model'

describe('buildDetails', () => {
  it('пустые и пробельные поля не попадают в список', () => {
    expect(buildDetails({ city: '', work: '   ', about: null })).toEqual([])
  })

  it('порядок строк фиксирован, значения обрезаны от пробелов', () => {
    const rows = buildDetails({ about: ' привет ', city: ' Москва ', work: 'Завод', birth: '1 января 2000 г.' })
    expect(rows.map((r) => r.key)).toEqual(['birth', 'city', 'work', 'about'])
    expect(rows[1].value).toBe('Москва')
  })

  it('сайт с http(s) становится ссылкой, прочее — нет', () => {
    expect(buildDetails({ website: 'https://example.com' })[0].link).toBe('https://example.com')
    expect(buildDetails({ website: 'javascript:alert(1)' })[0].link).toBeUndefined()
  })
})

describe('safeLink', () => {
  it('принимает только http и https', () => {
    expect(safeLink('http://a.b')).toBe('http://a.b')
    expect(safeLink('ftp://a.b')).toBeUndefined()
    expect(safeLink('https://a b')).toBeUndefined()
  })
})
