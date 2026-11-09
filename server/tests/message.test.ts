import { beforeEach, describe, expect, it } from 'vitest'

import MessageController from '@/api/message/controller'

import { createUsers, eventsOf, prisma, resetDb } from './helpers'

type User = Awaited<ReturnType<typeof createUsers>>[number]

describe('сообщения: отправка и чтение', () => {
  let alice: User
  let bob: User
  let carol: User

  beforeEach(async () => {
    await resetDb()
    ;[alice, bob, carol] = await createUsers(3)
  })

  it('сообщение появляется в диалоге у обоих и приходит получателю по сокету', async () => {
    const sent = await MessageController.send(alice.id, bob.id, 'привет', undefined)
    expect(sent).toMatchObject({ text: 'привет', senderId: alice.id, recipientId: bob.id })

    const forBob = await MessageController.list(bob.id, alice.id, undefined, 30)
    expect(forBob.map((m) => m.text)).toEqual(['привет'])
    expect(eventsOf('newMessage', `user:${bob.id}`)).toHaveLength(1)
  })

  it('нельзя писать самому себе, слать пустое и слишком длинное', async () => {
    await expect(MessageController.send(alice.id, alice.id, 'я', undefined)).rejects.toThrow('самому себе')
    await expect(MessageController.send(alice.id, bob.id, '   ', undefined)).rejects.toThrow('Сообщение пустое')
    await expect(MessageController.send(alice.id, bob.id, 'я'.repeat(2001), undefined)).rejects.toThrow('длиннее')
    await expect(MessageController.send(alice.id, 9999, 'привет', undefined)).rejects.toThrow('Пользователь не найден')
  })

  it('непрочитанные считаются у получателя и сбрасываются при чтении, отправитель видит «прочитано»', async () => {
    await MessageController.send(alice.id, bob.id, 'раз', undefined)
    const second = await MessageController.send(alice.id, bob.id, 'два', undefined)

    const before = await MessageController.conversations(bob.id)
    expect(before[0]).toMatchObject({ unread: 2 })
    expect((await MessageController.conversations(alice.id))[0].unread).toBe(0)
    expect(await MessageController.peerRead(alice.id, bob.id)).toBe(0)

    await MessageController.markRead(bob.id, alice.id)
    expect((await MessageController.conversations(bob.id))[0].unread).toBe(0)
    expect(await MessageController.peerRead(alice.id, bob.id)).toBe(second.id)
    expect(eventsOf('messagesRead', `user:${alice.id}`)).toHaveLength(1)
  })

  it('подгрузка истории: новые сверху, beforeId отдаёт более старые', async () => {
    const ids: number[] = []
    for (const text of ['a', 'b', 'c', 'd'])
      ids.push((await MessageController.send(alice.id, bob.id, text, undefined)).id)

    const page = await MessageController.list(bob.id, alice.id, undefined, 2)
    expect(page.map((m) => m.text)).toEqual(['d', 'c'])
    const older = await MessageController.list(bob.id, alice.id, ids[2], 10)
    expect(older.map((m) => m.text)).toEqual(['b', 'a'])
  })

  it('ответ возможен только на сообщение этого же диалога', async () => {
    const mine = await MessageController.send(alice.id, bob.id, 'вопрос', undefined)
    const foreign = await MessageController.send(bob.id, carol.id, 'чужое', undefined)

    const reply = await MessageController.send(bob.id, alice.id, 'ответ', undefined, mine.id)
    expect(reply.replyTo).toMatchObject({ id: mine.id, text: 'вопрос' })
    await expect(MessageController.send(alice.id, bob.id, 'подделка', undefined, foreign.id)).rejects.toThrow(
      'не найдено',
    )
  })
})

describe('сообщения: правка, реакции, поиск', () => {
  let alice: User
  let bob: User

  beforeEach(async () => {
    await resetDb()
    ;[alice, bob] = await createUsers(2)
  })

  it('править можно только своё сообщение, текст не может стать пустым', async () => {
    const msg = await MessageController.send(alice.id, bob.id, 'старое', undefined)
    await expect(MessageController.edit(bob.id, msg.id, 'взлом')).rejects.toThrow('только свои')
    await expect(MessageController.edit(alice.id, msg.id, '  ')).rejects.toThrow('пустое')

    const edited = await MessageController.edit(alice.id, msg.id, ' новое ')
    expect(edited).toMatchObject({ text: 'новое' })
    expect(edited.editedAt).toBeInstanceOf(Date)
    expect(eventsOf('messageUpdated', `user:${bob.id}`)).toHaveLength(1)
  })

  it('реакция: добавляется, заменяется, повтор той же снимает; допустимы только разрешённые эмодзи', async () => {
    const msg = await MessageController.send(alice.id, bob.id, 'текст', undefined)

    let result = await MessageController.react(bob.id, msg.id, '👍')
    expect(result.reactions).toEqual([{ userId: bob.id, emoji: '👍' }])

    result = await MessageController.react(bob.id, msg.id, '❤️')
    expect(result.reactions).toEqual([{ userId: bob.id, emoji: '❤️' }])

    result = await MessageController.react(alice.id, msg.id, '❤️')
    expect(result.reactions).toHaveLength(2)

    result = await MessageController.react(bob.id, msg.id, '❤️')
    expect(result.reactions).toEqual([{ userId: alice.id, emoji: '❤️' }])

    await expect(MessageController.react(bob.id, msg.id, '🤡')).rejects.toThrow('недоступна')
    expect(eventsOf('messageReactions').length).toBeGreaterThan(0)
  })

  it('поиск по тексту без учёта регистра, только внутри диалога', async () => {
    const carol = await createUsers(1).then((u) => u[0])
    await MessageController.send(alice.id, bob.id, 'Купить ХЛЕБ', undefined)
    await MessageController.send(bob.id, alice.id, 'и молоко', undefined)
    await MessageController.send(alice.id, carol.id, 'хлеб у карола', undefined)

    const found = await MessageController.search(alice.id, bob.id, 'хлеб', undefined, 20)
    expect(found.map((m) => m.text)).toEqual(['Купить ХЛЕБ'])
    expect(await MessageController.search(alice.id, bob.id, '   ', undefined, 20)).toEqual([])
  })
})

