import { describe, expect, it } from 'vitest'

import { fitsWall, shouldDropAfterChange } from './wall'

describe('fitsWall: попадёт ли новый пост автора на открытую вкладку', () => {
  const post = {}
  const repost = { repostOf: { id: 1 } }

  it('«Главная»: попадают и обычные посты, и репосты', () => {
    expect(fitsWall('all', '', post)).toBe(true)
    expect(fitsWall('all', '', repost)).toBe(true)
  })

  it('«Мои посты»: только свои, репосты не попадают', () => {
    expect(fitsWall('own', '', post)).toBe(true)
    expect(fitsWall('own', '', repost)).toBe(false)
  })

  it('«Архив»: новые посты туда не попадают никогда', () => {
    expect(fitsWall('archive', '', post)).toBe(false)
  })

  it('при активном поиске новые посты не вставляются в результаты', () => {
    expect(fitsWall('all', 'кофе', post)).toBe(false)
    expect(fitsWall('all', '   ', post)).toBe(true)
  })
})

describe('shouldDropAfterChange: убрать ли пост из списка после изменения', () => {
  it('удалённый пост убирается везде', () => {
    for (const kind of ['all', 'own', 'archive'] as const) {
      expect(shouldDropAfterChange({ removed: true }, kind, false)).toBe(true)
    }
  })

  it('пост ушёл в архив: убирается с «Главной» и «Моих постов», но не с вкладки «Архив»', () => {
    expect(shouldDropAfterChange({ archived: true }, 'all', false)).toBe(true)
    expect(shouldDropAfterChange({ archived: true }, 'own', false)).toBe(true)
    expect(shouldDropAfterChange({ archived: true }, 'archive', false)).toBe(false)
  })

  it('пост вернули из архива: убирается только из вкладки «Архив»', () => {
    expect(shouldDropAfterChange({ archived: false }, 'archive', false)).toBe(true)
    expect(shouldDropAfterChange({ archived: false }, 'all', false)).toBe(false)
  })

  it('закладка снята: пост убирается только на странице закладок', () => {
    expect(shouldDropAfterChange({ bookmarked: false }, 'all', true)).toBe(true)
    expect(shouldDropAfterChange({ bookmarked: false }, 'all', false)).toBe(false)
    expect(shouldDropAfterChange({ bookmarked: true }, 'all', true)).toBe(false)
  })

  it('обычные изменения (правка текста, лайк) пост не убирают', () => {
    expect(shouldDropAfterChange({}, 'all', false)).toBe(false)
    expect(shouldDropAfterChange({}, 'archive', true)).toBe(false)
  })
})
