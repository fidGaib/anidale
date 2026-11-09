import { beforeEach, describe, expect, it } from 'vitest'

import DiscussionService, { DISCUSSION_LIMITS } from '@/api/community/discussions'
import CommunityService from '@/api/community/service'

import { createUsers, prisma, resetDb } from './helpers'

type User = Awaited<ReturnType<typeof createUsers>>[number]

let owner: User
let anna: User
let boris: User

beforeEach(async () => {
  await resetDb()
  ;[owner, anna, boris] = await createUsers(3)
})

const make = (isClosed = false) => CommunityService.create(owner.id, { name: 'Клуб', isClosed })
const join = (id: number, ...users: User[]) => Promise.all(users.map((u) => CommunityService.join(u.id, id)))

describe('обсуждения: темы', () => {
  it('участник создаёт тему с первым сообщением, чужой — нет', async () => {
    const { id } = await make()
    await join(id, anna)
    await expect(DiscussionService.createTopic(boris.id, id, 'Привет', 'текст')).rejects.toThrow('только участники')
    const topic = await DiscussionService.createTopic(anna.id, id, '  Мой   вопрос ', 'Как дела?')
    expect(topic).toMatchObject({
      title: 'Мой вопрос',
      messagesCount: 1,
      lastText: 'Как дела?',
      pinned: false,
      closed: false,
    })
    expect(topic.author.id).toBe(anna.id)
  })

  it('пустые и слишком длинные названия и тексты отклоняются', async () => {
    const { id } = await make()
    await expect(DiscussionService.createTopic(owner.id, id, '  ', 'x')).rejects.toThrow('название темы')
    await expect(DiscussionService.createTopic(owner.id, id, 'Т', '  ')).rejects.toThrow('Введите сообщение')
    await expect(
      DiscussionService.createTopic(owner.id, id, 'а'.repeat(DISCUSSION_LIMITS.title + 1), 'x'),
    ).rejects.toThrow('длиннее')
    await expect(
      DiscussionService.createTopic(owner.id, id, 'Т', 'б'.repeat(DISCUSSION_LIMITS.text + 1)),
    ).rejects.toThrow('длиннее')
    expect(await prisma.discussionTopic.count()).toBe(0)
  })

  it('закреплённые темы сверху, остальные по последнему сообщению', async () => {
    const { id } = await make()
    const first = await DiscussionService.createTopic(owner.id, id, 'Первая', 'a')
    const second = await DiscussionService.createTopic(owner.id, id, 'Вторая', 'b')
    const third = await DiscussionService.createTopic(owner.id, id, 'Третья', 'c')
    await DiscussionService.addMessage(owner.id, first.id, 'новое сообщение')
    await DiscussionService.setFlags(owner.id, third.id, { pinned: true })
    const list = await DiscussionService.topics(id, 10, 0, owner.id)
    expect(list.map((t) => t.title)).toEqual(['Третья', 'Первая', 'Вторая'])
    expect(list[1].messagesCount).toBe(2)
    expect(second.id).toBeGreaterThan(0)
  })

  it('закреплять и закрывать может только администратор', async () => {
    const { id } = await make()
    await join(id, anna)
    const topic = await DiscussionService.createTopic(anna.id, id, 'Тема', 'x')
    await expect(DiscussionService.setFlags(anna.id, topic.id, { pinned: true })).rejects.toThrow('Нет доступа')
    expect(await DiscussionService.setFlags(owner.id, topic.id, { closed: true })).toBe(true)
    expect((await DiscussionService.topic(topic.id, owner.id))?.closed).toBe(true)
  })

  it('тему удаляет автор или администратор, посторонний участник — нет', async () => {
    const { id } = await make()
    await join(id, anna, boris)
    const mine = await DiscussionService.createTopic(anna.id, id, 'Моя', 'x')
    await expect(DiscussionService.removeTopic(boris.id, mine.id)).rejects.toThrow('Нет доступа')
    expect(await DiscussionService.removeTopic(anna.id, mine.id)).toBe(true)
    const other = await DiscussionService.createTopic(anna.id, id, 'Другая', 'x')
    expect(await DiscussionService.removeTopic(owner.id, other.id)).toBe(true)
    expect(await prisma.discussionMessage.count()).toBe(0)
  })
})