describe('сообщения: закрепы', () => {
  let alice: User
  let bob: User

  beforeEach(async () => {
    await resetDb()
    ;[alice, bob] = await createUsers(2)
  })

  it('закрепов может быть до 10, порядок — по времени закрепления', async () => {
    const ids: number[] = []
    for (let i = 0; i < 11; i++) ids.push((await MessageController.send(alice.id, bob.id, `м${i}`, undefined)).id)
    for (const id of ids.slice(0, 10)) await MessageController.pin(bob.id, id, true)

    await expect(MessageController.pin(bob.id, ids[10], true)).rejects.toThrow('не больше 10')
    const pinned = await MessageController.getPinned(alice.id, bob.id)
    expect(pinned.map((m) => m.id)).toEqual(ids.slice(0, 10))
  })

  it('открепление убирает сообщение из списка, повторное закрепление не дублирует', async () => {
    const a = await MessageController.send(alice.id, bob.id, 'a', undefined)
    const b = await MessageController.send(alice.id, bob.id, 'b', undefined)
    await MessageController.pin(alice.id, a.id, true)
    await MessageController.pin(alice.id, a.id, true)
    await MessageController.pin(alice.id, b.id, true)
    expect((await MessageController.getPinned(bob.id, alice.id)).map((m) => m.id)).toEqual([a.id, b.id])

    await MessageController.pin(alice.id, a.id, false)
    expect((await MessageController.getPinned(bob.id, alice.id)).map((m) => m.id)).toEqual([b.id])
  })

  it('удалённое сообщение пропадает из закрепов', async () => {
    const msg = await MessageController.send(alice.id, bob.id, 'временное', undefined)
    await MessageController.send(alice.id, bob.id, 'остаётся', undefined)
    await MessageController.pin(alice.id, msg.id, true)
    await MessageController.deleteMessage(alice.id, msg.id, true)
    expect(await MessageController.getPinned(bob.id, alice.id)).toEqual([])
  })
})

describe('сообщения: удаление', () => {
  let alice: User
  let bob: User

  beforeEach(async () => {
    await resetDb()
    ;[alice, bob] = await createUsers(2)
  })

  it('«удалить у меня» скрывает сообщение только у меня, а когда скрыли оба — стирает совсем', async () => {
    const msg = await MessageController.send(alice.id, bob.id, 'текст', undefined)
    await MessageController.send(alice.id, bob.id, 'второе', undefined)

    await MessageController.deleteMessage(alice.id, msg.id, false)
    expect((await MessageController.list(alice.id, bob.id, undefined, 30)).map((m) => m.text)).toEqual(['второе'])
    expect((await MessageController.list(bob.id, alice.id, undefined, 30)).map((m) => m.text)).toEqual([
      'второе',
      'текст',
    ])

    await MessageController.deleteMessage(bob.id, msg.id, false)
    expect(await prisma.message.findUnique({ where: { id: msg.id } })).toBeNull()
  })

  it('«удалить у всех» разрешено только для своих сообщений и стирает у обоих', async () => {
    const mine = await MessageController.send(alice.id, bob.id, 'моё', undefined)
    await MessageController.send(bob.id, alice.id, 'его', undefined)

    await expect(MessageController.deleteMessage(bob.id, mine.id, true)).rejects.toThrow('только свои')
    await MessageController.deleteMessage(alice.id, mine.id, true)
    expect(await prisma.message.findUnique({ where: { id: mine.id } })).toBeNull()
    expect(eventsOf('messagesDeleted', `user:${bob.id}`)).toHaveLength(1)
  })

  it('пакетное удаление у всех не удаляет ничего, если среди сообщений есть чужое', async () => {
    const mine = await MessageController.send(alice.id, bob.id, 'моё', undefined)
    const his = await MessageController.send(bob.id, alice.id, 'его', undefined)

    await expect(MessageController.deleteMessages(alice.id, [mine.id, his.id], true)).rejects.toThrow('только свои')
    expect(await prisma.message.count()).toBe(2)

    await MessageController.deleteMessages(alice.id, [mine.id, his.id], false)
    // Скрыто только у Алисы: у Боба оба сообщения на месте
    expect(await MessageController.list(bob.id, alice.id, undefined, 30)).toHaveLength(2)
    expect(await MessageController.list(alice.id, bob.id, undefined, 30)).toHaveLength(0)
  })

  it('диалог: удаление у себя не трогает собеседника, когда удалили оба — стирается переписка', async () => {
    await MessageController.send(alice.id, bob.id, 'привет', undefined)

    await MessageController.remove(alice.id, bob.id)
    expect(await MessageController.conversations(alice.id)).toEqual([])
    expect(await MessageController.conversations(bob.id)).toHaveLength(1)

    await MessageController.remove(bob.id, alice.id)
    expect(await prisma.conversation.count()).toBe(0)
    expect(await prisma.message.count()).toBe(0)
  })

  it('«у всех» стирает диалог сразу у обоих', async () => {
    await MessageController.send(alice.id, bob.id, 'привет', undefined)
    await MessageController.remove(alice.id, bob.id, true)
    expect(await prisma.conversation.count()).toBe(0)
    expect(eventsOf('conversationDeleted', `user:${bob.id}`)).toHaveLength(1)
  })
})

