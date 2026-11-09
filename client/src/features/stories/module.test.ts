import { beforeEach, describe, expect, it, vi } from 'vitest'

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
  store.setState({ groups: [], viewer: null })
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
