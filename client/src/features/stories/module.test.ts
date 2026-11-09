import { beforeEach, describe, expect, it, vi } from 'vitest'

import { client } from '@/app/providers/apollo-client'

import { Story, StoryGroup, useStoriesStore } from './module'

// Сеть и вход заменены заглушками: проверяется только логика стора
vi.mock('@/app/providers/apollo-client', () => ({
  client: { query: vi.fn(), mutate: vi.fn() },
}))
vi.mock('@/app/providers/routes/model', () => {
  const state = { refreshData: { id: 1, login: 'me', avatar: '' } }
  return { RefreshStore: { getState: () => state, subscribe: () => () => undefined } }
})

const store = useStoriesStore

const story = (id: number, seen = false): Story => ({
  id,
  src: `stories/${id}`,
  text: '',
  date: id,
  expiresAt: id + 1000,
  seen,
  viewsCount: null,
})

const group = (userId: number, stories: Story[]): StoryGroup => ({
  user: { id: userId, login: `user${userId}`, avatar: '' },
  stories,
  allSeen: stories.every((s) => s.seen),
})

beforeEach(() => {
  store.setState({ groups: [], viewer: null, source: null })
})

describe('открытие историй', () => {
  it('без указания истории открывается первая непросмотренная', () => {
    store.setState({ groups: [group(2, [story(10, true), story(11, true), story(12), story(13)])] })
    store.getState().open(2)
    expect(store.getState().viewer).toEqual({ group: 0, story: 2 })
  })

  it('если все просмотрены, открывается с первой', () => {
    store.setState({ groups: [group(2, [story(10, true), story(11, true)])] })
    store.getState().open(2)
    expect(store.getState().viewer).toEqual({ group: 0, story: 0 })
  })

  it('с указанной историей открывается именно она, даже если просмотрена', () => {
    store.setState({ groups: [group(1, [story(1)]), group(2, [story(10), story(11, true), story(12)])] })
    store.getState().open(2, 11)
    expect(store.getState().viewer).toEqual({ group: 1, story: 1 })
  })

  it('неизвестная история в группе: открывается как без указания', () => {
    store.setState({ groups: [group(2, [story(10, true), story(11)])] })
    store.getState().open(2, 999)
    expect(store.getState().viewer).toEqual({ group: 0, story: 1 })
  })

  it('у человека без историй ничего не открывается', () => {
    store.setState({ groups: [group(2, [story(10)])] })
    store.getState().open(5)
    expect(store.getState().viewer).toBeNull()
  })
})

describe('переход между историями', () => {
  const setup = () => {
    store.setState({ groups: [group(1, [story(1), story(2)]), group(2, [story(3), story(4)])] })
    store.setState({ viewer: { group: 0, story: 0 } })
  }

  it('вперёд внутри группы, затем к следующему человеку', () => {
    setup()
    store.getState().step(1)
    expect(store.getState().viewer).toEqual({ group: 0, story: 1 })
    store.getState().step(1)
    expect(store.getState().viewer).toEqual({ group: 1, story: 0 })
  })

  it('назад из начала следующей группы возвращает на последнюю историю предыдущей', () => {
    setup()
    store.setState({ viewer: { group: 1, story: 0 } })
    store.getState().step(-1)
    expect(store.getState().viewer).toEqual({ group: 0, story: 1 })
  })

  it('назад с самой первой истории остаётся на месте', () => {
    setup()
    store.getState().step(-1)
    expect(store.getState().viewer).toEqual({ group: 0, story: 0 })
  })

  it('после последней истории просмотр закрывается', () => {
    setup()
    store.setState({ viewer: { group: 1, story: 1 } })
    store.getState().step(1)
    expect(store.getState().viewer).toBeNull()
  })
})

describe('истории сообщества', () => {
  const query = vi.mocked(client.query)
  const raw = (id: number, seen = false) => ({
    id,
    high: '',
    medium: `stories/${id}`,
    small: '',
    text: '',
    date: id,
    expiresAt: id + 1000,
    seen,
    viewsCount: null,
  })
  const source = { id: 7, name: 'Клуб', avatar: 'communities/a/b', canManage: true }

  it('загружаются одной группой: сообщество с отрицательным id и признаком прав', async () => {
    query.mockResolvedValueOnce({ data: { getCommunityStories: [raw(1, true), raw(2)] } } as never)
    await store.getState().loadCommunity(source)
    const [g] = store.getState().groups
    expect(g.user).toEqual({ id: -7, login: 'Клуб', avatar: 'communities/a/b' })
    expect(g.community).toEqual({ id: 7, canManage: true })
    expect(g.stories.map((s) => s.id)).toEqual([1, 2])
    expect(g.allSeen).toBe(false)
    expect(store.getState().source).toEqual(source)
  })

  it('без историй групп нет, а открыть чужое ничего не даёт', async () => {
    query.mockResolvedValueOnce({ data: { getCommunityStories: [] } } as never)
    await store.getState().loadCommunity(source)
    expect(store.getState().groups).toEqual([])
    store.getState().open(-7)
    expect(store.getState().viewer).toBeNull()
  })

  it('история сообщества открывается по отрицательному id', async () => {
    query.mockResolvedValueOnce({ data: { getCommunityStories: [raw(1, true), raw(2)] } } as never)
    await store.getState().loadCommunity(source)
    store.getState().open(-7)
    expect(store.getState().viewer).toEqual({ group: 0, story: 1 })
  })

  it('reload обновляет то, что загружено: сообщество или общую ленту', async () => {
    query.mockResolvedValueOnce({ data: { getCommunityStories: [raw(1)] } } as never)
    await store.getState().loadCommunity(source)
    query.mockResolvedValueOnce({ data: { getCommunityStories: [raw(1), raw(3)] } } as never)
    await store.getState().reload()
    expect(store.getState().groups[0].stories).toHaveLength(2)
    query.mockResolvedValueOnce({ data: { getStories: [] } } as never)
    await store.getState().load()
    expect(store.getState().source).toBeNull()
    query.mockResolvedValueOnce({ data: { getStories: [] } } as never)
    await store.getState().reload()
    expect(query).toHaveBeenLastCalledWith(expect.objectContaining({ fetchPolicy: 'network-only' }))
  })
})
