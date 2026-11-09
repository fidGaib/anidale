import { describe, expect, it } from 'vitest'

import { MAX_TITLE, titleFromName } from './title'

describe('titleFromName', () => {
  it('убирает расширение', () => {
    expect(titleFromName('отпуск.mp4')).toBe('отпуск')
  })
  it('оставляет точки внутри имени', () => {
    expect(titleFromName('clip.v2.final.mov')).toBe('clip.v2.final')
  })
  it('имя без расширения не меняется', () => {
    expect(titleFromName('video')).toBe('video')
  })
  it('обрезает слишком длинное имя', () => {
    expect(titleFromName('а'.repeat(300) + '.mp4')).toHaveLength(MAX_TITLE)
  })
})
