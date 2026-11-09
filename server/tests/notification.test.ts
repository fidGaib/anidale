import { beforeEach, describe, expect, it } from 'vitest'

import NotificationController from '@/api/notification/controller'
import ReactionController from '@/api/reaction/controller'

import { createPost, createUsers, eventsOf, prisma, resetDb } from './helpers'

type User = Awaited<ReturnType<typeof createUsers>>[number]

describe('уведомления', () => {
  let owner: User
  let fan: User

  beforeEach(async () => {
    await resetDb()
    ;[owner, fan] = await createUsers(2)
  })

  it('создаётся и сразу уходит адресату по сокету, о своих действиях не уведомляет', async () => {
    await NotificationController.notify(owner.id, fan.id, 'comment', { text: 'круто' })
    await NotificationController.notify(owner.id, owner.id, 'comment', { text: 'я сам' })

    expect(await prisma.notification.count()).toBe(1)
    const [event] = eventsOf('notification', `user:${owner.id}`)
    expect(event.payload).toMatchObject({ notification: { type: 'comment', text: 'круто', read: false } })
  })

  it('лайк одного человека к одному посту не дублируется, а текст обрезается до 120 символов', async () => {
    const post = await createPost(owner.id)
    await NotificationController.notify(owner.id, fan.id, 'like', { postId: post.id })
    await NotificationController.notify(owner.id, fan.id, 'like', { postId: post.id })
    expect(await prisma.notification.count()).toBe(1)

    await NotificationController.notify(owner.id, fan.id, 'comment', { text: 'я'.repeat(500) })
    const long = await prisma.notification.findFirst({ where: { type: 'comment' } })
    expect(long?.text).toHaveLength(120)
  })

  it('счётчик непрочитанных, список по убыванию и «прочитать все»', async () => {
    await NotificationController.notify(owner.id, fan.id, 'track', { text: 'песня' })
    await NotificationController.notify(owner.id, fan.id, 'repost', { text: 'смотрите' })
    expect(await NotificationController.unreadCount(owner.id)).toBe(2)

    const list = await NotificationController.list(owner.id, 10)
    expect(list.map((n) => n.type)).toEqual(['repost', 'track'])
    expect(list[0].actor.id).toBe(fan.id)

    await NotificationController.markAllRead(owner.id)
    expect(await NotificationController.unreadCount(owner.id)).toBe(0)
    expect((await NotificationController.list(owner.id, 10)).every((n) => n.read)).toBe(true)
    expect(eventsOf('notificationsRead', `user:${owner.id}`)).toHaveLength(1)
  })

  it('подгрузка старых уведомлений по beforeId', async () => {
    for (let i = 0; i < 4; i++) await NotificationController.notify(owner.id, fan.id, 'track', { text: `t${i}` })
    const first = await NotificationController.list(owner.id, 2)
    expect(first.map((n) => n.text)).toEqual(['t3', 't2'])
    const next = await NotificationController.list(owner.id, 10, first[1].id)
    expect(next.map((n) => n.text)).toEqual(['t1', 't0'])
  })

  it('чужие уведомления не видны', async () => {
    await NotificationController.notify(owner.id, fan.id, 'track', { text: 'мне' })
    expect(await NotificationController.list(fan.id, 10)).toEqual([])
    expect(await NotificationController.unreadCount(fan.id)).toBe(0)
  })
})

describe('лайки и комментарии порождают уведомления', () => {
  let owner: User
  let fan: User

  beforeEach(async () => {
    await resetDb()
    ;[owner, fan] = await createUsers(2)
  })

  it('лайк уведомляет автора, снятие лайка убирает уведомление, повторный лайк не шумит', async () => {
    const post = await createPost(owner.id)
    const liked = await ReactionController.setLike(post.id, fan.id, true)
    expect(liked).toEqual({ liked: true, likesCount: 1 })
    expect(await NotificationController.unreadCount(owner.id)).toBe(1)

    await ReactionController.setLike(post.id, fan.id, true)
    expect(await prisma.like.count()).toBe(1)
    expect(await prisma.notification.count()).toBe(1)

    await ReactionController.setLike(post.id, fan.id, false)
    expect(await prisma.notification.count()).toBe(0)
    expect(await prisma.like.count()).toBe(0)
  })

  it('свой лайк и свой комментарий автора не уведомляют', async () => {
    const post = await createPost(owner.id)
    await ReactionController.setLike(post.id, owner.id, true)
    await ReactionController.addComment(post.id, owner.id, 'сам себе')
    expect(await prisma.notification.count()).toBe(0)
  })

  it('комментарий уведомляет автора с текстом, пустой и слишком длинный отклоняются', async () => {
    const post = await createPost(owner.id)
    await ReactionController.addComment(post.id, fan.id, '  отлично  ')
    const [n] = await NotificationController.list(owner.id, 10)
    expect(n).toMatchObject({ type: 'comment', text: 'отлично', postId: post.id })

    await expect(ReactionController.addComment(post.id, fan.id, '   ')).rejects.toThrow('пустой')
    await expect(ReactionController.addComment(post.id, fan.id, 'я'.repeat(501))).rejects.toThrow('длиннее')
    await expect(ReactionController.addComment(9999, fan.id, 'привет')).rejects.toThrow('Пост не найден')
  })

  it('удалить комментарий может автор комментария или автор поста, больше никто', async () => {
    const [, , stranger] = [owner, fan, await createUsers(1).then((u) => u[0])]
    const post = await createPost(owner.id)
    const comment = await ReactionController.addComment(post.id, fan.id, 'мой')

    await expect(ReactionController.removeComment(comment.id, stranger.id)).rejects.toThrow('Нет доступа')
    expect(await ReactionController.removeComment(comment.id, owner.id)).toBe(true)
    expect(await prisma.comment.count()).toBe(0)
  })

  it('удаление поста убирает его уведомления', async () => {
    const post = await createPost(owner.id)
    await ReactionController.setLike(post.id, fan.id, true)
    await prisma.post.delete({ where: { id: post.id } })
    expect(await prisma.notification.count()).toBe(0)
  })
})