describe('сообщения: пересылка и настройки диалога', () => {
  let alice: User
  let bob: User
  let carol: User

  beforeEach(async () => {
    await resetDb()
    ;[alice, bob, carol] = await createUsers(3)
  })

  it('пересылка создаёт копии с автором оригинала, при пересылке пересланного сохраняется первый автор', async () => {
    const original = await MessageController.send(alice.id, bob.id, 'важное', undefined)
    const [toCarol] = await MessageController.forward(bob.id, original.id, [carol.id])
    expect(toCarol).toMatchObject({ text: 'важное', forwardedFromId: alice.id, forwardedFrom: alice.login })

    const [again] = await MessageController.forward(carol.id, toCarol.id, [alice.id])
    expect(again).toMatchObject({ forwardedFromId: alice.id })
  })

  it('пересылка: нельзя больше 10 получателей и без получателей', async () => {
    const original = await MessageController.send(alice.id, bob.id, 'важное', undefined)
    await expect(MessageController.forward(bob.id, original.id, [])).rejects.toThrow('Выберите')
    const many = Array.from({ length: 11 }, (_, i) => 1000 + i)
    await expect(MessageController.forward(bob.id, original.id, many)).rejects.toThrow('не больше чем 10')
  })

  it('архив: новое сообщение возвращает диалог из архива, но не если он заглушён', async () => {
    await MessageController.send(alice.id, bob.id, 'раз', undefined)
    await MessageController.send(alice.id, carol.id, 'раз', undefined)
    await MessageController.setSettings(bob.id, alice.id, { archived: true })
    await MessageController.setSettings(carol.id, alice.id, { archived: true, muted: true })

    await MessageController.send(alice.id, bob.id, 'два', undefined)
    await MessageController.send(alice.id, carol.id, 'два', undefined)

    expect((await MessageController.conversations(bob.id))[0]).toMatchObject({ archived: false })
    expect((await MessageController.conversations(carol.id))[0]).toMatchObject({ archived: true, muted: true })
  })

  it('закреплённые диалоги идут первыми в списке', async () => {
    await MessageController.send(bob.id, alice.id, 'старый', undefined)
    await MessageController.send(carol.id, alice.id, 'новый', undefined)
    expect((await MessageController.conversations(alice.id)).map((c) => c.user.id)).toEqual([carol.id, bob.id])

    await MessageController.setSettings(alice.id, bob.id, { pinned: true })
    expect((await MessageController.conversations(alice.id)).map((c) => c.user.id)).toEqual([bob.id, carol.id])
  })

  it('настройки диалога у каждого свои', async () => {
    await MessageController.send(alice.id, bob.id, 'привет', undefined)
    await MessageController.setSettings(alice.id, bob.id, { muted: true })
    expect((await MessageController.conversations(alice.id))[0].muted).toBe(true)
    expect((await MessageController.conversations(bob.id))[0].muted).toBe(false)
    await expect(MessageController.setSettings(alice.id, carol.id, { muted: true })).rejects.toThrow('не найден')
  })

  it('присутствие: вне сети, пока нет сокетов; время последнего визита берётся из профиля', async () => {
    expect(await MessageController.presence(alice.id)).toEqual({ online: false, lastSeenAt: null })
    const seen = new Date('2026-01-01T10:00:00Z')
    await prisma.user.update({ where: { id: alice.id }, data: { lastSeenAt: seen } })
    expect(await MessageController.presence(alice.id)).toEqual({ online: false, lastSeenAt: seen })
    await expect(MessageController.presence(9999)).rejects.toThrow('не найден')
  })
})
