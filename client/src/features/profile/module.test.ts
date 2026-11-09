import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MAX_POST_TRACKS, usePostStore } from './module'
import type { CreatePostFn } from './types'

// Сеть и вход заменены заглушками: проверяется только логика черновика записи
vi.mock('@/app/providers/apollo-client', () => ({ client: { query: vi.fn(), mutate: vi.fn() } }))
vi.mock('@/app/providers/routes/model', () => {
  const state = { refreshData: { id: 1, login: 'me', avatar: '' } }
  return { RefreshStore: { getState: () => state, subscribe: () => () => undefined } }
})

const store = usePostStore
const audio = (name = 'a.mp3', size = 10) => {
  const file = new File(['x'], name, { type: 'audio/mpeg' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

beforeEach(() => {
  store.setState({
    description: '',
    images: [],
    videos: [],
    music: [],
    pickedMusic: [],
    pickedVideos: [],
    error_create: '',
    uploadProgress: null,
  })
})

describe('треки в черновике записи', () => {
  it('аудиофайлы добавляются и убираются', () => {
    const file = audio()
    store.getState().setMusicFiles([file])
    expect(store.getState().music).toEqual([file])
    store.getState().removeMusic(file)
    expect(store.getState().music).toEqual([])
  })

  it('не аудио и слишком большой файл отклоняются с понятной ошибкой', () => {
    store.getState().setMusicFiles([new File(['x'], 'a.txt', { type: 'text/plain' })])
    expect(store.getState().error_create).toContain('не аудио')
    store.getState().setMusicFiles([audio('big.mp3', 16 * 1024 * 1024)])
    expect(store.getState().error_create).toContain('больше')
    expect(store.getState().music).toEqual([])
  })

  it('лимит треков считает и загруженные, и выбранные из своей музыки', () => {
    store
      .getState()
      .pickMusic(Array.from({ length: MAX_POST_TRACKS }, (_, i) => ({ id: i + 1, title: 't', artist: 'a' })))
    store.getState().setMusicFiles([audio()])
    expect(store.getState().error_create).toContain('не больше')
    expect(store.getState().music).toEqual([])
  })

  it('выбор из своей музыки не выходит за лимит и снимается по одному', () => {
    store.getState().setMusicFiles([audio('1.mp3'), audio('2.mp3')])
    store.getState().pickMusic(Array.from({ length: 20 }, (_, i) => ({ id: i + 1, title: 't', artist: 'a' })))
    expect(store.getState().pickedMusic).toHaveLength(MAX_POST_TRACKS - 2)
    store.getState().unpickMusic(1)
    expect(store.getState().pickedMusic.some((t) => t.id === 1)).toBe(false)
  })
})

describe('отправка записи', () => {
  it('запись только с музыкой или с видео из коллекции отправляется, пустая — нет', async () => {
    const create = vi.fn().mockResolvedValue({ data: { createPost: null } }) as unknown as CreatePostFn
    await store.getState().send(create, 1)
    expect(create).not.toHaveBeenCalled()

    store.getState().pickMusic([{ id: 5, title: 'Песня', artist: 'А' }])
    store.getState().pickVideos([{ id: 9, title: 'Ролик' }])
    await store.getState().send(create, 1, 3)
    expect(create).toHaveBeenCalledTimes(1)
    expect((create as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].variables).toMatchObject({
      owner: 1,
      communityId: 3,
      musicIds: [5],
      videoIds: [9],
      music: [],
    })
    // После успеха черновик очищен
    expect(store.getState().pickedMusic).toEqual([])
    expect(store.getState().pickedVideos).toEqual([])
  })

  it('загружаемые аудиофайлы уходят вместе с записью и включают прогресс', async () => {
    const create = vi.fn().mockResolvedValue({ data: { createPost: null } }) as unknown as CreatePostFn
    const file = audio()
    store.getState().setMusicFiles([file])
    await store.getState().send(create, 1)
    const call = (create as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.variables.music).toEqual([file])
    expect(call.context.fetchOptions.onProgress).toBeTypeOf('function')
  })
})