describe('обсуждения: сообщения', () => {
  it('сообщения идут по порядку, пишут только участники', async () => {
    const { id } = await make()
    await join(id, anna)
    const topic = await DiscussionService.createTopic(owner.id, id, 'Тема', 'первое')
    await DiscussionService.addMessage(anna.id, topic.id, 'второе')
    await expect(DiscussionService.addMessage(boris.id, topic.id, 'чужое')).rejects.toThrow('только участники')
    const messages = await DiscussionService.messages(topic.id, 10, 0, anna.id)
    expect(messages.map((m) => m.text)).toEqual(['первое', 'второе'])
    expect(await DiscussionService.messages(topic.id, 1, 1, anna.id)).toHaveLength(1)
    expect((await DiscussionService.topic(topic.id, anna.id))?.lastText).toBe('второе')
  })

  it('в закрытой теме пишут только администраторы', async () => {
    const { id } = await make()
    await join(id, anna)
    const topic = await DiscussionService.createTopic(owner.id, id, 'Тема', 'x')
    await DiscussionService.setFlags(owner.id, topic.id, { closed: true })
    await expect(DiscussionService.addMessage(anna.id, topic.id, 'можно?')).rejects.toThrow('Тема закрыта')
    expect((await DiscussionService.addMessage(owner.id, topic.id, 'админ пишет')).text).toBe('админ пишет')
  })

  it('сообщение удаляет автор или администратор', async () => {
    const { id } = await make()
    await join(id, anna, boris)
    const topic = await DiscussionService.createTopic(owner.id, id, 'Тема', 'x')
    const msg = await DiscussionService.addMessage(anna.id, topic.id, 'моё')
    await expect(DiscussionService.removeMessage(boris.id, msg.id)).rejects.toThrow('Нет доступа')
    expect(await DiscussionService.removeMessage(anna.id, msg.id)).toBe(true)
    const other = await DiscussionService.addMessage(boris.id, topic.id, 'второе')
    expect(await DiscussionService.removeMessage(owner.id, other.id)).toBe(true)
    await expect(DiscussionService.removeMessage(owner.id, 9999)).rejects.toThrow('не найдено')
  })

  it('заблокированный не пишет', async () => {
    const { id } = await make()
    await join(id, anna)
    const topic = await DiscussionService.createTopic(owner.id, id, 'Тема', 'x')
    await CommunityService.ban(owner.id, id, anna.id)
    await expect(DiscussionService.addMessage(anna.id, topic.id, 'можно?')).rejects.toThrow('чёрном списке')
  })
})

describe('обсуждения закрытого сообщества', () => {
  it('темы и сообщения видны только участникам', async () => {
    const { id } = await make(true)
    const topic = await DiscussionService.createTopic(owner.id, id, 'Секрет', 'тайна')
    expect(await DiscussionService.topics(id, 10, 0, boris.id)).toEqual([])
    expect(await DiscussionService.topics(id, 10, 0, undefined)).toEqual([])
    expect(await DiscussionService.topic(topic.id, boris.id)).toBeNull()
    expect(await DiscussionService.messages(topic.id, 10, 0, boris.id)).toEqual([])
    expect(await DiscussionService.topics(id, 10, 0, owner.id)).toHaveLength(1)
  })
})

describe('контакты сообщества', () => {
  it('администратор ставит контакты из участников с должностями', async () => {
    const { id } = await make()
    await join(id, anna, boris)
    const updated = await CommunityService.setContacts(owner.id, id, [
      { userId: anna.id, position: ' Модератор ' },
      { userId: boris.id },
    ])
    expect(updated.contacts.map((c) => [c.user.id, c.position])).toEqual([
      [anna.id, 'Модератор'],
      [boris.id, ''],
    ])
    const replaced = await CommunityService.setContacts(owner.id, id, [{ userId: boris.id, position: 'Автор' }])
    expect(replaced.contacts).toHaveLength(1)
    expect((await CommunityService.find(id, anna.id))?.contacts[0].position).toBe('Автор')
  })

  it('не участник, повтор, лимит и права проверяются', async () => {
    const { id } = await make()
    await join(id, anna)
    await expect(CommunityService.setContacts(anna.id, id, [])).rejects.toThrow('Нет доступа')
    await expect(CommunityService.setContacts(owner.id, id, [{ userId: boris.id }])).rejects.toThrow('только участники')
    const twice = await CommunityService.setContacts(owner.id, id, [
      { userId: anna.id, position: 'А' },
      { userId: anna.id, position: 'Б' },
    ])
    expect(twice.contacts).toHaveLength(1)
    const many = Array.from({ length: 11 }, () => ({ userId: anna.id }))
    await expect(CommunityService.setContacts(owner.id, id, many)).rejects.toThrow('не больше')
  })

  it('ушедший или заблокированный участник пропадает из контактов', async () => {
    const { id } = await make()
    await join(id, anna, boris)
    await CommunityService.setContacts(owner.id, id, [{ userId: anna.id }, { userId: boris.id }])
    await CommunityService.leave(anna.id, id)
    await CommunityService.ban(owner.id, id, boris.id)
    expect((await CommunityService.find(id, owner.id))?.contacts).toEqual([])
  })

  it('удаление сообщества убирает обсуждения и контакты', async () => {
    const { id } = await make()
    await DiscussionService.createTopic(owner.id, id, 'Тема', 'x')
    await CommunityService.setContacts(owner.id, id, [{ userId: owner.id }])
    await CommunityService.remove(owner.id, id)
    expect(await prisma.discussionTopic.count()).toBe(0)
    expect(await prisma.discussionMessage.count()).toBe(0)
    expect(await prisma.communityContact.count()).toBe(0)
  })
})
