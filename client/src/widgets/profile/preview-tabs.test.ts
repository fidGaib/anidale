import { describe, expect, it } from 'vitest'

import { availableTabs, pickPreviewTab } from './preview-tabs'

describe('availableTabs: какие вкладки превью показывать', () => {
  it('только непустые, в порядке «музыка, фото, видео»', () => {
    expect(availableTabs({ music: 3, photos: 0, videos: 2 })).toEqual(['music', 'videos'])
    expect(availableTabs({ music: 0, photos: 5, videos: 5 })).toEqual(['photos', 'videos'])
    expect(availableTabs({ music: 0, photos: 0, videos: 0 })).toEqual([])
  })
})

describe('pickPreviewTab: какая вкладка открыта', () => {
  it('выбранная пользователем остаётся, пока в ней есть содержимое', () => {
    expect(pickPreviewTab({ music: 1, photos: 1, videos: 1 }, 'videos')).toBe('videos')
  })

  it('если выбранная опустела, открывается первая непустая', () => {
    expect(pickPreviewTab({ music: 0, photos: 4, videos: 1 }, 'music')).toBe('photos')
  })

  it('без выбора открывается первая непустая', () => {
    expect(pickPreviewTab({ music: 0, photos: 0, videos: 3 }, null)).toBe('videos')
    expect(pickPreviewTab({ music: 2, photos: 2, videos: 2 }, null)).toBe('music')
  })

  it('когда показывать нечего, возвращает null и блок скрывается', () => {
    expect(pickPreviewTab({ music: 0, photos: 0, videos: 0 }, 'music')).toBeNull()
    expect(pickPreviewTab({ music: 0, photos: 0, videos: 0 }, null)).toBeNull()
  })
})
