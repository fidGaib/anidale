import { beforeEach, describe, expect, it } from 'vitest'

import FriendService from '@/api/friend/service'
import { markConnected, markDisconnected } from '@/handlers/presence'

import { createUsers, prisma, resetDb } from './helpers'

type User = Awaited<ReturnType<typeof createUsers>>[number]

let tick = 0

/** Подписка с явным временем создания: каждая следующая строго позже предыдущей (порядок не зависит от скорости записи). */
const follow = (followerId: number, followingId: number) =>
  prisma.subscription.create({
    data: { followerId, followingId, createdAt: new Date(Date.UTC(2026, 0, 1) + ++tick * 1000) },
  })

/** Взаимная подписка: пользователи становятся друзьями. */
const befriend = async (a: User, b: User) => {
  await follow(a.id, b.id)
  await follow(b.id, a.id)
}

describe('друзья онлайн', () => {
  let me: User
  let friend1: User
  let friend2: User
  let subscriber: User
  const online: number[] = []

  const setOnline = async (user: User) => {
    await markConnected(user.id)
    online.push(user.id)
  }

  beforeEach(async () => {
    await resetDb()
    ;[me, friend1, friend2, subscriber] = await createUsers(4)
    await befriend(me, friend1)
    await befriend(me, friend2)
    // Подписчик: подписан на меня, но я на него нет — другом не считается
    await follow(subscriber.id, me.id)
    // Сброс присутствия прошлых тестов
    for (const id of online.splice(0)) await markDisconnected(id)
  })

  it('показывает только друзей, которые сейчас в сети', async () => {
    await setOnline(friend1)
    const result = await FriendService.friendsOnline(me.id)
    expect(result.map((u) => u.id)).toEqual([friend1.id])
  })

  it('подписчики и посторонние не попадают в список, даже если они в сети', async () => {
    await setOnline(subscriber)
    expect(await FriendService.friendsOnline(me.id)).toEqual([])
  })

  it('если никого нет в сети, список пуст', async () => {
    expect(await FriendService.friendsOnline(me.id)).toEqual([])
  })

  it('после выхода друг пропадает из списка', async () => {
    await setOnline(friend1)
    await markDisconnected(friend1.id)
    online.pop()
    expect(await FriendService.friendsOnline(me.id)).toEqual([])
  })

  it('свежие друзья идут первыми, число ограничено limit', async () => {
    await setOnline(friend1)
    await setOnline(friend2)
    const result = await FriendService.friendsOnline(me.id, 1)
    expect(result).toHaveLength(1)
    // friend2 добавлен позже: у него более свежая подписка
    expect(result[0].id).toBe(friend2.id)
  })

  it('несуществующий пользователь — ошибка', async () => {
    await expect(FriendService.friendsOnline(9999)).rejects.toThrow('не найден')
  })

  it('в публичной выборке нет закрытых данных', async () => {
    setOnline(friend1)
    const [user] = await FriendService.friendsOnline(me.id)
    expect(user).not.toHaveProperty('pass')
    expect(user).not.toHaveProperty('email')
  })
})

describe('подписки', () => {
  let me: User
  let friend: User
  let idol: User
  let fan: User

  beforeEach(async () => {
    await resetDb()
    ;[me, friend, idol, fan] = await createUsers(4)
    await befriend(me, friend)
    // Я читаю idol, он меня нет
    await follow(me.id, idol.id)
    // fan читает меня, я его нет
    await follow(fan.id, me.id)
  })

  it('подписки — только те, на кого подписан я, без друзей и без моих подписчиков', async () => {
    const list = await FriendService.subscriptions(me.id)
    expect(list.map((u) => u.id)).toEqual([idol.id])
  })

  it('у человека, на которого меня читают взаимно, он становится другом, а не «подпиской»', async () => {
    await follow(idol.id, me.id)
    expect(await FriendService.subscriptions(me.id)).toEqual([])
    expect((await FriendService.friends(me.id)).map((u) => u.id).sort()).toEqual([friend.id, idol.id].sort())
  })

  it('счётчики профиля не пересекаются: друзья, подписчики и подписки считаются отдельно', async () => {
    const state = await FriendService.state(me.id, me.id)
    expect(state).toMatchObject({ friendsCount: 1, subscribersCount: 1, subscriptionsCount: 1 })
  })

  it('новые подписки идут первыми, работают limit и offset', async () => {
    const [, , , , second, third] = [me, friend, idol, fan, ...(await createUsers(2))]
    await follow(me.id, second.id)
    await follow(me.id, third.id)

    expect((await FriendService.subscriptions(me.id)).map((u) => u.id)).toEqual([third.id, second.id, idol.id])
    expect((await FriendService.subscriptions(me.id, 1)).map((u) => u.id)).toEqual([third.id])
    expect((await FriendService.subscriptions(me.id, 10, 2)).map((u) => u.id)).toEqual([idol.id])
  })

  it('подписка и отписка сразу меняют счётчики в ответе', async () => {
    const after = await FriendService.subscribe(me.id, fan.id)
    // fan уже читал меня: теперь мы друзья
    expect(after.status).toBe('FRIEND')
    expect((await FriendService.state(me.id, me.id)).subscriptionsCount).toBe(1)
    expect((await FriendService.state(me.id, me.id)).friendsCount).toBe(2)

    await FriendService.unsubscribe(me.id, idol.id)
    expect((await FriendService.state(me.id, me.id)).subscriptionsCount).toBe(0)
  })

  it('в публичной выборке нет закрытых данных, несуществующий пользователь — ошибка', async () => {
    const [user] = await FriendService.subscriptions(me.id)
    expect(user).not.toHaveProperty('pass')
    expect(user).not.toHaveProperty('email')
    await expect(FriendService.subscriptions(9999)).rejects.toThrow('не найден')
  })
})
