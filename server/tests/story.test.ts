import { beforeEach, describe, expect, it } from 'vitest'

import StoryController from '@/api/story/controller'

import { createUsers, prisma, resetDb } from './helpers'

type User = Awaited<ReturnType<typeof createUsers>>[number]

const HOUR = 60 * 60 * 1000

/** История напрямую в БД: загрузку картинки (нативный модуль) в тестах не используем. */
const createStory = (userId: number, options: { text?: string; expiresInMs?: number } = {}) =>
  prisma.story.create({
    data: {
      userId,
      high: '',
      medium: `stories/m-${Math.random().toString(36).slice(2)}`,
      small: 'stories/s',
      vertical: true,
      type: 'webp',
      text: options.text ?? '',
      expiresAt: new Date(Date.now() + (options.expiresInMs ?? 24 * HOUR)),
    },
  })

describe('истории: лента', () => {
  let me: User
  let anna: User
  let boris: User

  beforeEach(async () => {
    await resetDb()
    ;[me, anna, boris] = await createUsers(3)
  })

  it('истории сгруппированы по людям; свои первыми, затем непросмотренные, затем просмотренные', async () => {
    const annaStory = await createStory(anna.id)
    await createStory(boris.id)
    await createStory(me.id)
    await StoryController.markViewed(me.id, annaStory.id)

    const feed = await StoryController.feed(me.id)
    expect(feed.map((g) => g.user.id)).toEqual([me.id, boris.id, anna.id])
    expect(feed.find((g) => g.user.id === anna.id)?.allSeen).toBe(true)
    expect(feed.find((g) => g.user.id === boris.id)?.allSeen).toBe(false)
  })

  it('у человека несколько историй: в группе они по порядку, allSeen только когда просмотрены все', async () => {
    const first = await createStory(anna.id, { text: 'раз' })
    const second = await createStory(anna.id, { text: 'два' })
    await StoryController.markViewed(me.id, first.id)

    let group = (await StoryController.feed(me.id))[0]
    expect(group.stories.map((s) => [s.text, s.seen])).toEqual([
      ['раз', true],
      ['два', false],
    ])
    expect(group.allSeen).toBe(false)

    await StoryController.markViewed(me.id, second.id)
    group = (await StoryController.feed(me.id))[0]
    expect(group.allSeen).toBe(true)
  })

  it('просроченные истории не показываются и удаляются', async () => {
    await createStory(anna.id, { expiresInMs: -HOUR })
    const alive = await createStory(boris.id)

    const feed = await StoryController.feed(me.id)
    expect(feed.map((g) => g.user.id)).toEqual([boris.id])
    expect(await prisma.story.findMany({ select: { id: true } })).toEqual([{ id: alive.id }])
  })

  it('число зрителей видит только автор', async () => {
    const story = await createStory(anna.id)
    await StoryController.markViewed(me.id, story.id)
    await StoryController.markViewed(boris.id, story.id)

    const asViewer = (await StoryController.feed(me.id))[0].stories[0]
    expect(asViewer.viewsCount).toBeNull()
    const asAuthor = (await StoryController.feed(anna.id))[0].stories[0]
    expect(asAuthor.viewsCount).toBe(2)
  })

  it('гость видит истории как непросмотренные', async () => {
    await createStory(anna.id)
    const feed = await StoryController.feed(undefined)
    expect(feed).toHaveLength(1)
    expect(feed[0].allSeen).toBe(false)
  })
})

describe('истории: просмотры и удаление', () => {
  let author: User
  let viewer: User

  beforeEach(async () => {
    await resetDb()
    ;[author, viewer] = await createUsers(2)
  })

  it('просмотр засчитывается один раз; свои и просроченные не считаются', async () => {
    const story = await createStory(author.id)
    await StoryController.markViewed(viewer.id, story.id)
    await StoryController.markViewed(viewer.id, story.id)
    await StoryController.markViewed(author.id, story.id)
    expect(await prisma.storyView.count()).toBe(1)

    const expired = await createStory(author.id, { expiresInMs: -HOUR })
    await expect(StoryController.markViewed(viewer.id, expired.id)).rejects.toThrow('История не найдена')
    await expect(StoryController.markViewed(viewer.id, 9999)).rejects.toThrow('История не найдена')
  })

  it('список зрителей: только автору, новые просмотры сверху', async () => {
    const story = await createStory(author.id)
    const [, second] = [viewer, (await createUsers(1))[0]]
    await StoryController.markViewed(viewer.id, story.id)
    await StoryController.markViewed(second.id, story.id)

    await expect(StoryController.viewers(viewer.id, story.id)).rejects.toThrow('Нет доступа')
    const viewers = await StoryController.viewers(author.id, story.id)
    expect(viewers.map((v) => v.user.id)).toEqual([second.id, viewer.id])
    await expect(StoryController.viewers(author.id, 9999)).rejects.toThrow('не найдена')
  })

  it('удалить может только автор', async () => {
    const story = await createStory(author.id)
    await expect(StoryController.remove(viewer.id, story.id)).rejects.toThrow('Нет доступа')
    expect(await StoryController.remove(author.id, story.id)).toBe(true)
    expect(await prisma.story.count()).toBe(0)
  })

  it('удаление пользователя убирает его истории и просмотры', async () => {
    const story = await createStory(author.id)
    await StoryController.markViewed(viewer.id, story.id)
    await prisma.user.delete({ where: { id: author.id } })
    expect(await prisma.story.count()).toBe(0)
    expect(await prisma.storyView.count()).toBe(0)
  })
})
