import { describe, expect, it, vi } from 'vitest'

import { communityOf, isValidScope } from './module'

// Сеть и вход заменены заглушками: проверяются только помощники
vi.mock('@/app/providers/apollo-client', () => ({ client: { query: vi.fn(), mutate: vi.fn() } }))
vi.mock('@/app/providers/routes/model', () => {
  const state = { refreshData: { id: 1, login: 'me', avatar: '' } }
  return { RefreshStore: { getState: () => state, subscribe: () => () => undefined } }
})

describe('область списка музыки', () => {
  it('communityOf достаёт id сообщества', () => {
    expect(communityOf('community:12')).toBe(12)
    expect(communityOf('all')).toBeNull()
    expect(communityOf(5)).toBeNull()
    expect(communityOf(null)).toBeNull()
  })

  it('isValidScope принимает ленту, человека и сообщество', () => {
    expect(isValidScope('all')).toBe(true)
    expect(isValidScope(7)).toBe(true)
    expect(isValidScope('community:3')).toBe(true)
    expect(isValidScope(Number.NaN)).toBe(false)
  })
})
