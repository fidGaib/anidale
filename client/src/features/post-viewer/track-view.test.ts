import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { client } from '@/app/providers/apollo-client'

import { usePostSync } from './sync'
import { FLUSH_DELAY_MS, resetTrackViewForTests, trackView } from './track-view'

vi.mock('@/app/providers/apollo-client', () => ({
  client: { mutate: vi.fn() },
}))

const mutate = client.mutate as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.useFakeTimers()
  resetTrackViewForTests()
  mutate.mockReset()
  usePostSync.setState({ patch: null, version: 0 })
})
afterEach(() => {
  vi.useRealTimers()
})

describe('trackView: учёт просмотров постов', () => {
  it('запрос уходит не сразу, а пачкой через заданную задержку', async () => {
    mutate.mockResolvedValue({ data: { viewPosts: [] } })
    trackView(1)
    trackView(2)
    trackView(3)
    expect(mutate).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS)
    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate.mock.calls[0][0].variables).toEqual({ ids: [1, 2, 3] })
  })

  it('один и тот же пост за сеанс отправляется один раз', async () => {
    mutate.mockResolvedValue({ data: { viewPosts: [] } })
    trackView(5)
    trackView(5)
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS)
    trackView(5)
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS)
    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate.mock.calls[0][0].variables).toEqual({ ids: [5] })
  })

  it('счётчик на экране берётся из ответа сервера, а не растёт сам', async () => {
    mutate.mockResolvedValue({ data: { viewPosts: [{ id: 7, views: 12 }] } })
    const seen: unknown[] = []
    const unsubscribe = usePostSync.subscribe((state) => state.patch && seen.push(state.patch))

    trackView(7)
    // Пока ответа нет, число не меняется
    expect(seen).toEqual([])
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS)
    unsubscribe()
    expect(seen).toEqual([{ id: 7, views: 12 }])
  })

  it('автор своего поста: сервер вернул прежний счётчик, и на экране он не меняется', async () => {
    mutate.mockResolvedValue({ data: { viewPosts: [{ id: 9, views: 3 }] } })
    trackView(9)
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS)
    expect(usePostSync.getState().patch).toEqual({ id: 9, views: 3 })
  })

  it('ошибка сети не ломает страницу', async () => {
    mutate.mockRejectedValue(new Error('нет сети'))
    trackView(4)
    await expect(vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS)).resolves.not.toThrow()
    expect(usePostSync.getState().patch).toBeNull()
  })

  it('пост без id не отправляется', async () => {
    trackView(0)
    await vi.advanceTimersByTimeAsync(FLUSH_DELAY_MS)
    expect(mutate).not.toHaveBeenCalled()
  })
})
