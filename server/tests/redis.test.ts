import Redis from 'ioredis'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Проверка Redis-пути: кэш с датами, версии, присутствие и ограничители.
 * Тесты запускаются, только если Redis доступен; без него остальные тесты
 * проверяют запасные пути (см. setup.ts). Адрес можно задать в TEST_REDIS_URL.
 */
const REDIS_URL = process.env.TEST_REDIS_URL || 'redis://127.0.0.1:6379'
const prefix = `anidale:test:${process.pid}:${Date.now()}`

const probe = new Redis(REDIS_URL, {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  connectTimeout: 1500,
  retryStrategy: () => null,
})

const available = await (async () => {
  try {
    await probe.connect()
    return (await probe.ping()) === 'PONG'
  } catch {
    return false
  }
})()

if (available) await probe.quit().catch(() => probe.disconnect())
else probe.disconnect()

let redisModule: typeof import('@/redis')
let presence: typeof import('@/handlers/presence')
let limits: typeof import('@/utils/rate-limit')
let raw: Redis

const presenceKey = (userId: number) => `anidale:presence:${userId}`

const suite = available ? describe : describe.skip

suite('Redis: общий кэш, присутствие и лимиты', () => {
  beforeAll(async () => {
    // Модули читают REDIS_URL при импорте, поэтому подключаем их уже с адресом
    process.env.REDIS_URL = REDIS_URL
    redisModule = await import('@/redis')
    presence = await import('@/handlers/presence')
    limits = await import('@/utils/rate-limit')
    raw = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 })
    await raw.connect()
  })

  afterAll(async () => {
    if (raw) {
      const keys = await raw.keys(`${prefix}:*`)
      if (keys.length) await raw.del(...keys)
      await raw.quit().catch(() => raw.disconnect())
    }
    await redisModule?.closeRedis()
  })

  it('вернёт даты из кэша и обновится после сброса версии', async () => {
    const cache = redisModule.createVersionedCache(`${prefix}:anime`, 30)
    const date = new Date('2026-01-02T03:04:05.000Z')
    const value = { title: 'Релиз', at: date, nested: [{ at: new Date('2025-05-06T07:08:09.000Z') }] }
    let calls = 0
    const load = async () => {
      calls += 1
      return value
    }

    const first = await cache.load('home:1', load)
    expect(first.at).toBeInstanceOf(Date)
    expect(first.at.getTime()).toBe(date.getTime())
    expect(first.nested[0].at).toBeInstanceOf(Date)

    const second = await cache.load('home:1', load)
    expect(second).toEqual(value)
    expect(calls).toBe(1)

    await cache.invalidate()
    const third = await cache.load('home:1', load)
    expect(third.at.getTime()).toBe(date.getTime())
    expect(calls).toBe(2)
  })

  it('считает лимит в Redis и сбрасывает его', async () => {
    const key = `${prefix}:limit`
    const windowMs = 60_000
    expect((await limits.hit(key, 2, windowMs)).allowed).toBe(true)
    expect((await limits.hit(key, 2, windowMs)).allowed).toBe(true)
    const blocked = await limits.hit(key, 2, windowMs)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfter).toBeGreaterThan(0)

    // Другой ключ считает своё окно
    expect((await limits.hit(`${key}:other`, 2, windowMs)).allowed).toBe(true)
    await raw.del(`anidale:limit:${key}`, `anidale:limit:${key}:other`)
    expect((await limits.hit(key, 2, windowMs)).allowed).toBe(true)

    // resetLimit снимает блокировку и в Redis
    const subject = `${prefix}-login`
    expect((await limits.hit(`login:${subject}`, 1, windowMs)).allowed).toBe(true)
    expect((await limits.hit(`login:${subject}`, 1, windowMs)).allowed).toBe(false)
    await limits.resetLimit('login', subject)
    expect((await limits.hit(`login:${subject}`, 1, windowMs)).allowed).toBe(true)
    await raw.del(`anidale:limit:login:${subject}`)
  })

  it('держит присутствие общим для сокетов и чистит просроченные', async () => {
    const user = 900_000 + (process.pid % 1000)
    const stale = user + 1
    await raw.del(presenceKey(user), presenceKey(stale))

    expect(await presence.isOnline(user)).toBe(false)
    expect(await presence.markConnected(user, 'socket-1')).toBe(true)
    expect(await presence.markConnected(user, 'socket-2')).toBe(false)
    expect(await presence.isOnline(user)).toBe(true)
    expect(await presence.onlineUsers([user, stale])).toEqual(new Set([user]))

    // Heartbeat продлевает жизнь сокета
    const before = Number(await raw.zscore(presenceKey(user), 'socket-1'))
    await presence.touchPresence(user, 'socket-1')
    const after = Number(await raw.zscore(presenceKey(user), 'socket-1'))
    expect(after).toBeGreaterThanOrEqual(before)

    expect(await presence.markDisconnected(user, 'socket-1')).toBe(false)
    expect(await presence.isOnline(user)).toBe(true)
    expect(await presence.markDisconnected(user, 'socket-2')).toBe(true)
    expect(await presence.isOnline(user)).toBe(false)

    // Сокет упавшего процесса: запись есть, но срок жизни истёк
    await raw.zadd(presenceKey(stale), Date.now() - 1000, 'dead-socket')
    expect(await presence.isOnline(stale)).toBe(false)
    await raw.del(presenceKey(stale))
  })
})
